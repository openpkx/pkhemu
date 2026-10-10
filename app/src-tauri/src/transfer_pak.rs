use crate::backups::Reason;
use crate::emu::BackUp;
use crate::games_folder::GamesFolder;
use crate::rom::{self, Rom};
use crate::save::Slot;
use serde::{Deserialize, Serialize};
use std::io::Read;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Runtime};

include!(concat!(env!("OUT_DIR"), "/transfer_pak_crcs.rs"));

const HEADER: u64 = 0x150;
const FIRST_GENERATION: [&str; 3] = ["POKEMON RED", "POKEMON BLUE", "POKEMON YELLOW"];
const SECOND_GENERATION: [&str; 3] = ["POKEMON_GLD", "POKEMON_SLV", "PM_CRYSTAL"];

/// Whether the core's ini marks the game as one that uses the Transfer Pak. The core looks games up
/// by MD5 and then by the header's CRCs; the CRCs alone spare hashing the whole ROM.
pub fn uses(n64_rom: &[u8]) -> bool {
    let Some(header) = n64_rom.get(..0x40).and_then(rom_art::n64_big_endian) else { return false };
    let crc = |at: usize| u32::from_be_bytes([header[at], header[at + 1], header[at + 2], header[at + 3]]);
    CRCS.contains(&(crc(0x10), crc(0x14)))
}

pub fn path(rom: &str) -> String {
    format!("{}/transfer-pak.json", rom::data_dir(rom))
}

#[derive(Serialize, Deserialize, Debug, PartialEq)]
pub struct Setting {
    pub game: Option<String>,
}

pub async fn chosen<R: Runtime>(folder: &GamesFolder<'_, R>, rom: &str) -> Result<Option<Setting>, String> {
    let path = path(rom);
    if !folder.has_file(&path).await {
        return Ok(None);
    }
    let json = folder.read(&path).await.map_err(|e| format!("{path}: {e}"))?;
    serde_json::from_slice(&json).map(Some).map_err(|e| format!("{path}: {e}"))
}

pub async fn choose<R: Runtime>(folder: &GamesFolder<'_, R>, rom: &str, game: Option<String>) -> Result<(), String> {
    let json = serde_json::to_vec(&Setting { game }).map_err(|e| e.to_string())?;
    folder.write(&path(rom), &json).await
}

pub async fn setting<R: Runtime>(folder: &GamesFolder<'_, R>, rom: &str, n64_rom: &[u8]) -> Result<Setting, String> {
    match chosen(folder, rom).await? {
        Some(setting) => Ok(setting),
        None => Ok(Setting { game: pick(folder, n64_rom).await }),
    }
}

pub async fn fill<R: Runtime>(
    folder: &GamesFolder<'_, R>,
    rom: &str,
    n64_rom: &[u8],
) -> Result<Option<String>, String> {
    if let Some(setting) = chosen(folder, rom).await? {
        return Ok(setting.game);
    }
    let picked = pick(folder, n64_rom).await;
    if picked.is_some() {
        choose(folder, rom, picked.clone()).await?;
    }
    Ok(picked)
}

#[tauri::command]
pub async fn transfer_pak<R: Runtime>(
    app: AppHandle<R>,
    folder: String,
    path: String,
) -> Result<Option<Setting>, String> {
    if !rom::is_n64(&path) {
        return Ok(None);
    }
    let games = GamesFolder::open(&app, &folder);
    let header = header(&games, &path).await?;
    if !uses(&header) {
        return Ok(None);
    }
    setting(&games, &path, &header).await.map(Some)
}

#[tauri::command]
pub async fn choose_transfer_pak<R: Runtime>(
    app: AppHandle<R>,
    folder: String,
    path: String,
    game: Option<String>,
) -> Result<(), String> {
    choose(&GamesFolder::open(&app, &folder), &path, game).await
}

fn wanted(n64_rom: &[u8]) -> &'static [&'static [&'static str]] {
    let code = rom_art::identify(n64_rom).map(|game| game.code).unwrap_or_default();
    match code.get(..3) {
        Some("NPO") => &[&FIRST_GENERATION],
        Some("NP3") => &[&SECOND_GENERATION, &FIRST_GENERATION],
        _ => &[],
    }
}

fn first_of(titles: &[&str], library: &[(String, String)]) -> Option<String> {
    library
        .iter()
        .find(|(_, title)| titles.iter().any(|wanted| title.starts_with(wanted)))
        .map(|(path, _)| path.clone())
}

async fn pick<R: Runtime>(folder: &GamesFolder<'_, R>, n64_rom: &[u8]) -> Option<String> {
    let wanted = wanted(n64_rom);
    if wanted.is_empty() {
        return None;
    }
    let library = game_boy_titles(folder).await;
    wanted.iter().find_map(|titles| first_of(titles, &library))
}

async fn game_boy_titles<R: Runtime>(folder: &GamesFolder<'_, R>) -> Vec<(String, String)> {
    let mut titles = Vec::new();
    for path in game_boy_paths(folder).await {
        match header(folder, &path).await {
            Ok(header) => {
                if let Some(game) = rom_art::identify(&header) {
                    titles.push((path, game.title));
                }
            }
            Err(e) => eprintln!("{path}: {e}"),
        }
    }
    titles
}

async fn game_boy_paths<R: Runtime>(folder: &GamesFolder<'_, R>) -> Vec<String> {
    let mut paths = Vec::new();
    for system in ["gb", "gbc"] {
        let (roms, dirs) = roms_and_dirs(folder, system).await;
        paths.extend(roms);
        for dir in dirs {
            paths.extend(roms_and_dirs(folder, &dir).await.0);
        }
    }
    paths
}

async fn roms_and_dirs<R: Runtime>(folder: &GamesFolder<'_, R>, dir: &str) -> (Vec<String>, Vec<String>) {
    let mut entries = folder.read_dir(dir).await.unwrap_or_default();
    entries.retain(|entry| !entry.name.starts_with('.'));
    entries.sort_by_cached_key(|entry| entry.name.to_lowercase());
    let (dirs, files): (Vec<_>, Vec<_>) = entries.into_iter().partition(|entry| entry.is_directory);
    let roms =
        files.into_iter().map(|entry| format!("{dir}/{}", entry.name)).filter(|path| is_game_boy_rom(path)).collect();
    (roms, dirs.into_iter().map(|entry| format!("{dir}/{}", entry.name)).collect())
}

fn is_game_boy_rom(path: &str) -> bool {
    let extension = Path::new(path).extension().and_then(|e| e.to_str()).unwrap_or_default().to_ascii_lowercase();
    matches!(extension.as_str(), "gb" | "gbc" | "zip" | "7z")
}

pub async fn header<R: Runtime>(folder: &GamesFolder<'_, R>, path: &str) -> Result<Vec<u8>, String> {
    let file = folder.open_file(path).await?;
    let read = |rom: &mut dyn Read| {
        let mut header = Vec::new();
        rom.take(HEADER).read_to_end(&mut header).map(|_| header)
    };
    match rom::is_archive(path) {
        true => rom::read_archived(path, std::io::BufReader::new(file), |_, _, rom| read(rom)),
        false => read(&mut { file }).map_err(|e| format!("{path}: {e}")),
    }
}

/// Cartridge RAM size from the GB header, by the core's own table in `gb_cart.c`.
pub fn cart_ram_size(gb_rom: &[u8]) -> usize {
    let mbc2 = matches!(gb_rom.get(0x147), Some(0x05 | 0x06));
    match gb_rom.get(0x149) {
        Some(0x00) if mbc2 => 0x200,
        Some(0x01) => 0x800,
        Some(0x02) => 0x2000,
        Some(0x03) => 0x8000,
        Some(0x04) => 0x20000,
        Some(0x05) => 0x10000,
        _ => 0,
    }
}

pub fn working_copy(library: &[u8], ram_size: usize) -> Vec<u8> {
    let mut ram = library[..library.len().min(ram_size)].to_vec();
    ram.resize(ram_size, 0xFF);
    ram
}

pub fn merge(library: &[u8], working: &[u8], ram_size: usize) -> Vec<u8> {
    let ram = &working[..working.len().min(ram_size)];
    [ram, library.get(ram.len()..).unwrap_or_default()].concat()
}

pub struct Cart {
    pub dir: PathBuf,
    pub rom: Rom,
    pub save: Option<Vec<u8>>,
    pub slot: Slot,
    pub back_up: BackUp,
}

pub struct Files {
    pub save: PathBuf,
    pub gb_rom: PathBuf,
    pub n64_rom: PathBuf,
}

pub struct Session {
    dir: PathBuf,
    files: Files,
    ram_size: usize,
    library: Vec<u8>,
    seen: Vec<u8>,
    slot: Slot,
    back_up: BackUp,
    backed_up: bool,
}

impl Session {
    pub fn start(cart: Cart, n64_rom: &Rom) -> Result<Session, String> {
        let dir = cart.dir;
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).map_err(|e| format!("{}: {e}", dir.display()))?;
        let ram_size = cart_ram_size(&cart.rom.bytes);
        let library = cart.save.unwrap_or_default();
        let working = working_copy(&library, ram_size);
        let files = Files {
            save: dir.join("cart.sav"),
            gb_rom: dir.join(file_name(&cart.rom.name, "cart.gb")),
            n64_rom: dir.join(file_name(&n64_rom.name, "game.z64")),
        };
        for (path, bytes) in
            [(&files.save, &working), (&files.gb_rom, &cart.rom.bytes), (&files.n64_rom, &n64_rom.bytes)]
        {
            std::fs::write(path, bytes).map_err(|e| format!("{}: {e}", path.display()))?;
        }
        Ok(Session {
            dir,
            files,
            ram_size,
            library,
            seen: working,
            slot: cart.slot,
            back_up: cart.back_up,
            backed_up: false,
        })
    }

    pub fn files(&self) -> &Files {
        &self.files
    }

    pub fn check(&mut self) -> Option<(Slot, Vec<u8>)> {
        let working =
            std::fs::read(&self.files.save).inspect_err(|e| eprintln!("the Transfer Pak's save: {e}")).ok()?;
        if working == self.seen {
            return None;
        }
        if !self.backed_up && !self.library.is_empty() {
            if let Err(e) = (self.back_up)(Reason::TransferPak, &self.library) {
                eprintln!("backing up before the Transfer Pak writes: {e}");
            }
        }
        self.backed_up = true;
        self.library = merge(&self.library, &working, self.ram_size);
        self.seen = working;
        Some((self.slot.clone(), self.library.clone()))
    }
}

impl Drop for Session {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.dir);
    }
}

fn file_name(name: &str, fallback: &str) -> String {
    Path::new(name).file_name().map_or(fallback.into(), |name| name.to_string_lossy().into_owned())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tauri::async_runtime::block_on;

    #[test]
    fn merging_keeps_a_crystal_saves_clock_footer_and_replaces_its_cartridge_ram() {
        let footer = [7u8; 0x30];
        let library = [vec![1u8; 0x8000], footer.to_vec()].concat();
        let working = vec![2u8; 0x8000];

        assert_eq!(merge(&library, &working, 0x8000), [vec![2u8; 0x8000], footer.to_vec()].concat());
    }

    #[test]
    fn merging_takes_only_the_cartridge_ram_from_the_working_copy() {
        let library = [vec![1u8; 0x2000], vec![7u8; 0x10]].concat();
        let working = [vec![2u8; 0x2000], vec![9u8; 0x10]].concat();

        assert_eq!(merge(&library, &working, 0x2000), [vec![2u8; 0x2000], vec![7u8; 0x10]].concat());
    }

    #[test]
    fn merging_into_a_game_without_a_save_takes_the_working_copy() {
        assert_eq!(merge(&[], &[3u8; 0x2000], 0x2000), vec![3u8; 0x2000]);
    }

    #[test]
    fn the_working_copy_drops_the_footer_and_fills_a_missing_save() {
        let library = [vec![1u8; 0x8000], vec![7u8; 0x30]].concat();

        assert_eq!(working_copy(&library, 0x8000), vec![1u8; 0x8000]);
        assert_eq!(working_copy(&[], 0x2000), vec![0xFF; 0x2000]);
    }

    fn gb_header(title: &[u8], cart_type: u8, ram: u8) -> Vec<u8> {
        let mut rom = vec![0u8; 0x8000];
        rom[0x134..0x134 + title.len()].copy_from_slice(title);
        rom[0x147] = cart_type;
        rom[0x149] = ram;
        rom[0x14D] = rom[0x134..0x14D].iter().fold(0u8, |sum, &b| sum.wrapping_sub(b).wrapping_sub(1));
        rom
    }

    #[test]
    fn reads_the_cartridge_ram_size_from_the_header() {
        assert_eq!(cart_ram_size(&gb_header(b"PM_CRYSTAL", 0x10, 0x03)), 0x8000);
        assert_eq!(cart_ram_size(&gb_header(b"TETRIS", 0x00, 0x00)), 0);
        assert_eq!(cart_ram_size(&gb_header(b"MBC2", 0x06, 0x00)), 0x200);
    }

    fn n64_header(code: &[u8; 4], crcs: (u32, u32)) -> Vec<u8> {
        let mut rom = vec![0u8; 0x1000];
        rom[..4].copy_from_slice(&[0x80, 0x37, 0x12, 0x40]);
        rom[0x10..0x14].copy_from_slice(&crcs.0.to_be_bytes());
        rom[0x14..0x18].copy_from_slice(&crcs.1.to_be_bytes());
        rom[0x3B..0x3F].copy_from_slice(code);
        rom
    }

    const STADIUM_CRCS: (u32, u32) = (0x90F5D9B3, 0x9D0EDCF0);
    const STADIUM_2_CRCS: (u32, u32) = (0x03571182, 0x892FD06D);

    #[test]
    fn knows_the_games_the_cores_ini_marks_for_the_transfer_pak() {
        assert!(uses(&n64_header(b"NPOE", STADIUM_CRCS)));
        assert!(uses(&n64_header(b"NP3E", STADIUM_2_CRCS)));
        assert!(!uses(&n64_header(b"NSME", (0x635A2BFF, 0x8B022326))));
        let v64: Vec<u8> = n64_header(b"NPOE", STADIUM_CRCS).chunks(2).flat_map(|pair| [pair[1], pair[0]]).collect();
        assert!(uses(&v64));
    }

    fn library(name: &str, games: &[(&str, &[u8])]) -> GamesFolder<'static, tauri::Wry> {
        let root = std::env::temp_dir().join(format!("pkh-emu-transfer-pak-{name}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        let folder = GamesFolder::at(root);
        for (path, title) in games {
            block_on(folder.write(path, &gb_header(title, 0x13, 0x03))).unwrap();
        }
        folder
    }

    #[test]
    fn stadium_picks_the_first_red_blue_or_yellow_in_the_library() {
        let folder = library(
            "stadium",
            &[
                ("gbc/Crystal.gbc", b"PM_CRYSTAL"),
                ("gb/Tetris.gb", b"TETRIS"),
                ("gb/Red.gb", b"POKEMON RED"),
                ("gb/Yellow.gb", b"POKEMON YELLOW"),
            ],
        );

        let filled = block_on(fill(&folder, "n64/Stadium.z64", &n64_header(b"NPOE", STADIUM_CRCS)));

        assert_eq!(filled, Ok(Some("gb/Red.gb".into())));
        assert_eq!(block_on(chosen(&folder, "n64/Stadium.z64")), Ok(Some(Setting { game: Some("gb/Red.gb".into()) })));
    }

    #[test]
    fn stadium_2_picks_crystal_over_red() {
        let folder = library("stadium-2", &[("gb/Red.gb", b"POKEMON RED"), ("gbc/Hacks/Crystal.gbc", b"PM_CRYSTAL")]);

        let filled = block_on(fill(&folder, "n64/Stadium 2.z64", &n64_header(b"NP3E", STADIUM_2_CRCS)));

        assert_eq!(filled, Ok(Some("gbc/Hacks/Crystal.gbc".into())));
    }

    #[test]
    fn stadium_2_falls_back_to_red() {
        let folder = library("stadium-2-red", &[("gb/Red.gb", b"POKEMON RED")]);

        assert_eq!(
            block_on(fill(&folder, "n64/Stadium 2.z64", &n64_header(b"NP3E", STADIUM_2_CRCS))),
            Ok(Some("gb/Red.gb".into()))
        );
    }

    #[test]
    fn leaves_the_setting_unchosen_when_nothing_fits() {
        let folder = library("none", &[("gb/Tetris.gb", b"TETRIS")]);

        assert_eq!(block_on(fill(&folder, "n64/Stadium.z64", &n64_header(b"NPOE", STADIUM_CRCS))), Ok(None));
        assert_eq!(block_on(chosen(&folder, "n64/Stadium.z64")), Ok(None));
    }

    #[test]
    fn keeps_a_choice_of_none() {
        let folder = library("chosen-none", &[("gb/Red.gb", b"POKEMON RED")]);
        block_on(choose(&folder, "n64/Stadium.z64", None)).unwrap();

        assert_eq!(block_on(fill(&folder, "n64/Stadium.z64", &n64_header(b"NPOE", STADIUM_CRCS))), Ok(None));
        assert!(block_on(folder.has_file("n64/Stadium/transfer-pak.json")));
    }

    #[test]
    fn shows_what_the_first_start_would_pick_without_choosing_it() {
        let folder = library("setting", &[("gb/Red.gb", b"POKEMON RED")]);

        let setting = block_on(setting(&folder, "n64/Stadium.z64", &n64_header(b"NPOE", STADIUM_CRCS)));

        assert_eq!(setting, Ok(Setting { game: Some("gb/Red.gb".into()) }));
        assert_eq!(block_on(chosen(&folder, "n64/Stadium.z64")), Ok(None));
    }

    #[test]
    fn reads_the_header_of_a_zipped_game() {
        let folder = library("zipped", &[]);
        let mut zip = zip::ZipWriter::new(std::io::Cursor::new(Vec::new()));
        zip.start_file("Red.gb", zip::write::SimpleFileOptions::default()).unwrap();
        std::io::Write::write_all(&mut zip, &gb_header(b"POKEMON RED", 0x13, 0x03)).unwrap();
        block_on(folder.write("gb/Red.zip", &zip.finish().unwrap().into_inner())).unwrap();

        assert_eq!(
            block_on(fill(&folder, "n64/Stadium.z64", &n64_header(b"NPOE", STADIUM_CRCS))),
            Ok(Some("gb/Red.zip".into()))
        );
    }

    fn session(name: &str, save: Option<Vec<u8>>, backups: std::sync::Arc<std::sync::Mutex<Vec<Vec<u8>>>>) -> Session {
        let dir = std::env::temp_dir().join(format!("pkh-emu-transfer-pak-session-{name}-{}", std::process::id()));
        let (slot, _) = Slot::new("gbc/Crystal.sav".into(), Vec::new());
        let cart = Cart {
            dir,
            rom: Rom { name: "Crystal.gbc".into(), bytes: gb_header(b"PM_CRYSTAL", 0x10, 0x03) },
            save,
            slot,
            back_up: Box::new(move |reason, save| {
                assert_eq!(reason, Reason::TransferPak);
                backups.lock().unwrap().push(save.to_vec());
                Ok(())
            }),
        };
        Session::start(cart, &Rom { name: "Stadium 2.z64".into(), bytes: n64_header(b"NP3E", STADIUM_2_CRCS) }).unwrap()
    }

    #[test]
    fn writes_the_working_copy_and_both_roms_for_the_core() {
        let library = [vec![1u8; 0x8000], vec![7u8; 0x30]].concat();
        let session = session("files", Some(library), Default::default());

        assert_eq!(std::fs::read(&session.files().save).unwrap(), vec![1u8; 0x8000]);
        assert_eq!(std::fs::read(&session.files().gb_rom).unwrap(), gb_header(b"PM_CRYSTAL", 0x10, 0x03));
        assert!(session.files().n64_rom.ends_with("Stadium 2.z64"));
    }

    #[test]
    fn creates_the_working_copy_for_a_game_without_a_save() {
        let session = session("no-save", None, Default::default());

        assert_eq!(std::fs::read(&session.files().save).unwrap(), vec![0xFF; 0x8000]);
    }

    #[test]
    fn merges_only_what_the_core_changed_after_one_backup() {
        let library = [vec![1u8; 0x8000], vec![7u8; 0x30]].concat();
        let backups = std::sync::Arc::default();
        let mut session = session("merge", Some(library.clone()), std::sync::Arc::clone(&backups));
        assert_eq!(session.check(), None);

        std::fs::write(&session.files().save, vec![2u8; 0x8000]).unwrap();
        let (_, first) = session.check().unwrap();
        std::fs::write(&session.files().save, vec![3u8; 0x8000]).unwrap();
        let (_, second) = session.check().unwrap();

        assert_eq!(first, [vec![2u8; 0x8000], vec![7u8; 0x30]].concat());
        assert_eq!(second, [vec![3u8; 0x8000], vec![7u8; 0x30]].concat());
        assert_eq!(session.check(), None);
        assert_eq!(*backups.lock().unwrap(), [library]);
    }

    #[test]
    fn removes_its_files_when_the_game_ends() {
        let session = session("ends", None, Default::default());
        let dir = session.dir.clone();

        drop(session);

        assert!(!dir.exists());
    }
}
