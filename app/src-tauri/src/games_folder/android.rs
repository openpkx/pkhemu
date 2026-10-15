use std::fs::File;
use std::path::PathBuf;
use std::time::SystemTime;

use tauri::{AppHandle, Runtime};
use tauri_plugin_android_fs::{api::api_async::AndroidFs, AndroidFsExt, FsUri, UriPermission};

use super::{error, incomplete_path, partial_path, split, DirEntry};
use crate::files::cache_dir;

// Needs no permission from Android 10. Before that the folder isn't made and the picker opens wherever it falls back to.
#[tauri::command]
pub async fn games_folder_make<R: Runtime>(app: AppHandle<R>) -> Result<Option<String>, String> {
    let picker = app.android_fs_async().picker();
    let initial = picker
        .resolve_public_storage_initial_location(
            None,
            tauri_plugin_android_fs::PublicGeneralPurposeDir::Documents,
            "pkhemu",
            true,
        )
        .await
        .ok();
    let picked = picker.pick_dir(initial.as_ref(), true).await.map_err(error)?;
    picked.map(|uri| uri.to_json_string().map_err(error)).transpose()
}

#[tauri::command]
pub async fn games_folder_pick<R: Runtime>(app: AppHandle<R>) -> Result<Option<String>, String> {
    let picked = app.android_fs_async().picker().pick_dir(None, true).await.map_err(error)?;
    picked.map(|uri| uri.to_json_string().map_err(error)).transpose()
}

// Opens at Documents/pkhemu when an earlier install left it there, but never makes it, since the player's old folder may be elsewhere.
// Only a path can tell whether it's there before the player grants anything, though the plugin deprecates paths.
#[tauri::command]
pub async fn games_folder_find<R: Runtime>(app: AppHandle<R>) -> Result<Option<String>, String> {
    use tauri_plugin_android_fs::PublicGeneralPurposeDir::Documents;
    let fs = app.android_fs_async();
    #[allow(deprecated)]
    let left = fs
        .public_storage()
        .resolve_path(None, Documents)
        .await
        .is_ok_and(|documents| documents.join("pkhemu").is_dir());
    let picker = fs.picker();
    let initial = picker
        .resolve_public_storage_initial_location(None, Documents, if left { "pkhemu" } else { "" }, false)
        .await
        .ok();
    let picked = picker.pick_dir(initial.as_ref(), true).await.map_err(error)?;
    picked.map(|uri| uri.to_json_string().map_err(error)).transpose()
}

pub fn open<R: Runtime>(_app: &AppHandle<R>, _saved: &str) -> Result<(), String> {
    Err("opening the games folder isn't available on Android".into())
}

async fn promote<R: Runtime>(
    fs: &AndroidFs<R>,
    staged: &FsUri,
    path: &str,
    staged_path: fn(&str) -> String,
) -> Result<FsUri, String> {
    let (_, name) = split(path);
    let file = fs.rename(staged, name).await.map_err(error)?;
    match fs.get_name(&file).await.map_err(error)? {
        renamed if renamed == name => Ok(file),
        renamed => {
            let _ = fs.rename(&file, staged_path(name)).await;
            Err(format!("{path} was renamed to {renamed}"))
        }
    }
}

/// A games folder picked through SAF.
pub struct Tree<'a, R: Runtime> {
    app: &'a AppHandle<R>,
    root: FsUri,
}

impl<'a, R: Runtime> Tree<'a, R> {
    pub fn open(app: &'a AppHandle<R>, folder: &str) -> Option<Self> {
        FsUri::from_json_str(folder).ok().map(|root| Tree { app, root })
    }

    fn fs(&self) -> &AndroidFs<R> {
        self.app.android_fs_async()
    }

    pub async fn exists(&self) -> bool {
        let fs = self.fs();
        fs.picker().check_persisted_uri_permission(&self.root, UriPermission::ReadAndWrite).await.unwrap_or(false)
            && fs.get_type(&self.root).await.is_ok_and(|kind| kind.is_dir())
    }

    pub async fn keep(&self) -> Result<(), String> {
        let picker = self.fs().picker();
        picker.persist_uri_permission(&self.root).await.map_err(error)?;
        // Android caps how many URI grants an app can persist, so drop the previous folder's.
        // Persisting first means a folder that can't be kept leaves the previous one alone.
        picker.release_all_persisted_uri_permissions().await.map_err(error)?;
        picker.persist_uri_permission(&self.root).await.map_err(error)
    }

    pub async fn create_dir(&self, path: &str) -> Result<(), String> {
        self.fs().create_dir_all(&self.root, path).await.map(|_| ()).map_err(error)
    }

    pub async fn read_dir(&self, path: &str) -> Result<Vec<DirEntry>, String> {
        let fs = self.fs();
        let dir = if path.is_empty() {
            self.root.clone()
        } else {
            fs.resolve_dir_uri(&self.root, path).await.map_err(error)?
        };
        Ok(fs
            .read_dir(&dir)
            .await
            .map_err(error)?
            .into_iter()
            .map(|entry| DirEntry { name: entry.name().to_owned(), is_directory: entry.is_dir() })
            .collect())
    }

    async fn lists(&self, path: &str) -> bool {
        let (dir, name) = split(path);
        self.read_dir(dir).await.is_ok_and(|entries| entries.iter().any(|entry| entry.name == name))
    }

    async fn find(&self, path: &str) -> Result<FsUri, String> {
        let fs = self.fs();
        match fs.resolve_file_uri(&self.root, path).await {
            Ok(file) => Ok(file),
            Err(e) if self.lists(path).await => Err(error(e)),
            Err(missing) => match fs.resolve_file_uri(&self.root, partial_path(path)).await {
                Ok(partial) => promote(fs, &partial, path, partial_path).await,
                Err(_) => Err(error(missing)),
            },
        }
    }

    pub async fn read(&self, path: &str) -> Result<Vec<u8>, String> {
        let file = self.find(path).await?;
        self.fs().read(&file).await.map_err(error)
    }

    pub async fn open_file(&self, path: &str) -> Result<File, String> {
        let file = self.find(path).await?;
        self.fs().open_file_readable(&file).await.map_err(error)
    }

    // A SAF file has no path the app may open, so the core gets the descriptor's /proc entry, which retro::vfs serves.
    pub async fn open_for_core(&self, path: &str) -> Result<crate::rom::RomFile, String> {
        use std::os::fd::AsRawFd;
        let file = self.open_file(path).await?;
        let proc = format!("/proc/self/fd/{}", file.as_raw_fd());
        Ok(crate::rom::RomFile::new(file, proc))
    }

    // std::env::temp_dir() isn't writable on Android.
    pub fn unpack_dir(&self) -> Result<PathBuf, String> {
        cache_dir(self.app, "unpacked")
    }

    pub async fn stat(&self, path: &str) -> Result<(u64, SystemTime), String> {
        let fs = self.fs();
        let file = fs.resolve_file_uri(&self.root, path).await.map_err(error)?;
        let info = fs.get_info(&file).await.map_err(error)?;
        Ok((info.file_len().ok_or_else(|| format!("{path}: not a file"))?, info.last_modified()))
    }

    async fn stage(&self, staged: &str) -> Result<FsUri, String> {
        let fs = self.fs();
        let file = match fs.resolve_file_uri(&self.root, staged).await {
            Ok(file) => file,
            Err(_) => fs.create_new_file(&self.root, staged, None).await.map_err(error)?,
        };
        if fs.get_name(&file).await.map_err(error)? != split(staged).1 {
            return Err(format!("couldn't create {staged}"));
        }
        Ok(file)
    }

    // SAF can't rename over a file, so the target goes before the staged file is renamed.
    async fn clear(&self, path: &str) -> Result<bool, String> {
        let fs = self.fs();
        match fs.resolve_file_uri(&self.root, path).await {
            Ok(file) => fs.remove_file(&file).await.map(|_| true).map_err(error),
            Err(e) if self.lists(path).await => Err(error(e)),
            Err(_) => Ok(false),
        }
    }

    pub async fn write(&self, path: &str, contents: &[u8]) -> Result<(), String> {
        let fs = self.fs();
        let partial = self.stage(&partial_path(path)).await?;
        fs.write(&partial, contents).await.map_err(error)?;
        // If the app dies before the rename, read() finishes it.
        self.clear(path).await?;
        promote(fs, &partial, path, partial_path).await.map(|_| ())
    }

    pub fn writing_key(&self, staged: &str) -> String {
        format!("{}/{staged}", self.root.uri)
    }

    pub async fn create_file(&self, path: &str, staged: &str) -> Result<(File, StagedTree<R>), String> {
        let incomplete = self.stage(staged).await?;
        let staged = StagedTree { app: self.app.clone(), root: self.root.clone(), incomplete, path: path.to_owned() };
        match self.fs().open_file_writable(&staged.incomplete).await {
            Ok(file) => Ok((file, staged)),
            Err(e) => {
                staged.discard();
                Err(error(e))
            }
        }
    }

    pub async fn remove_file(&self, path: &str) -> Result<(), String> {
        let fs = self.fs();
        let file = fs.resolve_file_uri(&self.root, path).await.map_err(error)?;
        fs.remove_file(&file).await.map_err(error)
    }

    pub async fn remove_dir(&self, path: &str) -> Result<(), String> {
        let fs = self.fs();
        match fs.resolve_dir_uri(&self.root, path).await {
            Ok(dir) => fs.remove_dir_all(&dir).await.map_err(error),
            Err(_) if !self.lists(path).await => Ok(()),
            Err(e) => Err(error(e)),
        }
    }
}

pub struct StagedTree<R: Runtime> {
    app: AppHandle<R>,
    root: FsUri,
    incomplete: FsUri,
    path: String,
}

impl<R: Runtime> StagedTree<R> {
    /// Also says whether the file it replaces is gone.
    pub async fn finish(&self) -> (Result<(), String>, bool) {
        let tree = Tree { app: &self.app, root: self.root.clone() };
        match tree.clear(&self.path).await {
            Ok(cleared) => {
                (promote(tree.fs(), &self.incomplete, &self.path, incomplete_path).await.map(|_| ()), cleared)
            }
            Err(e) => (Err(e), false),
        }
    }

    // By path, since a failed promote renames the file back under a new URI.
    pub fn discard(self) {
        tauri::async_runtime::spawn(async move {
            let fs = self.app.android_fs_async();
            if let Ok(file) = fs.resolve_file_uri(&self.root, incomplete_path(&self.path)).await {
                let _ = fs.remove_file(&file).await;
            }
        });
    }
}
