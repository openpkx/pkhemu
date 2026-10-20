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
    Rom { name: "test.gbc".into(), bytes: rom, file: None }
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
    Rom { name: "test.gba".into(), bytes: rom, file: None }
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

pub fn zip_of(files: &[(&str, &[u8])]) -> Vec<u8> {
    let mut zip = zip::ZipWriter::new(std::io::Cursor::new(Vec::new()));
    for (name, bytes) in files {
        zip.start_file(*name, zip::write::SimpleFileOptions::default()).unwrap();
        std::io::Write::write_all(&mut zip, bytes).unwrap();
    }
    zip.finish().unwrap().into_inner()
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

// A 3DSX's extended header points at its SMDH, whose first title starts with the short name in UTF-16.
fn smdh_title(path: &Path) -> Option<String> {
    let mut file = File::open(path).ok()?;
    let mut header = [0; 0x28];
    file.read_exact(&mut header).ok()?;
    let at = u32::from_le_bytes(header[0x20..0x24].try_into().ok()?) as u64;
    if &header[..4] != b"3DSX" || u16::from_le_bytes([header[4], header[5]]) < 0x2C || at == 0 {
        return None;
    }
    let mut smdh = [0; 0x88];
    std::io::Seek::seek(&mut file, std::io::SeekFrom::Start(at)).ok()?;
    file.read_exact(&mut smdh).ok()?;
    let units: Vec<u16> =
        smdh[8..].chunks(2).map(|pair| u16::from_le_bytes([pair[0], pair[1]])).take_while(|&unit| unit != 0).collect();
    (&smdh[..4] == b"SMDH").then(|| String::from_utf16_lossy(&units))
}

pub fn homebrew_3dsx(title: &str) -> Option<Rom> {
    let found =
        files_in(&Path::new(DATA).join("roms")).into_iter().find(|path| smdh_title(path).as_deref() == Some(title));
    let Some(path) = found else {
        eprintln!("skipped: needs the {title} homebrew's .3dsx in data/roms/");
        return None;
    };
    let file = File::open(&path).ok()?;
    let name = path.to_string_lossy().into_owned();
    Some(Rom::at(&name, crate::rom::RomFile::new(file, name.clone())))
}

fn gamecube_id(path: &Path) -> Option<(String, u8)> {
    let header = crate::game_cube::header(File::open(path).ok()?).ok()??;
    Some((String::from_utf8_lossy(&header[..6]).into_owned(), header[7]))
}

pub fn gamecube_disc(title: &str, id: &str, revision: u8) -> Option<Rom> {
    let found = files_in(&Path::new(DATA).join("roms"))
        .into_iter()
        .find(|path| gamecube_id(path) == Some((id.to_owned(), revision)));
    let Some(path) = found else {
        eprintln!("skipped: needs {title} ({id}, revision {revision}) in data/roms/");
        return None;
    };
    let name = path.to_string_lossy().into_owned();
    Some(Rom::at(&name, crate::rom::RomFile::new(File::open(&path).ok()?, name.clone())))
}

// A PowerPC apploader that hands the boot code a table of disc reads, then the entry point. Dolphin runs it at
// 0x81200000 and keeps the table, which follows it, in the same place.
fn apploader(reads: &[[u32; 3]], entry: u32) -> Vec<u8> {
    let (lis, addi, lwz, stw) = (
        |d: u32, imm: u32| 15 << 26 | d << 21 | imm,
        |d: u32, a: u32, imm: u32| 14 << 26 | d << 21 | a << 16 | imm,
        |d: u32, a: u32, off: u32| 32 << 26 | d << 21 | a << 16 | off,
        |s: u32, a: u32, off: u32| 36 << 26 | s << 21 | a << 16 | off,
    );
    let (blr, data) = (0x4E80_0020, 0x80);
    let code = [
        // Entry: give init, main and close.
        lis(6, 0x8120),
        addi(7, 6, 0x20),
        stw(7, 3, 0),
        addi(7, 6, 0x24),
        stw(7, 4, 0),
        addi(7, 6, 0x70),
        stw(7, 5, 0),
        blr,
        // Init.
        blr,
        // Main: the next read, or 0 when there are none left.
        lis(6, 0x8120),
        lwz(7, 6, data),
        lwz(8, 6, data + 4),
        31 << 26 | 7 << 16 | 8 << 11,
        16 << 26 | 4 << 21 | 0x34,
        7 << 26 | 9 << 21 | 7 << 16 | 12,
        31 << 26 | 9 << 21 | 9 << 16 | 6 << 11 | 266 << 1,
        lwz(10, 9, data + 12),
        stw(10, 3, 0),
        lwz(10, 9, data + 16),
        stw(10, 4, 0),
        lwz(10, 9, data + 20),
        stw(10, 5, 0),
        addi(7, 7, 1),
        stw(7, 6, data),
        addi(3, 0, 1),
        blr,
        addi(3, 0, 0),
        blr,
        // Close: the entry point.
        lis(6, 0x8120),
        lwz(3, 6, data + 8),
        blr,
    ];
    let mut blob: Vec<u8> = code.iter().flat_map(|word| word.to_be_bytes()).collect();
    assert!(blob.len() <= data as usize);
    blob.resize(data as usize, 0);
    let table = [0, reads.len() as u32, entry].into_iter().chain(reads.iter().flatten().copied());
    blob.extend(table.flat_map(|word| word.to_be_bytes()));
    blob
}

// A GameCube disc holding a homebrew DOL, booted by `apploader`.
pub fn gamecube_disc_of(game_id: &[u8; 6], dol: &[u8]) -> Vec<u8> {
    let word = |at: usize| u32::from_be_bytes(dol[at..at + 4].try_into().unwrap());
    let dol_at = 0x8000;
    let reads: Vec<[u32; 3]> = (0..18)
        .filter(|section| word(0x90 + section * 4) != 0)
        .map(|section| [word(0x48 + section * 4), word(0x90 + section * 4), dol_at + word(section * 4)])
        .collect();
    let loader = apploader(&reads, word(0xE0));
    let mut disc = vec![0; dol_at as usize];
    disc[..6].copy_from_slice(game_id);
    disc[0x1C..0x20].copy_from_slice(&0xC233_9F3Du32.to_be_bytes());
    disc[0x20..0x28].copy_from_slice(b"homebrew");
    disc[0x420..0x424].copy_from_slice(&dol_at.to_be_bytes());
    // An FST with only its root folder.
    let fst = 0x7000u32;
    for (at, value) in [(0x424, fst), (0x428, 13), (0x42C, 13)] {
        disc[at..at + 4].copy_from_slice(&value.to_be_bytes());
    }
    disc[fst as usize..fst as usize + 12].copy_from_slice(&[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]);
    disc[0x45B] = 1;
    disc[0x2450..0x2454].copy_from_slice(&0x8120_0000u32.to_be_bytes());
    disc[0x2454..0x2458].copy_from_slice(&(loader.len() as u32).to_be_bytes());
    disc[0x2460..0x2460 + loader.len()].copy_from_slice(&loader);
    disc.extend_from_slice(dol);
    disc.resize(disc.len().next_multiple_of(0x8000), 0);
    disc
}

const SNES9X_GX_5_0_3_GAMECUBE: &str = "e21b68ddef85ec7ae5fd3a6ba481c8fee4e3c5062948c7cf9ffa1069d5749f64";

// Snes9x GX ships its GameCube build as a DOL, so the test puts it on a disc of its own.
pub fn snes9x_gx_disc() -> Option<Rom> {
    let dol = files_in(&Path::new(DATA).join("roms"))
        .into_iter()
        .filter(|path| extension(&path.to_string_lossy()).as_deref() == Some("dol"))
        .filter_map(|path| std::fs::read(path).ok())
        .find(|dol| crate::save::sha256(dol) == SNES9X_GX_5_0_3_GAMECUBE);
    let Some(dol) = dol else {
        eprintln!("skipped: needs snes9xgx-gc.dol from Snes9x GX 5.0.3's GameCube release in data/roms/");
        return None;
    };
    let path = std::env::temp_dir().join("pkh-emu-snes9x-gx.iso");
    std::fs::write(&path, gamecube_disc_of(b"GS9E00", &dol)).ok()?;
    let name = path.to_string_lossy().into_owned();
    Some(Rom::at(&name, crate::rom::RomFile::new(File::open(&path).ok()?, name.clone())))
}

pub const PAD_READING: usize = 0x3F00;

// Holds A for a few frames and returns the buttons the pad reader saw, in the pad's own bits.
pub fn buttons_after_pressing_a(core: &mut crate::retro::Core) -> u32 {
    crate::retro::set_input(1 << 8);
    (0..6).for_each(|_| core.run_frame());
    crate::retro::release_input();
    let ram = core.memory_data(crate::retro::MEMORY_SYSTEM_RAM);
    u32::from_be_bytes(ram[PAD_READING..PAD_READING + 4].try_into().unwrap()) >> 16 & 0x1F7F
}

pub fn gamecube_pad_reader_disc() -> Rom {
    gamecube_disc_at("pkh-emu-gamecube-pad-reader.iso", &gamecube_pad_reader_iso())
}

pub fn gamecube_disc_at(name: &str, disc: &[u8]) -> Rom {
    let path = std::env::temp_dir().join(name);
    std::fs::write(&path, disc).unwrap();
    let name = path.to_string_lossy().into_owned();
    Rom::at(&name, crate::rom::RomFile::new(File::open(&path).unwrap(), name.clone()))
}

// A disc whose DOL copies what the SI reads from the pad in port 1, its two 32-bit words, to `PAD_READING` forever.
pub fn gamecube_pad_reader_iso() -> Vec<u8> {
    let (lis, ori, lwz, stw) = (
        |d: u32, imm: u32| 15 << 26 | d << 21 | imm,
        |a: u32, s: u32, imm: u32| 24 << 26 | s << 21 | a << 16 | imm,
        |d: u32, a: u32, off: u32| 32 << 26 | d << 21 | a << 16 | off,
        |s: u32, a: u32, off: u32| 36 << 26 | s << 21 | a << 16 | off,
    );
    let at = PAD_READING as u32;
    let code = [
        lis(3, 0xCC00),
        ori(3, 3, 0x6404),
        lis(5, 0x8000),
        lwz(6, 3, 0),
        stw(6, 5, at),
        lwz(6, 3, 4),
        stw(6, 5, at + 4),
        18 << 26 | (-16i32 as u32 & 0x03FF_FFFC),
    ];
    let (text_at, entry) = (0x100usize, 0x8000_4000u32);
    let mut dol = vec![0; text_at];
    dol[0..4].copy_from_slice(&(text_at as u32).to_be_bytes());
    dol[0x48..0x4C].copy_from_slice(&entry.to_be_bytes());
    dol[0x90..0x94].copy_from_slice(&(code.len() as u32 * 4).to_be_bytes());
    dol[0xE0..0xE4].copy_from_slice(&entry.to_be_bytes());
    dol.extend(code.iter().flat_map(|word| word.to_be_bytes()));
    gamecube_disc_of(b"GPRE00", &dol)
}

fn ncch_partitions(path: &Path) -> Vec<u64> {
    let mut ncsd = [0; 0x200];
    let read = File::open(path).and_then(|mut file| file.read_exact(&mut ncsd));
    if read.is_err() || &ncsd[0x100..0x104] != b"NCSD" {
        return Vec::new();
    }
    ncsd[0x120..0x160]
        .chunks(8)
        .map(|entry| u32::from_le_bytes(entry[..4].try_into().unwrap()) as u64 * 0x200)
        .filter(|&offset| offset != 0)
        .collect()
}

fn ncch_at(file: &mut File, offset: u64) -> Option<[u8; 0x200]> {
    let mut ncch = [0; 0x200];
    std::io::Seek::seek(file, std::io::SeekFrom::Start(offset)).ok()?;
    file.read_exact(&mut ncch).ok()?;
    (&ncch[0x100..0x104] == b"NCCH").then_some(ncch)
}

// The local dump's content is plaintext but its NoCrypto flags are clear, which Azahar reads as encrypted.
// A clone with the flags set costs no space on APFS.
pub fn cartridge_3ds(title: &str, program_id: u64) -> Option<Rom> {
    let matches = |path: &PathBuf| {
        let first = ncch_partitions(path).first().copied();
        let ncch = first.and_then(|offset| ncch_at(&mut File::open(path).ok()?, offset));
        ncch.is_some_and(|ncch| u64::from_le_bytes(ncch[0x118..0x120].try_into().unwrap()) == program_id)
    };
    let Some(path) = files_in(&Path::new(DATA).join("roms")).into_iter().find(matches) else {
        eprintln!("skipped: needs {title} ({program_id:016X}) as a decrypted .3ds in data/roms/");
        return None;
    };
    let clone = std::env::temp_dir().join(format!("{program_id:016X}.3ds"));
    let _ = std::fs::remove_file(&clone);
    std::fs::copy(&path, &clone).ok()?;
    let mut file = std::fs::OpenOptions::new().read(true).write(true).open(&clone).ok()?;
    for offset in ncch_partitions(&clone) {
        let Some(ncch) = ncch_at(&mut file, offset) else { continue };
        std::io::Seek::seek(&mut file, std::io::SeekFrom::Start(offset + 0x18F)).ok()?;
        std::io::Write::write_all(&mut file, &[ncch[0x18F] | 0x04]).ok()?;
    }
    let name = clone.to_string_lossy().into_owned();
    Some(Rom::at(&name, crate::rom::RomFile::new(File::open(&clone).ok()?, name.clone())))
}

pub fn save_of_size(title: &str, size: u64) -> Option<Vec<u8>> {
    let found = files_in(&Path::new(DATA).join("saves"))
        .into_iter()
        .find(|path| path.metadata().is_ok_and(|m| m.len() == size));
    if found.is_none() {
        eprintln!("skipped: needs {title} save of {size:#x} bytes in data/saves/");
    }
    std::fs::read(found?).ok()
}

// The product code and remaster version sit in the NCCH header, after an NCSD header in a cartridge dump.
fn ncch_product(path: &Path) -> Option<(String, u16)> {
    let mut file = File::open(path).ok()?;
    let mut header = [0; 0x200];
    file.read_exact(&mut header).ok()?;
    if &header[0x100..0x104] == b"NCSD" {
        let at = u32::from_le_bytes(header[0x120..0x124].try_into().ok()?) as u64 * 0x200;
        std::io::Seek::seek(&mut file, std::io::SeekFrom::Start(at)).ok()?;
        file.read_exact(&mut header).ok()?;
    }
    let product = String::from_utf8_lossy(&header[0x150..0x160]).trim_end_matches('\0').to_owned();
    (&header[0x100..0x104] == b"NCCH").then(|| (product, u16::from_le_bytes([header[0x112], header[0x113]])))
}

pub fn three_ds_by_header(title: &str, product: &str, version: u16) -> Option<PathBuf> {
    let wanted = Some((product.to_owned(), version));
    let found = files_in(&Path::new(DATA).join("roms")).into_iter().find(|path| ncch_product(path) == wanted);
    if found.is_none() {
        eprintln!("skipped: needs {title} ({product}, version {version}) in data/roms/");
    }
    found
}

// The dump's game is plain, but its header says encrypted, so it plays from a copy with the flag fixed, as an
// import makes.
pub fn pokemon_x() -> Option<Rom> {
    let source = three_ds_by_header("Pokémon X", "CTR-P-EKJA", 2)?;
    let copy = std::env::temp_dir().join("pkh-emu-pokemon-x.3ds");
    let size = |path: &Path| std::fs::metadata(path).map(|file| file.len()).ok();
    if size(&copy) != size(&source) {
        let _ = std::fs::remove_file(&copy);
        std::fs::copy(&source, &copy).unwrap();
    }
    let mut file = File::options().read(true).write(true).open(&copy).unwrap();
    let mut start = [0; 0x200];
    file.read_exact(&mut start).unwrap();
    let game = u32::from_le_bytes(start[0x120..0x124].try_into().unwrap()) as u64 * 0x200;
    let mut flags = [0];
    std::io::Seek::seek(&mut file, std::io::SeekFrom::Start(game + 0x18F)).unwrap();
    file.read_exact(&mut flags).unwrap();
    for (at, byte) in [(0x18B, 0), (0x18F, flags[0] | 0x04)] {
        std::io::Seek::seek(&mut file, std::io::SeekFrom::Start(game + at)).unwrap();
        std::io::Write::write_all(&mut file, &[byte]).unwrap();
    }
    let name = copy.to_string_lossy().into_owned();
    Some(Rom::at(&name, crate::rom::RomFile::new(File::open(&copy).unwrap(), name.clone())))
}

pub fn pokemon_x_save() -> Option<Vec<u8>> {
    let save = std::fs::read(Path::new(DATA).join("saves/3ds/x-catnapfart123-main")).ok();
    if save.is_none() {
        eprintln!("skipped: needs a Pokémon X save at data/saves/3ds/x-catnapfart123-main");
    }
    save
}

// A raw card whose directory, in blocks 1 and 2, lists the European Colosseum's save file.
pub fn colosseum_card() -> Option<Vec<u8>> {
    let lists_colosseum = |file: &Vec<u8>| {
        crate::save::game_cube::fits(file.len()) && file[0x2000..0x6000].windows(6).any(|id| id == b"GC6P01")
    };
    let card = files_in(&Path::new(DATA).join("saves"))
        .into_iter()
        .filter_map(|path| std::fs::read(path).ok())
        .find(lists_colosseum);
    if card.is_none() {
        eprintln!("skipped: needs a raw memory card with a European Pokémon Colosseum story save in data/saves/");
    }
    card
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

pub fn node(script: &str, args: &[&std::ffi::OsStr]) -> String {
    let output = std::process::Command::new("node")
        .arg(format!("{}/tests/{script}", env!("CARGO_MANIFEST_DIR")))
        .args(args)
        .output()
        .unwrap();
    assert!(output.status.success(), "{}", String::from_utf8_lossy(&output.stderr));
    String::from_utf8(output.stdout).unwrap().trim().to_string()
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
