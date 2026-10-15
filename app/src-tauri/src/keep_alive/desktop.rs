use tauri::{AppHandle, Runtime};

pub fn set<R: Runtime>(_app: &AppHandle<R>, _busy: bool) {}

pub fn progress<R: Runtime>(_app: &AppHandle<R>, _percent: Option<u8>) {}
