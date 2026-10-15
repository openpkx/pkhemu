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

pub fn inspect(mut patch: impl Read) -> std::io::Result<Option<Patched>> {
    let mut magic = Vec::new();
    patch.by_ref().take(5).read_to_end(&mut magic)?;
    let Some(format) = detect(&magic) else {
        return Ok(None);
    };
    let base_checked = match format {
        Format::Ips => false,
        Format::Ups | Format::Bps => true,
        Format::Xdelta => xdelta::checksummed(Cursor::new(magic).chain(patch)),
    };
    Ok(Some(Patched { format, base_checked }))
}

trait Rom: Read + Seek {}

impl<T: Read + Seek> Rom for T {}

// Patches are made against big-endian .z64 dumps, so .v64 and .n64 ROMs are put in that order first.
fn in_patch_order<'a>(mut base: impl Read + Seek + 'a, system: System) -> std::io::Result<Box<dyn Rom + 'a>> {
    if system != System::N64 {
        return Ok(Box::new(base));
    }
    let mut rom = Vec::new();
    base.read_to_end(&mut rom)?;
    Ok(Box::new(Cursor::new(rom_art::n64_big_endian(&rom).unwrap_or(rom))))
}

pub fn apply(
    patch: impl Read,
    base: impl Read + Seek,
    output: &mut impl Write,
    system: System,
) -> Result<Patched, PatchError> {
    apply_to(patch, in_patch_order(base, system)?, output, system)
}

#[derive(Debug)]
pub enum Fit {
    Crc32 { size: u64, crc32: u32 },
    FirstWindow(xdelta::FirstWindow),
    Unchecked,
}

impl Fit {
    pub fn checked(&self) -> bool {
        !matches!(self, Fit::Unchecked)
    }

    pub fn fits(&self, base: impl Read + Seek, system: System) -> Result<bool, PatchError> {
        match self {
            Fit::Crc32 { size, crc32 } => Ok(base_crc32(base, system)? == (*size, *crc32)),
            Fit::FirstWindow(window) => window.fits(in_patch_order(base, system)?),
            Fit::Unchecked => Ok(true),
        }
    }
}

pub fn fit(mut patch: impl Read) -> Result<Fit, PatchError> {
    let mut magic = Vec::new();
    patch.by_ref().take(5).read_to_end(&mut magic)?;
    let format = detect(&magic).ok_or(PatchError::UnknownFormat)?;
    let patch = Cursor::new(magic).chain(patch);
    match format {
        Format::Ips => Ok(Fit::Unchecked),
        Format::Ups | Format::Bps => {
            let patch = read_patch(patch, System::Ds.max_rom_size())?;
            let header = Header::read(&patch)?;
            Ok(Fit::Crc32 { size: header.base_size, crc32: header.base_crc32 })
        }
        Format::Xdelta => Ok(xdelta::first_window(patch)?.map_or(Fit::Unchecked, Fit::FirstWindow)),
    }
}

pub fn base_crc32(base: impl Read + Seek, system: System) -> std::io::Result<(u64, u32)> {
    let mut base = in_patch_order(base, system)?;
    let mut hasher = crc32fast::Hasher::new();
    let mut buffer = vec![0; 1 << 16];
    let mut size = 0;
    loop {
        let read = base.read(&mut buffer)?;
        if read == 0 {
            return Ok((size, hasher.finalize()));
        }
        hasher.update(&buffer[..read]);
        size += read as u64;
    }
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
