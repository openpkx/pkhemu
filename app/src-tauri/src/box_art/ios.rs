use tauri::{AppHandle, Runtime};
use tauri_plugin_dialog::DialogExt;

pub async fn pick_image<R: Runtime>(app: &AppHandle<R>) -> Result<Option<Vec<u8>>, String> {
    let (picked, chosen) = tokio::sync::oneshot::channel();
    app.dialog().file().add_filter("Images", &["png", "jpg", "jpeg", "gif", "webp", "bmp"]).pick_file(move |file| {
        let _ = picked.send(file);
    });
    let Some(file) = chosen.await.map_err(|e| e.to_string())? else {
        return Ok(None);
    };
    let path = file.into_path().map_err(|e| e.to_string())?;
    let read = tauri::async_runtime::spawn_blocking(move || {
        std::fs::read(&path).map_err(|e| format!("{}: {e}", path.display()))
    });
    read.await.map_err(|e| e.to_string())?.map(Some)
}
