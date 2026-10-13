use crate::rom::Rom;
use std::fs::File;
use std::io::Read;
use std::path::{Path, PathBuf};
use std::sync::{Mutex, MutexGuard};

static CORE: Mutex<()> = Mutex::new(());

// Only one core can be loaded at a time.
pub fn lock_core() -> MutexGuard<'static, ()> {
    CORE.lock().unwrap_or_else(|e| e.into_inner())
}

const COUNT_IN_WORK_RAM: [u8; 6] = [0x21, 0x00, 0xC0, 0x34, 0x18, 0xFD];
const COUNT_BOOTS_IN_SAVE_RAM: [u8; 9] = [0x3E, 0x0A, 0xEA, 0x00, 0x00, 0x21, 0x00, 0xA0, 0x34];

// Gold, Silver and Crystal's cart type: 32 KB of save RAM and a clock.
fn rom(program: &[&[u8]]) -> Rom {
    let mut rom = vec![0; 0x8000];
    rom[0x101..0x104].copy_from_slice(&[0xC3, 0x50, 0x01]);
    rom[0x104..0x108].copy_from_slice(&[0xCE, 0xED, 0x66, 0x66]);
    rom[0x147] = 0x10;
    rom[0x149] = 0x03;
    let program = program.concat();
    rom[0x150..0x150 + program.len()].copy_from_slice(&program);
    Rom { name: "test.gbc".into(), bytes: rom }
}

pub fn counting_rom() -> Rom {
    rom(&[&COUNT_IN_WORK_RAM])
}

pub fn boot_counting_rom() -> Rom {
    rom(&[&COUNT_BOOTS_IN_SAVE_RAM, &COUNT_IN_WORK_RAM])
}

// Latches the clock over and over and copies its day count into work RAM.
const READ_THE_CLOCK: [u8; 26] = [
    0x3E, 0x0A, 0xEA, 0x00, 0x00, 0x3E, 0x0B, 0xEA, 0x00, 0x40, 0xAF, 0xEA, 0x00, 0x60, 0x3C, 0xEA, 0x00, 0x60, 0xFA,
    0x00, 0xA0, 0xEA, 0x00, 0xC0, 0x18, 0xF0,
];

pub fn clock_rom() -> Rom {
    rom(&[&READ_THE_CLOCK])
}

pub fn days_on_the_clock(core: &mut crate::retro::Core) -> u8 {
    core.read_memory(&[crate::memory::Range { address: 0xC000, length: 1 }]).unwrap()[0]
}

// A save whose clock was last latched now, at day 0.
pub fn clock_save() -> Vec<u8> {
    let now = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs();
    [vec![0; 0x8000 + 40], now.to_le_bytes().to_vec()].concat()
}

pub fn gba_header(title: &[u8], code: &[u8], revision: u8) -> Vec<u8> {
    let mut rom = vec![0; 0x200];
    rom[0xA0..0xA0 + title.len()].copy_from_slice(title);
    rom[0xAC..0xB0].copy_from_slice(code);
    rom[0xB2] = 0x96;
    rom[0xBC] = revision;
    rom[0xBD] = rom[0xA0..0xBD].iter().fold(0u8, |sum, &b| sum.wrapping_sub(b)).wrapping_sub(0x19);
    rom
}

pub fn nds_header(code: &[u8], revision: u8) -> Vec<u8> {
    let mut rom = vec![0; 0x200];
    rom[0x0C..0x10].copy_from_slice(code);
    rom[0x1E] = revision;
    let crc = rom[..0x15E].iter().fold(0xFFFFu16, |crc, &byte| {
        (0..8).fold(crc ^ byte as u16, |crc, _| if crc & 1 == 1 { (crc >> 1) ^ 0xA001 } else { crc >> 1 })
    });
    rom[0x15E..0x160].copy_from_slice(&crc.to_le_bytes());
    rom
}

pub fn gb_header(title: &[u8], revision: u8) -> Vec<u8> {
    let mut rom = vec![0; 0x200];
    rom[0x134..0x134 + title.len()].copy_from_slice(title);
    rom[0x14C] = revision;
    rom[0x14D] = rom[0x134..0x14D].iter().fold(0u8, |sum, &b| sum.wrapping_sub(b).wrapping_sub(1));
    rom
}

// An ARM branch to itself, with the header byte mGBA looks for.
pub fn gba_rom() -> Rom {
    let mut rom = vec![0; 0x200];
    rom[0..4].copy_from_slice(&[0xFE, 0xFF, 0xFF, 0xEA]);
    rom[0xB2] = 0x96;
    Rom { name: "test.gba".into(), bytes: rom }
}

// Copies the ROM byte at 0x0134 into work RAM over and over.
const COPY_A_ROM_BYTE: [u8; 8] = [0xFA, 0x34, 0x01, 0xEA, 0x00, 0xC0, 0x18, 0xF8];

pub fn rom_byte_copying_rom() -> Rom {
    rom(&[&COPY_A_ROM_BYTE])
}

// Branches to 0xC0, switches to Thumb and counts a word in IWRAM at 0x03000000. The count goes up at 0x080000CE.
const COUNT_IN_IWRAM: [u8; 20] = [
    0x01, 0x00, 0x8F, 0xE2, 0x10, 0xFF, 0x2F, 0xE1, 0x03, 0x21, 0x09, 0x06, 0x0A, 0x68, 0x01, 0x32, 0x0A, 0x60, 0xFB,
    0xE7,
];

pub fn gba_counting_rom() -> Rom {
    let mut rom = gba_rom();
    rom.bytes[0..4].copy_from_slice(&[0x2E, 0x00, 0x00, 0xEA]);
    rom.bytes[0xC0..0xC0 + COUNT_IN_IWRAM.len()].copy_from_slice(&COUNT_IN_IWRAM);
    rom
}

pub fn pattern(len: usize, seed: u8) -> Vec<u8> {
    (0..len).map(|i| (i as u8).wrapping_mul(31).wrapping_add(seed)).collect()
}

pub fn sevenz_of(files: &[(&str, &[u8])]) -> Vec<u8> {
    let mut archive = sevenz_rust2::ArchiveWriter::new(std::io::Cursor::new(Vec::new())).unwrap();
    for (name, bytes) in files {
        archive.push_archive_entry(sevenz_rust2::ArchiveEntry::new_file(name), Some(*bytes)).unwrap();
    }
    archive.finish().unwrap().into_inner()
}

const DATA: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/../../data");

fn extension(name: &str) -> Option<String> {
    Some(Path::new(name).extension()?.to_str()?.to_ascii_lowercase())
}

fn header(name: &str, start: &[u8]) -> Option<([u8; 4], u8)> {
    let big_endian;
    let (start, code, revision) = match extension(name)?.as_str() {
        "gba" => (start, 0xAC, 0xBC),
        "nds" => (start, 0x0C, 0x1E),
        "z64" | "n64" | "v64" => {
            big_endian = rom_art::n64_big_endian(start)?;
            (big_endian.as_slice(), 0x3B, 0x3F)
        }
        _ => return None,
    };
    Some((start.get(code..code + 4)?.try_into().ok()?, *start.get(revision)?))
}

fn game_boy_header(name: &str, start: &[u8]) -> Option<(String, u16)> {
    if !matches!(extension(name)?.as_str(), "gb" | "gbc") {
        return None;
    }
    let title = String::from_utf8_lossy(start.get(0x134..0x144)?).trim_end_matches('\0').to_owned();
    Some((title, u16::from_be_bytes(start.get(0x14E..0x150)?.try_into().ok()?)))
}

fn start_of(path: &Path) -> Option<(String, Vec<u8>)> {
    let mut start = Vec::new();
    let path_str = path.to_string_lossy().into_owned();
    if crate::rom::is_archive(&path_str) {
        let name = crate::rom::read_archived(&path_str, File::open(path).ok()?, |name, _, rom| {
            rom.take(0x200).read_to_end(&mut start)?;
            Ok(name.to_owned())
        });
        Some((name.ok()?, start))
    } else {
        File::open(path).ok()?.take(0x200).read_to_end(&mut start).ok()?;
        Some((path_str, start))
    }
}

fn header_of(path: &Path) -> Option<([u8; 4], u8)> {
    let (name, start) = start_of(path)?;
    header(&name, &start)
}

pub fn files_in(dir: &Path) -> Vec<PathBuf> {
    let Ok(entries) = std::fs::read_dir(dir) else { return Vec::new() };
    let mut files: Vec<PathBuf> = entries.flatten().map(|entry| entry.path()).collect();
    files.sort();
    files.into_iter().flat_map(|path| if path.is_dir() { files_in(&path) } else { vec![path] }).collect()
}

fn find_rom(dir: &Path, code: &[u8; 4], revision: u8) -> Option<PathBuf> {
    files_in(dir).into_iter().find(|path| header_of(path) == Some((*code, revision)))
}

fn save_for(rom: &Path, extension: &str) -> Option<Vec<u8>> {
    let beside = rom.with_extension(extension);
    let in_saves = Path::new(DATA).join("saves").join(beside.file_name()?);
    std::fs::read(beside).or_else(|_| std::fs::read(in_saves)).ok()
}

fn game(title: &str, code: &[u8; 4], revision: u8, save: &str) -> Option<(Rom, Vec<u8>)> {
    let found = find_rom(&Path::new(DATA).join("roms"), code, revision).and_then(|path| {
        let rom = crate::rom::unpack(&path.to_string_lossy(), std::fs::read(&path).ok()?).ok()?;
        Some((rom, save_for(&path, save)?))
    });
    if found.is_none() {
        let code = String::from_utf8_lossy(code);
        eprintln!("skipped: needs {title} ({code}, revision {revision}) in data/roms/ and its .{save} in data/saves/");
    }
    found
}

fn roms_where(matches: impl Fn(&str, &[u8]) -> bool) -> Vec<Rom> {
    ["roms", "test-folder"]
        .iter()
        .flat_map(|dir| files_in(&Path::new(DATA).join(dir)))
        .filter(|path| start_of(path).is_some_and(|(name, start)| matches(&name, &start)))
        .filter_map(|path| crate::rom::unpack(&path.to_string_lossy(), std::fs::read(&path).ok()?).ok())
        .collect()
}

pub fn rom_by_header(title: &str, code: &[u8; 4], revision: u8) -> Option<Rom> {
    let found = find_rom(&Path::new(DATA).join("roms"), code, revision)
        .and_then(|path| crate::rom::unpack(&path.to_string_lossy(), std::fs::read(&path).ok()?).ok());
    if found.is_none() {
        let code = String::from_utf8_lossy(code);
        eprintln!("skipped: needs {title} ({code}, revision {revision}) in data/roms/");
    }
    found
}

pub fn roms_by_code(code: &[u8; 4], revision: u8) -> Vec<Rom> {
    roms_where(|name, start| header(name, start) == Some((*code, revision)))
}

pub fn game_boy_roms(title: &str, checksum: u16) -> Vec<Rom> {
    roms_where(|name, start| game_boy_header(name, start) == Some((title.to_owned(), checksum)))
}

pub fn red() -> Option<Rom> {
    let found = game_boy_roms("POKEMON RED", 0x91E6).into_iter().next();
    if found.is_none() {
        eprintln!("skipped: needs Pokémon Red (POKEMON RED, checksum 0x91E6) in data/roms/");
    }
    found
}

pub fn heartgold() -> Option<(Rom, Vec<u8>)> {
    game("HeartGold", b"IPKE", 0, "sav")
}

pub fn firered() -> Option<(Rom, Vec<u8>)> {
    game("FireRed", b"BPRE", 1, "sav")
}

pub fn stadium() -> Option<Rom> {
    rom_by_header("Pokémon Stadium", b"NPOE", 2)
}

// A save the app made, named after the ROM, as in data/saves/Pokemon Stadium.fla.
pub fn stadium_with_save() -> Option<(Rom, Vec<u8>)> {
    game("Pokémon Stadium", b"NPOE", 2, "fla")
}

pub fn stadium_2() -> Option<Rom> {
    rom_by_header("Pokémon Stadium 2", b"NP3E", 0)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    fn folder(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("pkh-emu-test-games-{name}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(dir.join("gba")).unwrap();
        dir
    }

    fn gba(code: &[u8; 4], revision: u8) -> Vec<u8> {
        let mut rom = gba_rom().bytes;
        rom[0xAC..0xB0].copy_from_slice(code);
        rom[0xBC] = revision;
        rom
    }

    fn nds(code: &[u8; 4], revision: u8) -> Vec<u8> {
        let mut rom = vec![0; 0x200];
        rom[0x0C..0x10].copy_from_slice(code);
        rom[0x1E] = revision;
        rom
    }

    fn zip_of(name: &str, bytes: &[u8]) -> Vec<u8> {
        let mut zip = zip::ZipWriter::new(std::io::Cursor::new(Vec::new()));
        zip.start_file("readme.txt", zip::write::SimpleFileOptions::default()).unwrap();
        zip.write_all(b"hello").unwrap();
        zip.start_file(name, zip::write::SimpleFileOptions::default()).unwrap();
        zip.write_all(bytes).unwrap();
        zip.finish().unwrap().into_inner()
    }

    #[test]
    fn finds_a_rom_by_its_game_code_and_revision() {
        let dir = folder("plain");
        std::fs::write(dir.join("gba/a.gba"), gba(b"BPRE", 0)).unwrap();
        std::fs::write(dir.join("gba/b.gba"), gba(b"BPRE", 1)).unwrap();
        std::fs::write(dir.join("gba/c.gba"), gba(b"BPEE", 1)).unwrap();

        assert_eq!(find_rom(&dir, b"BPRE", 1), Some(dir.join("gba/b.gba")));
    }

    #[test]
    fn finds_a_rom_inside_a_zip() {
        let dir = folder("zip");
        std::fs::write(dir.join("gba/HeartGold.zip"), zip_of("games/Game.NDS", &nds(b"IPKE", 0))).unwrap();

        assert_eq!(find_rom(&dir, b"IPKE", 0), Some(dir.join("gba/HeartGold.zip")));
    }

    #[test]
    fn finds_a_rom_inside_a_7z() {
        let dir = folder("7z");
        std::fs::write(dir.join("gba/HeartGold.7z"), sevenz_of(&[("Game.nds", &nds(b"IPKE", 0))])).unwrap();

        assert_eq!(find_rom(&dir, b"IPKE", 0), Some(dir.join("gba/HeartGold.7z")));
    }

    fn z64(code: &[u8; 4], revision: u8) -> Vec<u8> {
        let mut rom = vec![0; 0x200];
        rom[..4].copy_from_slice(&[0x80, 0x37, 0x12, 0x40]);
        rom[0x3B..0x3F].copy_from_slice(code);
        rom[0x3F] = revision;
        rom
    }

    #[test]
    fn finds_an_n64_rom_in_any_byte_order() {
        let dir = folder("n64");
        let v64: Vec<u8> = z64(b"NPOE", 2).chunks(2).flat_map(|pair| [pair[1], pair[0]]).collect();
        let n64: Vec<u8> = z64(b"NP3E", 0).chunks(4).flat_map(|word| [word[3], word[2], word[1], word[0]]).collect();
        std::fs::write(dir.join("Stadium.v64"), v64).unwrap();
        std::fs::write(dir.join("Stadium 2.n64"), n64).unwrap();

        assert_eq!(find_rom(&dir, b"NPOE", 2), Some(dir.join("Stadium.v64")));
        assert_eq!(find_rom(&dir, b"NP3E", 0), Some(dir.join("Stadium 2.n64")));
    }

    #[test]
    fn identifies_pokemon_stadium() {
        let Some(rom) = stadium() else { return };
        let game = rom_art::identify(&rom.bytes).unwrap();

        assert_eq!((game.platform, game.code.as_str(), game.revision), (rom_art::Platform::N64, "NPOE", 2));
    }

    #[test]
    fn finds_nothing_when_no_rom_matches() {
        let dir = folder("none");
        std::fs::write(dir.join("gba/a.gba"), gba(b"BPRE", 0)).unwrap();
        std::fs::write(dir.join("gba/a.sav"), gba(b"BPRE", 1)).unwrap();

        assert_eq!(find_rom(&dir, b"BPRE", 1), None);
        assert_eq!(find_rom(&dir.join("missing"), b"BPRE", 0), None);
    }
}
