use super::*;
use crate::sync::oauth::{self, Pkce};
use tauri::Manager;

/// Registered with Dropbox and in AndroidManifest.xml, so the Custom Tab comes back to the app.
pub const REDIRECT: &str = "fyi.openpkx.pkhemu://dropbox";

pub async fn sign_in<R: Runtime>(app: &AppHandle<R>) -> Result<Dropbox, Error> {
    let (http, service, pkce) = (http(), service(), Pkce::new());
    let url = service.authorize_url(&pkce, REDIRECT, &params(&SCOPES.join(" ")))?;
    let redirected = oauth::browser_sign_in(app, &url, REDIRECT).await?;
    let code = service.code(&pkce, &redirected).ok_or("Dropbox sent back a different sign-in")??;
    let grant = service.exchange(&http, &pkce, &code, REDIRECT).await?;
    connect(app, http, service, grant).await
}

pub(super) fn saved<R: Runtime>(app: &AppHandle<R>, service: &Service, account: &str) -> Result<Saved, Error> {
    Ok(Saved::new(&app.path().app_data_dir().map_err(|e| e.to_string())?, service, account))
}
