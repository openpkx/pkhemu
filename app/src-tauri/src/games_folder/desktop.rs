#[path = "no_tree.rs"]
mod no_tree;

use std::path::Path;

use tauri::{AppHandle, Manager, Runtime};
use tauri_plugin_fs::FsExt;
use tauri_plugin_opener::OpenerExt;

use super::error;
pub use no_tree::{StagedTree, Tree};

#[derive(serde::Serialize)]
pub struct MadeFolder {
    path: String,
    made: bool,
}

// macOS lets the app use a folder it made in Documents without asking, but asks for one it didn't make.
#[tauri::command]
pub async fn games_folder_make<R: Runtime>(app: AppHandle<R>) -> Result<MadeFolder, String> {
    let path = app.path().document_dir().map_err(error)?.join("pkhemu");
    let made = std::fs::create_dir(&path).is_ok();
    if made {
        app.fs_scope().allow_directory(&path, true).map_err(error)?;
    }
    Ok(MadeFolder { path: path.to_string_lossy().into_owned(), made })
}

#[tauri::command]
pub async fn games_folder_pick<R: Runtime>(_app: AppHandle<R>) -> Result<Option<String>, String> {
    Err("the desktop app picks folders in the webview".into())
}

#[tauri::command]
pub async fn games_folder_find<R: Runtime>(_app: AppHandle<R>) -> Result<Option<String>, String> {
    Err("the desktop app picks folders in the webview".into())
}

pub fn open<R: Runtime>(app: &AppHandle<R>, saved: &str) -> Result<(), String> {
    if !Path::new(saved).is_dir() {
        return Err("No games folder".into());
    }
    app.opener().open_path(saved, None::<&str>).map_err(error)
}
