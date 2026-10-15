use std::path::PathBuf;
use std::time::SystemTime;

use serde::Serialize;
use tauri::ipc::{Channel, InvokeResponseBody};
use tauri::plugin::{Builder, TauriPlugin};
use tauri::{AppHandle, Runtime};
use tauri_plugin_android_fs::{AndroidFsExt, Entry, FsUri};

use super::{error, Listed, PickedFolder, Walk};

#[derive(Serialize)]
struct Watch {
    channel: Channel,
}

pub fn plugin<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("opened-files")
        .setup(|app, api| {
            let plugin = api.register_android_plugin("fyi.openpkx.pkhemu", "OpenedFilesPlugin")?;
            let app = app.clone();
            let channel = Channel::new(move |body| {
                let InvokeResponseBody::Json(json) = body else { return Ok(()) };
                let uris: Vec<String> = serde_json::from_str(&json)?;
                let files = uris.into_iter().filter_map(|uri| FsUri::from_uri(uri).to_json_string().ok()).collect();
                super::opened(&app, files);
                Ok(())
            });
            plugin.run_mobile_plugin::<serde_json::Value>("watch", Watch { channel })?;
            Ok(())
        })
        .build()
}

pub async fn pick<R: Runtime>(app: &AppHandle<R>) -> Result<Vec<Listed>, String> {
    let mut picked = Vec::new();
    for uri in app.android_fs_async().picker().pick_files(None, &[], false).await.map_err(error)? {
        let Ok(file) = uri.to_json_string() else { continue };
        if let Ok(listed) = listed(app, file).await {
            picked.push(listed);
        }
    }
    Ok(picked)
}

pub async fn listed<R: Runtime>(app: &AppHandle<R>, file: String) -> Result<Listed, String> {
    let Ok(uri) = FsUri::from_json_str(&file) else { return super::listed(app, file).await };
    let fs = app.android_fs_async();
    match fs.get_info(&uri).await {
        Ok(info) => {
            let (name, modified, size) = (info.name().to_owned(), info.last_modified(), info.file_len().unwrap_or(0));
            Ok(Listed { file, name, folder: None, modified, size, title_id: None })
        }
        Err(err) => {
            // The plugin reads non-Documents URIs by columns that other apps' FileProviders don't serve.
            let name = fs.get_name(&uri).await.ok();
            let metadata = fs.open_file_readable(&uri).await.ok().and_then(|opened| opened.metadata().ok());
            let (Some(name), Some(metadata)) = (name, metadata) else { return Err(error(err)) };
            let size = metadata.len();
            Ok(Listed { file, name, folder: None, modified: SystemTime::now(), size, title_id: None })
        }
    }
}

pub async fn pick_folder<R: Runtime>(app: &AppHandle<R>) -> Result<Option<PickedFolder>, String> {
    let fs = app.android_fs_async();
    let Some(uri) = fs.picker().pick_dir(None, true).await.map_err(error)? else { return Ok(None) };
    let name = fs.get_name(&uri).await.map_err(error)?;
    Ok(Some(PickedFolder { folder: uri.to_json_string().map_err(error)?, name }))
}

pub async fn walk<R: Runtime>(app: &AppHandle<R>, folder: &str) -> Result<Walk, String> {
    let Ok(root) = FsUri::from_json_str(folder) else { return super::walk_folder(folder.into()).await };
    let fs = app.android_fs_async();
    let mut walk = Walk::default();
    let mut dirs = vec![(root, PathBuf::new())];
    while let Some((dir, path)) = dirs.pop() {
        let Ok(entries) = fs.read_dir(&dir).await else { continue };
        let folder = dir.to_json_string().ok();
        let names: Vec<String> = entries.iter().map(|entry| entry.name().to_owned()).collect();
        let skipped = walk.enter_dir(&path, &names);
        for (entry, name) in entries.into_iter().zip(&names) {
            if skipped(name) {
                continue;
            }
            match entry {
                Entry::Dir { uri, name, .. } => dirs.push((uri, path.join(name))),
                Entry::File { uri, name, last_modified, len, .. } => {
                    let Ok(file) = uri.to_json_string() else { continue };
                    let title_id = super::azahar_save(&path, &name);
                    let folder = folder.clone();
                    walk.listed.push(Listed { file, name, folder, modified: last_modified, size: len, title_id });
                }
            }
        }
    }
    Ok(walk)
}

pub fn remove_copies<R: Runtime>(_app: &AppHandle<R>, _files: &[String]) {}
