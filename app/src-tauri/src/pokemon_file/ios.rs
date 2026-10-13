use std::io::Read;
use tauri::{AppHandle, Runtime};
use tauri_plugin_dialog::{DialogExt, FileAccessMode};

use super::PickedFile;
use crate::files::open_picked;

#[tauri::command]
pub async fn pokemon_file_pick<R: Runtime>(app: AppHandle<R>) -> Result<Option<PickedFile>, String> {
    let (picked, chosen) = tokio::sync::oneshot::channel();
    app.dialog().file().set_file_access_mode(FileAccessMode::Scoped).pick_file(move |file| {
        let _ = picked.send(file);
    });
    let Some(url) = chosen.await.map_err(|e| e.to_string())? else {
        return Ok(None);
    };
    let file = url.to_string();
    let mut bytes = Vec::new();
    open_picked(&app, &file).await?.read_to_end(&mut bytes).map_err(|e| format!("{file}: {e}"))?;
    let path = url.into_path().map_err(|e| e.to_string())?;
    let name = path.file_name().map_or_else(String::new, |name| name.to_string_lossy().into_owned());
    Ok(Some(PickedFile { name, bytes }))
}
