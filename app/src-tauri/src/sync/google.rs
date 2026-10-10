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

#[cfg(not(target_os = "android"))]
pub use desktop::*;

#[cfg(not(target_os = "android"))]
mod desktop {
    use super::*;
    use crate::sync::oauth::{self, Grant, Loopback, OAuthClient, Refresher, Saved, Service, SignIn};

    const CLIENT_SECRET: &str = env!("PKH_EMU_GOOGLE_CLIENT_SECRET");
    const SCOPES: [&str; 3] = ["openid", "email", DRIVE_SCOPE];

    pub fn service() -> Service {
        Service {
            name: "Google Drive",
            key: "google",
            client: OAuthClient { id: CLIENT_ID.into(), secret: Some(CLIENT_SECRET.into()) },
            authorize: "https://accounts.google.com/o/oauth2/v2/auth".into(),
            token: "https://oauth2.googleapis.com/token".into(),
        }
    }

    pub async fn start(service: &Service) -> Result<SignIn, Error> {
        let scopes = SCOPES.join(" ");
        // Google only sends a refresh token on consent, and a player signing in again needs a new one.
        let params = [("scope", scopes.as_str()), ("access_type", "offline"), ("prompt", "consent")];
        SignIn::start(service, Loopback::any_port().await?, &params)
    }

    /// The player can untick Drive on Google's consent screen and still get a token.
    pub fn allowed(grant: Grant) -> Result<Grant, Error> {
        let Some(scope) = &grant.scope else { return Ok(grant) };
        let granted: Vec<&str> = scope.split_whitespace().collect();
        // Google answers `email` with its full URL.
        let has = |scope: &str| {
            granted.contains(&scope)
                || granted.contains(&format!("https://www.googleapis.com/auth/userinfo.{scope}").as_str())
        };
        match SCOPES.iter().all(|scope| has(scope)) {
            true => Ok(grant),
            false => Err(Error::Failed(
                "pkhemu needs access to its folder in your Google Drive. Sign in again and allow it.".into(),
            )),
        }
    }

    pub async fn sign_in<R: Runtime>(app: &AppHandle<R>) -> Result<Drive, Error> {
        let (http, service) = (http(), service());
        let grant = allowed(oauth::sign_in(app, start(&service).await?, &http, &service).await?)?;
        let account = account(&http, USERINFO, &grant.access_token).await?;
        Saved::new(&service, &account).save(grant.refresh_token.as_deref().unwrap_or_default())?;
        let tokens = Refresher::new(http.clone(), service.clone(), Saved::new(&service, &account), Some(grant));
        Ok(Drive::new(http, drive::API, account, Arc::new(tokens)))
    }

    pub async fn sign_out<R: Runtime>(_: &AppHandle<R>, account: &str) -> Result<(), Error> {
        Saved::new(&service(), account).forget()
    }

    pub fn reconnect<R: Runtime>(_: &AppHandle<R>, account: &str) -> Drive {
        let (http, service) = (http(), service());
        let tokens = Refresher::new(http.clone(), service.clone(), Saved::new(&service, account), None);
        Drive::new(http, drive::API, account.into(), Arc::new(tokens))
    }
}

#[cfg(target_os = "android")]
pub use android::*;

#[cfg(target_os = "android")]
mod android {
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
