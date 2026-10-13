use std::path::{Path, PathBuf};
use tauri::{AppHandle, Runtime};

pub async fn share_file<R: Runtime>(_app: &AppHandle<R>, _file: &Path) -> Result<(), String> {
    Err("the desktop app saves exports through the webview".into())
}

pub async fn share_files<R: Runtime>(_app: &AppHandle<R>, _files: &[PathBuf]) -> Result<(), String> {
    Err("the desktop app saves exports through the webview".into())
}
