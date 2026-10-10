use tauri::{AppHandle, Runtime};

pub async fn metered<R: Runtime>(app: &AppHandle<R>) -> bool {
    #[cfg(target_os = "android")]
    return android::metered(app).await;
    #[cfg(not(target_os = "android"))]
    {
        let _ = app;
        false
    }
}

#[cfg(target_os = "android")]
pub use android::plugin;

#[cfg(target_os = "android")]
mod android {
    use serde::Deserialize;
    use tauri::plugin::{Builder, PluginHandle, TauriPlugin};
    use tauri::{AppHandle, Manager, Runtime};

    struct Network<R: Runtime>(PluginHandle<R>);

    pub fn plugin<R: Runtime>() -> TauriPlugin<R> {
        Builder::new("network")
            .setup(|app, api| {
                app.manage(Network(api.register_android_plugin("fyi.openpkx.pkhemu", "NetworkPlugin")?));
                Ok(())
            })
            .build()
    }

    #[derive(Deserialize)]
    struct Metered {
        metered: bool,
    }

    // A failed check counts as metered, so a ROM never goes over mobile data by mistake.
    pub async fn metered<R: Runtime>(app: &AppHandle<R>) -> bool {
        let Some(network) = app.try_state::<Network<R>>() else { return true };
        match network.0.run_mobile_plugin_async::<Metered>("metered", ()).await {
            Ok(answer) => answer.metered,
            Err(e) => {
                eprintln!("checking the network: {e}");
                true
            }
        }
    }
}
