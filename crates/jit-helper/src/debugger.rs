use crate::Failure;
use idevice::debug_proxy::DebugProxyClient;
use idevice::{IdeviceError, ReadWrite};
use std::collections::HashMap;
use std::time::Duration;
use tokio::time::timeout;

// brk #0xf00d as m reads it back: the instruction's bytes in memory order.
const BRK_F00D: &str = "a0013ed4";
const DETACH: u64 = 0;
const PREPARE_REGION: u64 = 1;
const PC: u8 = 0x20;
const X16: u8 = 0x10;
const PAGE: u64 = 0x4000;
const WRITES_PER_BATCH: u64 = 128;
const INTERRUPTED_STOP_LIMIT: Duration = Duration::from_secs(5);

#[derive(Debug)]
enum Stop {
    Signal { signal: u8, thread: String, registers: HashMap<String, String> },
    Exited,
}

struct Debugger<R: ReadWrite> {
    client: DebugProxyClient<R>,
}

impl From<IdeviceError> for Failure {
    fn from(_: IdeviceError) -> Failure {
        Failure::ConnectionLost
    }
}

// Answers the brk #0xf00d requests that ios_jit.rs in the app makes, until the app asks it to detach.
pub async fn approve<R: ReadWrite>(client: DebugProxyClient<R>, pid: u32, limit: Duration) -> Result<(), Failure> {
    let mut debugger = Debugger { client };
    debugger.client.send_raw(b"+").await?;
    debugger.expect_ok("QStartNoAckMode").await?;
    debugger.client.set_ack_mode(false);
    let attached = debugger.request(&format!("vAttach;{pid:x}")).await?;
    if !attached.starts_with('T') && !attached.starts_with('S') {
        return Err(Failure::AttachRefused(attached));
    }
    let mut resume = "c".to_string();
    loop {
        debugger.send(&resume).await?;
        // Approving the pool takes tens of thousands of writes nobody has timed, so the limit is on each wait instead.
        let stop = match timeout(limit, debugger.next_stop()).await {
            Ok(stop) => stop?,
            Err(_) => return debugger.give_up().await,
        };
        let Stop::Signal { signal, thread, registers } = stop else {
            return Err(Failure::AppExited);
        };
        let pc = debugger.register(&registers, &thread, PC).await?;
        if !debugger.at_brk(pc).await? {
            resume = format!("C{signal:02x}");
            continue;
        }
        debugger.step_past(pc, &thread).await?;
        resume = "c".to_string();
        match debugger.register(&registers, &thread, X16).await? {
            PREPARE_REGION => {
                let start = debugger.register(&registers, &thread, 0).await?;
                let length = debugger.register(&registers, &thread, 1).await?;
                debugger.prepare_region(start, length).await?;
                debugger.expect_ok(&format!("P0={};thread:{thread};", le_hex(start))).await?;
            }
            DETACH => return debugger.detach().await,
            command => eprintln!("JIT helper: ignoring command {command}"),
        }
    }
}

impl<R: ReadWrite> Debugger<R> {
    async fn send(&mut self, data: &str) -> Result<(), Failure> {
        Ok(self.client.send_raw(packet(data).as_bytes()).await?)
    }

    async fn reply(&mut self) -> Result<String, Failure> {
        loop {
            match self.client.read_response().await? {
                Some(reply) if is_output(&reply) => continue,
                Some(reply) => return Ok(reply),
                None => continue,
            }
        }
    }

    async fn request(&mut self, data: &str) -> Result<String, Failure> {
        self.send(data).await?;
        self.reply().await
    }

    async fn expect_ok(&mut self, data: &str) -> Result<(), Failure> {
        match self.request(data).await? {
            reply if reply == "OK" => Ok(()),
            reply => Err(Failure::Unexpected(format!("{data} answered {reply}"))),
        }
    }

    async fn next_stop(&mut self) -> Result<Stop, Failure> {
        loop {
            let reply = self.reply().await?;
            if let Some(stop) = parse_stop(&reply) {
                return Ok(stop);
            }
        }
    }

    async fn register(
        &mut self,
        registers: &HashMap<String, String>,
        thread: &str,
        number: u8,
    ) -> Result<u64, Failure> {
        let value = match registers.get(&format!("{number:02x}")) {
            Some(value) => value.clone(),
            None => self.request(&format!("p{number:x};thread:{thread};")).await?,
        };
        from_le_hex(&value).ok_or(Failure::ConnectionLost)
    }

    async fn at_brk(&mut self, pc: u64) -> Result<bool, Failure> {
        Ok(self.request(&format!("m{pc:x},4")).await? == BRK_F00D)
    }

    // Before anything else, or the app runs the brk again once the debugger has left.
    async fn step_past(&mut self, pc: u64, thread: &str) -> Result<(), Failure> {
        self.expect_ok(&format!("P{PC:x}={};thread:{thread};", le_hex(pc + 4))).await
    }

    // On TXM, pages a debugger has written to can then run code the app writes through its own read+write alias.
    async fn prepare_region(&mut self, start: u64, length: u64) -> Result<(), Failure> {
        let pages: Vec<u64> = (start..start.saturating_add(length)).step_by(PAGE as usize).collect();
        for batch in pages.chunks(WRITES_PER_BATCH as usize) {
            let writes: String = batch.iter().map(|page| packet(&format!("M{page:x},1:69"))).collect();
            self.client.send_raw(writes.as_bytes()).await?;
            for page in batch {
                let reply = self.reply().await?;
                if reply != "OK" {
                    return Err(Failure::Unexpected(format!("writing to {page:x} answered {reply}")));
                }
            }
        }
        Ok(())
    }

    async fn detach(&mut self) -> Result<(), Failure> {
        match self.request("D").await? {
            reply if reply == "OK" => Ok(()),
            reply => Err(Failure::Unexpected(format!("D answered {reply}"))),
        }
    }

    async fn give_up(&mut self) -> Result<(), Failure> {
        self.client.send_raw(&[0x03]).await?;
        if let Ok(Ok(Stop::Signal { thread, registers, .. })) = timeout(INTERRUPTED_STOP_LIMIT, self.next_stop()).await
        {
            let pc = self.register(&registers, &thread, PC).await?;
            if self.at_brk(pc).await? {
                self.step_past(pc, &thread).await?;
            }
        }
        self.detach().await?;
        Err(Failure::TimedOut)
    }
}

fn packet(data: &str) -> String {
    let checksum = data.bytes().fold(0u8, |sum, byte| sum.wrapping_add(byte));
    format!("${data}#{checksum:02x}")
}

// debugserver forwards the app's stdout as O packets.
fn is_output(reply: &str) -> bool {
    reply.starts_with('O') && reply != "OK"
}

fn parse_stop(reply: &str) -> Option<Stop> {
    let kind = reply.chars().next()?;
    match kind {
        'W' | 'X' => Some(Stop::Exited),
        'T' | 'S' => {
            let signal = u8::from_str_radix(reply.get(1..3)?, 16).ok()?;
            let mut registers = HashMap::new();
            let mut thread = String::new();
            for pair in reply[3..].split(';') {
                let Some((key, value)) = pair.split_once(':') else { continue };
                if key == "thread" {
                    thread = value.to_string();
                } else {
                    registers.insert(key.to_ascii_lowercase(), value.to_string());
                }
            }
            Some(Stop::Signal { signal, thread, registers })
        }
        _ => None,
    }
}

fn le_hex(value: u64) -> String {
    value.to_le_bytes().iter().map(|byte| format!("{byte:02x}")).collect()
}

fn from_le_hex(hex: &str) -> Option<u64> {
    if hex.len() != 16 {
        return None;
    }
    let mut bytes = [0u8; 8];
    for (index, byte) in bytes.iter_mut().enumerate() {
        *byte = u8::from_str_radix(hex.get(index * 2..index * 2 + 2)?, 16).ok()?;
    }
    Some(u64::from_le_bytes(bytes))
}

#[cfg(test)]
mod tests;
