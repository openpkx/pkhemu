use super::Vault;
use std::path::{Path, PathBuf};

pub struct Keychain {
    dir: PathBuf,
}

impl Keychain {
    pub fn new(dir: &Path) -> Keychain {
        Keychain { dir: dir.into() }
    }

    fn path(&self, user: &str) -> PathBuf {
        self.dir.join(format!("retroachievements-{user}.token"))
    }
}

impl Vault for Keychain {
    fn load(&self, user: &str) -> Option<String> {
        std::fs::read_to_string(self.path(user)).ok()
    }

    fn save(&self, user: &str, token: &str) -> Result<(), String> {
        std::fs::write(self.path(user), token).map_err(|e| e.to_string())
    }

    fn forget(&self, user: &str) -> Result<(), String> {
        match std::fs::remove_file(self.path(user)) {
            Err(e) if e.kind() != std::io::ErrorKind::NotFound => Err(e.to_string()),
            _ => Ok(()),
        }
    }
}
