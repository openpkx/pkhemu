use crate::gl::Window;
use std::ffi::c_void;

pub fn watch() {}

#[tauri::command]
pub fn screen_set_playing(_playing: bool) -> Result<(), String> {
    Err("Android's game surface follows the page's own bridge".into())
}

#[no_mangle]
pub unsafe extern "system" fn Java_fyi_openpkx_pkhemu_NativeScreen_shown(
    env: *mut c_void,
    _class: *mut c_void,
    surface: *mut c_void,
) {
    if let Some(window) = Window::from_surface(env, surface) {
        super::shown(window);
    }
}

#[no_mangle]
pub extern "system" fn Java_fyi_openpkx_pkhemu_NativeScreen_gone(_env: *mut c_void, _class: *mut c_void) {
    super::gone();
}
