use super::Purchases;
use std::sync::Arc;
use tauri::{AppHandle, Runtime};

pub fn store<R: Runtime>(_app: &AppHandle<R>) -> Option<Arc<dyn Purchases>> {
    None
}
