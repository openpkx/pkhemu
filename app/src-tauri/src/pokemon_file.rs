use tauri::{AppHandle, Runtime};
use tauri_plugin_android_fs::AndroidFsExt;

#[derive(serde::Serialize)]
pub struct PickedFile {
    name: String,
    bytes: Vec<u8>,
}

#[tauri::command]
pub async fn pokemon_file_pick<R: Runtime>(app: AppHandle<R>) -> Result<Option<PickedFile>, String> {
    let fs = app.android_fs_async();
    let Some(uri) = fs
        .picker()
        .pick_file(None, &[], false)
        .await
        .map_err(|reason| reason.to_string())?
    else {
        return Ok(None);
    };
    Ok(Some(PickedFile {
        name: fs.get_name_or_last_path_segment(&uri).await,
        bytes: fs.read(&uri).await.map_err(|reason| reason.to_string())?,
    }))
}
