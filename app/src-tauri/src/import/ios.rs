use tauri::{AppHandle, Manager, Runtime};
use tauri_plugin_dialog::{DialogExt, FileAccessMode};
use tauri_plugin_pkhemu_ios::PkhemuIosExt;

use super::{error, Listed, PickedFolder, Walk};

pub async fn pick<R: Runtime>(app: &AppHandle<R>) -> Result<Vec<Listed>, String> {
    let (picked, chosen) = tokio::sync::oneshot::channel();
    app.dialog().file().set_file_access_mode(FileAccessMode::Scoped).pick_files(move |files| {
        let _ = picked.send(files);
    });
    let Some(files) = chosen.await.map_err(error)? else {
        return Ok(Vec::new());
    };
    let mut listed = Vec::new();
    for url in files {
        listed.push(super::listed(app, url.to_string()).await?);
    }
    Ok(listed)
}

pub async fn listed<R: Runtime>(app: &AppHandle<R>, file: String) -> Result<Listed, String> {
    super::listed(app, file).await
}

pub async fn pick_folder<R: Runtime>(app: &AppHandle<R>) -> Result<Option<PickedFolder>, String> {
    let picked = app.pkhemu_ios().pick_folder().await?;
    Ok(picked.map(|folder| PickedFolder { folder: folder.path, name: folder.name }))
}

pub async fn walk<R: Runtime>(app: &AppHandle<R>, folder: &str) -> Result<Walk, String> {
    let walk = super::walk_folder(folder.into()).await?;
    if let Err(e) = app.pkhemu_ios().download(&walk.offline).await {
        eprintln!("downloading from iCloud: {e}");
    }
    Ok(walk)
}

// Files shared from another app or over AirDrop arrive as copies in Documents/Inbox, which Files shows beside
// the games folder.
pub fn remove_copies<R: Runtime>(app: &AppHandle<R>, files: &[String]) {
    let Some(inbox) = app.path().document_dir().ok().and_then(|dir| dir.join("Inbox").canonicalize().ok()) else {
        return;
    };
    for file in files {
        let path = url::Url::parse(file).ok().and_then(|url| url.to_file_path().ok());
        if let Some(path) = path.and_then(|path| path.canonicalize().ok()).filter(|path| path.starts_with(&inbox)) {
            if let Err(e) = std::fs::remove_file(&path) {
                eprintln!("removing {}: {e}", path.display());
            }
        }
    }
}
