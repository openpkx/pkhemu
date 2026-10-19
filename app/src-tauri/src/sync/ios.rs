pub(super) const PRESS: &str = "tap";
pub(super) const TELLS_MOBILE_DATA: bool = false;

pub fn device_name() -> String {
    tauri_plugin_os::hostname()
}
