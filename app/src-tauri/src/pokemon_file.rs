#[cfg_attr(target_os = "android", path = "pokemon_file/android.rs")]
#[cfg_attr(target_os = "ios", path = "pokemon_file/ios.rs")]
#[cfg_attr(desktop, path = "pokemon_file/desktop.rs")]
pub mod platform;

#[derive(serde::Serialize)]
pub struct PickedFile {
    name: String,
    bytes: Vec<u8>,
}
