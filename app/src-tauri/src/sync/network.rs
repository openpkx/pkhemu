#[cfg_attr(target_os = "android", path = "network/android.rs")]
#[cfg_attr(target_os = "ios", path = "network/ios.rs")]
#[cfg_attr(desktop, path = "network/desktop.rs")]
mod platform;

pub use platform::*;
