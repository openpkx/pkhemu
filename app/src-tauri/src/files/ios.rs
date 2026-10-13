use std::fs::File;
use tauri::{AppHandle, Runtime};
use tauri_plugin_fs::{FilePath, FsExt, OpenOptions};
use tauri_plugin_pkhemu_ios::PkhemuIosExt;

// A picked file:// URL is security-scoped. The sandbox checks access when the file opens, so the open
// handle keeps reading after access stops, and stopping right away leaves no scope behind.
pub async fn open_picked<R: Runtime>(app: &AppHandle<R>, file: &str) -> Result<File, String> {
    let Ok(url) = url::Url::parse(file).map(FilePath::Url) else { return super::open_path(file) };
    let mut options = OpenOptions::new();
    options.read(true);
    let opened = app.fs().open(url.clone(), options).map_err(|e| format!("{file}: {e}"));
    let _ = app.fs().stop_accessing_security_scoped_resource(url);
    opened
}

pub async fn reading<R: Runtime>(app: &AppHandle<R>, path: &str) -> Result<super::Reading, String> {
    let ios = app.pkhemu_ios().clone();
    Ok(match ios.start_reading(path).await? {
        Some(id) => super::Reading::until(move || ios.stop_reading(&id)),
        None => super::Reading::default(),
    })
}
