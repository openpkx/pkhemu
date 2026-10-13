use std::path::{Path, PathBuf};
use tauri::{AppHandle, Runtime};
use tauri_plugin_pkhemu_ios::PkhemuIosExt;

pub async fn share_file<R: Runtime>(app: &AppHandle<R>, file: &Path) -> Result<(), String> {
    share_files(app, &[file.to_path_buf()]).await
}

pub async fn share_files<R: Runtime>(app: &AppHandle<R>, files: &[PathBuf]) -> Result<(), String> {
    let paths: Vec<String> = files.iter().map(|file| file.to_string_lossy().into_owned()).collect();
    app.pkhemu_ios().share(&paths).await
}
