use super::*;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};

/// Keeps a refresh token in the keychain between runs.
pub struct Saved {
    key: String,
}

const KEYCHAIN: &str = "fyi.openpkx.pkhemu";

impl Saved {
    pub fn new(service: &Service, account: &str) -> Saved {
        Saved { key: format!("{}:{account}", service.key) }
    }

    fn entry(&self) -> Result<keyring::Entry, Error> {
        keyring::Entry::new(KEYCHAIN, &self.key).map_err(|e| Error::Failed(e.to_string()))
    }

    pub fn load(&self) -> Option<String> {
        self.entry().ok()?.get_password().ok()
    }

    pub fn save(&self, token: &str) -> Result<(), Error> {
        self.entry()?.set_password(token).map_err(|e| Error::Failed(e.to_string()))
    }

    pub fn forget(&self) -> Result<(), Error> {
        match self.entry()?.delete_credential() {
            Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
            Err(e) => Err(Error::Failed(e.to_string())),
        }
    }
}

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
