use super::provider::{BoxFuture, Error};
use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use base64::Engine;
use reqwest::{Client, StatusCode};
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::sync::Arc;
use std::time::{Duration, Instant};

pub trait Tokens: Send + Sync {
    /// An access token. `refused` is one the cloud just turned down, so a new one is due.
    fn token<'a>(&'a self, refused: Option<&'a str>) -> BoxFuture<'a, Result<String, Error>>;
}

pub fn tls() -> rustls::ClientConfig {
    let roots = rustls::RootCertStore { roots: webpki_roots::TLS_SERVER_ROOTS.to_vec() };
    rustls::ClientConfig::builder_with_provider(Arc::new(rustls::crypto::ring::default_provider()))
        .with_safe_default_protocol_versions()
        .expect("ring supports the default TLS versions")
        .with_root_certificates(roots)
        .with_no_client_auth()
}

pub fn http() -> Client {
    Client::builder()
        .tls_backend_preconfigured(tls())
        // Resumable uploads answer 308 to mean "carry on", not to redirect.
        .redirect(reqwest::redirect::Policy::none())
        .connect_timeout(Duration::from_secs(15))
        .read_timeout(Duration::from_secs(60))
        .build()
        .expect("the HTTP client builds")
}

pub fn offline(e: reqwest::Error) -> Error {
    eprintln!("sync: {e}");
    Error::Offline
}

pub const SIGN_IN_WAIT: Duration = Duration::from_secs(10 * 60);

fn random() -> String {
    let mut bytes = [0u8; 32];
    getrandom::fill(&mut bytes).expect("the OS has randomness");
    URL_SAFE_NO_PAD.encode(bytes)
}

#[derive(Clone)]
pub struct OAuthClient {
    pub id: String,
    /// Only Google's desktop client has one, and Google treats it as public.
    pub secret: Option<String>,
}

#[derive(Clone)]
pub struct Service {
    /// What the player calls the cloud, as in "Sign in to Dropbox again".
    pub name: &'static str,
    /// Names the saved refresh token, with the account.
    pub key: &'static str,
    pub client: OAuthClient,
    pub authorize: String,
    pub token: String,
}

pub struct Pkce {
    verifier: String,
    state: String,
}

impl Pkce {
    pub fn new() -> Pkce {
        Pkce { verifier: random(), state: random() }
    }
}

pub struct Grant {
    pub refresh_token: Option<String>,
    pub access_token: String,
    pub expires_in: u64,
    #[cfg_attr(target_os = "android", allow(dead_code))]
    pub scope: Option<String>,
}

impl Service {
    pub fn sign_in_again(&self) -> Error {
        Error::Account(format!("Sign in to {} again", self.name))
    }

    pub fn authorize_url(&self, pkce: &Pkce, redirect: &str, params: &[(&str, &str)]) -> Result<String, Error> {
        let challenge = URL_SAFE_NO_PAD.encode(Sha256::digest(pkce.verifier.as_bytes()));
        let mut url = url::Url::parse(&self.authorize).map_err(|e| e.to_string())?;
        url.query_pairs_mut()
            .extend_pairs([
                ("client_id", self.client.id.as_str()),
                ("redirect_uri", redirect),
                ("response_type", "code"),
                ("code_challenge", &challenge),
                ("code_challenge_method", "S256"),
                ("state", &pkce.state),
            ])
            .extend_pairs(params);
        Ok(url.into())
    }

    /// The code the cloud sent back to `redirected`, or `None` if it isn't the answer to `pkce`'s sign-in.
    pub fn code(&self, pkce: &Pkce, redirected: &url::Url) -> Option<Result<String, Error>> {
        let param =
            |name: &str| redirected.query_pairs().find(|(key, _)| key == name).map(|(_, value)| value.into_owned());
        if param("state").as_deref() != Some(pkce.state.as_str()) {
            return None;
        }
        Some(param("code").ok_or_else(|| Error::Failed(format!("{} sign-in was cancelled", self.name))))
    }

    async fn grant(&self, http: &Client, mut form: Vec<(&str, &str)>) -> Result<Grant, Error> {
        form.push(("client_id", &self.client.id));
        if let Some(secret) = &self.client.secret {
            form.push(("client_secret", secret));
        }
        let response = http.post(&self.token).form(&form).send().await.map_err(offline)?;
        let status = response.status();
        let body = response.text().await.map_err(offline)?;
        let granted: Value = serde_json::from_str(&body).unwrap_or_default();
        if status == StatusCode::BAD_REQUEST || status == StatusCode::UNAUTHORIZED {
            return Err(self.sign_in_again());
        }
        if status == StatusCode::TOO_MANY_REQUESTS || status.is_server_error() {
            return Err(Error::SlowDown(None));
        }
        if !status.is_success() {
            return Err(Error::Failed(format!("{} answered {status}: {body}", self.name)));
        }
        let access_token =
            granted["access_token"].as_str().ok_or_else(|| format!("{} sent no access token", self.name))?;
        Ok(Grant {
            refresh_token: granted["refresh_token"].as_str().map(String::from),
            access_token: access_token.into(),
            expires_in: granted["expires_in"].as_u64().unwrap_or(0),
            scope: granted["scope"].as_str().map(String::from),
        })
    }

    pub async fn exchange(&self, http: &Client, pkce: &Pkce, code: &str, redirect: &str) -> Result<Grant, Error> {
        let form = vec![
            ("grant_type", "authorization_code"),
            ("code", code),
            ("code_verifier", &pkce.verifier),
            ("redirect_uri", redirect),
        ];
        let grant = self.grant(http, form).await?;
        if grant.refresh_token.is_none() {
            return Err(Error::Failed(format!("{} sent no refresh token", self.name)));
        }
        Ok(grant)
    }
}

/// Where a refresh token waits between runs: the keychain on desktop, and the app's private storage on Android.
pub struct Saved {
    key: String,
    #[cfg(target_os = "android")]
    dir: std::path::PathBuf,
}

#[cfg(not(target_os = "android"))]
const KEYCHAIN: &str = "fyi.openpkx.pkhemu";

impl Saved {
    #[cfg(not(target_os = "android"))]
    pub fn new(service: &Service, account: &str) -> Saved {
        Saved { key: format!("{}:{account}", service.key) }
    }

    #[cfg(target_os = "android")]
    pub fn new(dir: &std::path::Path, service: &Service, _account: &str) -> Saved {
        Saved { key: service.key.into(), dir: dir.into() }
    }

    #[cfg(not(target_os = "android"))]
    fn entry(&self) -> Result<keyring::Entry, Error> {
        keyring::Entry::new(KEYCHAIN, &self.key).map_err(|e| Error::Failed(e.to_string()))
    }

    #[cfg(not(target_os = "android"))]
    pub fn load(&self) -> Option<String> {
        self.entry().ok()?.get_password().ok()
    }

    #[cfg(not(target_os = "android"))]
    pub fn save(&self, token: &str) -> Result<(), Error> {
        self.entry()?.set_password(token).map_err(|e| Error::Failed(e.to_string()))
    }

    #[cfg(not(target_os = "android"))]
    pub fn forget(&self) -> Result<(), Error> {
        match self.entry()?.delete_credential() {
            Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
            Err(e) => Err(Error::Failed(e.to_string())),
        }
    }

    #[cfg(target_os = "android")]
    fn path(&self) -> std::path::PathBuf {
        self.dir.join(format!("sync-{}.token", self.key))
    }

    #[cfg(target_os = "android")]
    pub fn load(&self) -> Option<String> {
        std::fs::read_to_string(self.path()).ok()
    }

    #[cfg(target_os = "android")]
    pub fn save(&self, token: &str) -> Result<(), Error> {
        std::fs::write(self.path(), token).map_err(|e| Error::Failed(e.to_string()))
    }

    #[cfg(target_os = "android")]
    pub fn forget(&self) -> Result<(), Error> {
        match std::fs::remove_file(self.path()) {
            Err(e) if e.kind() != std::io::ErrorKind::NotFound => Err(Error::Failed(e.to_string())),
            _ => Ok(()),
        }
    }
}

pub struct Refresher {
    http: Client,
    service: Service,
    saved: Saved,
    refresh_token: std::sync::Mutex<Option<String>>,
    access: tokio::sync::Mutex<Option<(String, Instant)>>,
}

fn expiry(expires_in: u64) -> Instant {
    Instant::now() + Duration::from_secs(expires_in.saturating_sub(60))
}

impl Refresher {
    /// Without a grant, the first request reads the saved refresh token, so a keychain prompt waits for a sync.
    pub fn new(http: Client, service: Service, saved: Saved, grant: Option<Grant>) -> Refresher {
        let (refresh_token, access) = match grant {
            Some(grant) => (grant.refresh_token, Some((grant.access_token, expiry(grant.expires_in)))),
            None => (None, None),
        };
        Refresher {
            http,
            service,
            saved,
            refresh_token: std::sync::Mutex::new(refresh_token),
            access: tokio::sync::Mutex::new(access),
        }
    }

    fn refresh_token(&self) -> Result<String, Error> {
        let mut known = self.refresh_token.lock().unwrap_or_else(|e| e.into_inner());
        if known.is_none() {
            *known = Some(self.saved.load().ok_or_else(|| self.service.sign_in_again())?);
        }
        Ok(known.clone().unwrap_or_default())
    }

    async fn fresh(&self, refused: Option<&str>) -> Result<String, Error> {
        let mut access = self.access.lock().await;
        if let Some((token, until)) = &*access {
            if Some(token.as_str()) != refused && Instant::now() < *until {
                return Ok(token.clone());
            }
        }
        let refresh_token = self.refresh_token()?;
        let grant = self
            .service
            .grant(&self.http, vec![("grant_type", "refresh_token"), ("refresh_token", &refresh_token)])
            .await?;
        *access = Some((grant.access_token.clone(), expiry(grant.expires_in)));
        Ok(grant.access_token)
    }
}

impl Tokens for Refresher {
    fn token<'a>(&'a self, refused: Option<&'a str>) -> BoxFuture<'a, Result<String, Error>> {
        Box::pin(self.fresh(refused))
    }
}

#[cfg(not(target_os = "android"))]
pub use desktop::*;

#[cfg(not(target_os = "android"))]
mod desktop {
    use super::*;
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    use tokio::net::{TcpListener, TcpStream};

    fn page(text: &str) -> String {
        let body = format!("<!doctype html><meta charset=\"utf-8\"><title>pkhemu</title><p style=\"font-family: sans-serif\">{text}</p>");
        format!("HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}", body.len())
    }

    async fn request_target(stream: &mut TcpStream) -> Option<String> {
        let mut head = Vec::new();
        let mut buf = [0u8; 1024];
        while !head.windows(4).any(|window| window == b"\r\n\r\n") && head.len() < 16 * 1024 {
            let read = stream.read(&mut buf).await.ok()?;
            if read == 0 {
                break;
            }
            head.extend_from_slice(&buf[..read]);
        }
        let line = String::from_utf8_lossy(&head).lines().next()?.to_string();
        line.split_whitespace().nth(1).map(String::from)
    }

    pub struct Loopback {
        listener: TcpListener,
        pub redirect: String,
    }

    impl Loopback {
        pub async fn any_port() -> Result<Loopback, Error> {
            let listener = TcpListener::bind("127.0.0.1:0").await.map_err(|e| e.to_string())?;
            let redirect = format!("http://127.0.0.1:{}", listener.local_addr().map_err(|e| e.to_string())?.port());
            Ok(Loopback { listener, redirect })
        }

        /// For a cloud that only takes the redirects registered with it, port included.
        pub async fn first_free(ports: &[u16]) -> Result<Loopback, Error> {
            for port in ports {
                if let Ok(listener) = TcpListener::bind(("127.0.0.1", *port)).await {
                    let redirect =
                        format!("http://localhost:{}", listener.local_addr().map_err(|e| e.to_string())?.port());
                    return Ok(Loopback { listener, redirect });
                }
            }
            Err(Error::Failed(format!(
                "Another app is using ports {ports:?}, which sign-in needs. Close it and try again"
            )))
        }
    }

    pub struct SignIn {
        loopback: Loopback,
        pkce: Pkce,
        pub url: String,
    }

    impl SignIn {
        pub fn start(service: &Service, loopback: Loopback, params: &[(&str, &str)]) -> Result<SignIn, Error> {
            let pkce = Pkce::new();
            let url = service.authorize_url(&pkce, &loopback.redirect, params)?;
            Ok(SignIn { loopback, pkce, url })
        }

        async fn code(&self, service: &Service) -> Result<String, Error> {
            loop {
                let (mut stream, _) = self.loopback.listener.accept().await.map_err(|e| e.to_string())?;
                let Some(target) = request_target(&mut stream).await else { continue };
                let Ok(url) = url::Url::parse(&format!("http://127.0.0.1{target}")) else { continue };
                let Some(code) = service.code(&self.pkce, &url) else {
                    let _ = stream
                        .write_all(b"HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n")
                        .await;
                    continue;
                };
                let text = match code {
                    Ok(_) => "Signed in. You can close this tab and go back to pkhemu.",
                    Err(_) => "Sign-in didn't finish. Close this tab and try again in pkhemu.",
                };
                let _ = stream.write_all(page(text).as_bytes()).await;
                return code;
            }
        }

        pub async fn finish(self, http: &Client, service: &Service) -> Result<Grant, Error> {
            let code = self.code(service).await?;
            service.exchange(http, &self.pkce, &code, &self.loopback.redirect).await
        }
    }

    pub async fn sign_in<R: tauri::Runtime>(
        app: &tauri::AppHandle<R>,
        sign_in: SignIn,
        http: &Client,
        service: &Service,
    ) -> Result<Grant, Error> {
        use tauri_plugin_opener::OpenerExt;
        app.opener().open_url(&sign_in.url, None::<&str>).map_err(|e| e.to_string())?;
        tokio::time::timeout(SIGN_IN_WAIT, sign_in.finish(http, service))
            .await
            .map_err(|_| Error::Failed("Sign-in timed out".into()))?
    }
}

#[cfg(target_os = "android")]
pub use android::*;

#[cfg(target_os = "android")]
mod android {
    use super::*;
    use serde::Deserialize;
    use serde_json::json;
    use tauri::plugin::{Builder, PluginHandle, TauriPlugin};
    use tauri::{AppHandle, Manager, Runtime};

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
}

#[cfg(test)]
mod tests {
    use super::super::fake_http::{Reply, Server};
    use super::*;
    use serde_json::json;
    use std::collections::HashMap;
    use std::sync::Mutex;
    use tauri::async_runtime::block_on;

    type Forms = Arc<Mutex<Vec<HashMap<String, String>>>>;

    fn token_server() -> (Service, Forms) {
        let forms: Forms = Arc::default();
        let server = {
            let forms = forms.clone();
            Server::start(move |request| {
                let form: HashMap<String, String> = request.form().into_iter().collect();
                forms.lock().unwrap().push(form.clone());
                match form.get("refresh_token").map(String::as_str) {
                    Some("refresh") => Reply::json(200, json!({ "access_token": "refreshed", "expires_in": 14400 })),
                    _ => Reply::json(400, json!({ "error": "invalid_grant" })),
                }
            })
        };
        let service = Service {
            name: "Dropbox",
            key: "dropbox",
            client: OAuthClient { id: "app-key".into(), secret: None },
            authorize: format!("{}/authorize", server.url),
            token: format!("{}/token", server.url),
        };
        (service, forms)
    }

    fn refresher(service: Service, refresh_token: &str, access_token: Option<&str>) -> Refresher {
        let saved = Saved::new(&service, "player@example.com");
        let grant = Grant {
            refresh_token: Some(refresh_token.into()),
            access_token: access_token.unwrap_or_default().into(),
            expires_in: if access_token.is_some() { 14400 } else { 0 },
            scope: None,
        };
        Refresher::new(http(), service, saved, Some(grant))
    }

    #[test]
    fn refreshes_the_access_token_only_when_the_cloud_refuses_it() {
        let (service, forms) = token_server();
        let tokens = refresher(service, "refresh", Some("first"));

        let kept = block_on(tokens.token(None)).unwrap();
        let refreshed = block_on(tokens.token(Some("first"))).unwrap();
        let again = block_on(tokens.token(None)).unwrap();

        assert_eq!((kept.as_str(), refreshed.as_str(), again.as_str()), ("first", "refreshed", "refreshed"));
        let forms = forms.lock().unwrap();
        assert_eq!(forms.len(), 1);
        assert_eq!(forms[0]["grant_type"], "refresh_token");
        assert_eq!(forms[0]["client_id"], "app-key");
        assert!(!forms[0].contains_key("client_secret"));
    }

    #[test]
    fn a_revoked_sign_in_asks_the_player_to_sign_in_again() {
        let (service, _) = token_server();
        let tokens = refresher(service, "revoked", None);

        assert_eq!(block_on(tokens.token(None)), Err(Error::Account("Sign in to Dropbox again".into())));
    }
}
