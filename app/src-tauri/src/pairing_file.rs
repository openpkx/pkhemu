#[cfg(sideload)]
pub mod commands;
#[cfg(test)]
mod tests;

use plist::Value;
use std::io::{Cursor, Write};
use std::path::{Path, PathBuf};

pub const EXTENSIONS: [&str; 2] = ["mobiledevicepairing", "plist"];

// What the idevice crate's PairingFile reads. It also reads EscrowBag and UDID when they're there.
const LOCKDOWN_KEYS: [(&str, Kind); 8] = [
    ("DeviceCertificate", Kind::Data),
    ("HostPrivateKey", Kind::Data),
    ("HostCertificate", Kind::Data),
    ("RootPrivateKey", Kind::Data),
    ("RootCertificate", Kind::Data),
    ("SystemBUID", Kind::String),
    ("HostID", Kind::String),
    ("WiFiMACAddress", Kind::String),
];

// What its RpPairingFile reads for the RemotePairing tunnel. Older lockdown-only files lack them.
const REMOTE_PAIRING_KEYS: [(&str, Kind); 3] =
    [("public_key", Kind::Data), ("private_key", Kind::Data), ("identifier", Kind::String)];

#[derive(Clone, Copy)]
enum Kind {
    Data,
    String,
}

pub fn path(data_dir: &Path) -> PathBuf {
    data_dir.join("pairing.mobiledevicepairing")
}

pub fn is_set(data_dir: &Path) -> bool {
    path(data_dir).is_file()
}

pub fn import(data_dir: &Path, name: &str, bytes: &[u8]) -> Result<(), String> {
    check(name, bytes)?;
    let mut file = tempfile::NamedTempFile::new_in(data_dir).map_err(|e| e.to_string())?;
    file.write_all(bytes).map_err(|e| e.to_string())?;
    file.persist(path(data_dir)).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn remove(data_dir: &Path) -> Result<(), String> {
    match std::fs::remove_file(path(data_dir)) {
        Err(e) if e.kind() != std::io::ErrorKind::NotFound => Err(e.to_string()),
        _ => Ok(()),
    }
}

fn check(name: &str, bytes: &[u8]) -> Result<(), String> {
    let extension = Path::new(name).extension().and_then(|extension| extension.to_str()).unwrap_or_default();
    if !EXTENSIONS.iter().any(|allowed| extension.eq_ignore_ascii_case(allowed)) {
        return Err(format!("{name} isn't a pairing file. Pick a .mobiledevicepairing or .plist file."));
    }
    let Ok(Value::Dictionary(keys)) = Value::from_reader(Cursor::new(bytes)) else {
        return Err(format!("{name} isn't a pairing file."));
    };
    let missing = |expected: &[(&'static str, Kind)]| -> Vec<&'static str> {
        expected
            .iter()
            .filter(|&&(key, kind)| match (kind, keys.get(key)) {
                (Kind::Data, Some(Value::Data(_))) | (Kind::String, Some(Value::String(_))) => false,
                _ => true,
            })
            .map(|&(key, _)| key)
            .collect()
    };
    let (lockdown, remote_pairing) = (missing(&LOCKDOWN_KEYS), missing(&REMOTE_PAIRING_KEYS));
    if lockdown.is_empty() && !remote_pairing.is_empty() {
        return Err(format!("{name} is an older pairing file. Make a new one with iloader."));
    }
    let missing = [lockdown, remote_pairing].concat();
    match missing.split_last() {
        None => Ok(()),
        Some((last, [])) => Err(format!("{name} is missing {last}.")),
        Some((last, rest)) => Err(format!("{name} is missing {} and {last}.", rest.join(", "))),
    }
}
