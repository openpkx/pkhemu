#[path = "no_tree.rs"]
mod no_tree;

use std::path::PathBuf;

use tauri::{AppHandle, Manager, Runtime};
use tauri_plugin_opener::OpenerExt;

use super::error;
pub use no_tree::{StagedTree, Tree};

fn documents<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    app.path().document_dir().map_err(error)
}

#[tauri::command]
pub async fn games_folder_make<R: Runtime>(app: AppHandle<R>) -> Result<String, String> {
    let path = documents(&app)?.join("pkhemu");
    std::fs::create_dir_all(&path).map_err(error)?;
    Ok(path.to_string_lossy().into_owned())
}

#[tauri::command]
pub async fn games_folder_pick<R: Runtime>(_app: AppHandle<R>) -> Result<Option<String>, String> {
    Err("picking a folder isn't available on iOS yet".into())
}

#[tauri::command]
pub async fn games_folder_find<R: Runtime>(_app: AppHandle<R>) -> Result<Option<String>, String> {
    Err("picking a folder isn't available on iOS yet".into())
}

pub fn open<R: Runtime>(app: &AppHandle<R>, saved: &str) -> Result<(), String> {
    let folder = documents(app)?.join(saved);
    if !folder.is_dir() {
        return Err("No games folder".into());
    }
    // Files opens a folder for shareddocuments:// in place of file://, a scheme Apple doesn't document.
    let url = tauri::Url::from_directory_path(&folder).map_err(|()| "No games folder")?;
    app.opener().open_url(url.as_str().replacen("file://", "shareddocuments://", 1), None::<&str>).map_err(error)
}
