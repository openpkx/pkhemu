use super::{Header, PatchError};

// Not the `ups` crate: it misreads offsets whose encoding starts with a zero byte.
pub fn apply(patch: &[u8], base: &[u8], cap: u64) -> Result<Vec<u8>, PatchError> {
    let mut header = Header::read(patch)?;
    header.check(base, cap)?;
    let mut rom = base.to_vec();
    rom.resize(header.target_size as usize, 0);
    let mut at = 0u64;
    let body = &mut header.body;
    while !body.done() {
        at = at.saturating_add(body.number()?);
        loop {
            let xor = body.byte()?;
            if let Some(byte) = usize::try_from(at).ok().and_then(|at| rom.get_mut(at)) {
                *byte ^= xor;
            }
            at = at.saturating_add(1);
            if xor == 0 {
                break;
            }
        }
    }
    if crc32fast::hash(&rom) != header.target_crc32 {
        return Err(PatchError::Malformed);
    }
    Ok(rom)
}
