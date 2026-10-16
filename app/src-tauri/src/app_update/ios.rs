use super::{feed, Check};
use crate::plus::Build;
use std::time::{Duration, SystemTime};
use tauri::{AppHandle, Manager, Runtime};
use tauri_plugin_opener::OpenerExt;

#[tauri::command]
pub async fn app_update_check<R: Runtime>(app: AppHandle<R>) -> Result<Check, String> {
    let cache = app.path().app_data_dir().map_err(|e| e.to_string())?.join("app-update.json");
    let current = app.package_info().version.to_string();
    Ok(feed::check(Build::current(), &cache, SystemTime::now(), &current, fetch_feed).await)
}

async fn fetch_feed() -> Result<String, String> {
    let client = reqwest::Client::builder()
        .tls_backend_preconfigured(crate::sync::tls())
        .connect_timeout(Duration::from_secs(15))
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|e| e.to_string())?;
    let response = client.get(feed::FEED).send().await.and_then(|r| r.error_for_status()).map_err(|e| e.to_string())?;
    response.text().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub fn app_update_start<R: Runtime>(app: AppHandle<R>) -> Result<(), String> {
    app.opener().open_url(feed::JIT_PAGE, None::<&str>).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn app_update_complete() {}
