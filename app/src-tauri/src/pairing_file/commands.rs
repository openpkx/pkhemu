use std::io::Read;
use std::path::PathBuf;
use tauri::{AppHandle, Manager, Runtime};
use tauri_plugin_dialog::{DialogExt, FileAccessMode};

fn data_dir<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    app.path().app_data_dir().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn jit_pairing_file<R: Runtime>(app: AppHandle<R>) -> Result<bool, String> {
    Ok(super::is_set(&data_dir(&app)?))
}

#[tauri::command]
pub async fn jit_pairing_file_import<R: Runtime>(app: AppHandle<R>) -> Result<bool, String> {
    let (picked, chosen) = tokio::sync::oneshot::channel();
    app.dialog()
        .file()
        .set_file_access_mode(FileAccessMode::Scoped)
        .add_filter("Pairing file", &super::EXTENSIONS)
        .pick_file(move |file| {
            let _ = picked.send(file);
        });
    let Some(url) = chosen.await.map_err(|e| e.to_string())? else {
        return Ok(false);
    };
    let picked = url.to_string();
    let mut bytes = Vec::new();
    crate::files::open_picked(&app, &picked).await?.read_to_end(&mut bytes).map_err(|e| format!("{picked}: {e}"))?;
    let path = url.into_path().map_err(|e| e.to_string())?;
    let name = path.file_name().map_or_else(String::new, |name| name.to_string_lossy().into_owned());
    super::import(&data_dir(&app)?, &name, &bytes)?;
    Ok(true)
}

#[tauri::command]
pub fn jit_pairing_file_remove<R: Runtime>(app: AppHandle<R>) -> Result<(), String> {
    super::remove(&data_dir(&app)?)
}
