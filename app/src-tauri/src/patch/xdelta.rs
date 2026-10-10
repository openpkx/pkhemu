use super::PatchError;
use oxidelta::vcdiff::code_table::Instruction;
use oxidelta::vcdiff::decoder::{decode_window_into, DecodeError, SourceProvider, WindowSections};
use oxidelta::vcdiff::header::{
    WindowHeader, HARD_MAX_WINSIZE, VCD_ADDRCOMP, VCD_ADLER32, VCD_APPHEADER, VCD_CODETABLE, VCD_DATACOMP, VCD_INSTCOMP, VCD_LZMA_ID, VCD_SECONDARY, VCD_SOURCE,
    VCD_TARGET,
};
use oxidelta::vcdiff::varint::stream_read_u64;
use oxidelta::vcdiff::InstructionIterator;
use std::io::{BufReader, ErrorKind, Read, Seek, SeekFrom, Write};

struct Base<R> {
    rom: BufReader<R>,
    at: u64,
}

impl<R: Read + Seek> SourceProvider for Base<R> {
    fn read_source(&mut self, offset: u64, buf: &mut [u8]) -> Result<usize, DecodeError> {
        if offset != self.at {
            self.rom.seek_relative(offset as i64 - self.at as i64)?;
        }
        let read = std::io::copy(&mut self.rom.by_ref().take(buf.len() as u64), &mut &mut *buf)?;
        self.at = offset + read;
        Ok(read as usize)
    }

    fn source_len(&self) -> Option<u64> {
        None
    }
}

fn malformed(error: std::io::Error) -> PatchError {
    match error.kind() {
        ErrorKind::UnexpectedEof | ErrorKind::InvalidData => PatchError::Malformed,
        _ => error.into(),
    }
}

fn byte(patch: &mut impl Read) -> Result<u8, PatchError> {
    let mut byte = [0];
    patch.read_exact(&mut byte).map_err(malformed)?;
    Ok(byte[0])
}

fn number(patch: &mut impl Read) -> Result<u64, PatchError> {
    stream_read_u64(patch).map_err(malformed)
}

fn section(patch: &mut impl Read, len: u64) -> Result<Vec<u8>, PatchError> {
    let mut bytes = Vec::new();
    patch.take(len).read_to_end(&mut bytes)?;
    if (bytes.len() as u64) < len {
        return Err(PatchError::Malformed);
    }
    Ok(bytes)
}

fn read_file_header(patch: &mut impl Read) -> Result<Option<u8>, PatchError> {
    let mut magic = [0; 4];
    patch.read_exact(&mut magic).map_err(malformed)?;
    let indicator = byte(patch)?;
    if indicator & !(VCD_SECONDARY | VCD_CODETABLE | VCD_APPHEADER) != 0 {
        return Err(PatchError::Malformed);
    }
    if indicator & VCD_CODETABLE != 0 {
        return Err(PatchError::UnknownFormat);
    }
    let secondary = if indicator & VCD_SECONDARY != 0 { Some(byte(patch)?) } else { None };
    if secondary.is_some_and(|id| id != VCD_LZMA_ID) {
        return Err(PatchError::UnknownFormat);
    }
    if indicator & VCD_APPHEADER != 0 {
        let len = number(patch)?;
        if std::io::copy(&mut patch.take(len), &mut std::io::sink())? < len {
            return Err(PatchError::Malformed);
        }
    }
    Ok(secondary)
}

// oxidelta's own header readers allocate whatever lengths the patch claims.
fn read_window_header(patch: &mut impl Read) -> Result<Option<WindowHeader>, PatchError> {
    let mut indicator = [0];
    if patch.read(&mut indicator)? == 0 {
        return Ok(None);
    }
    let win_ind = indicator[0];
    if win_ind & !(VCD_SOURCE | VCD_ADLER32) != 0 {
        return Err(if win_ind & VCD_TARGET != 0 { PatchError::UnknownFormat } else { PatchError::Malformed });
    }
    let (copy_window_len, copy_window_offset) =
        if win_ind & VCD_SOURCE != 0 { (number(patch)?, number(patch)?) } else { (0, 0) };
    let enc_len = number(patch)?;
    let target_window_len = number(patch)?;
    if target_window_len > HARD_MAX_WINSIZE {
        return Err(PatchError::Malformed);
    }
    let del_ind = byte(patch)?;
    if del_ind & !0x07 != 0 {
        return Err(PatchError::Malformed);
    }
    let (data_len, inst_len, addr_len) = (number(patch)?, number(patch)?, number(patch)?);
    let adler32 = if win_ind & VCD_ADLER32 != 0 {
        let mut checksum = [0; 4];
        patch.read_exact(&mut checksum).map_err(malformed)?;
        Some(u32::from_be_bytes(checksum))
    } else {
        None
    };
    Ok(Some(WindowHeader {
        win_ind,
        copy_window_len,
        copy_window_offset,
        enc_len,
        target_window_len,
        del_ind,
        data_len,
        inst_len,
        addr_len,
        adler32,
    }))
}

struct Limited {
    bytes: Vec<u8>,
    limit: usize,
}

impl Write for Limited {
    fn write(&mut self, bytes: &[u8]) -> std::io::Result<usize> {
        if self.bytes.len() + bytes.len() > self.limit {
            return Err(ErrorKind::FileTooLarge.into());
        }
        self.bytes.extend_from_slice(bytes);
        Ok(bytes.len())
    }

    fn flush(&mut self) -> std::io::Result<()> {
        Ok(())
    }
}

// oxidelta decompresses without a limit, so a few bytes of LZMA could fill the memory. No section
// needs more than a few bytes per byte of the window it builds.
fn decompress(section: Vec<u8>, header: &WindowHeader, flag: u8) -> Result<Vec<u8>, PatchError> {
    if header.del_ind & flag == 0 {
        return Ok(section);
    }
    let limit = 16 * header.target_window_len as usize + 64;
    let options = lzma_rs::decompress::Options { memlimit: Some(limit), ..Default::default() };
    let mut output = Limited { bytes: Vec::new(), limit };
    lzma_rs::lzma_decompress_with_options(&mut &section[..], &mut output, &options)
        .map_err(|_| PatchError::Malformed)?;
    Ok(output.bytes)
}

// oxidelta grows the window by whatever each instruction asks for, so the sizes are summed first.
fn check_instructions(header: &WindowHeader, inst: &[u8], addr: &[u8]) -> Result<(), PatchError> {
    let mut total = 0u64;
    for instruction in InstructionIterator::new(inst, addr, header.copy_window_len) {
        let (Instruction::Add { len } | Instruction::Copy { len, .. } | Instruction::Run { len }) =
            instruction.map_err(|_| PatchError::Malformed)?;
        total += len as u64;
        if total > header.target_window_len {
            return Err(PatchError::Malformed);
        }
    }
    Ok(())
}

pub fn apply(
    patch: impl Read,
    mut base: impl Read + Seek,
    output: &mut impl Write,
    cap: u64,
) -> Result<bool, PatchError> {
    let mut patch = BufReader::new(patch);
    let secondary = read_file_header(&mut patch)?;
    let base_len = base.seek(SeekFrom::End(0))?;
    base.rewind()?;
    let mut base = Base { rom: BufReader::new(base), at: 0 };
    let (mut window, mut copies) = (Vec::new(), Vec::new());
    let mut written = 0u64;
    let mut checked = true;
    while let Some(header) = read_window_header(&mut patch)? {
        let copy_end = header.copy_window_offset.checked_add(header.copy_window_len);
        if copy_end.is_none_or(|end| end > base_len) {
            return Err(PatchError::WrongBase { expected_crc32: None });
        }
        written += header.target_window_len;
        if written > cap {
            return Err(PatchError::TooBig);
        }
        if header.del_ind != 0 && secondary.is_none() {
            return Err(PatchError::Malformed);
        }
        let data = decompress(section(&mut patch, header.data_len)?, &header, VCD_DATACOMP)?;
        let inst = decompress(section(&mut patch, header.inst_len)?, &header, VCD_INSTCOMP)?;
        let addr = decompress(section(&mut patch, header.addr_len)?, &header, VCD_ADDRCOMP)?;
        checked &= header.adler32.is_some();
        check_instructions(&header, &inst, &addr)?;
        window.clear();
        let sections = WindowSections { data: &data, inst: &inst, addr: &addr };
        decode_window_into(&header, sections, &mut base, true, &mut copies, &mut window).map_err(|error| match error {
            DecodeError::ChecksumMismatch { .. } => PatchError::WrongBase { expected_crc32: None },
            DecodeError::Io(error) => error.into(),
            _ => PatchError::Malformed,
        })?;
        output.write_all(&window)?;
    }
    Ok(checked)
}
