use super::*;
use std::collections::VecDeque;
use tokio::io::{duplex, AsyncReadExt, AsyncWriteExt, DuplexStream};

const PID: u32 = 0x1f2;
const THREAD: &str = "1a2b";
const BRK_PC: u64 = 0x1_0000_4000;
const OTHER_PC: u64 = 0x1_0000_8000;
const POOL: u64 = 0x2_8000_0000;
const LIMIT: Duration = Duration::from_secs(60);

#[derive(Clone, Copy)]
enum Step {
    Brk { x16: u64, x0: u64, x1: u64 },
    Signal(u8),
    Exit,
    Hang,
    Close,
}

#[derive(Default)]
struct Script {
    refuse_attach: bool,
    leave_out_x16: bool,
    steps: VecDeque<Step>,
}

#[derive(Debug, Default)]
struct Seen {
    attached: bool,
    pages: Vec<u64>,
    x0: Vec<u64>,
    passed_on: Vec<u8>,
    ran_brk_again: bool,
    interrupted: bool,
    asked_for_x16: bool,
    detached: bool,
}

struct Debugserver {
    stream: DuplexStream,
    script: Script,
    seen: Seen,
    acks: bool,
    pc: u64,
    registers: Option<u64>,
}

impl Debugserver {
    async fn run(mut self) -> Seen {
        while let Some(packet) = self.next_packet().await {
            if self.acks {
                let _ = self.stream.write_all(b"+").await;
            }
            if !self.answer(&packet).await {
                break;
            }
        }
        self.seen
    }

    async fn next_packet(&mut self) -> Option<String> {
        let mut byte = [0u8; 1];
        loop {
            self.stream.read_exact(&mut byte).await.ok()?;
            match byte[0] {
                b'+' => continue,
                0x03 => return Some("\x03".to_string()),
                b'$' => break,
                other => panic!("debugserver got a stray {other:#x}"),
            }
        }
        let mut data = Vec::new();
        loop {
            self.stream.read_exact(&mut byte).await.ok()?;
            if byte[0] == b'#' {
                break;
            }
            data.push(byte[0]);
        }
        let mut checksum = [0u8; 2];
        self.stream.read_exact(&mut checksum).await.ok()?;
        let data = String::from_utf8(data).unwrap();
        assert_eq!(std::str::from_utf8(&checksum).unwrap(), &packet(&data)[data.len() + 2..], "bad checksum");
        Some(data)
    }

    async fn reply(&mut self, data: &str) {
        let _ = self.stream.write_all(packet(data).as_bytes()).await;
    }

    async fn stop(&mut self, signal: u8, pc: u64, x16: u64, x0: u64, x1: u64) {
        self.pc = pc;
        let mut stop = format!("T{signal:02x}thread:{THREAD};20:{};00:{};01:{};", le_hex(pc), le_hex(x0), le_hex(x1));
        if !self.script.leave_out_x16 {
            stop.push_str(&format!("10:{};", le_hex(x16)));
        }
        self.registers = Some(x16);
        self.reply(&stop).await;
    }

    // Returns false once the connection should close.
    async fn answer(&mut self, packet: &str) -> bool {
        match packet {
            "QStartNoAckMode" => {
                self.reply("OK").await;
                self.acks = false;
            }
            "\x03" => {
                self.seen.interrupted = true;
                self.stop(0x11, OTHER_PC, 0, 0, 0).await;
            }
            "D" => {
                self.seen.ran_brk_again |= self.pc == BRK_PC;
                self.seen.detached = true;
                self.reply("OK").await;
            }
            "c" => return self.resume().await,
            _ if packet.starts_with("vAttach;") => {
                assert_eq!(u32::from_str_radix(&packet[8..], 16).unwrap(), PID);
                if self.script.refuse_attach {
                    self.reply("E01").await;
                } else {
                    self.seen.attached = true;
                    self.stop(0x11, OTHER_PC, 0, 0, 0).await;
                }
            }
            _ if packet.starts_with('C') => {
                self.seen.passed_on.push(u8::from_str_radix(&packet[1..], 16).unwrap());
                return self.resume().await;
            }
            _ if packet.starts_with('m') => {
                let (address, length) = packet[1..].split_once(',').unwrap();
                assert_eq!(length, "4");
                let address = u64::from_str_radix(address, 16).unwrap();
                self.reply(if address == BRK_PC { BRK_F00D } else { "1f2003d5" }).await;
            }
            _ if packet.starts_with("P20=") => {
                assert!(packet.ends_with(&format!(";thread:{THREAD};")));
                self.pc = from_le_hex(&packet[4..20]).unwrap();
                self.reply("OK").await;
            }
            _ if packet.starts_with("P0=") => {
                self.seen.x0.push(from_le_hex(&packet[3..19]).unwrap());
                self.reply("OK").await;
            }
            _ if packet.starts_with("p10;") => {
                self.seen.asked_for_x16 = true;
                let x16 = le_hex(self.registers.unwrap());
                self.reply(&x16).await;
            }
            _ if packet.starts_with('M') => {
                let (address, data) = packet[1..].split_once(',').unwrap();
                assert_eq!(data, "1:69");
                self.seen.pages.push(u64::from_str_radix(address, 16).unwrap());
                self.reply("OK").await;
            }
            other => panic!("debugserver doesn't know {other}"),
        }
        true
    }

    async fn resume(&mut self) -> bool {
        if self.pc == BRK_PC {
            self.seen.ran_brk_again = true;
        }
        match self.script.steps.pop_front() {
            Some(Step::Brk { x16, x0, x1 }) => self.stop(0x05, BRK_PC, x16, x0, x1).await,
            Some(Step::Signal(signal)) => self.stop(signal, OTHER_PC, 0, 0, 0).await,
            Some(Step::Exit) => self.reply("W00").await,
            Some(Step::Hang) | None => {}
            Some(Step::Close) => return false,
        }
        true
    }
}

async fn run(script: Script) -> (Result<(), Failure>, Seen) {
    let (client, server) = duplex(1 << 16);
    let debugserver = Debugserver { stream: server, script, seen: Seen::default(), acks: true, pc: 0, registers: None };
    let server = tokio::spawn(debugserver.run());
    let result = approve(DebugProxyClient::new(client), PID, LIMIT).await;
    (result, server.await.unwrap())
}

fn steps(steps: impl IntoIterator<Item = Step>) -> Script {
    Script { steps: steps.into_iter().collect(), ..Script::default() }
}

const DETACH_STEP: Step = Step::Brk { x16: DETACH, x0: 0, x1: 0 };

#[tokio::test]
async fn approves_the_whole_pool_on_txm_devices_and_leaves() {
    let size = 544 << 20;
    let (result, seen) = run(steps([Step::Brk { x16: PREPARE_REGION, x0: POOL, x1: size }, DETACH_STEP])).await;

    assert_eq!(result, Ok(()));
    assert!(seen.attached && seen.detached);
    assert_eq!(seen.pages.len(), 34_816);
    assert_eq!(seen.pages.first(), Some(&POOL));
    assert_eq!(seen.pages.last(), Some(&(POOL + size - PAGE)));
    assert_eq!(seen.x0, [POOL]);
    assert!(!seen.ran_brk_again);
}

#[tokio::test]
async fn leaves_straight_away_without_txm() {
    let (result, seen) = run(steps([DETACH_STEP])).await;

    assert_eq!(result, Ok(()));
    assert!(seen.detached);
    assert!(seen.pages.is_empty());
}

#[tokio::test]
async fn hands_other_signals_to_the_app() {
    let (result, seen) = run(steps([Step::Signal(0x0b), Step::Signal(0x0d), DETACH_STEP])).await;

    assert_eq!(result, Ok(()));
    assert_eq!(seen.passed_on, [0x0b, 0x0d]);
    assert!(seen.detached);
}

#[tokio::test]
async fn steps_over_commands_it_doesnt_know() {
    let (result, seen) = run(steps([Step::Brk { x16: 7, x0: 1, x1: 2 }, DETACH_STEP])).await;

    assert_eq!(result, Ok(()));
    assert!(!seen.ran_brk_again);
    assert!(seen.pages.is_empty() && seen.x0.is_empty());
    assert!(seen.detached);
}

#[tokio::test]
async fn reads_a_register_the_stop_left_out() {
    let script =
        Script { leave_out_x16: true, ..steps([Step::Brk { x16: PREPARE_REGION, x0: POOL, x1: PAGE }, DETACH_STEP]) };
    let (result, seen) = run(script).await;

    assert_eq!(result, Ok(()));
    assert!(seen.asked_for_x16);
    assert_eq!(seen.pages, [POOL]);
}

#[tokio::test]
async fn says_when_debugserver_wont_attach() {
    let (result, seen) = run(Script { refuse_attach: true, ..Script::default() }).await;

    assert_eq!(result, Err(Failure::AttachRefused("E01".into())));
    assert!(!seen.detached);
}

#[tokio::test]
async fn says_when_the_connection_drops_while_the_app_is_stopped() {
    let (result, seen) = run(steps([Step::Brk { x16: PREPARE_REGION, x0: POOL, x1: PAGE }, Step::Close])).await;

    assert_eq!(result, Err(Failure::ConnectionLost));
    assert!(!seen.detached);
}

#[tokio::test]
async fn says_when_the_app_quits() {
    let (result, _) = run(steps([Step::Exit])).await;

    assert_eq!(result, Err(Failure::AppExited));
}

#[tokio::test(start_paused = true)]
async fn lets_the_app_go_when_it_never_asks_to_detach() {
    let (result, seen) = run(steps([Step::Hang])).await;

    assert_eq!(result, Err(Failure::TimedOut));
    assert!(seen.interrupted && seen.detached);
}

#[test]
fn frames_packets_with_their_checksum() {
    assert_eq!(packet("OK"), "$OK#9a");
    assert_eq!(packet("QStartNoAckMode"), "$QStartNoAckMode#b0");
}

#[test]
fn reads_registers_as_little_endian_hex() {
    assert_eq!(le_hex(0x1_0000_4004), "0440000001000000");
    assert_eq!(from_le_hex("0440000001000000"), Some(0x1_0000_4004));
    assert_eq!(from_le_hex("0440"), None);
}

#[test]
fn skips_the_apps_output() {
    assert!(is_output("O48656c6c6f"));
    assert!(!is_output("OK"));
}
