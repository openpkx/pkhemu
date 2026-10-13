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
