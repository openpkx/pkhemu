use std::fs::File;
use std::io::{BufReader, Read, Seek};
use std::path::{Path, PathBuf};

const ROM_EXTENSIONS: [&str; 7] = ["gb", "gbc", "gba", "nds", "z64", "n64", "v64"];
pub const THREE_DS_EXTENSIONS: [&str; 5] = ["3ds", "3dsx", "cci", "cxi", "app"];

fn file_name(path: &str) -> String {
    Path::new(path).file_name().map_or(path.into(), |name| name.to_string_lossy().into_owned())
}

fn has_extension(path: &Path, extensions: &[&str]) -> bool {
    path.extension()
        .and_then(|e| e.to_str())
        .is_some_and(|e| extensions.iter().any(|x| e.eq_ignore_ascii_case(x)))
}

pub struct Rom {
    pub name: String,
    pub bytes: Vec<u8>,
    pub file: Option<RomFile>,
}

/// A game a core reads from its path, kept open while it plays.
pub struct RomFile {
    pub path: String,
    pub open: File,
}

impl RomFile {
    pub fn new(open: File, path: String) -> RomFile {
        RomFile { path, open }
    }
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub enum System {
    Gb,
    Gba,
    Ds,
    N64,
    ThreeDs,
}

impl Rom {
    pub fn at(name: &str, file: RomFile) -> Rom {
        Rom { name: file_name(name), bytes: Vec::new(), file: Some(file) }
    }

    pub fn system(&self) -> System {
        if is_3ds(&self.name) {
            System::ThreeDs
        } else if self.is_ds() {
            System::Ds
        } else if self.is_gb() {
            System::Gb
        } else if has_extension(Path::new(&self.name), &["z64", "n64", "v64"]) {
            System::N64
        } else {
            System::Gba
        }
    }

    pub fn is_ds(&self) -> bool {
        has_extension(Path::new(&self.name), &["nds"])
    }

    pub fn is_gb(&self) -> bool {
        has_extension(Path::new(&self.name), &["gb", "gbc"])
    }
}

// An archived ROM's system comes from the folder it sits in.
pub fn is_n64(path: &str) -> bool {
    let n64 = ["z64", "n64", "v64"];
    match is_archive(path) {
        true => path.split('/').next().is_some_and(|system| system.eq_ignore_ascii_case("n64")),
        false => has_extension(Path::new(path), &n64),
    }
}

pub fn save_path(rom: &str) -> String {
    Path::new(rom).with_extension("sav").to_string_lossy().into_owned()
}

pub fn dsv_path(rom: &str) -> String {
    Path::new(rom).with_extension("dsv").to_string_lossy().into_owned()
}

pub fn game_name(rom: &str) -> String {
    Path::new(rom).file_stem().map_or_else(String::new, |stem| stem.to_string_lossy().into_owned())
}

pub fn data_dir(rom: &str) -> String {
    Path::new(rom).with_extension("").to_string_lossy().into_owned()
}

pub fn resume_path(rom: &str) -> String {
    format!("{}/states/resume.state", data_dir(rom))
}

pub fn resume_screenshot_path(rom: &str) -> String {
    format!("{}/states/resume.png", data_dir(rom))
}

pub fn resume_info_path(rom: &str) -> String {
    format!("{}/states/resume.json", data_dir(rom))
}

pub const STATE_SLOTS: u8 = 10;

#[derive(Clone, Copy, Debug, PartialEq)]
pub enum StateName {
    Slot(u8),
    BeforeLoad,
}

impl From<u8> for StateName {
    fn from(slot: u8) -> StateName {
        StateName::Slot(slot)
    }
}

impl std::fmt::Display for StateName {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        match self {
            StateName::Slot(slot) => write!(f, "slot-{slot}"),
            StateName::BeforeLoad => write!(f, "before-load"),
        }
    }
}

pub fn state_path(rom: &str, name: impl Into<StateName>) -> String {
    format!("{}/states/{}.state", data_dir(rom), name.into())
}

pub fn state_screenshot_path(rom: &str, name: impl Into<StateName>) -> String {
    format!("{}/states/{}.png", data_dir(rom), name.into())
}

pub fn state_info_path(rom: &str, name: impl Into<StateName>) -> String {
    format!("{}/states/{}.json", data_dir(rom), name.into())
}

pub fn state_save_path(rom: &str, name: impl Into<StateName>, extension: &str) -> String {
    format!("{}/states/{}.{extension}", data_dir(rom), name.into())
}

pub fn is_archive(name: &str) -> bool {
    has_extension(Path::new(name), &["zip", "7z"])
}

pub fn unpack(name: &str, bytes: Vec<u8>) -> Result<Rom, String> {
    if !is_archive(name) {
        return Ok(Rom { name: file_name(name), bytes, file: None });
    }
    read_archived(name, std::io::Cursor::new(bytes), |inner, size, rom| {
        let mut bytes = Vec::with_capacity(size as usize);
        rom.read_to_end(&mut bytes)?;
        Ok(Rom { name: file_name(inner), bytes, file: None })
    })
}

/// Unpacks the ROM to a file in `dir` that disappears once the returned handle is dropped.
pub fn unpack_to_file(name: &str, archive: impl Read + Seek, dir: &Path) -> Result<File, String> {
    std::fs::create_dir_all(dir).map_err(|e| format!("{}: {e}", dir.display()))?;
    let mut file = tempfile::tempfile_in(dir).map_err(|e| format!("{}: {e}", dir.display()))?;
    read_archived(name, BufReader::new(archive), |_, _, rom| std::io::copy(rom, &mut file))?;
    file.rewind().map_err(|e| format!("{name}: {e}"))?;
    Ok(file)
}

/// Hands `read` the first ROM in a zip or 7z archive, with its name inside the archive and its size.
pub fn read_archived<T>(name: &str, archive: impl Read + Seek, read: impl ReadRom<T>) -> Result<T, String> {
    find_archived(name, archive, read)?.ok_or_else(|| format!("{name}: {NO_ROM}"))
}

/// Like `read_archived`, but an archive that holds no ROM is `None` rather than an error.
pub fn find_archived<T>(name: &str, archive: impl Read + Seek, read: impl ReadRom<T>) -> Result<Option<T>, String> {
    find_in_archive(name, archive, is_rom, read)
}

/// Copies the first 3DS game in a zip or 7z to a new file in `dir`, with its name inside the archive.
pub fn unpack_3ds(name: &str, archive: impl Read + Seek, dir: &Path) -> Result<Option<(String, PathBuf)>, String> {
    let copy = |inner: &str, _, game: &mut dyn Read| {
        std::fs::create_dir_all(dir)?;
        let mut file = tempfile::NamedTempFile::new_in(dir)?;
        std::io::copy(game, &mut file)?;
        let (_, path) = file.keep().map_err(|e| e.error)?;
        Ok((inner.to_owned(), path))
    };
    find_in_archive(name, BufReader::new(archive), crate::three_ds::is_import, copy)
}

fn find_in_archive<T>(
    name: &str,
    archive: impl Read + Seek,
    wanted: fn(&str) -> bool,
    read: impl ReadRom<T>,
) -> Result<Option<T>, String> {
    let result = match has_extension(Path::new(name), &["7z"]) {
        true => read_7z(archive, wanted, read),
        false => read_zip(archive, wanted, read),
    };
    result.map_err(|e| format!("{name}: {e}"))
}

pub trait ReadRom<T>: FnOnce(&str, u64, &mut dyn Read) -> std::io::Result<T> {}

impl<T, F: FnOnce(&str, u64, &mut dyn Read) -> std::io::Result<T>> ReadRom<T> for F {}

const NO_ROM: &str = "no ROM inside";

fn read_zip<T>(
    archive: impl Read + Seek,
    wanted: fn(&str) -> bool,
    read: impl ReadRom<T>,
) -> Result<Option<T>, String> {
    let mut archive = zip::ZipArchive::new(archive).map_err(|e| e.to_string())?;
    let found = |name: &str| !name.ends_with('/') && wanted(name);
    let Some(index) = (0..archive.len()).find(|&i| archive.name_for_index(i).is_some_and(found)) else {
        return Ok(None);
    };
    let mut rom = archive.by_index(index).map_err(|e| e.to_string())?;
    let name = rom.name().to_owned();
    read(&name, rom.size(), &mut rom).map(Some).map_err(|e| e.to_string())
}

fn read_7z<T>(
    mut source: impl Read + Seek,
    wanted: fn(&str) -> bool,
    read: impl ReadRom<T>,
) -> Result<Option<T>, String> {
    let password = sevenz_rust2::Password::empty();
    let archive = sevenz_rust2::Archive::read(&mut source, &password).map_err(|e| e.to_string())?;
    let Some(index) = archive.files.iter().position(|f| !f.is_directory && wanted(&f.name)) else {
        return Ok(None);
    };
    let rom = &archive.files[index];
    let Some(block) = archive.stream_map.file_block_index[index] else {
        return read(&rom.name, 0, &mut std::io::empty()).map(Some).map_err(|e| e.to_string());
    };
    let threads = std::thread::available_parallelism().map_or(1, |n| n.get() as u32);
    let mut read = Some(read);
    let mut result = None;
    sevenz_rust2::BlockDecoder::new(threads, block, &archive, &password, &mut source)
        .for_each_entries(&mut |entry, reader| {
            if !std::ptr::eq(entry, rom) {
                // A solid block decodes in order, so the entries before the ROM have to be read through.
                std::io::copy(reader, &mut std::io::sink())?;
                return Ok(true);
            }
            result = read.take().map(|read| read(&rom.name, rom.size, reader));
            Ok(false)
        })
        .map_err(|e| e.to_string())?;
    result.ok_or(NO_ROM)?.map(Some).map_err(|e| e.to_string())
}

pub(crate) fn is_3ds(name: &str) -> bool {
    has_extension(Path::new(name), &THREE_DS_EXTENSIONS)
}

pub(crate) fn is_rom(name: &str) -> bool {
    !name.ends_with('/') && has_extension(Path::new(name), &ROM_EXTENSIONS)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_games::{sevenz_of, zip_of};

    fn solid_sevenz_of(files: &[(&str, &[u8])]) -> Vec<u8> {
        let mut archive = sevenz_rust2::ArchiveWriter::new(std::io::Cursor::new(Vec::new())).unwrap();
        let entries = files.iter().map(|(name, _)| sevenz_rust2::ArchiveEntry::new_file(name)).collect();
        archive.push_archive_entries(entries, files.iter().map(|(_, bytes)| (*bytes).into()).collect()).unwrap();
        archive.finish().unwrap().into_inner()
    }

    #[test]
    fn puts_the_save_next_to_the_rom() {
        assert_eq!(save_path("gba/Emerald (USA).gba"), "gba/Emerald (USA).sav");
        assert_eq!(save_path("gbc/Crystal.v1.1.zip"), "gbc/Crystal.v1.1.sav");
        assert_eq!(save_path("nds/HeartGold.nds"), "nds/HeartGold.sav");
    }

    #[test]
    fn keeps_the_resume_state_in_the_rom_folder() {
        assert_eq!(resume_path("gba/Emerald (USA).gba"), "gba/Emerald (USA)/states/resume.state");
        assert_eq!(resume_path("gbc/Crystal.v1.1.zip"), "gbc/Crystal.v1.1/states/resume.state");
    }

    #[test]
    fn keeps_state_slots_next_to_the_resume_state() {
        assert_eq!(state_path("gba/Emerald.gba", 3), "gba/Emerald/states/slot-3.state");
        assert_eq!(state_screenshot_path("gba/Emerald.gba", 3), "gba/Emerald/states/slot-3.png");
        assert_eq!(state_info_path("gba/Emerald.gba", 10), "gba/Emerald/states/slot-10.json");
        assert_eq!(state_save_path("gba/Emerald.gba", 1, "sav"), "gba/Emerald/states/slot-1.sav");
        assert_eq!(state_save_path("nds/HeartGold.zip", 1, "dsv"), "nds/HeartGold/states/slot-1.dsv");
    }

    #[test]
    fn keeps_the_state_from_before_a_load_beside_the_slots() {
        assert_eq!(state_path("gba/Emerald.gba", StateName::BeforeLoad), "gba/Emerald/states/before-load.state");
        assert_eq!(state_save_path("gba/Emerald.gba", StateName::BeforeLoad, "sav"), "gba/Emerald/states/before-load.sav");
    }

    #[test]
    fn passes_a_plain_rom_through() {
        let rom = unpack("gba/Game.gba", b"rom bytes".to_vec()).unwrap();

        assert_eq!((rom.name.as_str(), rom.bytes.as_slice()), ("Game.gba", &b"rom bytes"[..]));
    }

    #[test]
    fn extracts_the_rom_from_a_zip() {
        let zip = zip_of(&[("readme.txt", b"hello"), ("Game (USA).GBC", b"rom bytes")]);

        let rom = unpack("gbc/Game.zip", zip).unwrap();

        assert_eq!((rom.name.as_str(), rom.bytes.as_slice()), ("Game (USA).GBC", &b"rom bytes"[..]));
    }

    #[test]
    fn extracts_a_ds_rom_from_a_zip() {
        let zip = zip_of(&[("games/HeartGold.nds", b"rom bytes")]);

        let rom = unpack("nds/HeartGold.zip", zip).unwrap();

        assert_eq!(rom.name, "HeartGold.nds");
        assert!(rom.is_ds());
    }

    #[test]
    fn tells_ds_roms_apart() {
        let rom = |name: &str| Rom { name: name.into(), bytes: Vec::new(), file: None };

        assert!(rom("HeartGold.NDS").is_ds());
        assert!(!rom("Emerald.gba").is_ds());
        assert!(!rom("Crystal.gbc").is_ds());
    }

    #[test]
    fn tells_each_roms_system() {
        let system = |name: &str| Rom { name: name.into(), bytes: Vec::new(), file: None }.system();

        assert_eq!(system("Crystal.gbc"), System::Gb);
        assert_eq!(system("Emerald.gba"), System::Gba);
        assert_eq!(system("HeartGold.NDS"), System::Ds);
        assert_eq!(system("Stadium.z64"), System::N64);
        assert_eq!(system("Stadium 2.N64"), System::N64);
        assert_eq!(system("Stadium.v64"), System::N64);
        for name in ["PKSM.3dsx", "X.3DS", "X.cci", "X.cxi", "X.app"] {
            assert_eq!(system(name), System::ThreeDs, "{name}");
        }
    }

    #[test]
    fn treats_the_zip_extension_case_insensitively() {
        let zip = zip_of(&[("game.gb", b"rom bytes")]);

        assert_eq!(unpack("gb/GAME.ZIP", zip).unwrap().bytes, b"rom bytes");
    }

    #[test]
    fn fails_on_a_zip_without_a_rom() {
        assert!(unpack("gb/Empty.zip", zip_of(&[("readme.txt", b"hello")])).is_err());
    }

    #[test]
    fn fails_on_a_broken_zip() {
        assert!(unpack("gb/Broken.zip", b"not a zip".to_vec()).is_err());
    }

    #[test]
    fn extracts_the_rom_from_a_7z() {
        let archive = sevenz_of(&[("readme.txt", b"hello"), ("games/Game (USA).GBC", b"rom bytes")]);

        let rom = unpack("gbc/Game.7Z", archive).unwrap();

        assert_eq!((rom.name.as_str(), rom.bytes.as_slice()), ("Game (USA).GBC", &b"rom bytes"[..]));
    }

    #[test]
    fn extracts_the_rom_from_a_solid_7z() {
        let archive = solid_sevenz_of(&[("readme.txt", b"hello"), ("Game.nds", b"rom bytes"), ("notes.txt", b"bye")]);

        let rom = unpack("nds/Game.7z", archive).unwrap();

        assert_eq!((rom.name.as_str(), rom.bytes.as_slice()), ("Game.nds", &b"rom bytes"[..]));
    }

    #[test]
    fn takes_the_first_rom_in_a_7z_like_in_a_zip() {
        let files: &[(&str, &[u8])] = &[("First.gba", b"first"), ("Second.gba", b"second")];

        assert_eq!(unpack("gba/Game.7z", sevenz_of(files)).unwrap().bytes, b"first");
        assert_eq!(unpack("gba/Game.zip", zip_of(files)).unwrap().bytes, b"first");
    }

    #[test]
    fn stops_reading_a_7z_at_the_rom() {
        let mut archive = sevenz_rust2::ArchiveWriter::new(std::io::Cursor::new(Vec::new())).unwrap();
        let rom = archive.push_archive_entry(sevenz_rust2::ArchiveEntry::new_file("Game.gba"), Some(&b"rom bytes"[..]));
        let rom_end = 32 + rom.unwrap().compressed_size as usize;
        let notes = sevenz_rust2::ArchiveEntry::new_file("notes.txt");
        archive.push_archive_entry(notes, Some(&b"notes that come after the ROM"[..])).unwrap();
        let mut bytes = archive.finish().unwrap().into_inner();
        bytes[rom_end + 4] ^= 0xFF;

        assert_eq!(unpack("gba/Game.7z", bytes).unwrap().bytes, b"rom bytes");
    }

    #[test]
    fn unpacks_the_first_3ds_game_in_an_archive() {
        let dir = std::env::temp_dir().join(format!("pkh-emu-unpack-3ds-{}", std::process::id()));
        let files: &[(&str, &[u8])] = &[("Game.gba", b"gba"), ("games/Game.3ds", b"first"), ("Other.cia", b"second")];

        let archives =
            [("Game.zip", zip_of(files)), ("Game.7z", sevenz_of(files)), ("Game.7z", solid_sevenz_of(files))];

        for (name, archive) in archives {
            let (inner, path) = unpack_3ds(name, std::io::Cursor::new(archive), &dir).unwrap().unwrap();

            assert_eq!((inner.as_str(), std::fs::read(path).unwrap()), ("games/Game.3ds", b"first".to_vec()), "{name}");
        }
        assert_eq!(unpack_3ds("Game.zip", std::io::Cursor::new(zip_of(&[("Game.gba", b"gba")])), &dir), Ok(None));
        let _ = std::fs::remove_dir_all(dir);
    }

    #[test]
    fn fails_on_a_7z_without_a_rom() {
        assert!(unpack("gb/Empty.7z", sevenz_of(&[("readme.txt", b"hello")])).is_err());
    }

    #[test]
    fn fails_on_a_broken_7z() {
        assert!(unpack("gb/Broken.7z", b"not a 7z".to_vec()).is_err());
    }
}
