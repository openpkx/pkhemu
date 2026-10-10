use super::{Header, PatchError};

fn moved(at: u64, encoded: u64) -> Result<u64, PatchError> {
    let distance = encoded >> 1;
    let moved = if encoded & 1 == 0 { at.checked_add(distance) } else { at.checked_sub(distance) };
    moved.ok_or(PatchError::Malformed)
}

fn slice(rom: &[u8], start: u64, len: usize) -> Result<&[u8], PatchError> {
    let start = usize::try_from(start).map_err(|_| PatchError::Malformed)?;
    start.checked_add(len).and_then(|end| rom.get(start..end)).ok_or(PatchError::Malformed)
}

pub fn apply(patch: &[u8], base: &[u8], cap: u64) -> Result<Vec<u8>, PatchError> {
    let mut header = Header::read(patch)?;
    header.check(base, cap)?;
    let body = &mut header.body;
    let metadata = body.number()?;
    body.take(metadata)?;
    let target_size = header.target_size as usize;
    let mut rom = Vec::with_capacity(target_size);
    let (mut source, mut target) = (0u64, 0u64);
    while !body.done() {
        let action = body.number()?;
        let len = usize::try_from((action >> 2) + 1)
            .ok()
            .filter(|&len| len <= target_size - rom.len())
            .ok_or(PatchError::Malformed)?;
        match action & 3 {
            0 => rom.extend_from_slice(slice(base, rom.len() as u64, len)?),
            1 => rom.extend_from_slice(body.take(len as u64)?),
            2 => {
                source = moved(source, body.number()?)?;
                rom.extend_from_slice(slice(base, source, len)?);
                source += len as u64;
            }
            _ => {
                target = moved(target, body.number()?)?;
                if target >= rom.len() as u64 {
                    return Err(PatchError::Malformed);
                }
                for at in target as usize..target as usize + len {
                    rom.push(rom[at]);
                }
                target += len as u64;
            }
        }
    }
    if rom.len() != target_size || crc32fast::hash(&rom) != header.target_crc32 {
        return Err(PatchError::Malformed);
    }
    Ok(rom)
}
