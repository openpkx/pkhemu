use std::fs::File;
use std::io::{BufReader, BufWriter, Read};

use serde::Serialize;
use sha2::{Digest, Sha256};
use tauri::{AppHandle, Runtime};
use tauri_plugin_android_fs::{AndroidFsExt, FsUri};

use crate::games_folder::{DirEntry, GamesFolder};
use crate::patch::{self, PatchError, System};

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

fn valid(name: &str) -> bool {
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
    let (output, sha256) = tauri::async_runtime::spawn_blocking(move || -> Result<_, Failure> {
        let mut patch = Hashing { inner: BufReader::new(patch), hash: Sha256::new() };
        let mut output = BufWriter::new(output);
        patch::apply(&mut patch, base, &mut output, cartridge)?;
        std::io::copy(&mut patch, &mut std::io::sink())?;
        let output = output.into_inner().map_err(|e| e.into_error())?;
        let sha256 = patch.hash.finalize().iter().map(|byte| format!("{byte:02x}")).collect();
        Ok((output, sha256))
    })
    .await
    .map_err(|e| e.to_string())??;
    output.finish().await?;
    Ok(Created { path, sha256 })
}

async fn open_patch<R: Runtime>(app: &AppHandle<R>, file: &str) -> Result<File, String> {
    match FsUri::from_json_str(file) {
        Ok(uri) => app.android_fs_async().open_file_readable(&uri).await.map_err(|e| e.to_string()),
        Err(_) => File::open(file).map_err(|e| format!("{file}: {e}")),
    }
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
    let game = rom_art::identify(rom)?;
    let name = known_name(&game);
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
    Some([Some(name.as_str()), language, version.as_deref()].into_iter().flatten().collect::<Vec<_>>().join(" "))
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PickedPatch {
    file: String,
    name: String,
    format: Option<&'static str>,
}

fn format(magic: &[u8]) -> Option<&'static str> {
    Some(match patch::detect(magic)? {
        patch::Format::Ips => "ips",
        patch::Format::Ups => "ups",
        patch::Format::Bps => "bps",
        patch::Format::Xdelta => "xdelta",
    })
}

#[cfg(target_os = "android")]
async fn pick_file<R: Runtime>(app: &AppHandle<R>) -> Result<Option<(String, String)>, String> {
    let fs = app.android_fs_async();
    let Some(uri) = fs.picker().pick_file(None, &[], false).await.map_err(|e| e.to_string())? else {
        return Ok(None);
    };
    let name = fs.get_name_or_last_path_segment(&uri).await;
    Ok(Some((uri.to_json_string().map_err(|e| e.to_string())?, name)))
}

#[cfg(not(target_os = "android"))]
async fn pick_file<R: Runtime>(app: &AppHandle<R>) -> Result<Option<(String, String)>, String> {
    use tauri_plugin_dialog::DialogExt;
    let (picked, chosen) = tokio::sync::oneshot::channel();
    app.dialog().file().pick_file(move |file| {
        let _ = picked.send(file);
    });
    let Some(file) = chosen.await.map_err(|e| e.to_string())? else {
        return Ok(None);
    };
    let path = file.into_path().map_err(|e| e.to_string())?;
    let name = path.file_name().map_or_else(String::new, |name| name.to_string_lossy().into_owned());
    Ok(Some((path.to_string_lossy().into_owned(), name)))
}

#[tauri::command]
pub async fn patch_pick<R: Runtime>(app: AppHandle<R>) -> Result<Option<PickedPatch>, String> {
    let Some((file, name)) = pick_file(&app).await? else {
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
    let mut magic = Vec::new();
    open_patch(app, &file).await?.take(5).read_to_end(&mut magic).map_err(|e| e.to_string())?;
    Ok(PickedPatch { file, name, format: format(&magic) })
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
    let patch = open_patch(&app, &patch).await?;
    create(&GamesFolder::open(&app, &folder), &path, &system, &name, patch).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::patch::tests::{bps, ips, xdelta};
    use crate::save::sha256;
    use crate::test_games::{pattern, sevenz_of};
    use std::io::{Cursor, Write};
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

        assert_eq!(created, Created { path: "gba/Radical Red.gba".into(), sha256: sha256(&patch) });
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

    fn gba_header(title: &[u8], code: &[u8], revision: u8) -> Vec<u8> {
        let mut rom = vec![0; 0x200];
        rom[0xA0..0xA0 + title.len()].copy_from_slice(title);
        rom[0xAC..0xB0].copy_from_slice(code);
        rom[0xB2] = 0x96;
        rom[0xBC] = revision;
        rom[0xBD] = rom[0xA0..0xBD].iter().fold(0u8, |sum, &b| sum.wrapping_sub(b)).wrapping_sub(0x19);
        rom
    }

    fn nds_header(code: &[u8], revision: u8) -> Vec<u8> {
        let mut rom = vec![0; 0x200];
        rom[0x0C..0x10].copy_from_slice(code);
        rom[0x1E] = revision;
        let crc = rom[..0x15E].iter().fold(0xFFFFu16, |crc, &byte| {
            (0..8).fold(crc ^ byte as u16, |crc, _| if crc & 1 == 1 { (crc >> 1) ^ 0xA001 } else { crc >> 1 })
        });
        rom[0x15E..0x160].copy_from_slice(&crc.to_le_bytes());
        rom
    }

    fn gb_header(title: &[u8], revision: u8) -> Vec<u8> {
        let mut rom = vec![0; 0x200];
        rom[0x134..0x134 + title.len()].copy_from_slice(title);
        rom[0x14C] = revision;
        rom[0x14D] = rom[0x134..0x14D].iter().fold(0u8, |sum, &b| sum.wrapping_sub(b).wrapping_sub(1));
        rom
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
    fn reports_failures_by_kind() {
        let json = |failure: Failure| serde_json::to_string(&failure).unwrap();

        assert_eq!(json(Failure::WrongBase { expected_crc32: Some(7) }), r#"{"kind":"wrongBase","expectedCrc32":7}"#);
        assert_eq!(json(Failure::NameTaken), r#"{"kind":"nameTaken"}"#);
    }
}
