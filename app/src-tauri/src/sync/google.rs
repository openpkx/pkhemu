#[cfg_attr(target_os = "android", path = "google/android.rs")]
#[cfg_attr(target_os = "ios", path = "google/ios.rs")]
#[cfg_attr(desktop, path = "google/desktop.rs")]
mod platform;

pub use platform::*;

use super::drive::{self, Drive};
use super::oauth::{http, offline};
use super::provider::Error;
use reqwest::Client;
use serde_json::Value;
use std::sync::Arc;
use tauri::{AppHandle, Runtime};

pub const CLIENT_ID: &str = env!("PKH_EMU_GOOGLE_CLIENT_ID");
pub const DRIVE_SCOPE: &str = "https://www.googleapis.com/auth/drive.appdata";

/// A build without a client ID hides sync, on Android too, where Google matches the app by its signing certificate instead.
pub fn available(client_id: &str) -> bool {
    !client_id.trim().is_empty()
}

const USERINFO: &str = "https://openidconnect.googleapis.com/v1/userinfo";

pub async fn account(http: &Client, userinfo: &str, access_token: &str) -> Result<String, Error> {
    let response = http.get(userinfo).bearer_auth(access_token).send().await.map_err(offline)?;
    let info: Value = drive::check(response).await?.json().await.map_err(offline)?;
    Ok(info["email"].as_str().ok_or("Google didn't say which account signed in")?.into())
}

#[cfg(test)]
mod tests {
    use super::super::fake_http::{Reply, Server};
    use super::super::oauth::{Grant, OAuthClient, Service};
    use super::*;
    use base64::engine::general_purpose::URL_SAFE_NO_PAD;
    use base64::Engine;
    use serde_json::json;
    use sha2::{Digest, Sha256};
    use std::collections::HashMap;
    use std::sync::Mutex;
    use tauri::async_runtime::{block_on, spawn};

    struct Google {
        service: Service,
        userinfo: String,
        forms: Arc<Mutex<Vec<HashMap<String, String>>>>,
    }

    fn google() -> Google {
        let forms: Arc<Mutex<Vec<HashMap<String, String>>>> = Arc::default();
        let server = {
            let forms = forms.clone();
            Server::start(move |request| match request.path.as_str() {
                "/token" => {
                    let form: HashMap<String, String> = request.form().into_iter().collect();
                    forms.lock().unwrap().push(form.clone());
                    let granted = |scope: Option<&str>| {
                        let mut grant = json!({ "access_token": "first", "refresh_token": "refresh", "expires_in": 3599, "id_token": "x.y.z" });
                        if let Some(scope) = scope {
                            grant["scope"] = scope.into();
                        }
                        Reply::json(200, grant)
                    };
                    match form.get("code").map(String::as_str) {
                        Some("the-code") => granted(None),
                        Some("no-drive") => granted(Some("openid https://www.googleapis.com/auth/userinfo.email")),
                        Some("drive") => granted(Some(
                            "https://www.googleapis.com/auth/drive.appdata openid https://www.googleapis.com/auth/userinfo.email",
                        )),
                        _ => Reply::json(400, json!({ "error": "invalid_grant" })),
                    }
                }
                "/userinfo" if request.header("authorization") == Some("Bearer first") => {
                    Reply::json(200, json!({ "sub": "1", "email": "player@example.com" }))
                }
                _ => Reply::status(404),
            })
        };
        let service = Service {
            client: OAuthClient { id: "client-id".into(), secret: Some("client-secret".into()) },
            authorize: format!("{}/auth", server.url),
            token: format!("{}/token", server.url),
            ..service()
        };
        Google { service, userinfo: format!("{}/userinfo", server.url), forms }
    }

    fn params(url: &str) -> HashMap<String, String> {
        url::Url::parse(url).unwrap().query_pairs().into_owned().collect()
    }

    fn signed_in(google: &Google, code: &'static str) -> Result<Grant, Error> {
        let sign_in = block_on(start(&google.service)).unwrap();
        let asked = params(&sign_in.url);
        let redirect = format!("{}/?state={}&code={code}", asked["redirect_uri"], asked["state"]);
        let browser = spawn(async move { http().get(redirect).send().await.unwrap().status() });
        let grant = block_on(sign_in.finish(&http(), &google.service));
        block_on(browser).unwrap();
        allowed(grant?)
    }

    #[test]
    fn refuses_a_sign_in_that_leaves_out_drive() {
        let google = google();

        assert_eq!(
            signed_in(&google, "no-drive").err(),
            Some(Error::Failed(
                "pkhemu needs access to its folder in your Google Drive. Sign in again and allow it.".into()
            ))
        );
        assert_eq!(signed_in(&google, "drive").unwrap().access_token, "first");
        assert_eq!(signed_in(&google, "the-code").unwrap().access_token, "first");
    }

    #[test]
    fn sync_is_available_only_with_a_client_id() {
        assert!(!available(""));
        assert!(available("1234-abc.apps.googleusercontent.com"));
    }

    #[test]
    fn signs_in_through_the_browser_with_pkce() {
        let google = google();
        let sign_in = block_on(start(&google.service)).unwrap();
        let asked = params(&sign_in.url);
        let (redirect, state) = (asked["redirect_uri"].clone(), asked["state"].clone());
        let browser = spawn(async move {
            let http = http();
            let stray = http.get(format!("{redirect}/favicon.ico")).send().await.unwrap().status();
            let forged = http.get(format!("{redirect}/?state=forged&code=stolen")).send().await.unwrap().status();
            let page = http.get(format!("{redirect}/?state={state}&code=the-code")).send().await.unwrap();
            (stray, forged, page.text().await.unwrap())
        });

        let grant = block_on(sign_in.finish(&http(), &google.service)).unwrap();
        let (stray, forged, page) = block_on(browser).unwrap();

        assert!(asked["redirect_uri"].starts_with("http://127.0.0.1:"));
        assert_eq!(asked["client_id"], "client-id");
        assert_eq!(asked["response_type"], "code");
        assert_eq!(asked["scope"], "openid email https://www.googleapis.com/auth/drive.appdata");
        assert_eq!(asked["code_challenge_method"], "S256");
        assert_eq!(asked["access_type"], "offline");
        assert_eq!((stray.as_u16(), forged.as_u16()), (404, 404));
        assert!(page.contains("Signed in"));
        let form = &google.forms.lock().unwrap()[0];
        assert_eq!(form["code"], "the-code");
        assert_eq!(form["client_id"], "client-id");
        assert_eq!(form["client_secret"], "client-secret");
        assert_eq!(form["redirect_uri"], asked["redirect_uri"]);
        assert_eq!(URL_SAFE_NO_PAD.encode(Sha256::digest(form["code_verifier"].as_bytes())), asked["code_challenge"]);
        assert!(form["code_verifier"].len() >= 43);
        assert_eq!(grant.refresh_token.as_deref(), Some("refresh"));
        assert_eq!(block_on(account(&http(), &google.userinfo, &grant.access_token)).unwrap(), "player@example.com");
    }
}
