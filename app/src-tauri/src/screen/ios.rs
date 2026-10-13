use crate::gl::Window;
use std::ffi::c_void;
use tauri::{AppHandle, Runtime};
use tauri_plugin_pkhemu_ios::PkhemuIosExt;

pub fn watch() {
    tauri_plugin_pkhemu_ios::watch_game_screen(shown, gone);
}

#[tauri::command]
pub fn screen_set_playing<R: Runtime>(app: AppHandle<R>, playing: bool) -> Result<(), String> {
    app.pkhemu_ios().set_game_screen_playing(playing)
}

extern "C" fn shown(layer: *mut c_void, width: i32, height: i32) {
    if let Some(window) = unsafe { Window::from_layer(layer, width, height) } {
        super::shown(window);
    }
}

extern "C" fn gone() {
    super::gone();
}
