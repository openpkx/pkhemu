use super::{PatchError, Reader};

const EOF: usize = 0x454F46;

fn be(bytes: &[u8]) -> usize {
    bytes.iter().fold(0, |value, &byte| value << 8 | byte as usize)
}

pub fn apply(patch: &[u8], base: &[u8], cap: u64) -> Result<Vec<u8>, PatchError> {
    let mut body = Reader { bytes: patch, at: 5 };
    let mut rom = base.to_vec();
    loop {
        let offset = be(body.take(3)?);
        if offset == EOF {
            break;
        }
        let (len, run) = match be(body.take(2)?) {
            0 => (be(body.take(2)?), Some(body.byte()?)),
            len => (len, None),
        };
        if len == 0 {
            return Err(PatchError::Malformed);
        }
        let end = offset + len;
        if end as u64 > cap {
            return Err(PatchError::TooBig);
        }
        if end > rom.len() {
            rom.resize(end, 0);
        }
        match run {
            Some(byte) => rom[offset..end].fill(byte),
            None => rom[offset..end].copy_from_slice(body.take(len as u64)?),
        }
    }
    if !body.done() {
        rom.truncate(be(body.take(3)?));
    }
    if !body.done() {
        return Err(PatchError::Malformed);
    }
    Ok(rom)
}
