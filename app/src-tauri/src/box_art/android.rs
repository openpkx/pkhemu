use tauri::{AppHandle, Runtime};
use tauri_plugin_android_fs::{AndroidFsExt, VisualMediaTarget};

pub async fn pick_image<R: Runtime>(app: &AppHandle<R>) -> Result<Option<Vec<u8>>, String> {
    let fs = app.android_fs_async();
    let picked = fs.picker().pick_visual_media(VisualMediaTarget::ImageOnly, false).await.map_err(|e| e.to_string())?;
    let Some(uri) = picked else {
        return Ok(None);
    };
    fs.read(&uri).await.map(Some).map_err(|e| e.to_string())
}
