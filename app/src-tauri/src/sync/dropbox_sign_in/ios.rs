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

pub(super) fn saved<R: Runtime>(_: &AppHandle<R>, service: &Service, account: &str) -> Result<Saved, Error> {
    Ok(Saved::new(service, account))
}
