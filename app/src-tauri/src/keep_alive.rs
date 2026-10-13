#[cfg_attr(target_os = "android", path = "keep_alive/android.rs")]
#[cfg_attr(target_os = "ios", path = "keep_alive/ios.rs")]
#[cfg_attr(desktop, path = "keep_alive/desktop.rs")]
pub mod platform;

use tauri::{AppHandle, Runtime};

pub fn begin<R: Runtime>(app: &AppHandle<R>) {
    // A store build without Plus leaves the sync service out of its manifest, since it never syncs.
    if !crate::plus::Build::current().offers_sync() {
        return;
    }
    platform::set(app, true);
}

pub fn end<R: Runtime>(app: &AppHandle<R>) {
    if !crate::plus::Build::current().offers_sync() {
        return;
    }
    platform::set(app, false);
}
