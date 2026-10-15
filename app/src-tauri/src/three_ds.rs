pub mod update;

use std::io::{self, Read, Seek, SeekFrom};
use std::path::{Path, PathBuf};

const MEDIA_UNIT: u64 = 0x200;
const KEY_SLOT: u64 = 0x18B;
const FLAGS: u64 = 0x18F;
const NO_CRYPTO: u8 = 0x04;
const CIA_HEADER_SIZE: u32 = 0x2020;
const CONTENT_ENCRYPTED: u16 = 0x1;
const BASE_GAME: u32 = 0x00040000;
const UPDATE: u32 = 0x0004000E;
const DLC: u32 = 0x0004008C;
const NO_ID: &str = "00000000000000000000000000000000";

// A CIA is an installer, so the import writes the game inside it and the games folder never holds one.
pub fn is_import(name: &str) -> bool {
    crate::rom::is_3ds(name)
        || Path::new(name).extension().is_some_and(|extension| extension.eq_ignore_ascii_case("cia"))
}

/// Where Azahar keeps a title on its virtual SD card.
pub fn sd_title_dir(azahar_dir: &Path, title_id: u64) -> PathBuf {
    let title = format!("title/{:08x}/{:08x}", title_id >> 32, title_id as u32);
    azahar_dir.join("sdmc/Nintendo 3DS").join(NO_ID).join(NO_ID).join(title)
}

#[derive(Debug, PartialEq)]
pub enum Refused {
    Encrypted,
    FlaggedEncrypted,
    Update,
    Dlc,
    NotAGame,
    Unreadable(String),
}

impl Refused {
    pub fn message(&self, game: &str) -> String {
        match self {
            Refused::Encrypted => format!("{game} is encrypted. pkhemu plays decrypted files only."),
            Refused::FlaggedEncrypted => {
                format!("{game}'s header says it's encrypted. Add it with Import files instead.")
            }
            Refused::Update => format!("{game} is an update for a game that isn't in pkhemu. Add the game first."),
            Refused::Dlc => format!("{game} is DLC, which pkhemu doesn't play."),
            Refused::NotAGame => format!("{game} isn't a 3DS game pkhemu can play."),
            Refused::Unreadable(e) => format!("{game}: {e}"),
        }
    }
}

impl From<io::Error> for Refused {
    fn from(e: io::Error) -> Refused {
        Refused::Unreadable(e.to_string())
    }
}

fn u16_le(bytes: &[u8], at: usize) -> u16 {
    u16::from_le_bytes(bytes[at..at + 2].try_into().unwrap())
}

fn u32_le(bytes: &[u8], at: usize) -> u32 {
    u32::from_le_bytes(bytes[at..at + 4].try_into().unwrap())
}

fn u64_le(bytes: &[u8], at: usize) -> u64 {
    u64::from_le_bytes(bytes[at..at + 8].try_into().unwrap())
}

fn u16_be(bytes: &[u8], at: usize) -> u16 {
    u16::from_be_bytes(bytes[at..at + 2].try_into().unwrap())
}

fn u32_be(bytes: &[u8], at: usize) -> u32 {
    u32::from_be_bytes(bytes[at..at + 4].try_into().unwrap())
}

fn u64_be(bytes: &[u8], at: usize) -> u64 {
    u64::from_be_bytes(bytes[at..at + 8].try_into().unwrap())
}

fn read_at(file: &mut (impl Read + Seek), at: u64, len: usize) -> io::Result<Vec<u8>> {
    file.seek(SeekFrom::Start(at))?;
    let mut bytes = Vec::with_capacity(len);
    file.take(len as u64).read_to_end(&mut bytes)?;
    if bytes.len() < len {
        return Err(io::ErrorKind::UnexpectedEof.into());
    }
    Ok(bytes)
}

enum Kind {
    Homebrew,
    Ncsd,
    Ncch,
    Cia,
}

fn kind(start: &[u8]) -> Result<Kind, Refused> {
    let magic = start.get(0x100..0x104);
    if start.starts_with(b"3DSX") {
        Ok(Kind::Homebrew)
    } else if magic == Some(b"NCSD") {
        Ok(Kind::Ncsd)
    } else if magic == Some(b"NCCH") {
        Ok(Kind::Ncch)
    } else if start.len() >= 0x20 && u32_le(start, 0) == CIA_HEADER_SIZE && u16_le(start, 4) == 0 {
        Ok(Kind::Cia)
    } else {
        Err(Refused::NotAGame)
    }
}

fn start(file: &mut (impl Read + Seek)) -> io::Result<Vec<u8>> {
    file.rewind()?;
    let mut start = Vec::with_capacity(0x200);
    file.take(0x200).read_to_end(&mut start)?;
    Ok(start)
}

fn ncch_header(file: &mut (impl Read + Seek), base: u64) -> Result<Vec<u8>, Refused> {
    let header = read_at(file, base, 0x200)?;
    match &header[0x100..0x104] == b"NCCH" {
        true => Ok(header),
        false => Err(Refused::NotAGame),
    }
}

// Encrypted names read as noise, so ten names of printable ASCII padded with zeros mean the ExeFS is plain.
fn plain_exefs_names(header: &[u8]) -> bool {
    let named = |entry: &[u8]| {
        let name = &entry[..8];
        let length = name.iter().position(|&byte| byte == 0).unwrap_or(8);
        name[..length].iter().all(|byte| byte.is_ascii_graphic()) && name[length..].iter().all(|&byte| byte == 0)
    };
    header[..8] != [0; 8] && header[..0xA0].chunks(0x10).all(named)
}

fn is_plain(file: &mut (impl Read + Seek), base: u64, header: &[u8]) -> io::Result<bool> {
    let (exefs, exefs_size) = (u32_le(header, 0x1A0) as u64, u32_le(header, 0x1A4));
    let (romfs, romfs_size) = (u32_le(header, 0x1B0) as u64, u32_le(header, 0x1B4));
    if exefs_size > 0 {
        return Ok(plain_exefs_names(&read_at(file, base + exefs * MEDIA_UNIT, 0xA0)?));
    }
    if romfs_size > 0 {
        return Ok(read_at(file, base + romfs * MEDIA_UNIT, 4)? == b"IVFC");
    }
    Ok(true)
}

// Some decrypted dumps leave the NoCrypto flag clear, which Azahar reads as encrypted.
fn no_crypto_fix(file: &mut (impl Read + Seek), base: u64, header: &[u8]) -> Result<Vec<(u64, u8)>, Refused> {
    let flags = header[FLAGS as usize];
    if flags & NO_CRYPTO != 0 {
        return Ok(Vec::new());
    }
    match is_plain(file, base, header)? {
        true => Ok(vec![(base + KEY_SLOT, 0), (base + FLAGS, flags | NO_CRYPTO)]),
        false => Err(Refused::Encrypted),
    }
}

/// The bytes an import writes: `len` bytes from `start`, with single bytes replaced at absolute offsets.
struct Plan {
    start: u64,
    len: u64,
    fixes: Vec<(u64, u8)>,
}

// The cartridge's other partitions, like the manual and the update data, can stay encrypted in a decrypted dump.
fn plan_ncsd(file: &mut (impl Read + Seek), start: &[u8]) -> Result<Plan, Refused> {
    if u32_le(start, 0x124) == 0 {
        return Err(Refused::NotAGame);
    }
    let len = file.seek(SeekFrom::End(0))?;
    let mut fixes = Vec::new();
    for partition in 0..8 {
        let offset = u32_le(start, 0x120 + partition * 8) as u64 * MEDIA_UNIT;
        if u32_le(start, 0x124 + partition * 8) == 0 {
            continue;
        }
        let header = ncch_header(file, offset);
        match partition {
            0 => fixes.extend(no_crypto_fix(file, offset, &header?)?),
            _ => fixes.extend(header.and_then(|header| no_crypto_fix(file, offset, &header)).unwrap_or_default()),
        }
    }
    Ok(Plan { start: 0, len, fixes })
}

fn plan_ncch(file: &mut (impl Read + Seek), base: u64, len: u64) -> Result<Plan, Refused> {
    let header = ncch_header(file, base)?;
    let fixes = no_crypto_fix(file, base, &header)?;
    Ok(Plan { start: base, len, fixes })
}

fn align(offset: u64) -> u64 {
    offset.div_ceil(64) * 64
}

fn signature_size(kind: u32) -> Option<usize> {
    match kind {
        0x10000 | 0x10003 => Some(0x200 + 0x3C),
        0x10001 | 0x10004 => Some(0x100 + 0x3C),
        0x10002 | 0x10005 => Some(0x3C + 0x40),
        _ => None,
    }
}

struct Content {
    id: u32,
    index: u16,
    kind: u16,
    offset: u64,
    size: u64,
}

struct Cia {
    title_id: u64,
    version: u16,
    tmd: Vec<u8>,
    contents: Vec<Content>,
}

// Contents follow the TMD in the order its chunk records list them.
fn read_cia(file: &mut (impl Read + Seek), start: &[u8]) -> Result<Cia, Refused> {
    let (certs, ticket, tmd_size) = (u32_le(start, 0x8) as u64, u32_le(start, 0xC) as u64, u32_le(start, 0x10));
    let tmd_at = align(align(align(CIA_HEADER_SIZE as u64) + certs) + ticket);
    let mut offset = align(tmd_at + tmd_size as u64);
    let mut tmd = read_at(file, tmd_at, (tmd_size as usize).min(0x10000))?;
    let header = signature_size(u32_be(&tmd, 0)).ok_or(Refused::NotAGame)? + 4;
    if tmd.len() < header + 0xC4 + 0x900 {
        return Err(Refused::NotAGame);
    }
    let title_id = u64_be(&tmd, header + 0x4C);
    let version = u16_be(&tmd, header + 0x9C);
    let count = u16_be(&tmd, header + 0x9E) as usize;
    let chunks = header + 0xC4 + 0x900;
    if tmd.len() < chunks + count * 0x30 {
        return Err(Refused::NotAGame);
    }
    tmd.truncate(chunks + count * 0x30);
    let mut contents = Vec::with_capacity(count);
    for at in (0..count).map(|i| chunks + i * 0x30) {
        let size = u64_be(&tmd, at + 8);
        let (id, index, kind) = (u32_be(&tmd, at), u16_be(&tmd, at + 4), u16_be(&tmd, at + 6));
        contents.push(Content { id, index, kind, offset, size });
        offset += size;
    }
    if contents.iter().any(|content| content.kind & CONTENT_ENCRYPTED != 0) {
        return Err(Refused::Encrypted);
    }
    Ok(Cia { title_id, version, tmd, contents })
}

fn plan_cia(file: &mut (impl Read + Seek), start: &[u8]) -> Result<Plan, Refused> {
    let cia = read_cia(file, start)?;
    match (cia.title_id >> 32) as u32 {
        BASE_GAME => {}
        UPDATE => return Err(Refused::Update),
        DLC => return Err(Refused::Dlc),
        _ => return Err(Refused::NotAGame),
    }
    let main = cia.contents.iter().find(|content| content.index == 0).ok_or(Refused::NotAGame)?;
    plan_ncch(file, main.offset, main.size)
}

/// Works out what importing `file` writes to the games folder, or why it can't be imported.
fn plan(file: &mut (impl Read + Seek)) -> Result<Plan, Refused> {
    let start = start(file)?;
    match kind(&start)? {
        Kind::Homebrew => Ok(Plan { start: 0, len: file.seek(SeekFrom::End(0))?, fixes: Vec::new() }),
        Kind::Ncsd => plan_ncsd(file, &start),
        Kind::Ncch => {
            let len = file.seek(SeekFrom::End(0))?;
            plan_ncch(file, 0, len)
        }
        Kind::Cia => plan_cia(file, &start),
    }
}

pub struct Fixed<R> {
    inner: R,
    start: u64,
    len: u64,
    at: u64,
    fixes: Vec<(u64, u8)>,
}

impl<R: Read> Read for Fixed<R> {
    fn read(&mut self, buf: &mut [u8]) -> io::Result<usize> {
        let left = self.len.saturating_sub(self.at).min(buf.len() as u64) as usize;
        let read = self.inner.read(&mut buf[..left])?;
        let from = self.start + self.at;
        for &(offset, byte) in &self.fixes {
            if (from..from + read as u64).contains(&offset) {
                buf[(offset - from) as usize] = byte;
            }
        }
        self.at += read as u64;
        Ok(read)
    }
}

impl<R: Seek> Seek for Fixed<R> {
    fn seek(&mut self, pos: SeekFrom) -> io::Result<u64> {
        let at = match pos {
            SeekFrom::Start(at) => Some(at),
            SeekFrom::End(delta) => self.len.checked_add_signed(delta),
            SeekFrom::Current(delta) => self.at.checked_add_signed(delta),
        };
        let at = at.ok_or(io::ErrorKind::InvalidInput)?;
        self.inner.seek(SeekFrom::Start(self.start + at))?;
        self.at = at;
        Ok(at)
    }
}

/// The bytes importing `file` writes, read from `file` itself, which stays unchanged.
pub fn imported<R: Read + Seek>(mut file: R) -> Result<Fixed<R>, Refused> {
    let Plan { start, len, fixes } = plan(&mut file)?;
    file.seek(SeekFrom::Start(start))?;
    Ok(Fixed { inner: file, start, len, at: 0, fixes })
}

/// The title id in a game's NCCH header, refusing a game whose header says it's encrypted.
pub fn title_id(file: &mut (impl Read + Seek)) -> Result<Option<u64>, Refused> {
    let start = start(file)?;
    let base = match kind(&start)? {
        Kind::Homebrew => return Ok(None),
        Kind::Ncsd => u32_le(&start, 0x120) as u64 * MEDIA_UNIT,
        Kind::Ncch => 0,
        Kind::Cia => return Err(Refused::NotAGame),
    };
    let header = ncch_header(file, base)?;
    match header[FLAGS as usize] & NO_CRYPTO {
        0 => Err(Refused::FlaggedEncrypted),
        _ => Ok(Some(u64_le(&header, 0x118))),
    }
}

#[cfg(test)]
pub mod tests {
    use super::*;
    use std::io::Cursor;

    const X: u64 = 0x0004000000055D00;

    fn put(bytes: &mut Vec<u8>, at: usize, value: &[u8]) {
        if bytes.len() < at + value.len() {
            bytes.resize(at + value.len(), 0);
        }
        bytes[at..at + value.len()].copy_from_slice(value);
    }

    // An NCCH with an ExeFS holding .code and icon, or noise where an encrypted one would be.
    pub fn ncch(title_id: u64, no_crypto: bool, plain: bool) -> Vec<u8> {
        let mut ncch = vec![0; 0x200];
        put(&mut ncch, 0x100, b"NCCH");
        put(&mut ncch, 0x118, &title_id.to_le_bytes());
        put(&mut ncch, 0x150, b"CTR-P-TEST");
        put(&mut ncch, KEY_SLOT as usize, &[0x01]);
        put(&mut ncch, FLAGS as usize, &[if no_crypto { NO_CRYPTO } else { 0 }]);
        put(&mut ncch, 0x1A0, &1u32.to_le_bytes());
        put(&mut ncch, 0x1A4, &1u32.to_le_bytes());
        let exefs = match plain {
            true => [b".code\0\0\0".as_slice(), &[0; 8], b"icon\0\0\0\0", &[0; 8]].concat(),
            false => (0..0x20u8).map(|i| i.wrapping_mul(97).wrapping_add(13) | 0x80).collect(),
        };
        put(&mut ncch, 0x200, &exefs);
        put(&mut ncch, 0x3FF, &[0]);
        ncch
    }

    fn ncsd(partitions: &[Vec<u8>]) -> Vec<u8> {
        let mut ncsd = vec![0; 0x4000];
        put(&mut ncsd, 0x100, b"NCSD");
        for (i, partition) in partitions.iter().enumerate() {
            let at = ncsd.len();
            put(&mut ncsd, 0x120 + i * 8, &((at as u64 / MEDIA_UNIT) as u32).to_le_bytes());
            put(&mut ncsd, 0x124 + i * 8, &((partition.len() as u64 / MEDIA_UNIT) as u32).to_le_bytes());
            ncsd.extend_from_slice(partition);
        }
        ncsd
    }

    pub fn cia(title_id: u64, contents: &[(u16, Vec<u8>)]) -> Vec<u8> {
        let contents: Vec<_> = contents
            .iter()
            .enumerate()
            .map(|(index, (kind, content))| (index as u32, *kind, content.clone()))
            .collect();
        cia_of(title_id, 0, &contents)
    }

    pub fn cia_of(title_id: u64, version: u16, contents: &[(u32, u16, Vec<u8>)]) -> Vec<u8> {
        let mut tmd = vec![0; 4 + 0x100 + 0x3C + 0xC4 + 0x900];
        put(&mut tmd, 0, &0x10004u32.to_be_bytes());
        let header = 4 + 0x100 + 0x3C;
        put(&mut tmd, header + 0x4C, &title_id.to_be_bytes());
        put(&mut tmd, header + 0x9C, &version.to_be_bytes());
        put(&mut tmd, header + 0x9E, &(contents.len() as u16).to_be_bytes());
        for (index, (id, kind, content)) in contents.iter().enumerate() {
            let mut chunk = vec![0; 0x30];
            put(&mut chunk, 0, &id.to_be_bytes());
            put(&mut chunk, 4, &(index as u16).to_be_bytes());
            put(&mut chunk, 6, &kind.to_be_bytes());
            put(&mut chunk, 8, &(content.len() as u64).to_be_bytes());
            tmd.extend_from_slice(&chunk);
        }
        let (certs, ticket) = (0xA00usize, 0x350usize);
        let mut cia = vec![0; 0x20];
        put(&mut cia, 0, &CIA_HEADER_SIZE.to_le_bytes());
        put(&mut cia, 0x8, &(certs as u32).to_le_bytes());
        put(&mut cia, 0xC, &(ticket as u32).to_le_bytes());
        put(&mut cia, 0x10, &(tmd.len() as u32).to_le_bytes());
        let total: usize = contents.iter().map(|(_, _, content)| content.len()).sum();
        put(&mut cia, 0x18, &(total as u64).to_le_bytes());
        let tmd_at = align(align(align(CIA_HEADER_SIZE as u64) + certs as u64) + ticket as u64) as usize;
        put(&mut cia, tmd_at, &tmd);
        let mut at = align((tmd_at + tmd.len()) as u64) as usize;
        for (_, _, content) in contents {
            put(&mut cia, at, content);
            at += content.len();
        }
        cia
    }

    fn imported_bytes(file: Vec<u8>) -> Result<Vec<u8>, Refused> {
        let mut bytes = Vec::new();
        imported(Cursor::new(file))?.read_to_end(&mut bytes)?;
        Ok(bytes)
    }

    #[test]
    fn sets_no_crypto_in_the_copy_of_a_plain_dump_flagged_encrypted() {
        let source = ncsd(&[ncch(X, false, true)]);

        let copy = imported_bytes(source.clone()).unwrap();

        let mut expected = source.clone();
        expected[0x4000 + KEY_SLOT as usize] = 0;
        expected[0x4000 + FLAGS as usize] = NO_CRYPTO;
        assert_eq!(copy, expected);
        assert_eq!(title_id(&mut Cursor::new(copy)), Ok(Some(X)));
        assert_eq!(title_id(&mut Cursor::new(source)), Err(Refused::FlaggedEncrypted));
    }

    #[test]
    fn refuses_an_encrypted_dump() {
        assert_eq!(plan(&mut Cursor::new(ncsd(&[ncch(X, false, false)]))).err(), Some(Refused::Encrypted));
        assert_eq!(plan(&mut Cursor::new(ncch(X, false, false))).err(), Some(Refused::Encrypted));
    }

    #[test]
    fn copies_a_dump_already_flagged_decrypted_as_it_is() {
        for source in [ncsd(&[ncch(X, true, false)]), ncch(X, true, true)] {
            assert_eq!(imported_bytes(source.clone()).unwrap(), source);
        }
    }

    #[test]
    fn fixes_a_plain_cxi_and_reads_its_title_id() {
        let source = ncch(X, false, true);

        let copy = imported_bytes(source.clone()).unwrap();

        assert_eq!((copy[KEY_SLOT as usize], copy[FLAGS as usize]), (0, NO_CRYPTO));
        assert_eq!(copy.len(), source.len());
        assert_eq!(title_id(&mut Cursor::new(copy)), Ok(Some(X)));
    }

    #[test]
    fn leaves_the_cartridges_encrypted_manual_alone() {
        let source = ncsd(&[ncch(X, false, true), ncch(X, false, false)]);

        let copy = imported_bytes(source.clone()).unwrap();

        let differs: Vec<usize> = (0..copy.len()).filter(|&i| copy[i] != source[i]).collect();
        assert_eq!(differs, [0x4000 + KEY_SLOT as usize, 0x4000 + FLAGS as usize]);
    }

    #[test]
    fn writes_a_base_game_cias_main_content_with_the_header_fixed() {
        let main = ncch(X, false, true);
        let source = cia(X, &[(0, main.clone()), (0, ncch(X, true, true))]);

        let copy = imported_bytes(source).unwrap();

        let mut expected = main;
        expected[KEY_SLOT as usize] = 0;
        expected[FLAGS as usize] = NO_CRYPTO;
        assert_eq!(copy, expected);
    }

    #[test]
    fn reads_a_cias_copy_from_wherever_it_seeks() {
        let main = ncch(X, false, true);
        let mut copy = imported(Cursor::new(cia(X, &[(0, main.clone())]))).unwrap();
        let mut tail = Vec::new();

        assert_eq!(copy.seek(SeekFrom::Start(0x180)).unwrap(), 0x180);
        copy.read_to_end(&mut tail).unwrap();

        assert_eq!((tail.len(), tail[0x0B], tail[0x0F]), (main.len() - 0x180, 0, NO_CRYPTO));
        assert_eq!(copy.seek(SeekFrom::End(-4)).unwrap(), main.len() as u64 - 4);
        assert!(copy.seek(SeekFrom::Current(-(main.len() as i64))).is_err());
    }

    #[test]
    fn refuses_a_cia_whose_tmd_marks_a_content_encrypted() {
        let source = cia(X, &[(0, ncch(X, true, true)), (CONTENT_ENCRYPTED, ncch(X, true, true))]);

        assert_eq!(plan(&mut Cursor::new(source)).err(), Some(Refused::Encrypted));
    }

    #[test]
    fn refuses_update_and_dlc_cias() {
        let content = vec![(0, ncch(X, true, true))];

        assert_eq!(plan(&mut Cursor::new(cia(0x0004000E00055D00, &content))).err(), Some(Refused::Update));
        assert_eq!(plan(&mut Cursor::new(cia(0x0004008C00055D00, &content))).err(), Some(Refused::Dlc));
    }

    #[test]
    fn copies_homebrew_as_it_is() {
        let source = b"3DSX homebrew".to_vec();

        assert_eq!(imported_bytes(source.clone()).unwrap(), source);
        assert_eq!(title_id(&mut Cursor::new(source)), Ok(None));
    }

    #[test]
    fn refuses_a_file_that_isnt_a_3ds_game() {
        assert_eq!(plan(&mut Cursor::new(b"not a game".to_vec())).err(), Some(Refused::NotAGame));
    }

    #[test]
    fn knows_the_files_it_imports() {
        for name in ["X.3ds", "X.CIA", "X.cxi", "X.cci", "X.app", "PKSM.3dsx"] {
            assert!(is_import(name), "{name}");
        }
        assert!(!is_import("X.nds"));
    }
}
