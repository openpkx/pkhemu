use tauri::{AppHandle, Runtime};
use tauri_plugin_dialog::DialogExt;

pub async fn pick_file<R: Runtime>(app: &AppHandle<R>) -> Result<Option<(String, String)>, String> {
    let (picked, chosen) = tokio::sync::oneshot::channel();
    app.dialog().file().pick_file(move |file| {
        let _ = picked.send(file);
    });
    let Some(file) = chosen.await.map_err(|e| e.to_string())? else {
        return Ok(None);
    };
    let path = file.into_path().map_err(|e| e.to_string())?;
    let name = path.file_name().map_or_else(String::new, |name| name.to_string_lossy().into_owned());
    Ok(Some((path.to_string_lossy().into_owned(), name)))
}
