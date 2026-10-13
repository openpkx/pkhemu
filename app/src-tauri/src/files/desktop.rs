use std::fs::File;
use tauri::{AppHandle, Runtime};

pub async fn open_picked<R: Runtime>(_app: &AppHandle<R>, file: &str) -> Result<File, String> {
    super::open_path(file)
}

pub async fn reading<R: Runtime>(_app: &AppHandle<R>, _path: &str) -> Result<super::Reading, String> {
    Ok(super::Reading::default())
}
