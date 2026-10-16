use super::Vault;
use std::path::Path;

const KEYCHAIN: &str = "fyi.openpkx.pkhemu";

pub struct Keychain;

impl Keychain {
    pub fn new(_dir: &Path) -> Keychain {
        Keychain
    }

    fn entry(user: &str) -> Result<keyring::Entry, String> {
        keyring::Entry::new(KEYCHAIN, &format!("retroachievements:{user}")).map_err(|e| e.to_string())
    }
}

impl Vault for Keychain {
    fn load(&self, user: &str) -> Option<String> {
        Keychain::entry(user).ok()?.get_password().ok()
    }

    fn save(&self, user: &str, token: &str) -> Result<(), String> {
        Keychain::entry(user)?.set_password(token).map_err(|e| e.to_string())
    }

    fn forget(&self, user: &str) -> Result<(), String> {
        match Keychain::entry(user)?.delete_credential() {
            Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
            Err(e) => Err(e.to_string()),
        }
    }
}
