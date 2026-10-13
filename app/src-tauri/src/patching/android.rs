use tauri::{AppHandle, Runtime};
use tauri_plugin_android_fs::AndroidFsExt;

pub async fn pick_file<R: Runtime>(app: &AppHandle<R>) -> Result<Option<(String, String)>, String> {
    let fs = app.android_fs_async();
    let Some(uri) = fs.picker().pick_file(None, &[], false).await.map_err(|e| e.to_string())? else {
        return Ok(None);
    };
    let name = fs.get_name_or_last_path_segment(&uri).await;
    Ok(Some((uri.to_json_string().map_err(|e| e.to_string())?, name)))
}
