#[cfg_attr(target_os = "android", path = "oauth/android.rs")]
#[cfg_attr(target_os = "ios", path = "oauth/ios.rs")]
#[cfg_attr(desktop, path = "oauth/desktop.rs")]
mod platform;

pub use platform::*;

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
