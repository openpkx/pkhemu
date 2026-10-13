pub fn watch() {}

#[tauri::command]
pub fn screen_set_playing(_playing: bool) -> Result<(), String> {
    Err("only phones draw the game natively".into())
}
