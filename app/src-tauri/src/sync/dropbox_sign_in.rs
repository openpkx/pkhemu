use super::dropbox::{self, Dropbox};
use super::oauth::{http, offline, Grant, OAuthClient, Refresher, Saved, Service};
use super::provider::Error;
use reqwest::Client;
use serde_json::Value;
use std::sync::Arc;
use tauri::{AppHandle, Runtime};

pub const APP_KEY: &str = env!("PKH_EMU_DROPBOX_APP_KEY");
const SCOPES: [&str; 5] =
    ["files.content.read", "files.content.write", "files.metadata.read", "files.metadata.write", "account_info.read"];

pub fn available(app_key: &str) -> bool {
    !app_key.trim().is_empty()
}

pub fn service() -> Service {
    Service {
        name: "Dropbox",
        key: "dropbox",
        client: OAuthClient { id: APP_KEY.into(), secret: None },
        authorize: "https://www.dropbox.com/oauth2/authorize".into(),
        token: "https://api.dropboxapi.com/oauth2/token".into(),
    }
}

fn params(scopes: &str) -> [(&str, &str); 2] {
    [("scope", scopes), ("token_access_type", "offline")]
}

pub async fn account(http: &Client, api: &str, access_token: &str) -> Result<String, Error> {
    let response = http
        .post(format!("{api}/2/users/get_current_account"))
        .bearer_auth(access_token)
        .json(&Value::Null)
        .send()
        .await
        .map_err(offline)?;
    if !response.status().is_success() {
        return Err(Error::Failed(format!("Dropbox answered {} when asked who signed in", response.status())));
    }
    let info: Value = response.json().await.map_err(offline)?;
    Ok(info["email"].as_str().ok_or("Dropbox didn't say which account signed in")?.into())
}

#[cfg(not(target_os = "android"))]
fn saved<R: Runtime>(_: &AppHandle<R>, service: &Service, account: &str) -> Result<Saved, Error> {
    Ok(Saved::new(service, account))
}

#[cfg(target_os = "android")]
fn saved<R: Runtime>(app: &AppHandle<R>, service: &Service, account: &str) -> Result<Saved, Error> {
    use tauri::Manager;
    Ok(Saved::new(&app.path().app_data_dir().map_err(|e| e.to_string())?, service, account))
}

async fn connect<R: Runtime>(
    app: &AppHandle<R>,
    http: Client,
    service: Service,
    grant: Grant,
) -> Result<Dropbox, Error> {
    let account = account(&http, dropbox::API, &grant.access_token).await?;
    let saved = saved(app, &service, &account)?;
    saved.save(grant.refresh_token.as_deref().unwrap_or_default())?;
    let tokens = Refresher::new(http.clone(), service, saved, Some(grant));
    Ok(Dropbox::new(http, dropbox::API, dropbox::CONTENT, account, Arc::new(tokens)))
}

pub async fn sign_out<R: Runtime>(app: &AppHandle<R>, account: &str) -> Result<(), Error> {
    saved(app, &service(), account)?.forget()
}

pub fn reconnect<R: Runtime>(app: &AppHandle<R>, account: &str) -> Result<Dropbox, Error> {
    let (http, service) = (http(), service());
    let tokens = Refresher::new(http.clone(), service.clone(), saved(app, &service, account)?, None);
    Ok(Dropbox::new(http, dropbox::API, dropbox::CONTENT, account.into(), Arc::new(tokens)))
}

#[cfg(not(target_os = "android"))]
pub use desktop::*;

#[cfg(not(target_os = "android"))]
mod desktop {
    use super::*;
    use crate::sync::oauth::{self, Loopback, SignIn};

    /// Dropbox only takes a redirect registered with it, port included, so the browser comes back to one of these.
    pub const PORTS: [u16; 3] = [18734, 18735, 18736];

    pub async fn start(service: &Service) -> Result<SignIn, Error> {
        SignIn::start(service, Loopback::first_free(&PORTS).await?, &params(&SCOPES.join(" ")))
    }

    pub async fn sign_in<R: Runtime>(app: &AppHandle<R>) -> Result<Dropbox, Error> {
        let (http, service) = (http(), service());
        let grant = oauth::sign_in(app, start(&service).await?, &http, &service).await?;
        connect(app, http, service, grant).await
    }
}

#[cfg(target_os = "android")]
pub use android::*;

#[cfg(target_os = "android")]
mod android {
    use super::*;
    use crate::sync::oauth::{self, Pkce};

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
}

#[cfg(test)]
mod tests {
    use super::super::fake_http::{Reply, Server};
    use super::*;
    use base64::engine::general_purpose::URL_SAFE_NO_PAD;
    use base64::Engine;
    use serde_json::json;
    use sha2::{Digest, Sha256};
    use std::collections::HashMap;
    use std::sync::Mutex;
    use tauri::async_runtime::{block_on, spawn};

    type Forms = Arc<Mutex<Vec<HashMap<String, String>>>>;

    fn dropbox() -> (Service, String, Forms) {
        let forms: Forms = Arc::default();
        let server = {
            let forms = forms.clone();
            Server::start(move |request| match request.path.as_str() {
                "/oauth2/token" => {
                    let form: HashMap<String, String> = request.form().into_iter().collect();
                    forms.lock().unwrap().push(form.clone());
                    match form.get("code").map(String::as_str) {
                        Some("the-code") => Reply::json(
                            200,
                            json!({ "access_token": "first", "refresh_token": "refresh", "expires_in": 14400, "token_type": "bearer", "account_id": "dbid:1" }),
                        ),
                        _ => Reply::json(400, json!({ "error": "invalid_grant" })),
                    }
                }
                "/2/users/get_current_account" if request.header("authorization") == Some("Bearer first") => {
                    Reply::json(200, json!({ "account_id": "dbid:1", "email": "player@example.com" }))
                }
                _ => Reply::status(404),
            })
        };
        let service = Service {
            client: OAuthClient { id: "app-key".into(), secret: None },
            authorize: format!("{}/oauth2/authorize", server.url),
            token: format!("{}/oauth2/token", server.url),
            ..service()
        };
        (service, server.url, forms)
    }

    fn params(url: &str) -> HashMap<String, String> {
        url::Url::parse(url).unwrap().query_pairs().into_owned().collect()
    }

    #[test]
    fn dropbox_is_offered_only_with_an_app_key() {
        assert!(!available(""));
        assert!(available("abc123xyz"));
    }

    #[test]
    fn signs_in_through_the_browser_with_pkce_and_no_secret() {
        let (service, api, forms) = dropbox();
        let sign_in = block_on(start(&service)).unwrap();
        let url = sign_in.url.clone();
        let asked = params(&url);
        let (redirect, state) = (asked["redirect_uri"].clone(), asked["state"].clone());
        let browser = spawn(async move {
            http().get(format!("{redirect}/?state={state}&code=the-code")).send().await.unwrap().text().await.unwrap()
        });

        let grant = block_on(sign_in.finish(&http(), &service)).unwrap();
        let page = block_on(browser).unwrap();

        assert!(
            PORTS.iter().any(|port| asked["redirect_uri"] == format!("http://localhost:{port}")),
            "{}",
            asked["redirect_uri"]
        );
        assert!(url.starts_with(&format!("{}?", service.authorize)));
        assert_eq!(asked["client_id"], "app-key");
        assert_eq!(asked["response_type"], "code");
        assert_eq!(asked["code_challenge_method"], "S256");
        assert_eq!(asked["token_access_type"], "offline");
        assert_eq!(
            asked["scope"],
            "files.content.read files.content.write files.metadata.read files.metadata.write account_info.read"
        );
        assert!(page.contains("Signed in"));
        let form = &forms.lock().unwrap()[0];
        assert_eq!(form["grant_type"], "authorization_code");
        assert_eq!(form["code"], "the-code");
        assert_eq!(form["client_id"], "app-key");
        assert!(!form.contains_key("client_secret"));
        assert_eq!(form["redirect_uri"], asked["redirect_uri"]);
        assert_eq!(URL_SAFE_NO_PAD.encode(Sha256::digest(form["code_verifier"].as_bytes())), asked["code_challenge"]);
        assert_eq!(grant.refresh_token.as_deref(), Some("refresh"));
        assert_eq!(block_on(account(&http(), &api, &grant.access_token)).unwrap(), "player@example.com");
    }

    #[test]
    fn a_refused_code_asks_the_player_to_sign_in_again() {
        let (service, _, _) = dropbox();
        let sign_in = block_on(start(&service)).unwrap();
        let asked = params(&sign_in.url);
        let (redirect, state) = (asked["redirect_uri"].clone(), asked["state"].clone());
        spawn(async move { http().get(format!("{redirect}/?state={state}&code=stale")).send().await.unwrap() });

        assert_eq!(
            block_on(sign_in.finish(&http(), &service)).err(),
            Some(Error::Account("Sign in to Dropbox again".into()))
        );
    }
}
