#[cfg_attr(target_os = "android", path = "app_update/android.rs")]
#[cfg_attr(target_os = "ios", path = "app_update/ios.rs")]
#[cfg_attr(desktop, path = "app_update/desktop.rs")]
pub mod platform;

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Default, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Check {
    available: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    version_code: Option<i64>,
    downloaded: bool,
}
