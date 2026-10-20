use super::Check;
use serde::de::DeserializeOwned;
use serde_json::{json, Value};
use tauri::ipc::Channel;
use tauri::plugin::{Builder, PluginHandle, TauriPlugin};
use tauri::{AppHandle, Emitter, Manager, Runtime};

struct AppUpdate<R: Runtime>(PluginHandle<R>);

pub fn plugin<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("app-update")
        .setup(|app, api| {
            let handle = api.register_android_plugin("fyi.openpkx.pkhemu", "AppUpdatePlugin")?;
            for event in ["downloading", "downloaded", "stopped"] {
                let emitter = app.clone();
                let handler = Channel::<Value>::new(move |body| {
                    let _ =
                        emitter.emit(&format!("app-update-{event}"), body.deserialize::<Value>().unwrap_or_default());
                    Ok(())
                });
                if let Err(e) =
                    handle.run_mobile_plugin::<Value>("registerListener", json!({ "event": event, "handler": handler }))
                {
                    eprintln!("listening for app update {event}: {e}");
                }
            }
            app.manage(AppUpdate(handle));
            Ok(())
        })
        .build()
}

#[tauri::command]
pub async fn app_update_check<R: Runtime>(app: AppHandle<R>) -> Result<Check, String> {
    run(&app, "check").await
}

#[tauri::command]
pub async fn app_update_start<R: Runtime>(app: AppHandle<R>) -> Result<(), String> {
    run::<R, Value>(&app, "start").await.map(|_| ())
}

#[tauri::command]
pub async fn app_update_complete<R: Runtime>(app: AppHandle<R>) -> Result<(), String> {
    run::<R, Value>(&app, "complete").await.map(|_| ())
}

async fn run<R: Runtime, T: DeserializeOwned>(app: &AppHandle<R>, command: &str) -> Result<T, String> {
    let update = app.try_state::<AppUpdate<R>>().ok_or("Google Play updates aren't set up")?;
    update.0.run_mobile_plugin_async(command, ()).await.map_err(|e| e.to_string())
}
