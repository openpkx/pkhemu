use tauri::{AppHandle, Runtime};
use tauri_plugin_dialog::DialogExt;

use super::{error, Listed, PickedFolder};

pub async fn pick<R: Runtime>(app: &AppHandle<R>) -> Result<Vec<Listed>, String> {
    let (picked, chosen) = tokio::sync::oneshot::channel();
    app.dialog().file().pick_files(move |files| {
        let _ = picked.send(files);
    });
    let Some(files) = chosen.await.map_err(error)? else {
        return Ok(Vec::new());
    };
    files
        .into_iter()
        .map(|file| {
            let path = file.into_path().map_err(error)?;
            let meta = path.metadata().map_err(|e| format!("{}: {e}", path.display()))?;
            let modified = meta.modified().map_err(|e| format!("{}: {e}", path.display()))?;
            let name = path.file_name().map_or_else(String::new, |name| name.to_string_lossy().into_owned());
            Ok(Listed { file: path.to_string_lossy().into_owned(), name, modified, size: meta.len() })
        })
        .collect()
}

pub async fn listed<R: Runtime>(app: &AppHandle<R>, file: String) -> Result<Listed, String> {
    super::listed(app, file).await
}

pub async fn pick_folder<R: Runtime>(app: &AppHandle<R>) -> Result<Option<PickedFolder>, String> {
    let (picked, chosen) = tokio::sync::oneshot::channel();
    app.dialog().file().pick_folder(move |folder| {
        let _ = picked.send(folder);
    });
    let Some(folder) = chosen.await.map_err(error)? else { return Ok(None) };
    let path = folder.into_path().map_err(error)?;
    let name = path.file_name().map_or_else(|| path.to_string_lossy(), |name| name.to_string_lossy()).into_owned();
    Ok(Some(PickedFolder { folder: path.to_string_lossy().into_owned(), name }))
}

pub async fn walk<R: Runtime>(_app: &AppHandle<R>, folder: &str) -> Result<Vec<Listed>, String> {
    Ok(super::walk_folder(folder.into()).await?.listed)
}

pub fn remove_copies<R: Runtime>(_app: &AppHandle<R>, _files: &[String]) {}
