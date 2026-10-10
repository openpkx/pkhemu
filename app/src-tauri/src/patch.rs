mod bps;
mod ips;
#[cfg(test)]
pub(crate) mod tests;
mod ups;
mod xdelta;

use std::io::{Cursor, Read, Seek, Write};

#[derive(Clone, Copy, Debug, PartialEq)]
pub enum System {
    GameBoy,
    GameBoyAdvance,
    Ds,
    N64,
}

impl System {
    pub fn max_rom_size(self) -> u64 {
        match self {
            System::GameBoy => 8 << 20,
            System::GameBoyAdvance => 32 << 20,
            System::Ds => 512 << 20,
            System::N64 => 64 << 20,
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub enum Format {
    Ips,
    Ups,
    Bps,
    Xdelta,
}

#[derive(Debug, PartialEq)]
pub struct Patched {
    pub format: Format,
    pub base_checked: bool,
}

#[derive(Debug, PartialEq)]
pub enum PatchError {
    WrongBase { expected_crc32: Option<u32> },
    UnknownFormat,
    Malformed,
    TooBig,
    Io(String),
}

impl From<std::io::Error> for PatchError {
    fn from(error: std::io::Error) -> Self {
        PatchError::Io(error.to_string())
    }
}

pub fn detect(magic: &[u8]) -> Option<Format> {
    if magic.starts_with(b"PATCH") {
        Some(Format::Ips)
    } else if magic.starts_with(b"UPS1") {
        Some(Format::Ups)
    } else if magic.starts_with(b"BPS1") {
        Some(Format::Bps)
    } else if magic.starts_with(&oxidelta::vcdiff::VCDIFF_MAGIC) {
        Some(Format::Xdelta)
    } else {
        None
    }
}

// Patches are made against big-endian .z64 dumps, so .v64 and .n64 ROMs are put in that order first.
pub fn apply(
    patch: impl Read,
    mut base: impl Read + Seek,
    output: &mut impl Write,
    system: System,
) -> Result<Patched, PatchError> {
    if system != System::N64 {
        return apply_to(patch, base, output, system);
    }
    let mut rom = Vec::new();
    base.read_to_end(&mut rom)?;
    let rom = rom_art::n64_big_endian(&rom).unwrap_or(rom);
    apply_to(patch, Cursor::new(rom), output, system)
}

fn apply_to(
    mut patch: impl Read,
    mut base: impl Read + Seek,
    output: &mut impl Write,
    system: System,
) -> Result<Patched, PatchError> {
    let mut magic = Vec::new();
    patch.by_ref().take(5).read_to_end(&mut magic)?;
    let format = detect(&magic).ok_or(PatchError::UnknownFormat)?;
    let patch = Cursor::new(magic).chain(patch);
    let cap = system.max_rom_size();
    let decode: fn(&[u8], &[u8], u64) -> Result<Vec<u8>, PatchError> = match format {
        Format::Ips => ips::apply,
        Format::Ups => ups::apply,
        Format::Bps => bps::apply,
        Format::Xdelta => {
            let base_checked = xdelta::apply(patch, base, output, cap)?;
            return Ok(Patched { format, base_checked });
        }
    };
    let patch = read_patch(patch, cap)?;
    let mut rom = Vec::new();
    base.read_to_end(&mut rom)?;
    let patched = decode(&patch, &rom, cap)?;
    if patched.len() as u64 > cap {
        return Err(PatchError::TooBig);
    }
    output.write_all(&patched)?;
    Ok(Patched { format, base_checked: format != Format::Ips })
}

// No real IPS, UPS or BPS patch is much bigger than the ROM it builds.
fn read_patch(patch: impl Read, cap: u64) -> Result<Vec<u8>, PatchError> {
    let limit = 2 * cap;
    let mut bytes = Vec::new();
    patch.take(limit + 1).read_to_end(&mut bytes)?;
    if bytes.len() as u64 > limit {
        return Err(PatchError::TooBig);
    }
    Ok(bytes)
}

struct Reader<'a> {
    bytes: &'a [u8],
    at: usize,
}

impl<'a> Reader<'a> {
    fn done(&self) -> bool {
        self.at == self.bytes.len()
    }

    fn byte(&mut self) -> Result<u8, PatchError> {
        let byte = *self.bytes.get(self.at).ok_or(PatchError::Malformed)?;
        self.at += 1;
        Ok(byte)
    }

    fn number(&mut self) -> Result<u64, PatchError> {
        let mut number = 0u64;
        let mut shift = 0;
        loop {
            let byte = self.byte()?;
            number = 1u64
                .checked_shl(shift)
                .and_then(|unit| unit.checked_mul((byte & 0x7F) as u64))
                .and_then(|part| number.checked_add(part))
                .ok_or(PatchError::Malformed)?;
            if byte & 0x80 != 0 {
                return Ok(number);
            }
            shift += 7;
            number = 1u64.checked_shl(shift).and_then(|unit| number.checked_add(unit)).ok_or(PatchError::Malformed)?;
        }
    }

    fn take(&mut self, len: u64) -> Result<&'a [u8], PatchError> {
        let end = usize::try_from(len).ok().and_then(|len| self.at.checked_add(len));
        let bytes = end.and_then(|end| self.bytes.get(self.at..end)).ok_or(PatchError::Malformed)?;
        self.at += bytes.len();
        Ok(bytes)
    }
}

struct Header<'a> {
    body: Reader<'a>,
    base_size: u64,
    target_size: u64,
    base_crc32: u32,
    target_crc32: u32,
}

impl<'a> Header<'a> {
    fn read(patch: &'a [u8]) -> Result<Header<'a>, PatchError> {
        let footer = patch.len().checked_sub(12).filter(|&at| at >= 4).ok_or(PatchError::Malformed)?;
        let crc = |at: usize| u32::from_le_bytes(patch[at..at + 4].try_into().unwrap());
        if crc32fast::hash(&patch[..footer + 8]) != crc(footer + 8) {
            return Err(PatchError::Malformed);
        }
        let mut body = Reader { bytes: &patch[..footer], at: 4 };
        let base_size = body.number()?;
        let target_size = body.number()?;
        Ok(Header { body, base_size, target_size, base_crc32: crc(footer), target_crc32: crc(footer + 4) })
    }

    fn check(&self, base: &[u8], cap: u64) -> Result<(), PatchError> {
        if self.base_size != base.len() as u64 || crc32fast::hash(base) != self.base_crc32 {
            return Err(PatchError::WrongBase { expected_crc32: Some(self.base_crc32) });
        }
        if self.target_size > cap {
            return Err(PatchError::TooBig);
        }
        Ok(())
    }
}
