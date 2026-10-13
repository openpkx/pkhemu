use tauri::{AppHandle, Runtime};

pub async fn metered<R: Runtime>(_: &AppHandle<R>) -> bool {
    false
}
