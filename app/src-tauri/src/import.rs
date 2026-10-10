use std::collections::HashMap;
use std::io::{BufReader, Read, Seek};
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

use serde::Serialize;
use tauri::{AppHandle, Runtime, State};

use crate::backups::{self, Reason};
use crate::files::open_picked;
use crate::game_art::{sha1_of_rom, sha1_of_stream};
use crate::games_folder::GamesFolder;
use crate::index::Index;
use crate::{resume, rom, save};

const SYSTEMS: [&str; 5] = ["gb", "gbc", "gba", "nds", "n64"];

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
}

struct Listed {
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

async fn picked<R: Runtime>(app: &AppHandle<R>, listed: Listed, hash: bool) -> Picked {
    let Listed { file, name, modified, size } = listed;
    let (inner, sha1) = match is_rom(&name) && (hash || rom::is_archive(&name)) {
        true => match open_picked(app, &file).await {
            Ok(opened) => {
                let archive = name.clone();
                tauri::async_runtime::spawn_blocking(move || identify(&archive, opened, hash))
                    .await
                    .unwrap_or((None, None))
            }
            Err(_) => (None, None),
        },
        false => (None, None),
    };
    Picked { file, name, modified: millis(modified), size, inner, sha1 }
}

#[cfg(target_os = "android")]
async fn pick<R: Runtime>(app: &AppHandle<R>) -> Result<Vec<Listed>, String> {
    use tauri_plugin_android_fs::AndroidFsExt;
    let fs = app.android_fs_async();
    let mut picked = Vec::new();
    for uri in fs.picker().pick_files(None, &[], false).await.map_err(error)? {
        let (Ok(info), Ok(file)) = (fs.get_info(&uri).await, uri.to_json_string()) else { continue };
        let (name, modified, size) = (info.name().to_owned(), info.last_modified(), info.file_len().unwrap_or(0));
        picked.push(Listed { file, name, modified, size });
    }
    Ok(picked)
}

#[cfg(not(target_os = "android"))]
async fn pick<R: Runtime>(app: &AppHandle<R>) -> Result<Vec<Listed>, String> {
    use tauri_plugin_dialog::DialogExt;
    let (picked, chosen) = tokio::sync::oneshot::channel();
    app.dialog().file().pick_files(move |files| {
        let _ = picked.send(files);
    });
    let Some(files) = chosen.await.map_err(error)? else {
        return Ok(Vec::new());
    };
    files
        .into_iter()
        .map(|file| {
            let path = file.into_path().map_err(error)?;
            let meta = path.metadata().map_err(|e| format!("{}: {e}", path.display()))?;
            let modified = meta.modified().map_err(|e| format!("{}: {e}", path.display()))?;
            let name = path.file_name().map_or_else(String::new, |name| name.to_string_lossy().into_owned());
            Ok(Listed { file: path.to_string_lossy().into_owned(), name, modified, size: meta.len() })
        })
        .collect()
}

#[tauri::command]
pub async fn import_pick<R: Runtime>(app: AppHandle<R>) -> Result<Vec<Picked>, String> {
    let mut files = Vec::new();
    for listed in pick(&app).await? {
        files.push(picked(&app, listed, true).await);
    }
    Ok(files)
}

#[derive(Serialize, Debug, PartialEq)]
pub struct PickedFolder {
    folder: String,
    name: String,
}

#[cfg(target_os = "android")]
#[tauri::command]
pub async fn import_pick_folder<R: Runtime>(app: AppHandle<R>) -> Result<Option<PickedFolder>, String> {
    use tauri_plugin_android_fs::AndroidFsExt;
    let fs = app.android_fs_async();
    let Some(uri) = fs.picker().pick_dir(None, true).await.map_err(error)? else { return Ok(None) };
    let name = fs.get_name(&uri).await.map_err(error)?;
    Ok(Some(PickedFolder { folder: uri.to_json_string().map_err(error)?, name }))
}

#[cfg(not(target_os = "android"))]
#[tauri::command]
pub async fn import_pick_folder<R: Runtime>(app: AppHandle<R>) -> Result<Option<PickedFolder>, String> {
    use tauri_plugin_dialog::DialogExt;
    let (picked, chosen) = tokio::sync::oneshot::channel();
    app.dialog().file().pick_folder(move |folder| {
        let _ = picked.send(folder);
    });
    let Some(folder) = chosen.await.map_err(error)? else { return Ok(None) };
    let path = folder.into_path().map_err(error)?;
    let name = path.file_name().map_or_else(|| path.to_string_lossy(), |name| name.to_string_lossy()).into_owned();
    Ok(Some(PickedFolder { folder: path.to_string_lossy().into_owned(), name }))
}

fn is_save(name: &str) -> bool {
    std::path::Path::new(name)
        .extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| ["sav", "srm", "dsv"].contains(&extension.to_ascii_lowercase().as_str()))
}

fn sort_found(listed: Vec<Listed>) -> (Vec<Listed>, usize) {
    let (found, other): (Vec<_>, Vec<_>) =
        listed.into_iter().partition(|file| is_rom(&file.name) || is_save(&file.name));
    (found, other.len())
}

fn walk_path(dir: &std::path::Path, listed: &mut Vec<Listed>) {
    let Ok(entries) = std::fs::read_dir(dir) else { return };
    for entry in entries.flatten() {
        let name = entry.file_name().to_string_lossy().into_owned();
        if name.starts_with('.') {
            continue;
        }
        let (Ok(kind), Ok(meta)) = (entry.file_type(), entry.metadata()) else { continue };
        if kind.is_dir() {
            walk_path(&entry.path(), listed);
        } else if kind.is_file() {
            let file = entry.path().to_string_lossy().into_owned();
            listed.push(Listed { file, name, modified: meta.modified().unwrap_or(UNIX_EPOCH), size: meta.len() });
        }
    }
}

async fn walk<R: Runtime>(app: &AppHandle<R>, folder: &str) -> Result<Vec<Listed>, String> {
    use tauri_plugin_android_fs::{AndroidFsExt, Entry, FsUri};
    let mut listed = Vec::new();
    let Ok(root) = FsUri::from_json_str(folder) else {
        let root = std::path::PathBuf::from(folder);
        return tauri::async_runtime::spawn_blocking(move || {
            walk_path(&root, &mut listed);
            listed
        })
        .await
        .map_err(error);
    };
    let fs = app.android_fs_async();
    let mut dirs = vec![root];
    while let Some(dir) = dirs.pop() {
        let Ok(entries) = fs.read_dir(&dir).await else { continue };
        for entry in entries {
            if entry.name().starts_with('.') {
                continue;
            }
            match entry {
                Entry::Dir { uri, .. } => dirs.push(uri),
                Entry::File { uri, name, last_modified, len, .. } => {
                    let Ok(file) = uri.to_json_string() else { continue };
                    listed.push(Listed { file, name, modified: last_modified, size: len });
                }
            }
        }
    }
    Ok(listed)
}

#[derive(Serialize, Debug, PartialEq)]
pub struct Scan {
    files: Vec<Picked>,
    other: usize,
}

#[tauri::command]
pub async fn import_scan<R: Runtime>(app: AppHandle<R>, folder: String, hash: bool) -> Result<Scan, String> {
    let (found, other) = sort_found(walk(&app, &folder).await?);
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
    let same = save::sha256(&save[save::editable(&save)]) == current.sha256;
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
    at: &str,
) -> Result<(), String> {
    let (slot, save) = imported(rom, name, file)?;
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
) -> Result<(), String> {
    let bytes = read_picked(&app, &file).await?;
    import_save_file(&GamesFolder::open(&app, &folder), &rom, &name, bytes, &backups::now()).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_games::sevenz_of;
    use std::io::Cursor;
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

    fn scanned(root: &std::path::Path) -> (Vec<String>, usize) {
        let mut listed = Vec::new();
        walk_path(root, &mut listed);
        let (found, other) = sort_found(listed);
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
    }

    #[test]
    fn leaves_the_source_files_alone() {
        let source: [(&str, &[u8]); 2] = [("roms/Emerald.gba", b"rom"), ("saves/Emerald.srm", b"save")];
        let root = source_folder("untouched", &source);
        let games = temp_folder("untouched");
        block_on(games.write("gba/Emerald.gba", b"old rom")).unwrap();
        block_on(games.write("gba/Emerald.sav", b"old save")).unwrap();
        let mut listed = Vec::new();
        walk_path(&root, &mut listed);

        for file in listed {
            let opened = std::fs::File::open(&file.file).unwrap();
            if is_save(&file.name) {
                let bytes = std::fs::read(&file.file).unwrap();
                block_on(import_save_file(&games, "gba/Emerald.gba", &file.name, bytes, "2026-10-11_1200")).unwrap();
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

    #[test]
    fn renames_a_save_to_the_name_the_app_reads() {
        let games = temp_folder("save");
        block_on(games.write("gba/Emerald.gba", b"rom")).unwrap();
        block_on(games.write("nds/Platinum.nds", b"rom")).unwrap();

        block_on(import_save_file(&games, "gba/Emerald.gba", "emerald.srm", b"save".to_vec(), "2026-10-11_1200"))
            .unwrap();
        block_on(import_save_file(&games, "nds/Platinum.nds", "PLATINUM.DSV", b"ds".to_vec(), "2026-10-11_1200"))
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

        block_on(import_save_file(&games, "gba/Emerald.gba", "Emerald.srm", b"picked".to_vec(), "2026-10-11_1200"))
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

        block_on(import_save_file(&games, "nds/Platinum.nds", "Platinum.sav", b"picked".to_vec(), "2026-10-11_1200"))
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

        assert!(block_on(import_save_file(&games, "n64/Stadium.z64", "Stadium.srm", vec![1; 32], "2026-10-11_1200"))
            .is_err());
        block_on(import_save_file(&games, "n64/Stadium.z64", "Stadium.srm", srm.clone(), "2026-10-11_1200")).unwrap();

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
