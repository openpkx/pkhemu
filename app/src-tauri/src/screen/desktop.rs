use super::{Native, Screen};

pub fn watch() {}

pub fn screen(native: Native) -> Box<dyn Screen> {
    Box::new(native)
}

#[tauri::command]
pub fn screen_set_playing(_playing: bool) -> Result<(), String> {
    Err("only phones draw the game natively".into())
}
