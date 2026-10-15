use rom_art::{identify, AnimatedSprite, Image};
use sha2::{Digest, Sha256};
use std::io::{Read, Seek, SeekFrom};
use std::path::{Path, PathBuf};

const ROMS: [&str; 2] = [
    concat!(env!("CARGO_MANIFEST_DIR"), "/../../data/roms"),
    concat!(env!("CARGO_MANIFEST_DIR"), "/../../data/test-folder"),
];
const SAVES: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/../../data/saves");
const HACKS: [&str; 3] = ["Unbound", "Imperium", "Radical Red"];
const EXTENSIONS: [&str; 4] = [".gba", ".nds", ".gb", ".gbc"];

fn files_in(dir: &Path) -> Vec<PathBuf> {
    let Ok(entries) = std::fs::read_dir(dir) else { return Vec::new() };
    let mut files: Vec<PathBuf> = entries.flatten().map(|entry| entry.path()).collect();
    files.sort();
    files.into_iter().flat_map(|path| if path.is_dir() { files_in(&path) } else { vec![path] }).collect()
}

fn is_rom(name: &str) -> bool {
    let name = name.to_ascii_lowercase();
    EXTENSIONS.iter().any(|extension| name.ends_with(extension))
}

fn roms_in(path: &Path) -> Vec<Vec<u8>> {
    let name = path.to_string_lossy();
    if is_rom(&name) {
        return std::fs::read(path).into_iter().collect();
    }
    if !name.to_ascii_lowercase().ends_with(".zip") {
        return Vec::new();
    }
    let Ok(mut archive) = std::fs::File::open(path).map_err(drop).and_then(|f| zip::ZipArchive::new(f).map_err(drop))
    else {
        return Vec::new();
    };
    (0..archive.len())
        .filter_map(|i| {
            let mut file = archive.by_index(i).ok()?;
            if !is_rom(file.name()) {
                return None;
            }
            let mut rom = Vec::new();
            file.read_to_end(&mut rom).ok()?;
            Some(rom)
        })
        .collect()
}

fn gen3_text(text: &str) -> Vec<u8> {
    text.chars()
        .map(|c| match c {
            'A'..='Z' => 0xBB + (c as u8 - b'A'),
            'a'..='z' => 0xD5 + (c as u8 - b'a'),
            _ => 0,
        })
        .collect()
}

fn names(rom: &[u8], hack: &str) -> bool {
    let name = gen3_text(hack);
    rom.windows(name.len()).any(|window| window == name)
}

fn find(code: &str, revision: u8, hack: Option<&str>) -> Option<Vec<u8>> {
    ROMS.iter().flat_map(|dir| files_in(Path::new(dir))).flat_map(|path| roms_in(&path)).find(|rom| {
        identify(rom).is_some_and(|game| game.code == code && game.revision == revision)
            && match hack {
                Some(hack) => names(rom, hack),
                None => !HACKS.iter().any(|hack| names(rom, hack)),
            }
    })
}

#[allow(dead_code)]
pub fn find_rom(code: &str, revision: u8) -> Option<Vec<u8>> {
    find(code, revision, None)
}

#[allow(dead_code)]
pub fn find_game_boy_rom(title: &str, checksum: u16) -> Option<Vec<u8>> {
    ROMS.iter().flat_map(|dir| files_in(Path::new(dir))).flat_map(|path| roms_in(&path)).find(|rom| {
        identify(rom).is_some_and(|game| game.title == title)
            && rom.get(0x14E..0x150) == Some(&checksum.to_be_bytes()[..])
    })
}

// 3DS dumps run to gigabytes, so this opens the file and reads only its header.
#[allow(dead_code)]
pub fn find_3ds(title_id: &str) -> Option<std::fs::File> {
    let is_3ds = |path: &Path| {
        let name = path.to_string_lossy().to_ascii_lowercase();
        [".3ds", ".cci", ".cxi", ".app"].iter().any(|extension| name.ends_with(extension))
    };
    ROMS.iter().flat_map(|dir| files_in(&Path::new(dir).join("3ds"))).filter(|path| is_3ds(path)).find_map(|path| {
        let mut file = std::fs::File::open(path).ok()?;
        let mut header = Vec::new();
        file.by_ref().take(0x200).read_to_end(&mut header).ok()?;
        identify(&header).filter(|game| game.code == title_id)?;
        Some(file)
    })
}

#[allow(dead_code)]
pub fn find_hack(code: &str, hack: &str) -> Option<Vec<u8>> {
    find(code, 0, Some(hack))
}

#[allow(dead_code)]
pub fn find_save(name: &str) -> Option<Vec<u8>> {
    std::fs::read(Path::new(SAVES).join(name)).ok()
}

#[allow(dead_code)]
pub struct Counted<R> {
    pub rom: R,
    pub read: u64,
}

impl<R: Read> Read for Counted<R> {
    fn read(&mut self, buf: &mut [u8]) -> std::io::Result<usize> {
        let read = self.rom.read(buf)?;
        self.read += read as u64;
        Ok(read)
    }
}

impl<R: Seek> Seek for Counted<R> {
    fn seek(&mut self, pos: SeekFrom) -> std::io::Result<u64> {
        self.rom.seek(pos)
    }
}

pub fn rgba_hash(image: &Image) -> String {
    Sha256::digest(image.rgba()).iter().map(|b| format!("{b:02x}")).collect()
}

#[allow(dead_code)]
pub fn animation_hash(animation: &AnimatedSprite) -> String {
    let mut hash = Sha256::new();
    for frame in &animation.frames {
        hash.update(frame.delay.to_le_bytes());
        hash.update(frame.pixels.iter().flat_map(|&i| animation.palette[i as usize]).collect::<Vec<u8>>());
    }
    hash.finalize().iter().map(|b| format!("{b:02x}")).collect()
}
