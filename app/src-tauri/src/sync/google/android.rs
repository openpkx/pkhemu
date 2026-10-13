use super::*;
use crate::sync::oauth::Tokens;
use crate::sync::provider::BoxFuture;
use serde::Deserialize;
use serde_json::json;
use tauri::plugin::mobile::{ErrorResponse, PluginInvokeError};
use tauri::plugin::{Builder, PluginHandle, TauriPlugin};
use tauri::Manager;

pub struct GoogleSignIn<R: Runtime>(Arc<PluginHandle<R>>);

pub fn plugin<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("google-sign-in")
        .setup(|app, api| {
            let handle = api.register_android_plugin("fyi.openpkx.pkhemu", "GoogleSignInPlugin")?;
            app.manage(GoogleSignIn(Arc::new(handle)));
            Ok(())
        })
        .build()
}

#[derive(Deserialize)]
struct Authorized {
    token: String,
}

async fn authorize<R: Runtime>(handle: &PluginHandle<R>, interactive: bool) -> Result<String, Error> {
    let authorized: Authorized = handle
        .run_mobile_plugin_async("authorize", json!({ "interactive": interactive, "scopes": ["email", DRIVE_SCOPE] }))
        .await
        .map_err(|e| match e {
            PluginInvokeError::InvokeRejected(ErrorResponse {
                code: Some(code), message: Some(message), ..
            }) if code == "signInAgain" => Error::Account(message),
            e => Error::Failed(e.to_string()),
        })?;
    Ok(authorized.token)
}

/// Google Identity Services keeps and refreshes the token, so an expired one only needs clearing and asking again.
pub struct Authorizer<R: Runtime> {
    handle: Arc<PluginHandle<R>>,
    token: tokio::sync::Mutex<Option<String>>,
}

impl<R: Runtime> Authorizer<R> {
    async fn fresh(&self, refused: Option<&str>) -> Result<String, Error> {
        let mut token = self.token.lock().await;
        match (&*token, refused) {
            (Some(known), Some(refused)) if known == refused => {
                let _: Result<Value, _> = self.handle.run_mobile_plugin_async("clearToken", json!({ "token": refused })).await;
            }
            (Some(known), _) => return Ok(known.clone()),
            (None, _) => {}
        }
        let fresh = authorize(&self.handle, false).await?;
        *token = Some(fresh.clone());
        Ok(fresh)
    }
}

impl<R: Runtime> Tokens for Authorizer<R> {
    fn token<'a>(&'a self, refused: Option<&'a str>) -> BoxFuture<'a, Result<String, Error>> {
        Box::pin(self.fresh(refused))
    }
}

fn handle<R: Runtime>(app: &AppHandle<R>) -> Arc<PluginHandle<R>> {
    app.state::<GoogleSignIn<R>>().0.clone()
}

pub async fn sign_in<R: Runtime>(app: &AppHandle<R>) -> Result<Drive, Error> {
    let handle = handle(app);
    let token = authorize(&handle, true).await?;
    let http = http();
    let account = account(&http, USERINFO, &token).await?;
    let tokens = Authorizer { handle, token: tokio::sync::Mutex::new(Some(token)) };
    Ok(Drive::new(http, drive::API, account, Arc::new(tokens)))
}

pub async fn sign_out<R: Runtime>(app: &AppHandle<R>, account: &str) -> Result<(), Error> {
    handle(app)
        .run_mobile_plugin_async::<Value>("revokeAccess", json!({ "account": account, "scopes": ["email", DRIVE_SCOPE] }))
        .await
        .map(|_| ())
        .map_err(|e| Error::Failed(e.to_string()))
}

pub fn reconnect<R: Runtime>(app: &AppHandle<R>, account: &str) -> Drive {
    let tokens = Authorizer { handle: handle(app), token: tokio::sync::Mutex::new(None) };
    Drive::new(http(), drive::API, account.into(), Arc::new(tokens))
}
