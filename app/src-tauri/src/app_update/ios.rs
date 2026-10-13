use super::Check;

#[tauri::command]
pub fn app_update_check() -> Check {
    Check::default()
}

#[tauri::command]
pub fn app_update_start() {}

#[tauri::command]
pub fn app_update_complete() {}
