use tauri::{AppHandle, Runtime};

pub fn set<R: Runtime>(_app: &AppHandle<R>, _busy: bool) {}
