#[cfg_attr(target_os = "android", path = "entitlements/android.rs")]
#[cfg_attr(target_os = "ios", path = "entitlements/ios.rs")]
#[cfg_attr(desktop, path = "entitlements/desktop.rs")]
mod platform;
#[cfg_attr(not(target_os = "ios"), allow(dead_code))]
mod signature;
#[cfg(test)]
mod tests;

use serde::Serialize;

#[derive(Serialize, Clone, Copy, Debug, PartialEq)]
#[serde(rename_all = "kebab-case")]
pub enum Entitlement {
    ExtendedVirtualAddressing,
    IncreasedMemoryLimit,
}

#[tauri::command]
pub fn missing_memory_entitlements() -> Vec<Entitlement> {
    platform::missing()
}
