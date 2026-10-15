#[cfg_attr(target_os = "android", path = "patching/android.rs")]
#[cfg_attr(target_os = "ios", path = "patching/ios.rs")]
#[cfg_attr(desktop, path = "patching/desktop.rs")]
mod platform;
mod retail;

use std::io::{BufReader, BufWriter, Read};
use std::sync::Arc;

use serde::Serialize;
use sha2::{Digest, Sha256};
use tauri::{AppHandle, Runtime, State};

use crate::files::open_picked;
use crate::games_folder::{DirEntry, GamesFolder};
use crate::import::millis;
use crate::index::{Index, RomCrc32};
use crate::patch::{self, Fit, PatchError, System};
use crate::rom;

#[derive(Serialize, Debug, PartialEq)]
#[serde(tag = "kind", rename_all = "camelCase", rename_all_fields = "camelCase")]
pub enum Failure {
    WrongBase { expected_crc32: Option<u32> },
    UnknownFormat,
    Malformed,
    TooBig,
    NameTaken,
    BadName,
    Failed { message: String },
}

impl From<PatchError> for Failure {
    fn from(error: PatchError) -> Self {
        match error {
            PatchError::WrongBase { expected_crc32 } => Failure::WrongBase { expected_crc32 },
            PatchError::UnknownFormat => Failure::UnknownFormat,
            PatchError::Malformed => Failure::Malformed,
            PatchError::TooBig => Failure::TooBig,
            PatchError::Io(message) => Failure::Failed { message },
        }
    }
}

impl From<String> for Failure {
    fn from(message: String) -> Self {
        Failure::Failed { message }
    }
}

impl From<std::io::Error> for Failure {
    fn from(error: std::io::Error) -> Self {
        error.to_string().into()
    }
}

fn system(name: &str) -> Result<System, Failure> {
    match name {
        "gb" | "gbc" => Ok(System::GameBoy),
        "gba" => Ok(System::GameBoyAdvance),
        "nds" => Ok(System::Ds),
        "n64" => Ok(System::N64),
        _ => Err(format!("{name} isn't a system").into()),
    }
}

fn extension(system: &str) -> &str {
    match system {
        "n64" => "z64",
        _ => system,
    }
}

pub(crate) fn valid(name: &str) -> bool {
    !name.is_empty()
        && name.trim() == name
        && !name.starts_with('.')
        && !name.chars().any(|c| c.is_control() || matches!(c, '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|'))
}

// A ROM's save, save states and data folder share its name, so any of them already there makes the name taken.
fn taken(entries: &[DirEntry], name: &str) -> bool {
    entries.iter().any(|entry| {
        let stem = match entry.name.rsplit_once('.') {
            Some((stem, _)) if !entry.is_directory => stem,
            _ => &entry.name,
        };
        stem.eq_ignore_ascii_case(name)
    })
}

async fn target<R: Runtime>(games: &GamesFolder<'_, R>, system: &str, name: &str) -> Result<String, Failure> {
    self::system(system)?;
    if !valid(name) {
        return Err(Failure::BadName);
    }
    let entries = games.read_dir(system).await?;
    if taken(&entries, name) {
        return Err(Failure::NameTaken);
    }
    Ok(format!("{system}/{name}.{}", extension(system)))
}

struct Hashing<R> {
    inner: R,
    hash: Sha256,
}

impl<R: Read> Read for Hashing<R> {
    fn read(&mut self, buf: &mut [u8]) -> std::io::Result<usize> {
        let read = self.inner.read(buf)?;
        self.hash.update(&buf[..read]);
        Ok(read)
    }
}

#[derive(Serialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Created {
    path: String,
    sha256: String,
    base_checked: bool,
}

async fn create<R: Runtime>(
    games: &GamesFolder<'_, R>,
    base: &str,
    system: &str,
    name: &str,
    patch: impl Read + Send + 'static,
) -> Result<Created, Failure> {
    let path = target(games, system, name).await?;
    let cartridge = self::system(system)?;
    let base = games.open_rom(base).await?;
    let output = games.create_file(&path).await?;
    let (output, sha256, base_checked) = tauri::async_runtime::spawn_blocking(move || -> Result<_, Failure> {
        let mut patch = Hashing { inner: BufReader::new(patch), hash: Sha256::new() };
        let mut output = BufWriter::new(output);
        let patched = patch::apply(&mut patch, base, &mut output, cartridge)?;
        std::io::copy(&mut patch, &mut std::io::sink())?;
        let output = output.into_inner().map_err(|e| e.into_error())?;
        let sha256 = patch.hash.finalize().iter().map(|byte| format!("{byte:02x}")).collect();
        Ok((output, sha256, patched.base_checked))
    })
    .await
    .map_err(|e| e.to_string())??;
    output.finish().await?;
    Ok(Created { path, sha256, base_checked })
}

const NAMES: [(&str, &str); 16] = [
    ("AXV", "Ruby"),
    ("AXP", "Sapphire"),
    ("BPE", "Emerald"),
    ("BPR", "FireRed"),
    ("BPG", "LeafGreen"),
    ("ADA", "Diamond"),
    ("APA", "Pearl"),
    ("CPU", "Platinum"),
    ("IPK", "HeartGold"),
    ("IPG", "SoulSilver"),
    ("IRB", "Black"),
    ("IRA", "White"),
    ("IRE", "Black 2"),
    ("IRD", "White 2"),
    ("NPO", "Stadium"),
    ("NP3", "Stadium 2"),
];

const GAME_BOY_NAMES: [(&str, &str); 6] = [
    ("POKEMON RED", "Red"),
    ("POKEMON BLUE", "Blue"),
    ("POKEMON YELLOW", "Yellow"),
    ("POKEMON_GLDAAUE", "Gold"),
    ("POKEMON_SLVAAXE", "Silver"),
    ("PM_CRYSTAL", "Crystal"),
];

fn language(code: &str) -> Option<&'static str> {
    Some(match code.chars().nth(3)? {
        'E' | 'O' => "EN",
        'J' => "JP",
        'F' => "FR",
        'D' => "DE",
        'I' => "IT",
        'S' => "ES",
        'K' => "KO",
        _ => return None,
    })
}

fn known_name(game: &rom_art::Game) -> Option<&'static str> {
    let known =
        |names: &[(&str, &'static str)], key: &str| names.iter().find(|(k, _)| *k == key).map(|(_, name)| *name);
    match game.platform {
        rom_art::Platform::Gb | rom_art::Platform::Gbc => known(&GAME_BOY_NAMES, &game.title),
        _ => game.code.get(..3).and_then(|code| known(&NAMES, code)),
    }
}

pub fn game_name(rom: &[u8]) -> Option<&'static str> {
    known_name(&rom_art::identify(rom)?)
}

pub fn build(rom: &[u8]) -> Option<String> {
    Some(label(&rom_art::identify(rom)?))
}

pub fn retail_build(crc32: u32) -> Option<String> {
    let &(_, platform, key, revision) = retail::RETAIL.iter().find(|(retail, ..)| *retail == crc32)?;
    let (title, code) = match platform {
        rom_art::Platform::Gb | rom_art::Platform::Gbc => (key, ""),
        _ => ("", key),
    };
    Some(label(&rom_art::Game { platform, title: title.into(), code: code.into(), revision }))
}

fn label(game: &rom_art::Game) -> String {
    let name = known_name(game);
    let language = match game.platform {
        rom_art::Platform::Gb | rom_art::Platform::Gbc => None,
        _ => language(&game.code),
    };
    let name = name.map_or_else(|| [game.title.as_str(), game.code.as_str()].join(" ").trim().to_owned(), String::from);
    let version = match game.platform {
        rom_art::Platform::Nds if game.revision == 0 => None,
        rom_art::Platform::Nds => Some(format!("rev {}", game.revision)),
        _ => Some(format!("1.{}", game.revision)),
    };
    [Some(name.as_str()), language, version.as_deref()].into_iter().flatten().collect::<Vec<_>>().join(" ")
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PickedPatch {
    file: String,
    name: String,
    format: Option<&'static str>,
    base_checked: bool,
}

pub(crate) fn format_of(file: impl Read) -> Option<&'static str> {
    patch::inspect(file).ok().flatten().map(|inspected| format(inspected.format))
}

pub(crate) fn format(format: patch::Format) -> &'static str {
    match format {
        patch::Format::Ips => "ips",
        patch::Format::Ups => "ups",
        patch::Format::Bps => "bps",
        patch::Format::Xdelta => "xdelta",
    }
}

#[tauri::command]
pub async fn patch_pick<R: Runtime>(app: AppHandle<R>) -> Result<Option<PickedPatch>, String> {
    let Some((file, name)) = platform::pick_file(&app).await? else {
        return Ok(None);
    };
    picked_patch(&app, file, name).await.map(Some)
}

#[tauri::command]
pub async fn patch_dropped<R: Runtime>(app: AppHandle<R>, file: String) -> Result<PickedPatch, String> {
    let name = std::path::Path::new(&file).file_name().map_or_else(String::new, |name| name.to_string_lossy().into_owned());
    picked_patch(&app, file, name).await
}

async fn picked_patch<R: Runtime>(app: &AppHandle<R>, file: String, name: String) -> Result<PickedPatch, String> {
    let inspected = patch::inspect(open_picked(app, &file).await?).map_err(|e| e.to_string())?;
    Ok(PickedPatch {
        file,
        name,
        format: inspected.as_ref().map(|inspected| format(inspected.format)),
        base_checked: inspected.is_some_and(|inspected| inspected.base_checked),
    })
}

async fn rom_header<R: Runtime>(app: &AppHandle<R>, folder: &str, path: &str) -> Result<Vec<u8>, String> {
    let rom = GamesFolder::open(app, folder).open_rom(path).await?;
    let mut header = Vec::new();
    rom.take(0x200).read_to_end(&mut header).map_err(|e| e.to_string())?;
    Ok(header)
}

#[tauri::command]
pub async fn patch_base_build<R: Runtime>(app: AppHandle<R>, folder: String, path: String) -> Result<Option<String>, String> {
    Ok(build(&rom_header(&app, &folder, &path).await?))
}

#[tauri::command]
pub async fn rom_game_name<R: Runtime>(
    app: AppHandle<R>,
    folder: String,
    path: String,
) -> Result<Option<String>, String> {
    Ok(game_name(&rom_header(&app, &folder, &path).await?).map(String::from))
}

#[tauri::command]
pub async fn patch_check_name<R: Runtime>(app: AppHandle<R>, folder: String, system: String, name: String) -> Result<(), Failure> {
    target(&GamesFolder::open(&app, &folder), &system, &name).await.map(|_| ())
}

#[tauri::command]
pub async fn patch_rom<R: Runtime>(
    app: AppHandle<R>,
    folder: String,
    path: String,
    system: String,
    name: String,
    patch: String,
) -> Result<Created, Failure> {
    let patch = open_picked(&app, &patch).await?;
    create(&GamesFolder::open(&app, &folder), &path, &system, &name, patch).await
}

#[derive(Serialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Bases {
    checked: bool,
    games: Vec<String>,
    needs: Option<Needs>,
}

#[derive(Serialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Needs {
    crc32: u32,
    build: Option<String>,
}

fn rom_system(path: &str) -> Option<System> {
    path.split_once('/').and_then(|(system, _)| self::system(system).ok())
}

async fn base_crc32<R: Runtime>(games: &GamesFolder<'_, R>, index: &Index, path: &str, size: u64) -> Option<u32> {
    let (file_size, modified) = games.stat(path).await.ok()?;
    let (file_size, mtime) = (file_size as i64, millis(modified));
    let known = index.rom_crc32(path).ok().flatten().filter(|row| row.size == file_size && row.mtime == mtime);
    let row = match known {
        Some(row) => row,
        None if !rom::is_archive(path) && file_size as u64 != size => return None,
        None => {
            let system = rom_system(path)?;
            let rom = games.open_rom(path).await.ok()?;
            let hashed = tauri::async_runtime::spawn_blocking(move || patch::base_crc32(BufReader::new(rom), system));
            let (rom_size, crc32) = hashed.await.ok()?.ok()?;
            let row = RomCrc32 { path: path.into(), size: file_size, mtime, rom_size: rom_size as i64, crc32 };
            if let Err(e) = index.keep_rom_crc32(&row) {
                eprintln!("keeping {path}'s CRC32: {e}");
            }
            row
        }
    };
    (row.rom_size as u64 == size).then_some(row.crc32)
}

async fn first_window_fits<R: Runtime>(games: &GamesFolder<'_, R>, path: &str, fit: Arc<Fit>) -> bool {
    let (Some(system), Ok(rom)) = (rom_system(path), games.open_rom(path).await) else { return false };
    let fits = tauri::async_runtime::spawn_blocking(move || fit.fits(BufReader::new(rom), system));
    fits.await.is_ok_and(|fits| fits.unwrap_or(false))
}

async fn bases<R: Runtime>(
    games: &GamesFolder<'_, R>,
    index: &Index,
    patch: impl Read + Send + 'static,
    paths: Vec<String>,
) -> Result<Bases, Failure> {
    let fit = tauri::async_runtime::spawn_blocking(move || patch::fit(BufReader::new(patch)))
        .await
        .map_err(|e| e.to_string())??;
    let fit = Arc::new(fit);
    let mut fitting = Vec::new();
    for path in paths {
        let fits = match &*fit {
            Fit::Unchecked => true,
            Fit::Crc32 { size, crc32 } => base_crc32(games, index, &path, *size).await == Some(*crc32),
            Fit::FirstWindow(_) => first_window_fits(games, &path, fit.clone()).await,
        };
        if fits {
            fitting.push(path);
        }
    }
    let needs = match *fit {
        Fit::Crc32 { crc32, .. } => Some(Needs { crc32, build: retail_build(crc32) }),
        _ => None,
    };
    Ok(Bases { checked: fit.checked(), games: fitting, needs })
}

#[tauri::command]
pub async fn patch_bases<R: Runtime>(
    app: AppHandle<R>,
    index: State<'_, Arc<Index>>,
    folder: String,
    patch: String,
    games: Vec<String>,
) -> Result<Bases, Failure> {
    let patch = open_picked(&app, &patch).await?;
    bases(&GamesFolder::open(&app, &folder), &index, patch, games).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::index::temp_index;
    use crate::patch::tests::{bps, ips, ups, xdelta, xdelta_with};
    use crate::save::sha256;
    use crate::test_games::{gb_header, gba_header, nds_header, pattern, red, rom_by_header, sevenz_of};
    use std::io::{Cursor, Write};
    use std::time::Duration;
    use tauri::async_runtime::block_on;

    fn temp_folder(name: &str) -> GamesFolder<'static, tauri::Wry> {
        let root = std::env::temp_dir().join(format!("pkh-emu-patching-{name}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        std::fs::create_dir_all(&root).unwrap();
        GamesFolder::at(root)
    }

    fn names(games: &GamesFolder<'static, tauri::Wry>, dir: &str) -> Vec<String> {
        let mut names: Vec<_> = block_on(games.read_dir(dir)).unwrap().into_iter().map(|e| e.name).collect();
        names.sort();
        names
    }

    fn hacked(base: &[u8]) -> Vec<u8> {
        let mut target = base.to_vec();
        target[10..20].fill(0x42);
        target.extend_from_slice(b"hack");
        target
    }

    #[test]
    fn writes_the_patched_rom_next_to_the_base_as_a_new_game() {
        let games = temp_folder("create");
        let base = pattern(1000, 1);
        block_on(games.write("gba/FireRed.gba", &base)).unwrap();
        block_on(games.write("gba/FireRed.sav", b"save")).unwrap();
        let patch = bps(&base, &hacked(&base));

        let created = block_on(create(&games, "gba/FireRed.gba", "gba", "Radical Red", Cursor::new(patch.clone()))).unwrap();

        assert_eq!(created, Created { path: "gba/Radical Red.gba".into(), sha256: sha256(&patch), base_checked: true });
        assert_eq!(block_on(games.read("gba/Radical Red.gba")).unwrap(), hacked(&base));
        assert_eq!(block_on(games.read("gba/FireRed.gba")).unwrap(), base);
        assert_eq!(names(&games, "gba"), ["FireRed.gba", "FireRed.sav", "Radical Red.gba"]);
    }

    #[test]
    fn patches_a_zipped_rom_into_the_system_folder() {
        let games = temp_folder("zip");
        let base = pattern(1000, 2);
        let mut zip = zip::ZipWriter::new(Cursor::new(Vec::new()));
        zip.start_file("Platinum.nds", zip::write::SimpleFileOptions::default()).unwrap();
        zip.write_all(&base).unwrap();
        block_on(games.write("nds/originals/Platinum.zip", &zip.finish().unwrap().into_inner())).unwrap();
        block_on(games.create_dir("nds")).unwrap();

        block_on(create(&games, "nds/originals/Platinum.zip", "nds", "Renegade", Cursor::new(xdelta(&base, &hacked(&base))))).unwrap();

        assert_eq!(block_on(games.read("nds/Renegade.nds")).unwrap(), hacked(&base));
    }

    #[test]
    fn patches_a_rom_from_a_7z() {
        let games = temp_folder("7z");
        let base = pattern(1000, 3);
        block_on(games.write("gba/FireRed.7z", &sevenz_of(&[("FireRed.gba", &base)]))).unwrap();

        block_on(create(&games, "gba/FireRed.7z", "gba", "Radical Red", Cursor::new(xdelta(&base, &hacked(&base)))))
            .unwrap();

        assert_eq!(block_on(games.read("gba/Radical Red.gba")).unwrap(), hacked(&base));
    }

    #[test]
    fn writes_a_patched_n64_rom_as_a_big_endian_z64() {
        let games = temp_folder("n64");
        let base = [&[0x80, 0x37, 0x12, 0x40][..], &pattern(1000, 8)].concat();
        let v64: Vec<u8> = base.chunks(2).flat_map(|pair| [pair[1], pair[0]]).collect();
        block_on(games.write("n64/Stadium.v64", &v64)).unwrap();

        let patch = Cursor::new(ips(&base, &hacked(&base)));

        let created = block_on(create(&games, "n64/Stadium.v64", "n64", "Hack", patch)).unwrap();

        assert_eq!(created.path, "n64/Hack.z64");
        assert!(!created.base_checked);
        assert_eq!(block_on(games.read("n64/Hack.z64")).unwrap(), hacked(&base));
    }

    #[test]
    fn hashes_a_streamed_patch() {
        let games = temp_folder("hash");
        let base = pattern(100, 3);
        block_on(games.write("gb/Red.gb", &base)).unwrap();
        let patch = xdelta(&base, &hacked(&base));

        let created = block_on(create(&games, "gb/Red.gb", "gb", "Red Plus", Cursor::new(patch.clone()))).unwrap();

        assert_eq!(created.sha256, sha256(&patch));
        assert_eq!(block_on(games.read("gb/Red Plus.gb")).unwrap(), hacked(&base));
    }

    #[test]
    fn refuses_the_wrong_base_and_leaves_nothing_behind() {
        let games = temp_folder("wrong-base");
        let base = pattern(1000, 4);
        block_on(games.write("gba/FireRed.gba", &base)).unwrap();
        let other = pattern(1000, 5);

        let failed = block_on(create(&games, "gba/FireRed.gba", "gba", "Hack", Cursor::new(bps(&other, &hacked(&other)))));

        assert_eq!(failed, Err(Failure::WrongBase { expected_crc32: Some(crc32fast::hash(&other)) }));
        assert_eq!(names(&games, "gba"), ["FireRed.gba"]);
    }

    #[test]
    fn refuses_a_file_that_isnt_a_patch() {
        let games = temp_folder("unknown");
        block_on(games.write("gba/FireRed.gba", &pattern(100, 6))).unwrap();

        let failed = block_on(create(&games, "gba/FireRed.gba", "gba", "Hack", Cursor::new(b"not a patch".to_vec())));

        assert_eq!(failed, Err(Failure::UnknownFormat));
        assert_eq!(names(&games, "gba"), ["FireRed.gba"]);
    }

    #[test]
    fn refuses_a_name_another_game_uses() {
        let games = temp_folder("taken");
        let base = pattern(100, 7);
        block_on(games.write("gba/FireRed.gba", &base)).unwrap();
        block_on(games.write("gba/Unbound.zip", b"zip")).unwrap();
        block_on(games.create_dir("gba/Glazed")).unwrap();

        for name in ["FireRed", "firered", "Unbound", "Glazed"] {
            let failed = block_on(create(&games, "gba/FireRed.gba", "gba", name, Cursor::new(ips(&base, &hacked(&base)))));
            assert_eq!(failed, Err(Failure::NameTaken), "{name}");
        }
        assert_eq!(block_on(target(&games, "gba", "Glazed v1")), Ok("gba/Glazed v1.gba".into()));
    }

    #[test]
    fn a_folder_named_like_a_file_doesnt_take_its_stem() {
        let entries = [DirEntry { name: "Glazed v1.2".into(), is_directory: true }];

        assert!(!taken(&entries, "Glazed v1"));
        assert!(taken(&entries, "Glazed v1.2"));
    }

    #[test]
    fn refuses_names_that_arent_file_names() {
        let games = temp_folder("bad-name");
        block_on(games.create_dir("gba")).unwrap();

        for name in ["", " Hack", ".hidden", "../Hack", "a/b", "a\\b", "what?"] {
            assert_eq!(block_on(target(&games, "gba", name)), Err(Failure::BadName), "{name:?}");
        }
    }

    fn n64_header(title: &[u8], code: &[u8], revision: u8) -> Vec<u8> {
        let mut rom = vec![0; 0x200];
        rom[..4].copy_from_slice(&[0x80, 0x37, 0x12, 0x40]);
        rom[0x20..0x20 + title.len()].copy_from_slice(title);
        rom[0x3B..0x3F].copy_from_slice(code);
        rom[0x3F] = revision;
        rom
    }

    #[test]
    fn names_the_build_from_the_header() {
        assert_eq!(build(&gba_header(b"POKEMON FIRE", b"BPRE", 0)).as_deref(), Some("FireRed EN 1.0"));
        assert_eq!(build(&gba_header(b"POKEMON EMER", b"BPEJ", 0)).as_deref(), Some("Emerald JP 1.0"));
        assert_eq!(build(&gba_header(b"POKEMON RUBY", b"AXVD", 1)).as_deref(), Some("Ruby DE 1.1"));
        assert_eq!(build(&nds_header(b"CPUE", 0)).as_deref(), Some("Platinum EN"));
        assert_eq!(build(&nds_header(b"ADAE", 13)).as_deref(), Some("Diamond EN rev 13"));
        assert_eq!(build(&gb_header(b"POKEMON YELLOW", 1)).as_deref(), Some("Yellow 1.1"));
        assert_eq!(build(&n64_header(b"POKEMON STADIUM", b"NPOE", 2)).as_deref(), Some("Stadium EN 1.2"));
    }

    #[test]
    fn names_the_game_from_the_header() {
        assert_eq!(game_name(&gba_header(b"POKEMON RUBY", b"AXVD", 1)), Some("Ruby"));
        assert_eq!(game_name(&gba_header(b"POKEMON SAPP", b"AXPE", 0)), Some("Sapphire"));
        assert_eq!(game_name(&nds_header(b"ADAE", 0)), Some("Diamond"));
        assert_eq!(game_name(&gb_header(b"POKEMON_GLDAAUE", 0)), Some("Gold"));
        assert_eq!(game_name(&n64_header(b"POKEMON STADIUM", b"NPOE", 2)), Some("Stadium"));
        assert_eq!(game_name(&n64_header(b"POKEMON STADIUM 2", b"NP3E", 0)), Some("Stadium 2"));
        assert_eq!(game_name(&gba_header(b"MY HACK", b"ABCD", 0)), None);
    }

    #[test]
    fn names_an_unknown_build_by_its_header_title_and_code() {
        assert_eq!(build(&gba_header(b"MY HACK", b"ZZZZ", 0)).as_deref(), Some("MY HACK ZZZZ 1.0"));
        assert_eq!(build(&gb_header(b"TETRIS", 0)).as_deref(), Some("TETRIS 1.0"));
        assert_eq!(build(&[0; 0x200]), None);
    }

    #[test]
    fn names_the_retail_build_a_crc32_belongs_to() {
        assert_eq!(retail_build(0xDD88761C).as_deref(), Some("FireRed EN 1.0"));
        assert_eq!(retail_build(0x84EE4776).as_deref(), Some("FireRed EN 1.1"));
        assert_eq!(retail_build(0x15E1E280).as_deref(), Some("Ruby DE 1.0"));
        assert_eq!(retail_build(0xDCF7050B).as_deref(), Some("Diamond EN rev 13"));
        assert_eq!(retail_build(0x2CA88FAA).as_deref(), Some("Black ES"));
        assert_eq!(retail_build(0x9F7FDD53).as_deref(), Some("Red 1.0"));
        assert_eq!(retail_build(0x3358E30A).as_deref(), Some("Crystal 1.1"));
        assert_eq!(retail_build(0x235B1842).as_deref(), Some("Stadium EN 1.2"));
        assert_eq!(retail_build(0x12345678), None);
    }

    #[test]
    fn names_a_retail_dump_the_way_its_header_does() {
        let roms = [
            rom_by_header("FireRed", b"BPRE", 1),
            rom_by_header("Emerald", b"BPEE", 0),
            rom_by_header("Diamond", b"ADAE", 13),
            rom_by_header("Platinum", b"CPUE", 1),
            rom_by_header("HeartGold", b"IPKE", 0),
            rom_by_header("Pokémon Stadium", b"NPOE", 2),
            red(),
        ];

        for rom in roms.into_iter().flatten() {
            let bytes = rom_art::n64_big_endian(&rom.bytes).unwrap_or(rom.bytes);
            assert_eq!(retail_build(crc32fast::hash(&bytes)), build(&bytes), "{}", rom.name);
        }
    }

    #[test]
    fn says_which_retail_build_a_patch_needs() {
        let games = temp_folder("bases-needs");
        let (index, _) = temp_index("bases-needs");
        let mut patch = bps(&pattern(100, 1), &pattern(100, 2));
        let footer = patch.len() - 12;
        patch[footer..footer + 4].copy_from_slice(&0xDD88761Cu32.to_le_bytes());
        let checksum = crc32fast::hash(&patch[..footer + 8]);
        patch[footer + 8..].copy_from_slice(&checksum.to_le_bytes());

        let found = block_on(bases(&games, &index, Cursor::new(patch), Vec::new())).unwrap();

        let needs = Needs { crc32: 0xDD88761C, build: Some("FireRed EN 1.0".into()) };
        assert_eq!(found, Bases { checked: true, games: Vec::new(), needs: Some(needs) });
    }

    #[test]
    fn tells_a_patch_by_its_magic_bytes() {
        let base = pattern(100, 1);
        assert_eq!(format_of(&bps(&base, &hacked(&base))[..]), Some("bps"));
        assert_eq!(format_of(&xdelta(&base, &hacked(&base))[..]), Some("xdelta"));
        assert_eq!(format_of(&b"PK\x03\x04"[..]), None);
    }

    fn paths(paths: &[&str]) -> Vec<String> {
        paths.iter().map(|path| path.to_string()).collect()
    }

    fn zip_of(name: &str, rom: &[u8]) -> Vec<u8> {
        let mut zip = zip::ZipWriter::new(Cursor::new(Vec::new()));
        zip.start_file(name, zip::write::SimpleFileOptions::default()).unwrap();
        zip.write_all(rom).unwrap();
        zip.finish().unwrap().into_inner()
    }

    fn library(name: &str, base: &[u8]) -> GamesFolder<'static, tauri::Wry> {
        let games = temp_folder(name);
        block_on(games.write("gba/FireRed.gba", base)).unwrap();
        block_on(games.write("gba/Emerald.gba", &pattern(base.len(), 99))).unwrap();
        block_on(games.write("gb/Red.gb", &pattern(64, 98))).unwrap();
        block_on(games.write("gba/zipped/FireRed.zip", &zip_of("FireRed.gba", base))).unwrap();
        games
    }

    const LIBRARY: [&str; 4] = ["gba/FireRed.gba", "gba/Emerald.gba", "gb/Red.gb", "gba/zipped/FireRed.zip"];

    #[test]
    fn lists_the_games_a_ups_or_bps_patch_fits() {
        let base = pattern(1000, 1);
        let games = library("bases-crc32", &base);
        let (index, _) = temp_index("bases-crc32");

        for patch in [ups(&base, &hacked(&base)), bps(&base, &hacked(&base))] {
            let found = block_on(bases(&games, &index, Cursor::new(patch), paths(&LIBRARY))).unwrap();

            let fitting = paths(&["gba/FireRed.gba", "gba/zipped/FireRed.zip"]);
            let needs = Some(Needs { crc32: crc32fast::hash(&base), build: None });
            assert_eq!(found, Bases { checked: true, games: fitting, needs });
        }
    }

    #[test]
    fn lists_the_games_an_xdelta_patch_with_checksums_fits() {
        let base = pattern(4000, 1);
        let games = library("bases-xdelta", &base);
        let (index, _) = temp_index("bases-xdelta");
        let patch = Cursor::new(xdelta(&base, &hacked(&base)));

        let found = block_on(bases(&games, &index, patch, paths(&LIBRARY))).unwrap();

        let fitting = paths(&["gba/FireRed.gba", "gba/zipped/FireRed.zip"]);
        assert_eq!(found, Bases { checked: true, games: fitting, needs: None });
    }

    #[test]
    fn lists_every_game_when_the_patch_cant_check_its_base() {
        let base = pattern(1000, 1);
        let games = library("bases-unchecked", &base);
        let (index, _) = temp_index("bases-unchecked");
        let options = oxidelta::compress::encoder::CompressOptions { checksum: false, ..Default::default() };

        for patch in [ips(&base, &hacked(&base)), xdelta_with(&base, &hacked(&base), options)] {
            let found = block_on(bases(&games, &index, Cursor::new(patch), paths(&LIBRARY))).unwrap();

            assert_eq!(found, Bases { checked: false, games: paths(&LIBRARY), needs: None });
        }
    }

    #[test]
    fn finds_an_n64_base_in_any_byte_order() {
        let base = [&[0x80, 0x37, 0x12, 0x40][..], &pattern(1000, 8)].concat();
        let v64: Vec<u8> = base.chunks(2).flat_map(|pair| [pair[1], pair[0]]).collect();
        let games = temp_folder("bases-n64");
        block_on(games.write("n64/Stadium.v64", &v64)).unwrap();
        let (index, _) = temp_index("bases-n64");

        for patch in [bps(&base, &hacked(&base)), xdelta(&base, &hacked(&base))] {
            let found = block_on(bases(&games, &index, Cursor::new(patch), paths(&["n64/Stadium.v64"]))).unwrap();

            assert_eq!(found.games, ["n64/Stadium.v64"]);
        }
    }

    #[test]
    fn hashes_each_rom_once_and_skips_roms_of_the_wrong_size() {
        let base = pattern(1000, 1);
        let games = library("bases-cache", &base);
        let (index, _) = temp_index("bases-cache");
        let patch = || Cursor::new(bps(&base, &hacked(&base)));
        block_on(bases(&games, &index, patch(), paths(&LIBRARY))).unwrap();
        assert_eq!(index.rom_crc32("gb/Red.gb"), Ok(None));

        let rom = games.root().join("gba/FireRed.gba");
        let modified = std::fs::metadata(&rom).unwrap().modified().unwrap();
        std::fs::write(&rom, pattern(1000, 2)).unwrap();
        std::fs::File::options().write(true).open(&rom).unwrap().set_modified(modified).unwrap();
        let found = block_on(bases(&games, &index, patch(), paths(&LIBRARY))).unwrap();

        assert_eq!(found.games, ["gba/FireRed.gba", "gba/zipped/FireRed.zip"]);
        std::fs::write(&rom, pattern(1000, 2)).unwrap();
        let later = modified + Duration::from_secs(1);
        std::fs::File::options().write(true).open(&rom).unwrap().set_modified(later).unwrap();
        let found = block_on(bases(&games, &index, patch(), paths(&LIBRARY))).unwrap();
        assert_eq!(found.games, ["gba/zipped/FireRed.zip"]);
    }

    #[test]
    fn reports_failures_by_kind() {
        let json = |failure: Failure| serde_json::to_string(&failure).unwrap();

        assert_eq!(json(Failure::WrongBase { expected_crc32: Some(7) }), r#"{"kind":"wrongBase","expectedCrc32":7}"#);
        assert_eq!(json(Failure::NameTaken), r#"{"kind":"nameTaken"}"#);
    }
}
