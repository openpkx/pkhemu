#[cfg_attr(target_os = "android", path = "system_bars/android.rs")]
#[cfg_attr(target_os = "ios", path = "system_bars/ios.rs")]
#[cfg_attr(desktop, path = "system_bars/desktop.rs")]
pub mod platform;
