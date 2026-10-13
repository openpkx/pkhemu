use super::*;
use serde::Deserialize;
use serde_json::json;
use tauri::plugin::{Builder, PluginHandle, TauriPlugin};
use tauri::{AppHandle, Manager, Runtime};

/// Keeps a refresh token in the app's private storage between runs.
pub struct Saved {
    key: String,
    dir: std::path::PathBuf,
}

impl Saved {
    pub fn new(dir: &std::path::Path, service: &Service, _account: &str) -> Saved {
        Saved { key: service.key.into(), dir: dir.into() }
    }

    fn path(&self) -> std::path::PathBuf {
        self.dir.join(format!("sync-{}.token", self.key))
    }

    pub fn load(&self) -> Option<String> {
        std::fs::read_to_string(self.path()).ok()
    }

    pub fn save(&self, token: &str) -> Result<(), Error> {
        std::fs::write(self.path(), token).map_err(|e| Error::Failed(e.to_string()))
    }

    pub fn forget(&self) -> Result<(), Error> {
        match std::fs::remove_file(self.path()) {
            Err(e) if e.kind() != std::io::ErrorKind::NotFound => Err(Error::Failed(e.to_string())),
            _ => Ok(()),
        }
    }
}

struct BrowserSignIn<R: Runtime>(PluginHandle<R>);

pub fn plugin<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("browser-sign-in")
        .setup(|app, api| {
            let handle = api.register_android_plugin("fyi.openpkx.pkhemu", "BrowserSignInPlugin")?;
            app.manage(BrowserSignIn(handle));
            Ok(())
        })
        .build()
}

#[derive(Deserialize)]
struct Redirected {
    url: String,
}

pub async fn browser_sign_in<R: Runtime>(app: &AppHandle<R>, url: &str, redirect: &str) -> Result<url::Url, Error> {
    let state = app.state::<BrowserSignIn<R>>();
    let opened = state.0.run_mobile_plugin_async::<Redirected>("open", json!({ "url": url, "redirect": redirect }));
    let redirected = tokio::time::timeout(SIGN_IN_WAIT, opened)
        .await
        .map_err(|_| Error::Failed("Sign-in timed out".into()))?
        .map_err(|e| Error::Failed(e.to_string()))?;
    url::Url::parse(&redirected.url).map_err(|e| Error::Failed(e.to_string()))
}
