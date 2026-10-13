use percent_encoding::{utf8_percent_encode, AsciiSet, NON_ALPHANUMERIC};
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Runtime};
use tauri_plugin_android_fs::{AndroidFsExt, FsUri};

use super::EXPORTS;

const UNRESERVED: &AsciiSet = &NON_ALPHANUMERIC.remove(b'-').remove(b'_').remove(b'.').remove(b'~');

fn content_uri(identifier: &str, name: &str) -> String {
    // The ExportProvider in AndroidManifest.xml, under the applicationId, which is the same string as the identifier.
    let authority = format!("{identifier}.exports");
    format!("content://{authority}/{EXPORTS}/{}", utf8_percent_encode(name, UNRESERVED))
}

fn uri<R: Runtime>(app: &AppHandle<R>, file: &Path) -> FsUri {
    let name = file.file_name().map(|name| name.to_string_lossy()).unwrap_or_default();
    FsUri::from_uri(content_uri(&app.config().identifier, &name))
}

pub async fn share_file<R: Runtime>(app: &AppHandle<R>, file: &Path) -> Result<(), String> {
    app.android_fs_async().opener().share_file(&uri(app, file)).await.map_err(|e| e.to_string())
}

pub async fn share_files<R: Runtime>(app: &AppHandle<R>, files: &[PathBuf]) -> Result<(), String> {
    let uris: Vec<FsUri> = files.iter().map(|file| uri(app, file)).collect();
    app.android_fs_async().opener().share_files(&uris).await.map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn points_the_content_uri_at_the_export_provider() {
        assert_eq!(
            content_uri("fyi.openpkx.pkhemu", "Mr. Mime ♂.pk3"),
            "content://fyi.openpkx.pkhemu.exports/exports/Mr.%20Mime%20%E2%99%82.pk3"
        );
    }
}
