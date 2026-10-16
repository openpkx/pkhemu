use super::{signature, Entitlement};
use crate::plus::Build;

// App Store and from-source builds always carry both. Only a sideloading tool's Apple account can drop them.
pub fn missing() -> Vec<Entitlement> {
    if Build::current() != (Build::Unlocked { sideload: true }) {
        return Vec::new();
    }
    let executable = std::env::current_exe().and_then(std::fs::File::open);
    let missing = executable.ok().and_then(|mut file| signature::missing_memory(&mut file));
    if missing.is_none() {
        eprintln!("couldn't read the app's entitlements, so no memory notice");
    }
    missing.unwrap_or_default()
}
