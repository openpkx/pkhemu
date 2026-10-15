use tauri::{AppHandle, Runtime};

// A stub until the app ships on iOS. It should call UIApplication's beginBackgroundTask when busy, which buys about
// 30 seconds for saves and states, and endBackgroundTask when not.
pub fn set<R: Runtime>(_app: &AppHandle<R>, _busy: bool) {}

pub fn progress<R: Runtime>(_app: &AppHandle<R>, _percent: Option<u8>) {}
