use std::fs::File;
use tauri::{AppHandle, Runtime};
use tauri_plugin_android_fs::{AndroidFsExt, FsUri};

pub async fn open_picked<R: Runtime>(app: &AppHandle<R>, file: &str) -> Result<File, String> {
    match FsUri::from_json_str(file) {
        Ok(uri) => app.android_fs_async().open_file_readable(&uri).await.map_err(|e| e.to_string()),
        Err(_) => super::open_path(file),
    }
}

pub async fn reading<R: Runtime>(_app: &AppHandle<R>, _path: &str) -> Result<super::Reading, String> {
    Ok(super::Reading::default())
}
