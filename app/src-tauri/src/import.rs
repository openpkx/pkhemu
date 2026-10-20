#[cfg_attr(target_os = "android", path = "import/android.rs")]
#[cfg_attr(target_os = "ios", path = "import/ios.rs")]
#[cfg_attr(desktop, path = "import/desktop.rs")]
pub(crate) mod platform;

use std::collections::HashMap;
use std::io::{BufReader, Read, Seek, Write};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, Runtime, State};
use url::Url;

use crate::backups::{self, Reason};
use crate::files::{self, open_picked};
use crate::game_art::{sha1_of_disc, sha1_of_rom, sha1_of_stream, sha1_of_unpacked};
use crate::games_folder::GamesFolder;
use crate::index::Index;
use crate::{game_cube, resume, rom, save, three_ds};

const SYSTEMS: [&str; 7] = ["gb", "gbc", "gba", "nds", "n64", "3ds", "gc"];

struct App {
    name: Option<&'static str>,
    markers: &'static [&'static str],
    skipped: &'static [&'static str],
}

// Delta's markers sit at two levels, so it has two rows. Every app that runs Azahar keeps its folders as Azahar does.
const APPS: [App; 6] = [
    App { name: Some("Delta"), markers: &["Database", "Backups"], skipped: &["Backups"] },
    App { name: Some("Delta"), markers: &["Games", "Delta.sqlite"], skipped: &["Save States", "Controller Skins"] },
    App {
        name: Some("Provenance"),
        markers: &["ROMs", "Battery States"],
        skipped: &["Save States", "Screenshots", "BIOS", "Cheats", "Patches", "System", "DeltaSkins", "Conflicts"],
    },
    App {
        name: Some("RetroArch"),
        markers: &["saves", "system", "config"],
        skipped: &[
            "states",
            "system",
            "screenshots",
            "thumbnails",
            "playlists",
            "logs",
            "config",
            "cht",
            "database",
            "assets",
            "overlays",
            "shaders",
            "info",
            "autoconfig",
        ],
    },
    App {
        name: Some("Manic EMU"),
        markers: &["Datas", "3DS"],
        skipped: &["BIOS", "Assets", "Manuals", "Palettes", "Shaders", "PPSSPP", "Dolphin", ".manic-sync"],
    },
    App { name: None, markers: &["sdmc", "nand"], skipped: &["nand", "sysdata", "states", "config"] },
];
const DEMO: &[u8] = include_bytes!("../demo/Tobu Tobu Girl Deluxe.gbc");
const DEMO_PATH: &str = "gbc/Tobu Tobu Girl Deluxe.gbc";

fn error(reason: impl ToString) -> String {
    reason.to_string()
}

pub(crate) fn millis(time: SystemTime) -> i64 {
    time.duration_since(UNIX_EPOCH).unwrap_or_default().as_millis() as i64
}

fn is_rom(name: &str) -> bool {
    rom::is_rom(name) || rom::is_archive(name) || three_ds::is_import(name) || rom::is_game_cube(name)
}

#[derive(Serialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Picked {
    file: String,
    name: String,
    folder: Option<String>,
    modified: i64,
    size: u64,
    inner: Option<String>,
    sha1: Option<String>,
    title: Option<String>,
    patch: Option<&'static str>,
    archive: Option<String>,
    error: Option<String>,
    title_id: Option<String>,
}

pub(crate) struct Listed {
    file: String,
    name: String,
    folder: Option<String>,
    modified: SystemTime,
    size: u64,
    title_id: Option<u64>,
}

fn identify(name: &str, file: impl Read + Seek, hash: bool) -> Result<(Option<String>, Option<String>), String> {
    // A 3DS game is known by the bytes its import writes, so importing it again finds the copy.
    if three_ds::is_import(name) {
        return Ok((
            None,
            if hash { three_ds::imported(file).ok().and_then(|copy| sha1_of_unpacked(copy).ok()) } else { None },
        ));
    }
    if rom::is_game_cube(name) {
        return Ok((None, if hash { sha1_of_disc(file).map_err(|e| format!("{name}: {e}"))? } else { None }));
    }
    if !rom::is_archive(name) {
        return Ok((None, if hash { sha1_of_stream(file).ok() } else { None }));
    }
    // A zipped disc is only named, since importing it is refused rather than unpacking 1.4 GB.
    let read = |inner: &str, _, rom: &mut dyn Read| {
        Ok((inner.to_owned(), if hash && !rom::is_game_cube(inner) { Some(sha1_of_stream(rom)?) } else { None }))
    };
    let found = rom::find_archived_game(name, BufReader::new(file), read)?;
    Ok(found.map_or((None, None), |(inner, sha1)| (Some(inner), sha1)))
}

// Delta names each ROM by its SHA-1 and keeps the game's name in its own database.
fn named_by_hash(name: &str) -> bool {
    let stem = Path::new(name).file_stem().and_then(|stem| stem.to_str()).unwrap_or_default();
    rom::is_rom(name) && stem.len() == 40 && stem.bytes().all(|byte| byte.is_ascii_hexdigit())
}

fn title_id(name: &str, file: &mut (impl Read + Seek)) -> Option<u64> {
    if !three_ds::is_import(name) {
        return None;
    }
    let copy = three_ds::imported(&mut *file).ok();
    let title_id = copy.and_then(|mut copy| three_ds::title_id(&mut copy).ok().flatten());
    file.rewind().ok()?;
    title_id
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
    let Listed { file, name, folder, modified, size, title_id: azahar_title } = listed;
    let opened = hash || rom::is_archive(&name) || named_by_hash(&name) || three_ds::is_import(&name);
    let (inner, sha1, title, title_id, failed) = match is_rom(&name) && opened {
        true => match open_picked(app, &file).await {
            Ok(mut opened) => {
                let archive = name.clone();
                tauri::async_runtime::spawn_blocking(move || {
                    let (title, title_id) = (title(&archive, &mut opened), title_id(&archive, &mut opened));
                    match identify(&archive, opened, hash) {
                        Ok((inner, sha1)) => (inner, sha1, title, title_id, None),
                        Err(e) => (None, None, title, title_id, Some(e)),
                    }
                })
                .await
                .unwrap_or_else(|e| (None, None, None, None, Some(error(e))))
            }
            Err(e) => (None, None, None, None, Some(e)),
        },
        false => (None, None, None, azahar_title.filter(|&title_id| save::three_ds::fits(title_id, size)), None),
    };
    if let Some(e) = &failed {
        eprintln!("reading {e}");
    }
    let patch = match is_rom(&name) || is_save(&name) || is_clock(&name) || azahar_title.is_some() {
        true => None,
        false => open_picked(app, &file).await.ok().and_then(crate::patching::format_of),
    };
    let (modified, title_id) = (millis(modified), title_id.map(|title_id| format!("{title_id:016x}")));
    Picked { file, name, folder, modified, size, inner, sha1, title, patch, archive: None, error: failed, title_id }
}

struct Unzipped {
    name: String,
    path: PathBuf,
    size: u64,
    format: &'static str,
}

fn unzip_patch(entry: &mut impl Read, name: &str, dir: &Path) -> std::io::Result<Option<Unzipped>> {
    let mut magic = Vec::new();
    entry.by_ref().take(5).read_to_end(&mut magic)?;
    let Some(format) = crate::patch::detect(&magic) else { return Ok(None) };
    let name = Path::new(name).file_name().map_or_else(String::new, |name| name.to_string_lossy().into_owned());
    let mut file = tempfile::NamedTempFile::new_in(dir)?;
    file.write_all(&magic)?;
    let size = std::io::copy(entry, &mut file)? + magic.len() as u64;
    let (_, path) = file.keep().map_err(|e| e.error)?;
    Ok(Some(Unzipped { name, path, size, format: crate::patching::format(format) }))
}

// The patch dialog reads a patch by path, so each patch found in a zip goes to a file of its own.
fn unzip_patches(archive: impl Read + Seek, dir: &Path) -> Result<Vec<Unzipped>, String> {
    let mut archive = zip::ZipArchive::new(BufReader::new(archive)).map_err(error)?;
    std::fs::create_dir_all(dir).map_err(|e| format!("{}: {e}", dir.display()))?;
    let mut patches = Vec::new();
    for index in 0..archive.len() {
        let Ok(mut entry) = archive.by_index(index) else { continue };
        let name = entry.name().to_owned();
        if entry.is_dir() || is_rom(&name) {
            continue;
        }
        match unzip_patch(&mut entry, &name, dir) {
            Ok(patch) => patches.extend(patch),
            Err(e) => eprintln!("unzipping {name}: {e}"),
        }
    }
    Ok(patches)
}

async fn zipped_patches<R: Runtime>(app: &AppHandle<R>, zip: &Picked, dir: PathBuf) -> Vec<Picked> {
    let Ok(file) = open_picked(app, &zip.file).await else { return Vec::new() };
    let patches = match tauri::async_runtime::spawn_blocking(move || unzip_patches(file, &dir)).await {
        Ok(Ok(patches)) => patches,
        Ok(Err(e)) => {
            eprintln!("looking for patches in {}: {e}", zip.name);
            Vec::new()
        }
        Err(_) => Vec::new(),
    };
    patches
        .into_iter()
        .map(|patch| Picked {
            file: patch.path.to_string_lossy().into_owned(),
            name: patch.name,
            folder: None,
            modified: zip.modified,
            size: patch.size,
            inner: None,
            sha1: None,
            title: None,
            patch: Some(patch.format),
            archive: Some(zip.name.clone()),
            error: None,
            title_id: None,
        })
        .collect()
}

// Azahar runs a 3DS game by its path, so a zipped one is unpacked and listed as a file of its own.
async fn unzipped_game<R: Runtime>(
    app: &AppHandle<R>,
    archive: &Picked,
    modified: SystemTime,
    dir: PathBuf,
) -> Result<Option<Picked>, String> {
    let file = open_picked(app, &archive.file).await?;
    let name = archive.name.clone();
    let unpacked =
        tauri::async_runtime::spawn_blocking(move || rom::unpack_3ds(&name, file, &dir)).await.map_err(error)?;
    let Some((inner, path)) = unpacked? else { return Ok(None) };
    let size = std::fs::metadata(&path).map_err(|e| format!("{}: {e}", path.display()))?.len();
    let file = path.to_string_lossy().into_owned();
    let name = Path::new(&inner).file_name().map_or_else(|| inner.clone(), |name| name.to_string_lossy().into_owned());
    let picked = picked(app, Listed { file, name, folder: None, modified, size, title_id: None }, true).await;
    Ok(Some(Picked { archive: Some(archive.name.clone()), ..picked }))
}

async fn with_unzipped<R: Runtime>(app: &AppHandle<R>, listed: Listed, dir: &Path) -> Vec<Picked> {
    let (zip, modified) = (has_extension(&listed.name, &["zip"]), listed.modified);
    let mut picked = picked(app, listed, true).await;
    let game = if rom::is_archive(&picked.name) {
        unzipped_game(app, &picked, modified, dir.to_owned()).await.unwrap_or_else(|e| {
            eprintln!("unzipping {e}");
            picked.error = Some(e);
            None
        })
    } else {
        None
    };
    let patches = if zip { zipped_patches(app, &picked, dir.to_owned()).await } else { Vec::new() };
    std::iter::once(picked).chain(game).chain(patches).collect()
}

// The frontend imports one batch at a time, so the files unzipped for the last one are done with.
fn unzipped_dir<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    let dir = files::cache_dir(app, "unzipped")?;
    if let Err(e) = std::fs::remove_dir_all(&dir) {
        if e.kind() != std::io::ErrorKind::NotFound {
            eprintln!("removing {}: {e}", dir.display());
        }
    }
    Ok(dir)
}

#[tauri::command]
pub async fn import_pick<R: Runtime>(app: AppHandle<R>) -> Result<Vec<Picked>, String> {
    let unzipped = unzipped_dir(&app)?;
    let mut files = Vec::new();
    for listed in platform::pick(&app).await? {
        files.extend(with_unzipped(&app, listed, &unzipped).await);
    }
    Ok(files)
}

async fn listed<R: Runtime>(app: &AppHandle<R>, file: String) -> Result<Listed, String> {
    let meta = open_picked(app, &file).await?.metadata().map_err(|e| format!("{file}: {e}"))?;
    let modified = meta.modified().map_err(|e| format!("{file}: {e}"))?;
    let path = Url::parse(&file).ok().and_then(|url| url.to_file_path().ok()).unwrap_or_else(|| PathBuf::from(&file));
    let name = path.file_name().map_or_else(String::new, |name| name.to_string_lossy().into_owned());
    Ok(Listed { file, name, folder: None, modified, size: meta.len(), title_id: None })
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

pub fn opened<R: Runtime>(app: &AppHandle<R>, files: Vec<String>) {
    if app.state::<Opened>().add(files) {
        let _ = app.emit("files-opened", ());
    }
}

fn file_urls(urls: Vec<Url>) -> Vec<String> {
    urls.into_iter().filter(|url| url.scheme() == "file").map(String::from).collect()
}

pub fn opened_urls<R: Runtime>(app: &AppHandle<R>, urls: Vec<Url>) {
    opened(app, file_urls(urls));
}

#[tauri::command]
pub async fn import_opened<R: Runtime>(app: AppHandle<R>, opened: State<'_, Opened>) -> Result<Vec<Picked>, String> {
    let (done, next) = opened.next();
    platform::remove_copies(&app, &done);
    let unzipped = unzipped_dir(&app)?;
    let (mut files, mut failed) = (Vec::new(), None);
    for file in next {
        match platform::listed(&app, file).await {
            Ok(listed) => files.extend(with_unzipped(&app, listed, &unzipped).await),
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
    has_extension(name, &["sav", "sav2", "srm", "dsv"])
}

fn is_clock(name: &str) -> bool {
    has_extension(name, &["rtc"])
}

fn sort_found(listed: Vec<Listed>) -> (Vec<Listed>, usize) {
    let (found, other): (Vec<_>, Vec<_>) = listed
        .into_iter()
        .partition(|file| is_rom(&file.name) || is_save(&file.name) || is_clock(&file.name) || file.title_id.is_some());
    (found, other.len())
}

// Provenance's GBA cores save side by side, VBA-M to a .sav2 and mGBA to a .sav. The .sav2 wins.
fn replaced(name: &str, siblings: &[&str]) -> bool {
    has_extension(name, &["sav"]) && siblings.iter().any(|sibling| sibling.eq_ignore_ascii_case(&format!("{name}2")))
}

// iCloud lists a file that isn't on the device as a hidden ".<name>.icloud" stub.
fn in_icloud(name: &str) -> Option<&str> {
    name.strip_prefix('.')?.strip_suffix(".icloud")
}

fn offline(name: &str) -> Option<&str> {
    in_icloud(name).filter(|name| is_rom(name) || is_save(name) || is_clock(name))
}

#[derive(Default)]
pub(crate) struct Walk {
    listed: Vec<Listed>,
    offline: Vec<String>,
    app: Option<&'static str>,
}

// Azahar installs a game's .app files in content, beside its save data in data.
fn installed(dir: &Path) -> bool {
    dir.parent().and_then(Path::parent).and_then(Path::file_name).is_some_and(|name| name == "title")
}

fn azahar_save(dir: &Path, name: &str) -> Option<u64> {
    (name == "main").then(|| save::three_ds::archive_title(dir)).flatten()
}

impl Walk {
    fn enter_dir<'a>(&mut self, dir: &Path, names: &'a [String]) -> impl Fn(&str) -> bool + 'a {
        let names: Vec<&str> = names.iter().map(|name| in_icloud(name).unwrap_or(name)).collect();
        let apps: Vec<&App> =
            APPS.iter().filter(|app| app.markers.iter().all(|marker| names.contains(marker))).collect();
        self.app = self.app.or(apps.iter().find_map(|app| app.name));
        let installed = installed(dir);
        move |name| {
            name.starts_with('.')
                || apps.iter().any(|app| app.skipped.contains(&name))
                || replaced(name, &names)
                || installed && name == "content"
        }
    }
}

fn walk_path(dir: &Path, walk: &mut Walk) -> std::io::Result<()> {
    let entries: Vec<_> = std::fs::read_dir(dir)?.flatten().collect();
    let names: Vec<String> = entries.iter().map(|entry| entry.file_name().to_string_lossy().into_owned()).collect();
    let skipped = walk.enter_dir(dir, &names);
    for (entry, name) in entries.iter().zip(&names) {
        if let Some(name) = offline(name) {
            walk.offline.push(dir.join(name).to_string_lossy().into_owned());
            continue;
        }
        if skipped(name) {
            continue;
        }
        let (Ok(kind), Ok(meta)) = (entry.file_type(), entry.metadata()) else { continue };
        if kind.is_dir() {
            let _ = walk_path(&entry.path(), walk);
        } else if kind.is_file() {
            let file = entry.path().to_string_lossy().into_owned();
            let (name, folder) = (name.clone(), Some(dir.to_string_lossy().into_owned()));
            let (modified, title_id) = (meta.modified().unwrap_or(UNIX_EPOCH), azahar_save(dir, &name));
            walk.listed.push(Listed { file, name, folder, modified, size: meta.len(), title_id });
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
    app: Option<&'static str>,
}

#[tauri::command]
pub async fn import_scan<R: Runtime>(app: AppHandle<R>, folder: String, hash: bool) -> Result<Scan, String> {
    let _reading = files::reading(&app, &folder).await?;
    let walk = platform::walk(&app, &folder).await?;
    let (found, other) = sort_found(walk.listed);
    let mut files = Vec::new();
    for listed in found {
        files.push(picked(&app, listed, hash).await);
    }
    Ok(Scan { files, other, app: walk.app })
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

#[tauri::command]
pub async fn import_title_ids<R: Runtime>(
    app: AppHandle<R>,
    folder: String,
    paths: Vec<String>,
) -> Result<HashMap<String, String>, String> {
    Ok(title_ids(&GamesFolder::open(&app, &folder), paths).await)
}

async fn title_ids<R: Runtime>(games: &GamesFolder<'_, R>, paths: Vec<String>) -> HashMap<String, String> {
    let mut title_ids = HashMap::new();
    for path in paths.into_iter().filter(|path| rom::is_3ds(path)) {
        let Ok(mut file) = games.open_file(&path).await else { continue };
        if let Ok(Some(title_id)) = three_ds::title_id(&mut file) {
            title_ids.insert(path, format!("{title_id:016x}"));
        }
    }
    title_ids
}

fn check_rom_path(path: &str) -> Result<(), String> {
    match path.split_once('/') {
        Some((system, name))
            if SYSTEMS.contains(&system)
                && !name.contains('/')
                && !name.starts_with('.')
                && match system {
                    "3ds" => rom::is_3ds(name),
                    "gc" => rom::is_game_cube(name),
                    _ => is_rom(name) && !three_ds::is_import(name) && !rom::is_game_cube(name),
                } =>
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

/// Copies a ROM to `path`, or an update to the games it updates, which it returns.
#[tauri::command]
pub async fn import_rom<R: Runtime>(
    app: AppHandle<R>,
    folder: String,
    file: String,
    path: String,
) -> Result<Vec<String>, String> {
    let source = open_picked(&app, &file).await?;
    let games = GamesFolder::open(&app, &folder);
    match path.split_once('/').map(|(system, _)| system) {
        Some("3ds") => copy_3ds(&games, &path, source).await,
        Some("gc") => copy_disc(&games, &path, source).await.map(|_| Vec::new()),
        _ => copy_rom(&games, &path, source).await.map(|_| Vec::new()),
    }
}

// Dolphin reads a disc by its path, and a 1.4 GB disc is too big to unpack for each run.
pub async fn copy_disc<R: Runtime>(
    games: &GamesFolder<'_, R>,
    path: &str,
    mut source: impl Read + Seek + Send + 'static,
) -> Result<(), String> {
    let name = Path::new(path).file_name().map_or_else(|| path.to_owned(), |name| name.to_string_lossy().into_owned());
    if rom::is_archive(path) {
        return Err(rom::zipped_disc(&name));
    }
    check_rom_path(path)?;
    let (header, source) = tauri::async_runtime::spawn_blocking(move || {
        let header = game_cube::header(&mut source).and_then(|header| source.rewind().map(|_| header));
        (header, source)
    })
    .await
    .map_err(error)?;
    if header.map_err(|e| format!("{name}: {e}"))?.is_none() {
        return Err(game_cube::not_a_disc(&name));
    }
    copy_rom(games, path, source).await
}

pub async fn copy_3ds<R: Runtime>(
    games: &GamesFolder<'_, R>,
    path: &str,
    mut source: impl Read + Seek + Send + 'static,
) -> Result<Vec<String>, String> {
    check_rom_path(path)?;
    let game = rom::game_name(path);
    let (update, source) = tauri::async_runtime::spawn_blocking(move || (three_ds::update::read(&mut source), source))
        .await
        .map_err(error)?;
    if let Some(update) = update.map_err(|refused| refused.message(&game))? {
        return copy_update(games, &game, &update, source).await;
    }
    let copy = tauri::async_runtime::spawn_blocking(move || three_ds::imported(source))
        .await
        .map_err(error)?
        .map_err(|refused| refused.message(&game))?;
    copy_rom(games, path, copy).await.map(|_| Vec::new())
}

async fn copy_update<R: Runtime>(
    games: &GamesFolder<'_, R>,
    name: &str,
    update: &three_ds::update::Update,
    mut source: impl Read + Seek + Send + 'static,
) -> Result<Vec<String>, String> {
    let mut updated = Vec::new();
    for rom in crate::sync::scan(games).await.into_iter().filter(|rom| rom::is_3ds(rom)) {
        let Ok(mut file) = games.open_file(&rom).await else { continue };
        if three_ds::title_id(&mut file).is_ok_and(|title_id| title_id.is_some_and(|id| update.updates(id))) {
            updated.push(rom);
        }
    }
    if updated.is_empty() {
        return Err(three_ds::Refused::Update.message(name));
    }
    for rom in &updated {
        let path = three_ds::update::path(rom);
        let mut copy = games.create_file(&path).await?;
        let copied = tauri::async_runtime::spawn_blocking(move || {
            source.rewind()?;
            std::io::copy(&mut source, &mut copy)?;
            Ok::<_, std::io::Error>((source, copy))
        });
        let (returned, copy) = copied.await.map_err(error)?.map_err(|e| format!("{path}: {e}"))?;
        source = returned;
        copy.finish().await?;
    }
    Ok(updated)
}

#[tauri::command]
pub async fn three_ds_update<R: Runtime>(
    app: AppHandle<R>,
    folder: String,
    path: String,
) -> Result<Option<u16>, String> {
    let games = GamesFolder::open(&app, &folder);
    let update = three_ds::update::path(&path);
    if !games.has_file(&update).await {
        return Ok(None);
    }
    let mut file = games.open_file(&update).await?;
    let read = tauri::async_runtime::spawn_blocking(move || three_ds::update::read(&mut file)).await.map_err(error)?;
    Ok(read.map_err(|refused| refused.message(&update))?.map(|update| update.version))
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
    crate::edited::put(games, rom, None).await?;
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
    use crate::patch::tests::{bps, ips};
    use crate::test_games::{sevenz_of, zip_of};
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
    fn opens_only_file_urls() {
        let urls = ["file:///Inbox/Emerald.gba", "pkhemu://open", "https://example.com/Emerald.sav"];
        let files = file_urls(urls.map(|url| Url::parse(url).unwrap()).to_vec());

        assert_eq!(files, vec!["file:///Inbox/Emerald.gba"]);
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

    fn unzipped(name: &str, files: &[(&str, &[u8])]) -> Vec<(String, &'static str, Vec<u8>)> {
        let dir = std::env::temp_dir().join(format!("pkh-emu-unzip-{name}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        let patches = unzip_patches(Cursor::new(zip_of(files)), &dir).unwrap();
        patches.into_iter().map(|patch| (patch.name, patch.format, std::fs::read(patch.path).unwrap())).collect()
    }

    #[test]
    fn unzips_the_patch_beside_a_readme() {
        let patch = ips(b"base", b"hack");

        let patches = unzipped("one", &[("readme.txt", b"Patch a FireRed ROM"), ("Unbound/Unbound.ips", &patch)]);

        assert_eq!(patches, vec![("Unbound.ips".into(), "ips", patch)]);
    }

    #[test]
    fn unzips_every_patch_found_by_its_magic_bytes() {
        let (first, second) = (bps(b"base", b"hack"), ips(b"base", b"other"));

        let patches =
            unzipped("two", &[("Emerald.gba", b"PATCH but a ROM"), ("hack.bps", &first), ("Speedchoice.dat", &second)]);

        assert_eq!(patches, vec![("hack.bps".into(), "bps", first), ("Speedchoice.dat".into(), "ips", second)]);
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
    fn writes_a_3ds_games_fixed_copy_and_refuses_an_encrypted_one_before_writing() {
        use crate::three_ds::tests::{cia, ncch};
        let games = temp_folder("3ds");
        let (plain, encrypted) = (ncch(0x0004000000055D00, false, true), ncch(0x0004000000055D00, false, false));

        block_on(copy_3ds(&games, "3ds/X.cxi", Cursor::new(cia(0x0004000000055D00, &[(0, plain.clone())])))).unwrap();
        let refused = block_on(copy_3ds(&games, "3ds/Y.cxi", Cursor::new(encrypted)));

        let copy = block_on(games.read("3ds/X.cxi")).unwrap();
        assert_eq!(three_ds::title_id(&mut Cursor::new(&copy)), Ok(Some(0x0004000000055D00)));
        assert_eq!(copy.len(), plain.len());
        assert!(refused.is_err());
        assert_eq!(names(&games, "3ds"), ["X.cxi"]);
        assert!(block_on(copy_3ds(&games, "3ds/Z.cia", Cursor::new(plain))).is_err());
    }

    #[test]
    fn keeps_an_update_beside_the_game_it_updates_and_refuses_one_without_its_game() {
        use crate::three_ds::tests::{cia_of, ncch};
        let games = temp_folder("3ds-update");
        let update = |version| cia_of(0x0004000E00055D00, version, &[(0, 0, ncch(0x0004000E00055D00, true, true))]);
        let without_game = block_on(copy_3ds(&games, "3ds/Update.cxi", Cursor::new(update(1040))));
        block_on(copy_3ds(&games, "3ds/X.cxi", Cursor::new(ncch(0x0004000000055D00, true, true)))).unwrap();
        block_on(copy_3ds(&games, "3ds/Y.cxi", Cursor::new(ncch(0x0004000000055E00, true, true)))).unwrap();

        let older = block_on(copy_3ds(&games, "3ds/Update.cxi", Cursor::new(update(1040)))).unwrap();
        let newer = block_on(copy_3ds(&games, "3ds/Update (2).cxi", Cursor::new(update(5232)))).unwrap();

        assert!(without_game.unwrap_err().contains("Add the game first"));
        assert_eq!((older, newer), (vec!["3ds/X.cxi".to_string()], vec!["3ds/X.cxi".to_string()]));
        assert_eq!(names(&games, "3ds"), ["X", "X.cxi", "Y.cxi"]);
        assert_eq!(block_on(games.read("3ds/X/update.cia")).unwrap(), update(5232));
    }

    #[test]
    fn knows_a_3ds_game_as_the_library_knows_its_copy() {
        let x = 0x0004000000055D00;
        let source = crate::three_ds::tests::cia(x, &[(0, crate::three_ds::tests::ncch(x, false, true))]);
        let games = temp_folder("3ds-sha1");
        block_on(copy_3ds(&games, "3ds/X.cxi", Cursor::new(source.clone()))).unwrap();
        let copy = block_on(games.read("3ds/X.cxi")).unwrap();

        let (_, sha1) = identify("X.cia", Cursor::new(source), true).unwrap();

        assert_eq!(sha1, Some(sha1_of_rom("3ds/X.cxi", Cursor::new(copy)).unwrap()));
    }

    #[test]
    #[cfg(target_arch = "aarch64")]
    fn imports_pokemon_x_and_the_copy_boots() {
        use crate::retro::Core;
        let Some(source) = crate::test_games::three_ds_by_header("Pokémon X", "CTR-P-EKJA", 2) else { return };
        let header =
            |path: &Path| std::fs::File::open(path).unwrap().take(0x5000).bytes().map(Result::unwrap).collect();
        let before: Vec<u8> = header(&source);
        let games = temp_folder("pokemon-x");
        let copy = games.root().join("3ds/X.3ds");

        block_on(copy_3ds(&games, "3ds/X.3ds", std::fs::File::open(&source).unwrap())).unwrap();

        assert_eq!(header(&source), before);
        assert_eq!(three_ds::title_id(&mut std::fs::File::open(&copy).unwrap()), Ok(Some(0x0004000000055D00)));
        let _lock = crate::test_games::lock_core();
        let game = |path: &Path| {
            let name = path.to_string_lossy().into_owned();
            rom::Rom::at(&name, rom::RomFile::new(std::fs::File::open(path).unwrap(), name.clone()))
        };
        assert!(Core::load(game(&source), &std::env::temp_dir()).is_err());
        let mut core = Core::load(game(&copy), &std::env::temp_dir()).unwrap();
        for _ in 0..600 {
            core.run_frame();
        }
        let pixels = core.last_frame(|frame| frame.pixels.clone()).unwrap();
        drop(core);
        let _ = std::fs::remove_dir_all(games.root());
        assert!(pixels.iter().any(|&pixel| pixel != pixels[0]), "the screens are one colour");
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

        let (inner, sha1) = identify("Crystal.7z", Cursor::new(archive.clone()), true).unwrap();

        assert_eq!(inner.as_deref(), Some("Crystal.gbc"));
        assert_eq!(sha1, Some(crate::game_art::sha1_of(b"rom")));
        assert_eq!(identify("Crystal.7z", Cursor::new(archive), false), Ok((Some("Crystal.gbc".into()), None)));
        assert_eq!(
            identify("Crystal.gbc", Cursor::new(b"rom".to_vec()), true),
            Ok((None, Some(crate::game_art::sha1_of(b"rom"))))
        );
        assert!(identify("Crystal.zip", Cursor::new(b"not a zip".to_vec()), true).is_err());
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
        assert_eq!(walked(&root).app, None);
    }

    #[test]
    fn lists_each_file_with_its_folder() {
        let source: [(&str, &[u8]); 3] =
            [("Gambatte/Crystal.srm", b"save"), ("Gambatte/Crystal.rtc", b"rtc"), ("mGBA/Crystal.srm", b"save")];
        let root = source_folder("folders", &source);

        let mut folders: Vec<_> = walked(&root).listed.into_iter().map(|file| (file.file, file.folder)).collect();
        folders.sort();

        let folder = |dir: &str| Some(root.join(dir).to_string_lossy().into_owned());
        let file = |path: &str| root.join(path).to_string_lossy().into_owned();
        assert_eq!(
            folders,
            [
                (file("Gambatte/Crystal.rtc"), folder("Gambatte")),
                (file("Gambatte/Crystal.srm"), folder("Gambatte")),
                (file("mGBA/Crystal.srm"), folder("mGBA")),
            ]
        );
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
    fn says_why_it_cant_read_a_picked_archive() {
        let root = source_folder("bad-zip", &[("bad.zip", b"not a zip")]);
        let app = tauri::test::mock_app();
        let listed = block_on(listed(app.handle(), root.join("bad.zip").to_string_lossy().into_owned())).unwrap();

        let picked = block_on(picked(app.handle(), listed, true));

        assert_eq!(picked.inner, None);
        assert!(picked.error.as_deref().is_some_and(|e| e.starts_with("bad.zip: ")), "{:?}", picked.error);
    }

    #[test]
    fn takes_a_zip_of_patches_as_readable() {
        let root = source_folder("patch-zip", &[("patches.zip", &zip_of(&[("Hack.ips", &ips(b"base", b"hack"))]))]);
        let app = tauri::test::mock_app();
        let listed = block_on(listed(app.handle(), root.join("patches.zip").to_string_lossy().into_owned())).unwrap();

        let picked = block_on(picked(app.handle(), listed, true));

        assert_eq!((picked.inner, picked.error), (None, None));
    }

    fn picked_with_unzipped(name: &str, archive: &str, bytes: &[u8]) -> Vec<Picked> {
        let root = source_folder(name, &[(archive, bytes)]);
        let app = tauri::test::mock_app();
        let listed = block_on(listed(app.handle(), root.join(archive).to_string_lossy().into_owned())).unwrap();
        block_on(with_unzipped(app.handle(), listed, &root.join("unzipped")))
    }

    fn imported_3ds(name: &str, picked: &Picked) -> (GamesFolder<'static, tauri::Wry>, Result<Vec<String>, String>) {
        let games = temp_folder(name);
        let app = tauri::test::mock_app();
        let folder = games.root().to_string_lossy().into_owned();
        let imported = block_on(import_rom(app.handle().clone(), folder, picked.file.clone(), "3ds/Game.cxi".into()));
        (games, imported)
    }

    #[test]
    fn unpacks_a_zipped_3ds_game_to_import_it_as_a_loose_one() {
        let game = crate::three_ds::tests::ncch(0x0004000000055D00, false, true);

        for (name, archive, bytes) in [
            ("zip-3ds", "Game.zip", zip_of(&[("readme.txt", b"hi"), ("Game.3ds", &game)])),
            ("7z-3ds", "Game.7z", sevenz_of(&[("readme.txt", b"hi"), ("games/Game.3ds", &game)])),
        ] {
            let picked = picked_with_unzipped(name, archive, &bytes);

            assert_eq!(picked.len(), 2, "{archive}");
            assert_eq!(picked[0].inner, None);
            let unpacked = &picked[1];
            assert_eq!((unpacked.name.as_str(), unpacked.archive.as_deref()), ("Game.3ds", Some(archive)));
            assert_eq!(unpacked.modified, picked[0].modified);
            assert!(unpacked.sha1.is_some(), "{archive}");
            assert!(Path::new(&unpacked.file).exists(), "{archive}");
        }
    }

    #[test]
    fn writes_a_zipped_cia_as_its_game() {
        use crate::three_ds::tests::{cia, ncch};
        let game = cia(0x0004000000055D00, &[(0, ncch(0x0004000000055D00, false, true))]);
        let picked = picked_with_unzipped("zip-cia", "Game.zip", &zip_of(&[("Game.cia", &game)]));

        let (games, imported) = imported_3ds("zip-cia", &picked[1]);

        assert_eq!(imported, Ok(Vec::new()));
        assert_eq!(names(&games, "3ds"), ["Game.cxi"]);
        let copy = block_on(games.read("3ds/Game.cxi")).unwrap();
        assert_eq!(three_ds::title_id(&mut Cursor::new(copy)), Ok(Some(0x0004000000055D00)));
    }

    #[test]
    fn refuses_a_zipped_encrypted_3ds_game() {
        let game = crate::three_ds::tests::ncch(0x0004000000055D00, false, false);
        let picked = picked_with_unzipped("zip-encrypted", "Game.zip", &zip_of(&[("Game.3ds", &game)]));

        let (games, imported) = imported_3ds("zip-encrypted", &picked[1]);

        assert_eq!(imported, Err(three_ds::Refused::Encrypted.message("Game")));
        assert_eq!(names(&games, "3ds"), Vec::<String>::new());
    }

    #[test]
    fn says_why_it_cant_unzip_a_3ds_game() {
        let mut zip = zip_of(&[("Game.3ds", &crate::three_ds::tests::ncch(0x0004000000055D00, false, true))]);
        // The entry's data starts after the 30-byte local header, its name and its extra field.
        let data =
            30 + u16::from_le_bytes([zip[26], zip[27]]) as usize + u16::from_le_bytes([zip[28], zip[29]]) as usize;
        zip[data] ^= 0xFF;

        let picked = picked_with_unzipped("zip-3ds-broken", "Game.zip", &zip);

        assert_eq!(picked.len(), 1);
        assert!(picked[0].error.as_deref().is_some_and(|e| e.starts_with("Game.zip: ")), "{:?}", picked[0].error);
    }

    fn imported(
        name: &str,
        picked: &Picked,
        path: &str,
    ) -> (GamesFolder<'static, tauri::Wry>, Result<Vec<String>, String>) {
        let games = temp_folder(name);
        let app = tauri::test::mock_app();
        let folder = games.root().to_string_lossy().into_owned();
        let imported = block_on(import_rom(app.handle().clone(), folder, picked.file.clone(), path.into()));
        (games, imported)
    }

    #[test]
    fn imports_a_gamecube_disc_in_each_format_known_by_its_header() {
        use crate::game_cube::tests::{ciso_of, gcz_of, iso, rvz_of};
        let colosseum = iso(b"GC6E01", 0);
        let formats = [
            ("Colosseum.iso", colosseum.clone()),
            ("Colosseum.GCM", colosseum.clone()),
            ("Colosseum.rvz", rvz_of(&colosseum, b"RVZ\x01")),
            ("Colosseum.ciso", ciso_of(&colosseum, 0x8000)),
            ("Colosseum.gcz", gcz_of(&colosseum, 0x4000)),
        ];

        for (name, bytes) in formats {
            let picked = picked_with_unzipped(&format!("disc-{name}"), name, &bytes);
            let (games, imported) = imported(&format!("disc-{name}"), &picked[0], &format!("gc/{name}"));

            assert_eq!((picked.len(), picked[0].sha1.clone()), (1, Some(crate::game_art::sha1_of(&colosseum[..0x80]))));
            assert_eq!(imported, Ok(Vec::new()), "{name}");
            assert_eq!(block_on(games.read(&format!("gc/{name}"))).unwrap(), bytes, "{name}");
        }
    }

    #[test]
    fn refuses_a_file_that_isnt_a_gamecube_disc() {
        let picked = picked_with_unzipped("not-a-disc", "Game.iso", &[0x5A; 0x10000]);

        let (games, imported) = imported("not-a-disc", &picked[0], "gc/Game.iso");

        assert_eq!((picked[0].sha1.clone(), picked[0].error.clone()), (None, None));
        assert_eq!(imported, Err("Game.iso isn't a GameCube disc".into()));
        assert_eq!(names(&games, "gc"), Vec::<String>::new());
    }

    #[test]
    fn refuses_a_zipped_disc_with_a_message_to_unzip_it() {
        let disc = crate::game_cube::tests::iso(b"GC6E01", 0);

        for (name, archive) in [
            ("Colosseum.zip", zip_of(&[("readme.txt", b"hi"), ("Colosseum.iso", &disc)])),
            ("Colosseum.7z", sevenz_of(&[("games/Colosseum.rvz", &disc)])),
        ] {
            let picked = picked_with_unzipped(&format!("zipped-{name}"), name, &archive);
            let (games, imported) = imported(&format!("zipped-{name}"), &picked[0], &format!("gc/{name}"));

            assert_eq!(picked.len(), 1, "{name}");
            assert!(picked[0].inner.as_deref().is_some_and(|inner| rom::is_game_cube(inner)), "{name}");
            assert_eq!((picked[0].sha1.clone(), picked[0].error.clone()), (None, None), "{name}");
            assert_eq!(imported, Err(format!("Unzip {name} first. pkhemu can't play a zipped GameCube disc.")));
            assert_eq!(names(&games, "gc"), Vec::<String>::new());
        }
    }

    #[test]
    fn keeps_other_zipped_roms_zipped() {
        let picked = picked_with_unzipped("zip-gba", "Emerald.zip", &zip_of(&[("Emerald.gba", b"rom")]));

        assert_eq!(picked.len(), 1);
        assert_eq!(picked[0].inner.as_deref(), Some("Emerald.gba"));
        assert_eq!(picked[0].sha1, Some(crate::game_art::sha1_of(b"rom")));
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
        assert_eq!(walked(&root).app, Some("Delta"));
        assert_eq!(walked(&root.join("Delta/Database")).app, Some("Delta"));
    }

    #[test]
    fn finds_each_apps_games_and_saves_and_skips_its_own_folders() {
        let apps: [(&str, &[&str], &[&str]); 3] = [
            (
                "Provenance",
                &[
                    "ROMs/com.provenance.gbc/Crystal.gbc",
                    "ROMs/com.provenance.gba/Emerald.gba",
                    "ROMs/com.provenance.nds/Platinum.nds",
                    "ROMs/com.provenance.gb/Red.gb",
                    "Battery States/Crystal/Crystal.sav",
                    "Battery States/Crystal/Crystal.rtc",
                    "Battery States/Emerald/Emerald.sav2",
                    "Battery States/Platinum/Platinum.dsv",
                    "RetroArch/saves/Red.srm",
                ],
                &[
                    "Battery States/Emerald/Emerald.sav",
                    "Save States/Crystal/Crystal.sav",
                    "Screenshots/Crystal.sav",
                    "BIOS/Crystal.sav",
                    "Cheats/Crystal.sav",
                    "Patches/Crystal.sav",
                    "System/Crystal.sav",
                    "DeltaSkins/Crystal.sav",
                    "Conflicts/Crystal.sav",
                ],
            ),
            (
                "RetroArch",
                &[
                    "downloads/Crystal.gbc",
                    "downloads/Emerald.gba",
                    "downloads/Platinum.nds",
                    "saves/Gambatte/Crystal.srm",
                    "saves/Gambatte/Crystal.rtc",
                    "saves/mGBA/Emerald.srm",
                    "saves/melonDS DS/Platinum.srm",
                ],
                &[
                    "states/mGBA/Emerald.srm",
                    "system/gba_bios.sav",
                    "screenshots/Emerald.sav",
                    "thumbnails/Emerald.sav",
                    "playlists/Emerald.sav",
                    "logs/Emerald.sav",
                    "config/mGBA/Emerald.srm",
                    "cht/Emerald.sav",
                    "database/Emerald.sav",
                    "assets/Emerald.sav",
                    "overlays/Emerald.sav",
                    "shaders/Emerald.sav",
                    "info/Emerald.sav",
                    "autoconfig/Emerald.sav",
                ],
            ),
            (
                "Manic EMU",
                &[
                    "Datas/Crystal.gbc",
                    "Datas/Emerald.gba",
                    "Datas/Platinum.nds",
                    "Datas/Red.gb",
                    "Datas/Red.gb.sav",
                    "3DS/sdmc/saves/gbc/Crystal.sav",
                    "3DS/sdmc/saves/gbc/Crystal.rtc",
                    "3DS/sdmc/saves/gba/Emerald.sav",
                    "3DS/sdmc/saves/nds/Platinum.srm",
                ],
                &[
                    "BIOS/Crystal.sav",
                    "Assets/Crystal.sav",
                    "Manuals/Crystal.sav",
                    "Palettes/Crystal.sav",
                    "Shaders/Crystal.sav",
                    "PPSSPP/Crystal.sav",
                    "Dolphin/Crystal.sav",
                    ".manic-sync/Crystal.sav",
                ],
            ),
        ];

        for (app, found, left_out) in apps {
            let files: Vec<(&str, &[u8])> =
                found.iter().chain(left_out).map(|path| (*path, [0; 32].as_slice())).collect();
            let root = source_folder(app, &files);

            let mut expected = found.to_vec();
            expected.sort();
            assert_eq!(scanned(&root), (expected.iter().map(|path| path.to_string()).collect(), 0), "{app}");
            assert_eq!(walked(&root).app, Some(app));
        }
    }

    fn sd_title(azahar: &str, title_id: &str) -> String {
        let no_id = "00000000000000000000000000000000";
        format!("{azahar}/sdmc/Nintendo 3DS/{no_id}/{no_id}/title/{title_id}")
    }

    #[test]
    fn finds_only_saves_in_an_azahar_folder() {
        let x = sd_title("3DS", "00040000/00055d00");
        let found = [format!("{x}/data/00000001/main"), "Datas/X.3ds".into()];
        let left_out = [
            format!("{x}/content/00000000.app"),
            format!("{x}/content/X.sav"),
            "3DS/nand/title/00040010/00021000/content/00000000.app".into(),
            "3DS/nand/data/X.sav".into(),
            "3DS/sysdata/X.3ds".into(),
            "3DS/states/X.3ds".into(),
            "3DS/config/X.sav".into(),
        ];
        let files: Vec<(String, Vec<u8>)> = found
            .iter()
            .chain(&left_out)
            .chain(&[format!("{x}/data/00000001.metadata")])
            .map(|path| (path.clone(), vec![0; 32]))
            .collect();
        let root = delta_folder("azahar", &files);

        assert_eq!(scanned(&root), (found.to_vec(), 1));
        assert_eq!(walked(&root).app, Some("Manic EMU"));
        assert_eq!(scanned(&root.join("3DS")).0, [found[0].strip_prefix("3DS/").unwrap()]);
        assert_eq!(walked(&root.join("3DS")).app, None);
        let main = walked(&root).listed.into_iter().find(|file| file.name == "main").unwrap();
        assert_eq!(main.title_id, Some(0x0004000000055D00));
    }

    #[test]
    fn imports_a_manic_emu_save_onto_x_in_the_library_byte_for_byte() {
        use crate::save::three_ds::tests::{X, X_SIZE};
        use crate::test_games::pattern;
        use crate::three_ds::tests::{cia, ncch};
        let save = pattern(X_SIZE, 7);
        let (x, y) = (sd_title("3DS", "00040000/00055d00"), sd_title("3DS", "00040000/00055e00"));
        let (usum, other) = (sd_title("3DS", "00040000/001b5100"), sd_title("3DS", "00040000/0ec10000"));
        let y_game = cia(0x0004000000055E00, &[(0, ncch(0x0004000000055E00, false, true))]);
        let root = delta_folder(
            "manic-x",
            &[
                (format!("{x}/data/00000001/main"), save.clone()),
                (format!("{y}/data/00000001/main"), pattern(X_SIZE - 1, 1)),
                (format!("{usum}/data/00000001/main"), pattern(X_SIZE, 1)),
                (format!("{other}/data/00000001/main"), pattern(X_SIZE, 1)),
                ("3DS/nand/readme.txt".into(), b"hi".to_vec()),
                ("Datas/Y.cia".into(), y_game),
            ],
        );
        let games = temp_folder("manic-x");
        block_on(games.write("3ds/X.cxi", &ncch(X, true, true))).unwrap();
        let app = tauri::test::mock_app();
        let folder = games.root().to_string_lossy().into_owned();

        let scan = block_on(import_scan(app.handle().clone(), root.to_string_lossy().into_owned(), false)).unwrap();
        let title_id = |name: &str| scan.files.iter().find(|file| file.file.contains(name)).unwrap().title_id.clone();
        let main = scan.files.iter().find(|file| file.file.contains("00055d00")).unwrap();
        let library = block_on(title_ids(&games, vec!["3ds/X.cxi".into(), "gba/X.gba".into()]));
        let (file, name) = (main.file.clone(), main.name.clone());
        block_on(import_save(app.handle().clone(), folder, "3ds/X.cxi".into(), file, name, None)).unwrap();

        assert_eq!(main.title_id.as_deref(), Some("0004000000055d00"));
        assert_eq!(library, HashMap::from([("3ds/X.cxi".to_string(), "0004000000055d00".to_string())]));
        assert_eq!(block_on(games.read("3ds/X.sav")).unwrap(), save);
        assert_eq!(title_id("Y.cia").as_deref(), Some("0004000000055e00"));
        assert_eq!([title_id("00055e00"), title_id("001b5100"), title_id("0ec10000")], [None, None, None]);
        assert_eq!(scan.files.len(), 5);
    }

    #[test]
    fn imports_the_x_save_from_an_azahar_folder_onto_the_x_dump() {
        let (Some(rom), Some(save)) = (crate::test_games::pokemon_x(), crate::test_games::pokemon_x_save()) else {
            return;
        };
        let root = delta_folder(
            "azahar-x",
            &[
                (format!("{}/data/00000001/main", sd_title("Azahar", "00040000/00055d00")), save.clone()),
                ("Azahar/nand/readme.txt".into(), b"hi".to_vec()),
            ],
        );
        let games = temp_folder("azahar-x");
        std::fs::create_dir_all(games.root().join("3ds")).unwrap();
        std::os::unix::fs::symlink(&rom.file.unwrap().path, games.root().join("3ds/X.3ds")).unwrap();
        let app = tauri::test::mock_app();

        let scan = block_on(import_scan(app.handle().clone(), root.to_string_lossy().into_owned(), false)).unwrap();
        let library = block_on(title_ids(&games, vec!["3ds/X.3ds".into()]));
        let main = &scan.files[0];
        assert_eq!(main.title_id, library.get("3ds/X.3ds").cloned());
        let folder = games.root().to_string_lossy().into_owned();
        let (file, name) = (main.file.clone(), main.name.clone());
        block_on(import_save(app.handle().clone(), folder, "3ds/X.3ds".into(), file, name, None)).unwrap();

        assert_eq!(block_on(games.read("3ds/X.sav")).unwrap(), save);
    }

    #[test]
    fn takes_a_sav2_over_a_sav_only_in_the_same_folder() {
        let root = source_folder(
            "sav2",
            &[
                ("a/Emerald.sav", b"mgba"),
                ("a/Emerald.SAV2", b"vba-m"),
                ("b/Emerald.sav", b"mgba"),
                ("b/Ruby.sav2", b"vba-m"),
                ("c/Ruby.sav", b"mgba"),
                ("c/.Ruby.sav2.icloud", b"stub"),
            ],
        );

        assert_eq!(scanned(&root).0, ["a/Emerald.SAV2", "b/Emerald.sav", "b/Ruby.sav2"]);
        assert_eq!(walked(&root).offline, [root.join("c/Ruby.sav2").to_string_lossy()]);
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

    fn days_on_the_clock_after_importing(folder: &str, rtc: Vec<u8>) -> u8 {
        use crate::test_games::{clock_rom, days_on_the_clock, lock_core};
        let games = temp_folder(folder);
        block_on(games.write("gbc/Crystal.gbc", b"rom")).unwrap();

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
        days_on_the_clock(&mut core)
    }

    #[test]
    fn gives_a_save_the_clock_from_a_delta_rtc() {
        let rtc = ((now() - 3 * DAY) as u32).to_be_bytes().to_vec();
        assert_eq!(days_on_the_clock_after_importing("delta-clock", rtc), 3);
    }

    #[test]
    fn gives_a_save_the_clock_from_a_gambatte_libretro_rtc() {
        let rtc = (now() - 3 * DAY).to_le_bytes().to_vec();
        assert_eq!(days_on_the_clock_after_importing("gambatte-clock", rtc), 3);
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
    fn a_replaced_save_loses_its_edited_mark() {
        let games = temp_folder("replaced-edited");
        block_on(games.write("gba/Emerald.gba", b"rom")).unwrap();
        block_on(games.write("gba/Emerald.sav", &[1; 0x20000])).unwrap();
        block_on(crate::edited::mark(&games, "gba/Emerald.gba")).unwrap();

        block_on(import_save_file(&games, "gba/Emerald.gba", "e.sav", vec![2; 0x20000], None, "2026-10-11_1200"))
            .unwrap();

        assert_eq!(block_on(crate::edited::read(&games, "gba/Emerald.gba")), None);
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
    fn imports_a_desmume_srm_like_the_same_dsv() {
        let footer = [vec![7; 0x7A - 16], b"|-DESMUME SAVE-|".to_vec()].concat();
        let file = [crate::test_games::pattern(0x80000, 7), footer].concat();
        let import = |name: &str| {
            let games = temp_folder(&format!("desmume-{name}"));
            block_on(games.write("nds/Platinum.nds", b"rom")).unwrap();
            block_on(import_save_file(&games, "nds/Platinum.nds", name, file.clone(), None, "2026-10-11_1200"))
                .unwrap();
            let (_, save) = block_on(save::open(&games, "nds/Platinum.nds")).unwrap();
            (names(&games, "nds"), save.unwrap())
        };

        assert_eq!(import("Platinum.srm"), import("Platinum.dsv"));
    }

    #[test]
    fn imports_a_melonds_srm_unchanged() {
        let games = temp_folder("melonds-srm");
        block_on(games.write("nds/Platinum.nds", b"rom")).unwrap();
        let srm = crate::test_games::pattern(0x80000, 7);

        block_on(import_save_file(&games, "nds/Platinum.nds", "Platinum.srm", srm.clone(), None, "2026-10-11_1200"))
            .unwrap();

        assert_eq!(block_on(games.read("nds/Platinum.sav")).unwrap(), srm);
        assert_eq!(block_on(save::open(&games, "nds/Platinum.nds")).unwrap().1, Some(srm));
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

        block_on(games.write("gba/Ruby.gba", b"rom")).unwrap();
        block_on(import_save_file(&games, "gba/Ruby.gba", "Ruby.sav2", b"vba-m".to_vec(), None, "2026-10-11_1200"))
            .unwrap();

        assert_eq!(block_on(games.read("gba/Ruby.sav")).unwrap(), b"vba-m");
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
