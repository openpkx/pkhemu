use tauri::{AppHandle, Runtime};

use super::PickedFile;

#[tauri::command]
pub async fn pokemon_file_pick<R: Runtime>(_app: AppHandle<R>) -> Result<Option<PickedFile>, String> {
    Err("the desktop app picks files in the webview".into())
}
