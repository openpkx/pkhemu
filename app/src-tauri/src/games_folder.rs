#[cfg_attr(target_os = "android", path = "games_folder/android.rs")]
#[cfg_attr(target_os = "ios", path = "games_folder/ios.rs")]
#[cfg_attr(desktop, path = "games_folder/desktop.rs")]
pub mod platform;

use std::fs::File;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::SystemTime;

use tauri::{AppHandle, Manager, Runtime};
use tauri_plugin_store::StoreExt;

use crate::index::{self, Index};
use crate::{game_art, rom, sync};

#[derive(serde::Serialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct DirEntry {
    pub name: String,
    pub is_directory: bool,
}

pub struct GamesFolder<'a, R: Runtime> {
    place: Place<'a, R>,
    deletion_log: Option<Arc<Index>>,
}

enum Place<'a, R: Runtime> {
    Path(PathBuf),
    Tree(platform::Tree<'a, R>),
}

fn error(reason: impl ToString) -> String {
    reason.to_string()
}

pub(crate) fn partial_path(path: &str) -> String {
    format!("{path}.partial")
}

// A different suffix from write()'s, so read() never promotes a file that's still being written.
pub(crate) fn incomplete_path(path: &str) -> String {
    format!("{path}.incomplete")
}

// Every file a FileWriter has open, across all folders, so clearing out stray ones skips them.
static WRITING: Mutex<Vec<String>> = Mutex::new(Vec::new());
// Held while a writer registers and while a stray file is checked and removed, so a writer
// starting on a stray file's name never has its new file removed.
static STAGING: tokio::sync::Mutex<()> = tokio::sync::Mutex::const_new(());

struct Writing(String);

impl Writing {
    async fn start(key: String) -> Writing {
        let _staging = STAGING.lock().await;
        WRITING.lock().unwrap_or_else(|e| e.into_inner()).push(key.clone());
        Writing(key)
    }

    fn holds(key: &str) -> bool {
        WRITING.lock().unwrap_or_else(|e| e.into_inner()).iter().any(|held| held == key)
    }
}

impl Drop for Writing {
    fn drop(&mut self) {
        let mut writing = WRITING.lock().unwrap_or_else(|e| e.into_inner());
        if let Some(at) = writing.iter().position(|held| *held == self.0) {
            writing.swap_remove(at);
        }
    }
}

pub(crate) fn split(path: &str) -> (&str, &str) {
    path.rsplit_once('/').unwrap_or(("", path))
}

impl<'a, R: Runtime> GamesFolder<'a, R> {
    pub fn open(app: &'a AppHandle<R>, folder: &str) -> Self {
        let place = match platform::Tree::open(app, folder) {
            Some(tree) => Place::Tree(tree),
            None => Place::Path(folder.into()),
        };
        GamesFolder { place, deletion_log: app.try_state::<Arc<Index>>().map(|index| index.inner().clone()) }
    }

    #[cfg(test)]
    pub fn at(root: impl Into<PathBuf>) -> Self {
        GamesFolder { place: Place::Path(root.into()), deletion_log: None }
    }

    #[cfg(test)]
    pub fn logging_to(self, index: Arc<Index>) -> Self {
        GamesFolder { deletion_log: Some(index), ..self }
    }

    #[cfg(test)]
    pub fn root(&self) -> &std::path::Path {
        match &self.place {
            Place::Path(root) => root,
            Place::Tree(..) => unreachable!("tests use a folder on disk"),
        }
    }

    pub async fn exists(&self) -> bool {
        match &self.place {
            Place::Path(root) => root.is_dir(),
            Place::Tree(tree) => tree.exists().await,
        }
    }

    pub async fn keep(&self) -> Result<(), String> {
        match &self.place {
            Place::Path(_) => Ok(()),
            Place::Tree(tree) => tree.keep().await,
        }
    }

    pub async fn create_dir(&self, path: &str) -> Result<(), String> {
        match &self.place {
            Place::Path(root) => std::fs::create_dir_all(root.join(path)).map_err(error),
            Place::Tree(tree) => tree.create_dir(path).await,
        }
    }

    pub async fn read_dir(&self, path: &str) -> Result<Vec<DirEntry>, String> {
        match &self.place {
            Place::Path(root) => std::fs::read_dir(root.join(path))
                .and_then(|entries| {
                    entries
                        .map(|entry| {
                            let entry = entry?;
                            Ok(DirEntry {
                                name: entry.file_name().to_string_lossy().into_owned(),
                                is_directory: entry.path().is_dir(),
                            })
                        })
                        .collect()
                })
                .map_err(error),
            Place::Tree(tree) => tree.read_dir(path).await,
        }
    }

    pub async fn read(&self, path: &str) -> Result<Vec<u8>, String> {
        match &self.place {
            Place::Path(root) => std::fs::read(root.join(path)).map_err(error),
            Place::Tree(tree) => tree.read(path).await,
        }
    }

    pub async fn open_file(&self, path: &str) -> Result<File, String> {
        match &self.place {
            Place::Path(root) => File::open(root.join(path)).map_err(error),
            Place::Tree(tree) => tree.open_file(path).await,
        }
    }

    pub async fn open_rom(&self, path: &str) -> Result<File, String> {
        let file = self.open_file(path).await?;
        if !rom::is_archive(path) {
            return Ok(file);
        }
        let dir = match &self.place {
            Place::Path(_) => std::env::temp_dir(),
            Place::Tree(tree) => tree.unpack_dir()?,
        };
        let name = path.to_owned();
        tauri::async_runtime::spawn_blocking(move || rom::unpack_to_file(&name, file, &dir))
            .await
            .map_err(error)?
    }

    pub async fn modified(&self, path: &str) -> Result<SystemTime, String> {
        self.stat(path).await.map(|(_, modified)| modified)
    }

    pub async fn stat(&self, path: &str) -> Result<(u64, SystemTime), String> {
        match &self.place {
            Place::Path(root) => {
                let file = root.join(path).metadata().map_err(error)?;
                Ok((file.len(), file.modified().map_err(error)?))
            }
            Place::Tree(tree) => tree.stat(path).await,
        }
    }

    pub async fn has_file(&self, path: &str) -> bool {
        self.lists(path).await
            || matches!(self.place, Place::Tree(..)) && self.lists(&partial_path(path)).await
    }

    async fn lists(&self, path: &str) -> bool {
        let (dir, name) = split(path);
        self.read_dir(dir)
            .await
            .is_ok_and(|entries| entries.iter().any(|entry| entry.name == name))
    }

    pub async fn write(&self, path: &str, contents: &[u8]) -> Result<(), String> {
        match &self.place {
            Place::Path(root) => {
                let file = root.join(path);
                if let Some(parent) = file.parent() {
                    std::fs::create_dir_all(parent).map_err(error)?;
                }
                let partial = root.join(partial_path(path));
                std::fs::write(&partial, contents).map_err(error)?;
                std::fs::rename(&partial, file).map_err(error)
            }
            Place::Tree(tree) => tree.write(path, contents).await,
        }
    }

    fn writing_key(&self, staged: &str) -> String {
        match &self.place {
            Place::Path(root) => root.join(staged).to_string_lossy().into_owned(),
            Place::Tree(tree) => tree.writing_key(staged),
        }
    }

    pub async fn create_file(&self, path: &str) -> Result<FileWriter<R>, String> {
        let staged = incomplete_path(path);
        let writing = Writing::start(self.writing_key(&staged)).await;
        match &self.place {
            Place::Path(root) => {
                let file = root.join(path);
                if let Some(parent) = file.parent() {
                    std::fs::create_dir_all(parent).map_err(error)?;
                }
                let incomplete = root.join(staged);
                Ok(FileWriter {
                    file: Some(File::create(&incomplete).map_err(error)?),
                    staged: Some(Staged::Path { incomplete, file }),
                    _writing: writing,
                })
            }
            Place::Tree(tree) => {
                let (file, staged) = tree.create_file(path, &staged).await?;
                Ok(FileWriter { file: Some(file), staged: Some(Staged::Tree(staged)), _writing: writing })
            }
        }
    }

    /// Removes the staged files of writers the app was killed in, leaving those still being written.
    pub async fn remove_half_written(&self, dirs: &[&str]) {
        let mut dirs: Vec<String> = dirs.iter().map(|dir| dir.to_string()).collect();
        while let Some(dir) = dirs.pop() {
            for entry in self.read_dir(&dir).await.unwrap_or_default() {
                let path = format!("{dir}/{}", entry.name);
                if entry.is_directory {
                    dirs.push(path);
                } else if entry.name.ends_with(".incomplete") {
                    let _staging = STAGING.lock().await;
                    if Writing::holds(&self.writing_key(&path)) {
                        continue;
                    }
                    if let Err(e) = self.remove_unlogged(&path).await {
                        eprintln!("{path}: {e}");
                    }
                }
            }
        }
    }

    /// Removes a file the app deleted on purpose. Sync deletes a file from the cloud only once this has logged it.
    pub async fn remove(&self, rom: &str, path: &str) -> Result<(), String> {
        if let Some(index) = self.deletion_log.as_ref().filter(|_| sync::syncs(rom, path)) {
            if let Ok(bytes) = self.read(path).await {
                if let Err(e) = index.keep_sync_deletion(rom, path, &game_art::sha1_of(&bytes), index::now()) {
                    eprintln!("{path}: {e}");
                }
            }
        }
        self.remove_unlogged(path).await
    }

    pub async fn remove_unlogged(&self, path: &str) -> Result<(), String> {
        match &self.place {
            Place::Path(root) => std::fs::remove_file(root.join(path)).map_err(error),
            Place::Tree(tree) => tree.remove_file(path).await,
        }
    }

    pub async fn remove_dir(&self, path: &str) -> Result<(), String> {
        match &self.place {
            Place::Path(root) => match std::fs::remove_dir_all(root.join(path)) {
                Err(e) if e.kind() != std::io::ErrorKind::NotFound => Err(error(e)),
                _ => Ok(()),
            },
            Place::Tree(tree) => tree.remove_dir(path).await,
        }
    }

    pub async fn move_out(&self, path: &str, to: &Path) -> Result<(), String> {
        if let Some(parent) = to.parent() {
            std::fs::create_dir_all(parent).map_err(error)?;
        }
        if let Place::Path(root) = &self.place {
            // A rename fails across volumes, so it falls back to the copy SAF always needs.
            if std::fs::rename(root.join(path), to).is_ok() {
                return Ok(());
            }
        }
        let mut source = self.open_file(path).await?;
        let mut partial = to.as_os_str().to_owned();
        partial.push(".partial");
        let mut copy = File::create(&partial).map_err(error)?;
        std::io::copy(&mut source, &mut copy).map_err(error)?;
        copy.sync_all().map_err(error)?;
        std::fs::rename(&partial, to).map_err(error)?;
        self.remove_unlogged(path).await
    }

    pub async fn rename(&self, from: &str, to: &str) -> Result<(), String> {
        match &self.place {
            Place::Path(root) => {
                let file = root.join(to);
                if let Some(parent) = file.parent() {
                    std::fs::create_dir_all(parent).map_err(error)?;
                }
                std::fs::rename(root.join(from), file).map_err(error)
            }
            // SAF renames only within a folder, so a move is a copy.
            Place::Tree(..) => {
                let mut source = self.open_file(from).await?;
                let mut copy = self.create_file(to).await?;
                std::io::copy(&mut source, &mut copy).map_err(error)?;
                copy.finish().await?;
                self.remove_unlogged(from).await
            }
        }
    }
}

enum Staged<R: Runtime> {
    Path { incomplete: PathBuf, file: PathBuf },
    Tree(platform::StagedTree<R>),
}

/// A file being written to the games folder. It appears under its name on [`FileWriter::finish`],
/// and dropping it unfinished removes what was written.
pub struct FileWriter<R: Runtime> {
    file: Option<File>,
    staged: Option<Staged<R>>,
    _writing: Writing,
}

impl<R: Runtime> FileWriter<R> {
    fn file(&mut self) -> &mut File {
        self.file.as_mut().expect("the file stays open until finish")
    }

    pub async fn finish(mut self) -> Result<(), String> {
        self.file().flush().map_err(error)?;
        drop(self.file.take());
        let (finished, cleared) = match self.staged.as_ref().expect("staged until finish") {
            Staged::Path { incomplete, file } => (std::fs::rename(incomplete, file).map_err(error), false),
            Staged::Tree(staged) => staged.finish().await,
        };
        // Once the old file is gone, the new one is all that's left, so a failed rename keeps it.
        if finished.is_ok() || cleared {
            self.staged = None;
        }
        finished
    }
}

impl<R: Runtime> Write for FileWriter<R> {
    fn write(&mut self, buf: &[u8]) -> std::io::Result<usize> {
        self.file().write(buf)
    }

    fn flush(&mut self) -> std::io::Result<()> {
        self.file().flush()
    }
}

impl<R: Runtime> Drop for FileWriter<R> {
    fn drop(&mut self) {
        drop(self.file.take());
        match self.staged.take() {
            Some(Staged::Path { incomplete, .. }) => {
                let _ = std::fs::remove_file(incomplete);
            }
            Some(Staged::Tree(staged)) => staged.discard(),
            None => {}
        }
    }
}

#[tauri::command]
pub async fn games_folder_keep<R: Runtime>(
    app: AppHandle<R>,
    folder: String,
) -> Result<(), String> {
    GamesFolder::open(&app, &folder).keep().await
}

#[tauri::command]
pub async fn games_folder_exists<R: Runtime>(
    app: AppHandle<R>,
    folder: String,
) -> Result<bool, String> {
    Ok(GamesFolder::open(&app, &folder).exists().await)
}

#[tauri::command]
pub async fn games_folder_create_dir<R: Runtime>(
    app: AppHandle<R>,
    folder: String,
    path: String,
) -> Result<(), String> {
    GamesFolder::open(&app, &folder).create_dir(&path).await
}

#[tauri::command]
pub async fn games_folder_read_dir<R: Runtime>(
    app: AppHandle<R>,
    folder: String,
    path: String,
) -> Result<Vec<DirEntry>, String> {
    GamesFolder::open(&app, &folder).read_dir(&path).await
}

// Opens the saved folder rather than a path from the webview, so the webview can't launch arbitrary files.
#[tauri::command]
pub fn games_folder_open<R: Runtime>(app: AppHandle<R>) -> Result<(), String> {
    let saved = app.store("settings.json").map_err(error)?.get("gamesFolder");
    platform::open(&app, saved.as_ref().and_then(|folder| folder.as_str()).ok_or("No games folder")?)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_games::sevenz_of;
    use std::io::{Read, Seek, SeekFrom, Write};
    use tauri::async_runtime::block_on;

    fn temp_folder(name: &str) -> GamesFolder<'static, tauri::Wry> {
        let root = std::env::temp_dir().join(format!("pkh-emu-{name}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        std::fs::create_dir_all(&root).unwrap();
        GamesFolder::at(root)
    }

    #[test]
    fn creates_folders_and_lists_them() {
        let folder = temp_folder("list");
        block_on(folder.create_dir("gba")).unwrap();
        std::fs::write(folder.root().join("gba/emerald.gba"), b"rom").unwrap();
        block_on(folder.create_dir("gba/emerald/states")).unwrap();

        let mut entries = block_on(folder.read_dir("gba")).unwrap();
        entries.sort_by(|a, b| a.name.cmp(&b.name));

        assert_eq!(
            entries,
            [
                DirEntry {
                    name: "emerald".into(),
                    is_directory: true
                },
                DirEntry {
                    name: "emerald.gba".into(),
                    is_directory: false
                },
            ]
        );
        assert_eq!(
            block_on(folder.read_dir("")).unwrap(),
            [DirEntry {
                name: "gba".into(),
                is_directory: true
            }]
        );
    }

    #[test]
    fn writes_a_file_next_to_the_rom_and_reads_it_back() {
        let folder = temp_folder("write");
        block_on(folder.write("gba/emerald.sav", b"first")).unwrap();
        block_on(folder.write("gba/emerald.sav", b"second")).unwrap();

        assert_eq!(block_on(folder.read("gba/emerald.sav")).unwrap(), b"second");
    }

    #[test]
    fn writes_into_missing_folders() {
        let folder = temp_folder("nested");

        block_on(folder.write("gba/emerald/states/1.state", b"state")).unwrap();

        assert_eq!(
            block_on(folder.read("gba/emerald/states/1.state")).unwrap(),
            b"state"
        );
    }

    #[test]
    fn replaces_a_file_without_leaving_a_partial_copy() {
        let folder = temp_folder("partial");
        block_on(folder.write("gba/emerald.sav", b"first")).unwrap();
        block_on(folder.write("gba/emerald.sav", b"second")).unwrap();

        let names: Vec<_> = block_on(folder.read_dir("gba")).unwrap().into_iter().map(|e| e.name).collect();
        assert_eq!(names, ["emerald.sav"]);
    }

    #[test]
    fn knows_whether_a_file_is_there() {
        let folder = temp_folder("has-file");
        block_on(folder.write("gba/emerald.sav", b"save")).unwrap();

        assert!(block_on(folder.has_file("gba/emerald.sav")));
        assert!(!block_on(folder.has_file("gba/ruby.sav")));
        assert!(!block_on(folder.has_file("gbc/crystal.sav")));
    }

    #[test]
    fn knows_when_a_file_was_last_written() {
        let folder = temp_folder("modified");
        let before = SystemTime::now() - std::time::Duration::from_secs(1);

        block_on(folder.write("gba/emerald.sav", b"save")).unwrap();

        let modified = block_on(folder.modified("gba/emerald.sav")).unwrap();
        assert!(modified >= before && modified <= SystemTime::now());
        assert!(block_on(folder.modified("gba/ruby.sav")).is_err());
    }

    #[test]
    fn moves_a_file_into_a_missing_folder() {
        let folder = temp_folder("rename");
        block_on(folder.write("gba/Emerald.sav", b"save")).unwrap();

        block_on(folder.rename("gba/Emerald.sav", "gba/Hacks/Emerald.sav")).unwrap();

        assert_eq!(block_on(folder.read("gba/Hacks/Emerald.sav")).unwrap(), b"save");
        assert!(!block_on(folder.has_file("gba/Emerald.sav")));
    }

    #[test]
    fn knows_how_big_a_file_is() {
        let folder = temp_folder("stat");
        block_on(folder.write("gba/emerald.gba", b"rom bytes")).unwrap();

        let (size, modified) = block_on(folder.stat("gba/emerald.gba")).unwrap();

        assert_eq!(size, 9);
        assert_eq!(Ok(modified), block_on(folder.modified("gba/emerald.gba")));
        assert!(block_on(folder.stat("gba/ruby.gba")).is_err());
    }

    #[test]
    fn removes_a_file() {
        let folder = temp_folder("remove");
        block_on(folder.write("gba/emerald.sav", b"save")).unwrap();

        block_on(folder.remove("gba/emerald.gba", "gba/emerald.sav")).unwrap();

        assert!(!block_on(folder.has_file("gba/emerald.sav")));
    }

    #[test]
    fn logs_removing_a_file_sync_carries() {
        let (index, _) = crate::index::temp_index("games-folder-deletions");
        let folder = temp_folder("remove-logged").logging_to(index.clone());
        let rom = "gba/emerald.gba";
        for path in ["gba/emerald.sav", "gba/emerald/states/before-load.state", "gba/emerald/states/slot-1.state"] {
            block_on(folder.write(path, b"save")).unwrap();
        }

        block_on(folder.remove(rom, "gba/emerald.sav")).unwrap();
        block_on(folder.remove(rom, "gba/emerald/states/before-load.state")).unwrap();
        block_on(folder.remove_unlogged("gba/emerald/states/slot-1.state")).unwrap();

        assert_eq!(index.sync_deletions(rom).unwrap(), [("gba/emerald.sav".to_string(), game_art::sha1_of(b"save"))]);
        assert!(names(&folder, "gba/emerald/states").is_empty());
    }

    #[test]
    fn reports_a_missing_file() {
        let folder = temp_folder("missing");

        assert!(block_on(folder.read("gba/emerald.gba")).is_err());
        assert!(block_on(folder.read_dir("gba")).is_err());
    }

    fn names(folder: &GamesFolder<'static, tauri::Wry>, dir: &str) -> Vec<String> {
        let mut names: Vec<_> = block_on(folder.read_dir(dir)).unwrap().into_iter().map(|e| e.name).collect();
        names.sort();
        names
    }

    #[test]
    fn streams_a_file_in_and_reads_it_back() {
        let folder = temp_folder("stream");
        block_on(folder.write("nds/hack.nds", b"old")).unwrap();

        let mut file = block_on(folder.create_file("nds/hack.nds")).unwrap();
        file.write_all(b"patched ").unwrap();
        file.write_all(b"rom").unwrap();
        assert_eq!(block_on(folder.read("nds/hack.nds")).unwrap(), b"old");
        block_on(file.finish()).unwrap();

        assert_eq!(block_on(folder.read("nds/hack.nds")).unwrap(), b"patched rom");
        assert_eq!(names(&folder, "nds"), ["hack.nds"]);
    }

    #[test]
    fn streams_into_missing_folders() {
        let folder = temp_folder("stream-nested");

        let mut file = block_on(folder.create_file("nds/hacks/hack.nds")).unwrap();
        file.write_all(b"rom").unwrap();
        block_on(file.finish()).unwrap();

        assert_eq!(block_on(folder.read("nds/hacks/hack.nds")).unwrap(), b"rom");
    }

    #[test]
    fn leaves_nothing_behind_when_a_streamed_write_is_dropped() {
        let folder = temp_folder("stream-dropped");
        block_on(folder.create_dir("nds")).unwrap();

        let mut file = block_on(folder.create_file("nds/hack.nds")).unwrap();
        file.write_all(b"half a rom").unwrap();
        drop(file);

        assert!(names(&folder, "nds").is_empty());
        assert!(!block_on(folder.has_file("nds/hack.nds")));
    }

    #[test]
    fn leaves_nothing_behind_when_a_streamed_write_fails_to_finish() {
        let folder = temp_folder("stream-failed");
        block_on(folder.create_dir("nds/hack.nds/in-the-way")).unwrap();

        let mut file = block_on(folder.create_file("nds/hack.nds")).unwrap();
        file.write_all(b"rom").unwrap();

        assert!(block_on(file.finish()).is_err());
        assert_eq!(names(&folder, "nds"), ["hack.nds"]);
    }

    #[test]
    fn keeps_the_old_file_when_a_streamed_write_is_dropped() {
        let folder = temp_folder("stream-kept");
        block_on(folder.write("nds/hack.nds", b"old")).unwrap();

        let mut file = block_on(folder.create_file("nds/hack.nds")).unwrap();
        file.write_all(b"half a rom").unwrap();
        drop(file);

        assert_eq!(block_on(folder.read("nds/hack.nds")).unwrap(), b"old");
        assert_eq!(names(&folder, "nds"), ["hack.nds"]);
    }

    #[test]
    fn removes_files_left_half_written() {
        let folder = temp_folder("stray");
        block_on(folder.write("nds/Game.nds", b"rom")).unwrap();
        block_on(folder.write("nds/Game.nds.incomplete", b"half a rom")).unwrap();
        block_on(folder.write("gba/Emerald/states/slot-1.state.incomplete", b"half a state")).unwrap();
        block_on(folder.write("gba/Emerald/states/slot-1.state", b"state")).unwrap();

        block_on(folder.remove_half_written(&["gb", "gba", "nds"]));

        assert_eq!(names(&folder, "nds"), ["Game.nds"]);
        assert_eq!(names(&folder, "gba/Emerald/states"), ["slot-1.state"]);
    }

    #[test]
    fn leaves_a_file_still_being_written() {
        let folder = temp_folder("stray-open");
        let mut file = block_on(folder.create_file("nds/hack.nds")).unwrap();
        file.write_all(b"half ").unwrap();

        block_on(folder.remove_half_written(&["nds"]));

        assert_eq!(names(&folder, "nds"), ["hack.nds.incomplete"]);
        file.write_all(b"a rom").unwrap();
        block_on(file.finish()).unwrap();
        assert_eq!(block_on(folder.read("nds/hack.nds")).unwrap(), b"half a rom");
    }

    #[test]
    fn reads_a_file_from_any_offset() {
        let folder = temp_folder("seek");
        block_on(folder.write("nds/game.nds", b"0123456789")).unwrap();

        let mut file = block_on(folder.open_file("nds/game.nds")).unwrap();
        let mut bytes = [0; 3];
        file.seek(SeekFrom::Start(6)).unwrap();
        file.read_exact(&mut bytes).unwrap();
        assert_eq!(&bytes, b"678");
        file.seek(SeekFrom::Start(1)).unwrap();
        file.read_exact(&mut bytes).unwrap();
        assert_eq!(&bytes, b"123");

        assert!(block_on(folder.open_file("nds/missing.nds")).is_err());
    }

    fn zip_of(files: &[(&str, &[u8])]) -> Vec<u8> {
        let mut zip = zip::ZipWriter::new(std::io::Cursor::new(Vec::new()));
        for (name, bytes) in files {
            zip.start_file(*name, zip::write::SimpleFileOptions::default()).unwrap();
            zip.write_all(bytes).unwrap();
        }
        zip.finish().unwrap().into_inner()
    }

    #[test]
    fn unpacks_a_zipped_rom_into_a_seekable_file() {
        let folder = temp_folder("unzip");
        let zip = zip_of(&[("readme.txt", b"hi"), ("game.nds", b"0123456789")]);
        block_on(folder.write("nds/game.zip", &zip)).unwrap();

        let mut file = block_on(folder.open_rom("nds/game.zip")).unwrap();
        let mut bytes = [0; 3];
        file.seek(SeekFrom::Start(6)).unwrap();
        file.read_exact(&mut bytes).unwrap();
        assert_eq!(&bytes, b"678");
        let mut all = Vec::new();
        file.seek(SeekFrom::Start(0)).unwrap();
        file.read_to_end(&mut all).unwrap();
        assert_eq!(all, b"0123456789");

        assert_eq!(names(&folder, "nds"), ["game.zip"]);
    }

    #[test]
    fn unpacks_a_7z_rom_into_a_seekable_file() {
        let folder = temp_folder("un7z");
        let archive = sevenz_of(&[("readme.txt", b"hi"), ("game.nds", b"0123456789")]);
        block_on(folder.write("nds/game.7z", &archive)).unwrap();

        let mut file = block_on(folder.open_rom("nds/game.7z")).unwrap();
        let mut bytes = [0; 3];
        file.seek(SeekFrom::Start(6)).unwrap();
        file.read_exact(&mut bytes).unwrap();
        assert_eq!(&bytes, b"678");

        assert_eq!(names(&folder, "nds"), ["game.7z"]);
    }

    #[test]
    fn opens_a_plain_rom_as_it_is() {
        let folder = temp_folder("plain-rom");
        block_on(folder.write("nds/game.nds", b"rom")).unwrap();

        let mut rom = Vec::new();
        block_on(folder.open_rom("nds/game.nds")).unwrap().read_to_end(&mut rom).unwrap();

        assert_eq!(rom, b"rom");
    }

    #[test]
    fn refuses_a_zip_without_a_rom() {
        let folder = temp_folder("empty-zip");
        block_on(folder.write("nds/game.zip", &zip_of(&[("readme.txt", b"hi")]))).unwrap();

        assert!(block_on(folder.open_rom("nds/game.zip")).is_err());
    }

    #[test]
    fn refuses_a_7z_without_a_rom() {
        let folder = temp_folder("empty-7z");
        block_on(folder.write("nds/game.7z", &sevenz_of(&[("readme.txt", b"hi")]))).unwrap();

        assert!(block_on(folder.open_rom("nds/game.7z")).is_err());
    }

    #[test]
    fn knows_whether_the_folder_is_there() {
        let folder = temp_folder("exists");
        assert!(block_on(folder.exists()));

        std::fs::remove_dir_all(folder.root()).unwrap();

        assert!(!block_on(folder.exists()));
    }
}
