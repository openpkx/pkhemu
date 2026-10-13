#[cfg_attr(target_os = "android", path = "import/android.rs")]
#[cfg_attr(target_os = "ios", path = "import/ios.rs")]
#[cfg_attr(desktop, path = "import/desktop.rs")]
pub(crate) mod platform;

use std::collections::HashMap;
use std::io::{BufReader, Read, Seek};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, Runtime, State};
use url::Url;

use crate::backups::{self, Reason};
use crate::files::{self, open_picked};
use crate::game_art::{sha1_of_rom, sha1_of_stream};
use crate::games_folder::GamesFolder;
use crate::index::Index;
use crate::{resume, rom, save};

const SYSTEMS: [&str; 5] = ["gb", "gbc", "gba", "nds", "n64"];
const DELTA_MARKERS: [&str; 2] = ["Database", "Games"];
const DELTA_SKIPPED: [&str; 3] = ["Save States", "Controller Skins", "Backups"];
const DEMO: &[u8] = include_bytes!("../demo/Tobu Tobu Girl Deluxe.gbc");
const DEMO_PATH: &str = "gbc/Tobu Tobu Girl Deluxe.gbc";

fn error(reason: impl ToString) -> String {
    reason.to_string()
}

fn millis(time: SystemTime) -> i64 {
    time.duration_since(UNIX_EPOCH).unwrap_or_default().as_millis() as i64
}

fn is_rom(name: &str) -> bool {
    rom::is_rom(name) || rom::is_archive(name)
}

#[derive(Serialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Picked {
    file: String,
    name: String,
    modified: i64,
    size: u64,
    inner: Option<String>,
    sha1: Option<String>,
    title: Option<String>,
}

pub(crate) struct Listed {
    file: String,
    name: String,
    modified: SystemTime,
    size: u64,
}

fn identify(name: &str, file: impl Read + Seek, hash: bool) -> (Option<String>, Option<String>) {
    if !rom::is_archive(name) {
        return (None, if hash { sha1_of_stream(file).ok() } else { None });
    }
    let read = |inner: &str, _, rom: &mut dyn Read| {
        Ok((inner.to_owned(), if hash { Some(sha1_of_stream(rom)?) } else { None }))
    };
    match rom::read_archived(name, BufReader::new(file), read) {
        Ok((inner, sha1)) => (Some(inner), sha1),
        Err(_) => (None, None),
    }
}

// Delta names each ROM by its SHA-1 and keeps the game's name in its own database.
fn named_by_hash(name: &str) -> bool {
    let stem = Path::new(name).file_stem().and_then(|stem| stem.to_str()).unwrap_or_default();
    rom::is_rom(name) && stem.len() == 40 && stem.bytes().all(|byte| byte.is_ascii_hexdigit())
}

fn title(name: &str, file: &mut (impl Read + Seek)) -> Option<String> {
    if !named_by_hash(name) {
        return None;
    }
    let mut header = Vec::new();
    let read = file.by_ref().take(0x200).read_to_end(&mut header);
    file.rewind().ok()?;
    read.ok()?;
    let title = match crate::patching::game_name(&header) {
        Some(name) => name.to_owned(),
        None => rom_art::identify(&header)?.title,
    };
    crate::patching::valid(&title).then_some(title)
}

async fn picked<R: Runtime>(app: &AppHandle<R>, listed: Listed, hash: bool) -> Picked {
    let Listed { file, name, modified, size } = listed;
    let (inner, sha1, title) = match is_rom(&name) && (hash || rom::is_archive(&name) || named_by_hash(&name)) {
        true => match open_picked(app, &file).await {
            Ok(mut opened) => {
                let archive = name.clone();
                tauri::async_runtime::spawn_blocking(move || {
                    let title = title(&archive, &mut opened);
                    let (inner, sha1) = identify(&archive, opened, hash);
                    (inner, sha1, title)
                })
                .await
                .unwrap_or((None, None, None))
            }
            Err(_) => (None, None, None),
        },
        false => (None, None, None),
    };
    Picked { file, name, modified: millis(modified), size, inner, sha1, title }
}

#[tauri::command]
pub async fn import_pick<R: Runtime>(app: AppHandle<R>) -> Result<Vec<Picked>, String> {
    let mut files = Vec::new();
    for listed in platform::pick(&app).await? {
        files.push(picked(&app, listed, true).await);
    }
    Ok(files)
}

async fn listed<R: Runtime>(app: &AppHandle<R>, file: String) -> Result<Listed, String> {
    let meta = open_picked(app, &file).await?.metadata().map_err(|e| format!("{file}: {e}"))?;
    let modified = meta.modified().map_err(|e| format!("{file}: {e}"))?;
    let path = Url::parse(&file).ok().and_then(|url| url.to_file_path().ok()).unwrap_or_else(|| PathBuf::from(&file));
    let name = path.file_name().map_or_else(String::new, |name| name.to_string_lossy().into_owned());
    Ok(Listed { file, name, modified, size: meta.len() })
}

#[derive(Default)]
struct Queue {
    waiting: Vec<String>,
    importing: Vec<String>,
}

// Files can arrive before the frontend listens, such as the one that launched the app, so they wait here.
#[derive(Default)]
pub struct Opened(Mutex<Queue>);

impl Opened {
    fn add(&self, files: Vec<String>) -> bool {
        let added = !files.is_empty();
        self.0.lock().unwrap().waiting.extend(files);
        added
    }

    // The frontend asks for more only once it has imported the last files, so it's done with those.
    fn next(&self) -> (Vec<String>, Vec<String>) {
        let mut queue = self.0.lock().unwrap();
        let next = std::mem::take(&mut queue.waiting);
        (std::mem::replace(&mut queue.importing, next.clone()), next)
    }
}

#[cfg_attr(desktop, allow(dead_code))]
pub fn opened<R: Runtime>(app: &AppHandle<R>, files: Vec<String>) {
    if app.state::<Opened>().add(files) {
        let _ = app.emit("files-opened", ());
    }
}

#[tauri::command]
pub async fn import_opened<R: Runtime>(app: AppHandle<R>, opened: State<'_, Opened>) -> Result<Vec<Picked>, String> {
    let (done, next) = opened.next();
    platform::remove_copies(&app, &done);
    let (mut files, mut failed) = (Vec::new(), None);
    for file in next {
        match platform::listed(&app, file).await {
            Ok(listed) => files.push(picked(&app, listed, true).await),
            Err(e) => failed = Some(e),
        }
    }
    match failed {
        Some(e) if files.is_empty() => Err(e),
        _ => Ok(files),
    }
}

#[derive(Serialize, Debug, PartialEq)]
pub struct PickedFolder {
    folder: String,
    name: String,
}

#[tauri::command]
pub async fn import_pick_folder<R: Runtime>(app: AppHandle<R>) -> Result<Option<PickedFolder>, String> {
    platform::pick_folder(&app).await
}

fn has_extension(name: &str, extensions: &[&str]) -> bool {
    Path::new(name)
        .extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| extensions.contains(&extension.to_ascii_lowercase().as_str()))
}

fn is_save(name: &str) -> bool {
    has_extension(name, &["sav", "srm", "dsv"])
}

fn is_clock(name: &str) -> bool {
    has_extension(name, &["rtc"])
}

fn sort_found(listed: Vec<Listed>) -> (Vec<Listed>, usize) {
    let (found, other): (Vec<_>, Vec<_>) =
        listed.into_iter().partition(|file| is_rom(&file.name) || is_save(&file.name) || is_clock(&file.name));
    (found, other.len())
}

fn skipped(name: &str, siblings: &[String]) -> bool {
    name.starts_with('.')
        || DELTA_SKIPPED.contains(&name) && siblings.iter().any(|sibling| DELTA_MARKERS.contains(&sibling.as_str()))
}

// iCloud lists a file that isn't on the device as a hidden ".<name>.icloud" stub.
fn offline(name: &str) -> Option<&str> {
    name.strip_prefix('.')?.strip_suffix(".icloud").filter(|name| is_rom(name) || is_save(name) || is_clock(name))
}

#[derive(Default)]
struct Walk {
    listed: Vec<Listed>,
    offline: Vec<String>,
}

fn walk_path(dir: &Path, walk: &mut Walk) -> std::io::Result<()> {
    let entries: Vec<_> = std::fs::read_dir(dir)?.flatten().collect();
    let names: Vec<String> = entries.iter().map(|entry| entry.file_name().to_string_lossy().into_owned()).collect();
    for (entry, name) in entries.iter().zip(&names) {
        if let Some(name) = offline(name) {
            walk.offline.push(dir.join(name).to_string_lossy().into_owned());
            continue;
        }
        if skipped(name, &names) {
            continue;
        }
        let (Ok(kind), Ok(meta)) = (entry.file_type(), entry.metadata()) else { continue };
        if kind.is_dir() {
            let _ = walk_path(&entry.path(), walk);
        } else if kind.is_file() {
            let file = entry.path().to_string_lossy().into_owned();
            let name = name.clone();
            walk.listed.push(Listed { file, name, modified: meta.modified().unwrap_or(UNIX_EPOCH), size: meta.len() });
        }
    }
    Ok(())
}

async fn walk_folder(root: std::path::PathBuf) -> Result<Walk, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let mut walk = Walk::default();
        walk_path(&root, &mut walk).map_err(|e| format!("{}: {e}", root.display()))?;
        Ok(walk)
    })
    .await
    .map_err(error)?
}

#[derive(Serialize, Debug, PartialEq)]
pub struct Scan {
    files: Vec<Picked>,
    other: usize,
}

#[tauri::command]
pub async fn import_scan<R: Runtime>(app: AppHandle<R>, folder: String, hash: bool) -> Result<Scan, String> {
    let _reading = files::reading(&app, &folder).await?;
    let (found, other) = sort_found(platform::walk(&app, &folder).await?);
    let mut files = Vec::new();
    for listed in found {
        files.push(picked(&app, listed, hash).await);
    }
    Ok(Scan { files, other })
}

#[tauri::command]
pub async fn import_sha1s<R: Runtime>(
    app: AppHandle<R>,
    index: State<'_, Arc<Index>>,
    folder: String,
    paths: Vec<String>,
) -> Result<HashMap<String, String>, String> {
    let games = GamesFolder::open(&app, &folder);
    let mut sha1s = HashMap::new();
    for path in paths {
        let Ok((size, modified)) = games.stat(&path).await else { continue };
        let known = index.rom_art(&path)?.filter(|row| row.size == size as i64 && row.mtime == millis(modified));
        if let Some(row) = known.filter(|row| !row.sha1.is_empty()) {
            sha1s.insert(path, row.sha1);
            continue;
        }
        let Ok(file) = games.open_file(&path).await else { continue };
        let name = path.clone();
        if let Ok(Ok(sha1)) = tauri::async_runtime::spawn_blocking(move || sha1_of_rom(&name, file)).await {
            sha1s.insert(path, sha1);
        }
    }
    Ok(sha1s)
}

fn check_rom_path(path: &str) -> Result<(), String> {
    match path.split_once('/') {
        Some((system, name))
            if SYSTEMS.contains(&system) && !name.contains('/') && !name.starts_with('.') && is_rom(name) =>
        {
            Ok(())
        }
        _ => Err(format!("{path} isn't a ROM in a system folder")),
    }
}

pub async fn copy_rom<R: Runtime>(
    games: &GamesFolder<'_, R>,
    path: &str,
    mut source: impl Read + Send + 'static,
) -> Result<(), String> {
    check_rom_path(path)?;
    if games.has_file(path).await {
        return Err(format!("{path} is already there"));
    }
    let mut copy = games.create_file(path).await?;
    let copy = tauri::async_runtime::spawn_blocking(move || std::io::copy(&mut source, &mut copy).map(|_| copy))
        .await
        .map_err(error)?
        .map_err(|e| format!("{path}: {e}"))?;
    copy.finish().await
}

#[tauri::command]
pub async fn import_rom<R: Runtime>(
    app: AppHandle<R>,
    folder: String,
    file: String,
    path: String,
) -> Result<(), String> {
    let source = open_picked(&app, &file).await?;
    copy_rom(&GamesFolder::open(&app, &folder), &path, source).await
}

pub async fn copy_demo<R: Runtime>(games: &GamesFolder<'_, R>) -> Result<String, String> {
    copy_rom(games, DEMO_PATH, std::io::Cursor::new(DEMO)).await?;
    Ok(DEMO_PATH.into())
}

#[tauri::command]
pub async fn import_demo<R: Runtime>(app: AppHandle<R>, folder: String) -> Result<String, String> {
    copy_demo(&GamesFolder::open(&app, &folder)).await
}

#[derive(Serialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Existing {
    modified: i64,
    same: bool,
}

const RZIP_MAGIC: &[u8] = b"#RZIPv";

fn imported(rom: &str, name: &str, file: Vec<u8>) -> Result<(save::Slot, Vec<u8>), String> {
    if file.starts_with(RZIP_MAGIC) {
        return Err(format!("{name} is a compressed RetroArch save, which pkhemu can't read"));
    }
    save::imported(rom, name, file)
}

pub async fn existing_save<R: Runtime>(
    games: &GamesFolder<'_, R>,
    rom: &str,
    name: &str,
    file: Vec<u8>,
) -> Result<Option<Existing>, String> {
    let (_, save) = imported(rom, name, file)?;
    let Some(current) = save::read_file(games, rom).await? else { return Ok(None) };
    let same = save::sha256(save::without_clock(rom, &save[save::editable(&save)]))
        == save::sha256(save::without_clock(rom, &current.bytes));
    Ok(Some(Existing { modified: current.modified, same }))
}

async fn read_picked<R: Runtime>(app: &AppHandle<R>, file: &str) -> Result<Vec<u8>, String> {
    let mut bytes = Vec::new();
    open_picked(app, file).await?.read_to_end(&mut bytes).map_err(|e| format!("{file}: {e}"))?;
    Ok(bytes)
}

#[tauri::command]
pub async fn import_existing_save<R: Runtime>(
    app: AppHandle<R>,
    folder: String,
    rom: String,
    file: String,
    name: String,
) -> Result<Option<Existing>, String> {
    let bytes = read_picked(&app, &file).await?;
    existing_save(&GamesFolder::open(&app, &folder), &rom, &name, bytes).await
}

pub async fn import_save_file<R: Runtime>(
    games: &GamesFolder<'_, R>,
    rom: &str,
    name: &str,
    file: Vec<u8>,
    clock: Option<Vec<u8>>,
    at: &str,
) -> Result<(), String> {
    let (slot, save) = imported(rom, name, file)?;
    let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs();
    let save = match clock {
        Some(rtc) => save::with_clock(rom, save, &rtc, now),
        None => save,
    };
    let stale = match save::open(games, rom).await? {
        (current, Some(existing)) => {
            backups::take(games, rom, &current, Reason::Import, &existing, at, None)
                .await
                .map_err(|e| format!("couldn't back up the save: {e}"))?;
            let written: Vec<String> = slot.files(&save).into_iter().map(|(path, _)| path).collect();
            current.files(&existing).into_iter().map(|(path, _)| path).filter(|path| !written.contains(path)).collect()
        }
        (_, None) => Vec::new(),
    };
    slot.write(games, &save).await?;
    for path in stale {
        games.remove(rom, &path).await.map_err(|e| format!("{path}: {e}"))?;
    }
    resume::remove(games, rom).await
}

#[tauri::command]
pub async fn import_save<R: Runtime>(
    app: AppHandle<R>,
    folder: String,
    rom: String,
    file: String,
    name: String,
    clock: Option<String>,
) -> Result<(), String> {
    let bytes = read_picked(&app, &file).await?;
    let clock = match clock {
        Some(clock) => Some(read_picked(&app, &clock).await?),
        None => None,
    };
    import_save_file(&GamesFolder::open(&app, &folder), &rom, &name, bytes, clock, &backups::now()).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_games::sevenz_of;
    use std::io::Cursor;
    use std::sync::atomic::{AtomicUsize, Ordering::SeqCst};
    use tauri::async_runtime::block_on;

    fn temp_folder(name: &str) -> GamesFolder<'static, tauri::Wry> {
        let root = std::env::temp_dir().join(format!("pkh-emu-import-{name}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        std::fs::create_dir_all(&root).unwrap();
        GamesFolder::at(root)
    }

    fn names(games: &GamesFolder<'static, tauri::Wry>, dir: &str) -> Vec<String> {
        let mut names: Vec<_> = block_on(games.read_dir(dir)).unwrap_or_default().into_iter().map(|e| e.name).collect();
        names.sort();
        names
    }

    fn backups(games: &GamesFolder<'static, tauri::Wry>, rom: &str) -> Vec<Vec<u8>> {
        let dir = format!("{}/backups", rom::data_dir(rom));
        names(games, &dir).iter().map(|name| block_on(games.read(&format!("{dir}/{name}"))).unwrap()).collect()
    }

    #[test]
    fn hands_out_opened_files_then_the_ones_imported() {
        let opened = Opened::default();

        assert!(opened.add(vec!["file:///Inbox/Emerald.gba".into()]));
        assert!(!opened.add(vec![]));
        assert!(opened.add(vec!["file:///Inbox/Emerald.sav".into()]));

        let files = ["file:///Inbox/Emerald.gba", "file:///Inbox/Emerald.sav"];
        assert_eq!(opened.next(), (vec![], files.map(String::from).to_vec()));
        assert_eq!(opened.next(), (files.map(String::from).to_vec(), vec![]));
        assert_eq!(opened.next(), (vec![], vec![]));
    }

    #[test]
    fn hands_out_shared_content_uris() {
        let opened = Opened::default();
        let files = [
            r#"{"uri":"content://media/external/file/1234","documentTopTreeUri":null}"#,
            r#"{"uri":"content://com.android.providers.downloads.documents/document/5","documentTopTreeUri":null}"#,
        ]
        .map(String::from)
        .to_vec();

        assert!(opened.add(files.clone()));

        assert_eq!(opened.next(), (vec![], files.clone()));
        assert_eq!(opened.next(), (files, vec![]));
    }

    #[test]
    fn copies_a_rom_into_its_system_folder() {
        let games = temp_folder("rom");

        block_on(copy_rom(&games, "gba/Emerald.gba", Cursor::new(b"rom".to_vec()))).unwrap();

        assert_eq!(block_on(games.read("gba/Emerald.gba")).unwrap(), b"rom");
        assert_eq!(names(&games, "gba"), ["Emerald.gba"]);
    }

    #[test]
    fn never_copies_over_a_file_or_outside_a_system_folder() {
        let games = temp_folder("rom-refused");
        block_on(games.write("gba/Emerald.gba", b"old")).unwrap();

        for path in [
            "gba/Emerald.gba",
            "Emerald.gba",
            "gba/../Emerald.gba",
            "gba/hacks/Emerald.gba",
            "gba/Emerald.sav",
            "psx/Emerald.gba",
        ] {
            assert!(block_on(copy_rom(&games, path, Cursor::new(b"new".to_vec()))).is_err(), "{path}");
        }
        assert_eq!(block_on(games.read("gba/Emerald.gba")).unwrap(), b"old");
    }

    #[test]
    fn copies_the_demo_into_the_gbc_folder() {
        let games = temp_folder("demo");

        assert_eq!(block_on(copy_demo(&games)).unwrap(), "gbc/Tobu Tobu Girl Deluxe.gbc");

        assert_eq!(block_on(games.read("gbc/Tobu Tobu Girl Deluxe.gbc")).unwrap(), DEMO);
    }

    #[test]
    fn never_copies_the_demo_over_a_file() {
        let games = temp_folder("demo-refused");
        block_on(games.write("gbc/Tobu Tobu Girl Deluxe.gbc", b"old")).unwrap();

        assert_eq!(block_on(copy_demo(&games)), Err("gbc/Tobu Tobu Girl Deluxe.gbc is already there".into()));
        assert_eq!(block_on(games.read("gbc/Tobu Tobu Girl Deluxe.gbc")).unwrap(), b"old");
    }

    #[test]
    fn embeds_the_released_demo() {
        assert_eq!(save::sha256(DEMO), "0a0e8018dbbc8d7f8cd99f05e7cdc7b4cc9e358ecfe9377ebfb2291a84c6e310");
    }

    #[test]
    fn names_the_rom_inside_an_archive_and_hashes_it() {
        let archive = sevenz_of(&[("readme.txt", b"hi".as_slice()), ("Crystal.gbc", b"rom".as_slice())]);

        let (inner, sha1) = identify("Crystal.7z", Cursor::new(archive.clone()), true);

        assert_eq!(inner.as_deref(), Some("Crystal.gbc"));
        assert_eq!(sha1, Some(crate::game_art::sha1_of(b"rom")));
        assert_eq!(identify("Crystal.7z", Cursor::new(archive), false), (Some("Crystal.gbc".into()), None));
        assert_eq!(
            identify("Crystal.gbc", Cursor::new(b"rom".to_vec()), true),
            (None, Some(crate::game_art::sha1_of(b"rom")))
        );
        assert_eq!(identify("Crystal.zip", Cursor::new(b"not a zip".to_vec()), true), (None, None));
    }

    fn source_folder(name: &str, files: &[(&str, &[u8])]) -> std::path::PathBuf {
        let root = std::env::temp_dir().join(format!("pkh-emu-import-source-{name}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        for (path, bytes) in files {
            crate::files::write_file(&root.join(path), bytes).unwrap();
        }
        root
    }

    fn walked(root: &std::path::Path) -> Walk {
        let mut walk = Walk::default();
        walk_path(root, &mut walk).unwrap();
        walk
    }

    fn scanned(root: &std::path::Path) -> (Vec<String>, usize) {
        let (found, other) = sort_found(walked(root).listed);
        let mut names: Vec<String> = found
            .iter()
            .map(|file| std::path::Path::new(&file.file).strip_prefix(root).unwrap().to_string_lossy().into_owned())
            .collect();
        names.sort();
        (names, other)
    }

    #[test]
    fn finds_roms_and_saves_in_every_folder_inside_the_pick() {
        let root = source_folder(
            "nested",
            &[
                ("roms/gba/Emerald.gba", b"rom"),
                ("roms/gbc/Crystal.7z", b"7z"),
                ("roms/Red.GB", b"rom"),
                ("saves/mGBA/Emerald.srm", b"save"),
                ("saves/Crystal.SAV", b"save"),
                ("saves/Platinum.dsv", b"save"),
                ("roms/readme.txt", b"hi"),
                ("states/Emerald.state1", b"state"),
                (".thumbnails/Emerald.gba", b"hidden"),
                ("roms/.DS_Store", b"hidden"),
                ("roms/.Ruby.gba.icloud", b"stub"),
            ],
        );

        let (found, other) = scanned(&root);

        assert_eq!(
            found,
            [
                "roms/Red.GB",
                "roms/gba/Emerald.gba",
                "roms/gbc/Crystal.7z",
                "saves/Crystal.SAV",
                "saves/Platinum.dsv",
                "saves/mGBA/Emerald.srm",
            ]
        );
        assert_eq!(other, 2);
        assert_eq!(walked(&root).offline, [root.join("roms/Ruby.gba").to_string_lossy()]);
    }

    #[test]
    fn leaves_the_source_files_alone() {
        let source: [(&str, &[u8]); 2] = [("roms/Emerald.gba", b"rom"), ("saves/Emerald.srm", b"save")];
        let root = source_folder("untouched", &source);
        let games = temp_folder("untouched");
        block_on(games.write("gba/Emerald.gba", b"old rom")).unwrap();
        block_on(games.write("gba/Emerald.sav", b"old save")).unwrap();
        let listed = walked(&root).listed;

        for file in listed {
            let opened = std::fs::File::open(&file.file).unwrap();
            if is_save(&file.name) {
                let bytes = std::fs::read(&file.file).unwrap();
                block_on(import_save_file(&games, "gba/Emerald.gba", &file.name, bytes, None, "2026-10-11_1200"))
                    .unwrap();
            } else {
                block_on(copy_rom(&games, "gba/Emerald (2).gba", opened)).unwrap();
            }
        }

        assert_eq!(block_on(games.read("gba/Emerald (2).gba")).unwrap(), b"rom");
        assert_eq!(block_on(games.read("gba/Emerald.sav")).unwrap(), b"save");
        for (path, bytes) in source {
            assert_eq!(std::fs::read(root.join(path)).unwrap(), bytes, "{path}");
        }
        assert_eq!(scanned(&root).0, ["roms/Emerald.gba", "saves/Emerald.srm"]);
    }

    #[derive(Clone, Default)]
    struct Scope {
        open: Arc<AtomicUsize>,
        bytes_left: Arc<AtomicUsize>,
    }

    impl Scope {
        fn start(&self) -> files::Reading {
            self.open.fetch_add(1, SeqCst);
            let open = self.open.clone();
            files::Reading::until(move || {
                open.fetch_sub(1, SeqCst);
            })
        }

        fn open(&self) -> usize {
            self.open.load(SeqCst)
        }
    }

    // Reads only while access is open, until the scope ends after its bytes run out.
    struct InScope {
        file: files::PickedFile,
        scope: Scope,
    }

    impl Read for InScope {
        fn read(&mut self, buf: &mut [u8]) -> std::io::Result<usize> {
            let left = self.scope.bytes_left.load(SeqCst);
            if self.scope.open() == 0 || left == 0 {
                return Err(std::io::ErrorKind::PermissionDenied.into());
            }
            let end = buf.len().min(left);
            let read = self.file.read(&mut buf[..end])?;
            self.scope.bytes_left.fetch_sub(read, SeqCst);
            Ok(read)
        }
    }

    #[test]
    fn keeps_the_games_copied_before_access_to_the_folder_ends() {
        use crate::test_games::pattern;
        let (crystal, emerald) = (pattern(0x10000, 1), pattern(0x10000, 2));
        let source: [(&str, &[u8]); 3] =
            [("roms/Crystal.gbc", &crystal), ("roms/Emerald.gba", &emerald), ("saves/Emerald.srm", b"save")];
        let root = source_folder("scope", &source);
        let games = temp_folder("scope");
        let scope = Scope::default();
        scope.bytes_left.store(crystal.len() + 0x1000, SeqCst);

        let (mut found, _) = {
            let _reading = scope.start();
            sort_found(walked(&root).listed)
        };
        found.retain(|file| is_rom(&file.name));
        found.sort_by(|a, b| a.name.cmp(&b.name));
        let copied: Vec<bool> = found
            .iter()
            .map(|file| {
                let system = Path::new(&file.name).extension().unwrap().to_str().unwrap();
                let picked = files::PickedFile::new(std::fs::File::open(&file.file).unwrap(), scope.start());
                let source = InScope { file: picked, scope: scope.clone() };
                let copied = block_on(copy_rom(&games, &format!("{system}/{}", file.name), source));
                assert_eq!(scope.open(), 0, "{}", file.name);
                copied.is_ok()
            })
            .collect();

        assert_eq!(copied, [true, false]);
        scope.bytes_left.store(emerald.len(), SeqCst);
        let ended =
            files::PickedFile::new(std::fs::File::open(root.join("roms/Emerald.gba")).unwrap(), Default::default());
        assert!(block_on(copy_rom(&games, "gba/Emerald.gba", InScope { file: ended, scope: scope.clone() })).is_err());
        assert_eq!(block_on(games.read("gbc/Crystal.gbc")).unwrap(), crystal);
        assert_eq!(names(&games, "gba"), Vec::<String>::new());
        for (path, bytes) in source {
            assert_eq!(std::fs::read(root.join(path)).unwrap(), bytes, "{path}");
        }
    }

    #[test]
    fn says_why_it_cant_read_the_picked_folder() {
        let root = std::env::temp_dir().join(format!("pkh-emu-import-unreadable-{}", std::process::id()));

        let Err(refused) = block_on(walk_folder(root.clone())) else { panic!("read {}", root.display()) };

        assert!(refused.starts_with(&root.display().to_string()), "{refused}");
    }

    fn delta_folder(name: &str, files: &[(String, Vec<u8>)]) -> std::path::PathBuf {
        let files: Vec<(&str, &[u8])> = files.iter().map(|(path, bytes)| (path.as_str(), bytes.as_slice())).collect();
        source_folder(name, &files)
    }

    fn now() -> u64 {
        SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs()
    }

    const DAY: u64 = 24 * 60 * 60;

    #[test]
    fn finds_a_delta_library_and_skips_deltas_own_folders() {
        let (crystal, emerald, platinum) = ("c".repeat(40), "e".repeat(40), "f".repeat(40));
        let games = [
            format!("{crystal}.gbc"),
            format!("{crystal}.sav"),
            format!("{crystal}.rtc"),
            format!("{emerald}.gba"),
            format!("{emerald}.sav"),
            format!("{platinum}.nds"),
            format!("{platinum}.dsv"),
        ];
        let mut files: Vec<(String, Vec<u8>)> =
            games.iter().map(|name| (format!("Delta/Database/Games/{name}"), b"bytes".to_vec())).collect();
        files.extend([
            (format!("Delta/Database/Save States/{crystal}/state.svs"), b"state".to_vec()),
            (format!("Delta/Database/Save States/{crystal}/{crystal}.sav"), b"save".to_vec()),
            ("Delta/Database/Controller Skins/skin.gbc".into(), b"skin".to_vec()),
            (format!("Delta/Backups/2026-10-01/{crystal}.sav"), b"old save".to_vec()),
            ("Delta/Database/Delta.sqlite".into(), b"db".to_vec()),
        ]);
        let root = delta_folder("delta-scan", &files);

        let (found, other) = scanned(&root);

        let mut expected: Vec<String> = games.iter().map(|name| format!("Delta/Database/Games/{name}")).collect();
        expected.sort();
        assert_eq!(found, expected);
        assert_eq!(other, 1);
        assert_eq!(scanned(&root.join("Delta/Database")).0.len(), games.len());
        assert_eq!(scanned(&root.join("Delta/Database/Games")).0.len(), games.len());
    }

    #[test]
    fn keeps_a_backups_folder_that_isnt_deltas() {
        let root = source_folder("backups", &[("saves/Backups/Emerald.sav", b"save"), ("roms/Emerald.gba", b"rom")]);

        assert_eq!(scanned(&root).0, ["roms/Emerald.gba", "saves/Backups/Emerald.sav"]);
    }

    #[test]
    fn names_a_rom_named_by_its_sha1_from_its_header() {
        use crate::test_games::{gb_header, gba_header, nds_header};
        let sha1 = "0123456789abcdef0123456789ABCDEF01234567";
        let titled = |name: &str, header: Vec<u8>| {
            let mut file = Cursor::new(header);
            let named = title(name, &mut file);
            assert_eq!(file.position(), 0, "{name}");
            named
        };

        assert_eq!(titled(&format!("{sha1}.gbc"), gb_header(b"PM_CRYSTAL", 0)).as_deref(), Some("Crystal"));
        assert_eq!(titled(&format!("{sha1}.gba"), gba_header(b"POKEMON EMER", b"BPEE", 0)).as_deref(), Some("Emerald"));
        assert_eq!(titled(&format!("{sha1}.nds"), nds_header(b"CPUE", 0)).as_deref(), Some("Platinum"));
        assert_eq!(titled(&format!("{sha1}.gb"), gb_header(b"TETRIS", 0)).as_deref(), Some("TETRIS"));
        assert_eq!(titled(&format!("{sha1}.gb"), gb_header(b"AC/DC", 0)), None);
        assert_eq!(titled(&format!("{sha1}.gba"), vec![0; 0x200]), None);
        assert_eq!(titled("Crystal.gbc", gb_header(b"PM_CRYSTAL", 0)), None);
        assert_eq!(titled(&format!("{}.gbc", &sha1[1..]), gb_header(b"PM_CRYSTAL", 0)), None);
    }

    #[test]
    fn gives_a_save_the_clock_from_a_delta_rtc() {
        use crate::test_games::{clock_rom, days_on_the_clock, lock_core};
        let games = temp_folder("delta-clock");
        block_on(games.write("gbc/Crystal.gbc", b"rom")).unwrap();
        let rtc = ((now() - 3 * DAY) as u32).to_be_bytes().to_vec();

        block_on(import_save_file(&games, "gbc/Crystal.gbc", "c.sav", vec![0; 0x8000], Some(rtc), "2026-10-11_1200"))
            .unwrap();

        let file = block_on(games.read("gbc/Crystal.sav")).unwrap();
        assert_eq!(file.len(), 0x8000 + 48);
        let _lock = lock_core();
        let mut core = crate::retro::Core::load(clock_rom(), &std::env::temp_dir()).unwrap();
        let [save_ram, rtc] = core.save_memory();
        save::fill(save_ram, rtc, &file);
        for _ in 0..10 {
            core.run_frame();
        }
        assert_eq!(days_on_the_clock(&mut core), 3);
    }

    #[test]
    fn takes_a_save_without_a_clock_as_the_same_as_pkhemus_with_one() {
        let games = temp_folder("delta-same");
        block_on(games.write("gbc/Crystal.gbc", b"rom")).unwrap();
        let rtc = ((now() - DAY) as u32).to_be_bytes().to_vec();
        block_on(import_save_file(&games, "gbc/Crystal.gbc", "c.sav", vec![1; 0x8000], Some(rtc), "2026-10-11_1200"))
            .unwrap();

        let existing =
            |save: Vec<u8>| block_on(existing_save(&games, "gbc/Crystal.gbc", "c.sav", save)).unwrap().unwrap();

        assert!(existing(vec![1; 0x8000]).same);
        assert!(!existing(vec![2; 0x8000]).same);
    }

    #[test]
    fn keeps_every_byte_of_a_delta_dsv() {
        let games = temp_folder("delta-dsv");
        block_on(games.write("nds/Platinum.nds", b"rom")).unwrap();
        let dsv = crate::test_games::pattern(0x80000, 7);

        block_on(import_save_file(&games, "nds/Platinum.nds", "f.dsv", dsv.clone(), None, "2026-10-11_1200")).unwrap();

        assert_eq!(block_on(games.read("nds/Platinum.dsv")).unwrap(), dsv);
    }

    #[test]
    fn leaves_a_delta_folder_untouched() {
        use crate::test_games::{files_in, gb_header};
        let sha1 = "c".repeat(40);
        let files = vec![
            (format!("Database/Games/{sha1}.gbc"), gb_header(b"PM_CRYSTAL", 0)),
            (format!("Database/Games/{sha1}.sav"), vec![1; 0x8000]),
            (format!("Database/Games/{sha1}.rtc"), ((now() - DAY) as u32).to_be_bytes().to_vec()),
            (format!("Database/Save States/{sha1}/state.svs"), b"state".to_vec()),
        ];
        let root = delta_folder("delta-untouched", &files);
        let games = temp_folder("delta-untouched");
        let listed = walked(&root).listed;
        let (found, _) = sort_found(listed);

        for file in &found {
            let path = std::path::Path::new(&file.file);
            if is_rom(&file.name) {
                let mut opened = std::fs::File::open(path).unwrap();
                let title = title(&file.name, &mut opened).unwrap();
                block_on(copy_rom(&games, &format!("gbc/{title}.gbc"), opened)).unwrap();
            } else if is_save(&file.name) {
                let (bytes, rtc) = (std::fs::read(path).unwrap(), std::fs::read(path.with_extension("rtc")).ok());
                block_on(import_save_file(&games, "gbc/Crystal.gbc", &file.name, bytes, rtc, "2026-10-11_1200"))
                    .unwrap();
            }
        }

        assert_eq!(block_on(games.read("gbc/Crystal.sav")).unwrap().len(), 0x8000 + 48);
        assert_eq!(block_on(games.read("gbc/Crystal.gbc")).unwrap(), files[0].1);
        let mut expected: Vec<_> = files.iter().map(|(path, _)| root.join(path)).collect();
        expected.sort();
        assert_eq!(files_in(&root), expected);
        for (path, bytes) in &files {
            assert_eq!(&std::fs::read(root.join(path)).unwrap(), bytes, "{path}");
        }
    }

    #[test]
    fn renames_a_save_to_the_name_the_app_reads() {
        let games = temp_folder("save");
        block_on(games.write("gba/Emerald.gba", b"rom")).unwrap();
        block_on(games.write("nds/Platinum.nds", b"rom")).unwrap();

        block_on(import_save_file(&games, "gba/Emerald.gba", "emerald.srm", b"save".to_vec(), None, "2026-10-11_1200"))
            .unwrap();
        block_on(import_save_file(&games, "nds/Platinum.nds", "PLATINUM.DSV", b"ds".to_vec(), None, "2026-10-11_1200"))
            .unwrap();

        assert_eq!(names(&games, "gba"), ["Emerald.gba", "Emerald.sav"]);
        assert_eq!(block_on(games.read("gba/Emerald.sav")).unwrap(), b"save");
        assert_eq!(names(&games, "nds"), ["Platinum.dsv", "Platinum.nds"]);
    }

    #[test]
    fn backs_up_the_save_it_replaces_first() {
        let games = temp_folder("replace");
        block_on(games.write("gba/Emerald.gba", b"rom")).unwrap();
        block_on(games.write("gba/Emerald.sav", b"pkhemu's")).unwrap();
        block_on(games.write("gba/Emerald/states/resume.state", b"state")).unwrap();

        block_on(import_save_file(
            &games,
            "gba/Emerald.gba",
            "Emerald.srm",
            b"picked".to_vec(),
            None,
            "2026-10-11_1200",
        ))
        .unwrap();

        assert_eq!(block_on(games.read("gba/Emerald.sav")).unwrap(), b"picked");
        assert_eq!(names(&games, "gba/Emerald/backups"), ["2026-10-11_1200_import.sav"]);
        assert_eq!(backups(&games, "gba/Emerald.gba"), [b"pkhemu's".to_vec()]);
        assert!(!block_on(games.has_file("gba/Emerald/states/resume.state")));
    }

    #[test]
    fn replaces_a_save_of_the_other_kind() {
        let games = temp_folder("other-kind");
        block_on(games.write("nds/Platinum.nds", b"rom")).unwrap();
        block_on(games.write("nds/Platinum.dsv", b"pkhemu's")).unwrap();

        block_on(import_save_file(
            &games,
            "nds/Platinum.nds",
            "Platinum.sav",
            b"picked".to_vec(),
            None,
            "2026-10-11_1200",
        ))
        .unwrap();

        assert_eq!(names(&games, "nds"), ["Platinum", "Platinum.nds", "Platinum.sav"]);
        assert_eq!(backups(&games, "nds/Platinum.nds"), [b"pkhemu's".to_vec()]);
    }

    #[test]
    fn takes_an_n64_srm_whole_and_refuses_other_sizes() {
        let games = temp_folder("n64");
        block_on(games.write("n64/Stadium.z64", b"rom")).unwrap();
        let mut srm = vec![0; save::n64::SIZE];
        srm[0] = 1;

        assert!(block_on(import_save_file(
            &games,
            "n64/Stadium.z64",
            "Stadium.srm",
            vec![1; 32],
            None,
            "2026-10-11_1200"
        ))
        .is_err());
        block_on(import_save_file(&games, "n64/Stadium.z64", "Stadium.srm", srm.clone(), None, "2026-10-11_1200"))
            .unwrap();

        let (_, save) = block_on(save::open(&games, "n64/Stadium.z64")).unwrap();
        assert_eq!(save, Some(srm));
    }

    #[test]
    fn refuses_a_compressed_retroarch_save_before_asking_to_replace() {
        let games = temp_folder("rzip");
        block_on(games.write("gba/Emerald.gba", b"rom")).unwrap();

        let refused = block_on(import_save_file(
            &games,
            "gba/Emerald.gba",
            "Emerald.srm",
            b"#RZIPv1 data".to_vec(),
            None,
            "2026-10-11_1200",
        ));

        assert!(refused.is_err());
        assert!(block_on(existing_save(&games, "gba/Emerald.gba", "Emerald.srm", b"#RZIPv1 data".to_vec())).is_err());
        assert_eq!(names(&games, "gba"), ["Emerald.gba"]);
    }

    #[test]
    fn tells_whether_the_game_has_a_save_and_whether_it_is_the_same() {
        let games = temp_folder("existing");
        block_on(games.write("gba/Emerald.gba", b"rom")).unwrap();

        assert_eq!(block_on(existing_save(&games, "gba/Emerald.gba", "Emerald.srm", b"save".to_vec())).unwrap(), None);

        block_on(games.write("gba/Emerald.sav", b"save")).unwrap();
        let modified = millis(block_on(games.modified("gba/Emerald.sav")).unwrap());

        assert_eq!(
            block_on(existing_save(&games, "gba/Emerald.gba", "Emerald.srm", b"save".to_vec())).unwrap(),
            Some(Existing { modified, same: true })
        );
        assert_eq!(
            block_on(existing_save(&games, "gba/Emerald.gba", "Emerald.srm", b"other".to_vec())).unwrap(),
            Some(Existing { modified, same: false })
        );
    }
}
