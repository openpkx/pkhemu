#[tauri::command]
pub fn system_bars_set_hidden(_hidden: bool) -> Result<(), String> {
    Err("only iOS sets its system bars from Rust".into())
}

#[tauri::command]
pub fn system_bars_set_light(_light: bool) -> Result<(), String> {
    Err("only iOS sets its system bars from Rust".into())
}
