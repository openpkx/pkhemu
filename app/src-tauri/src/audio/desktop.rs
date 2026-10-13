use tauri::{AppHandle, Runtime};

pub fn watch<R: Runtime>(_app: &AppHandle<R>) {}

#[tauri::command]
pub fn audio_play_in_silent_mode<R: Runtime>(_app: AppHandle<R>, _on: bool) -> Result<(), String> {
    Err("only iOS has a silent mode switch".into())
}
