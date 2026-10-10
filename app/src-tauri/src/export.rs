use crate::bytes;
use crate::files::cache_dir;
use percent_encoding::{utf8_percent_encode, AsciiSet, NON_ALPHANUMERIC};
use std::path::{Path, PathBuf};
use tauri::ipc::Request;
use tauri::{AppHandle, Runtime};
use tauri_plugin_android_fs::{AndroidFsExt, FsUri};

const EXPORTS: &str = "exports";
const UNRESERVED: &AsciiSet = &NON_ALPHANUMERIC
    .remove(b'-')
    .remove(b'_')
    .remove(b'.')
    .remove(b'~');

fn replace(root: &Path, files: &[(&str, &[u8])]) -> Result<Vec<PathBuf>, String> {
    for (name, _) in files {
        let valid = !name.is_empty()
            && !name.starts_with('.')
            && !name
                .chars()
                .any(|c| c.is_control() || c == '/' || c == '\\');
        if !valid {
            return Err(format!("{name}: not a file name"));
        }
    }
    match std::fs::remove_dir_all(root) {
        Err(e) if e.kind() != std::io::ErrorKind::NotFound => return Err(e.to_string()),
        _ => {}
    }
    std::fs::create_dir_all(root).map_err(|e| e.to_string())?;
    let mut written = Vec::with_capacity(files.len());
    for (name, contents) in files {
        let file = root.join(name);
        std::fs::write(&file, contents).map_err(|e| format!("{name}: {e}"))?;
        written.push(file);
    }
    Ok(written)
}

fn content_uri(identifier: &str, name: &str) -> String {
    // The ExportProvider in AndroidManifest.xml, under the applicationId, which is the same string as the identifier.
    let authority = format!("{identifier}.exports");
    format!(
        "content://{authority}/{EXPORTS}/{}",
        utf8_percent_encode(name, UNRESERVED)
    )
}

#[tauri::command]
pub async fn export_share<R: Runtime>(
    app: AppHandle<R>,
    request: Request<'_>,
) -> Result<(), String> {
    let contents = bytes(request.body())?;
    let name = request
        .headers()
        .get("name")
        .and_then(|value| value.to_str().ok())
        .and_then(|value| {
            percent_encoding::percent_decode_str(value)
                .decode_utf8()
                .ok()
        })
        .ok_or("name the file in a name header")?;
    replace(&cache_dir(&app, EXPORTS)?, &[(&name, &contents)])?;
    let uri = FsUri::from_uri(content_uri(&app.config().identifier, &name));
    app.android_fs_async()
        .opener()
        .share_file(&uri)
        .await
        .map_err(|e| e.to_string())
}

#[derive(serde::Deserialize)]
pub struct Exported {
    name: String,
    bytes: Vec<u8>,
}

#[tauri::command]
pub async fn export_share_files<R: Runtime>(
    app: AppHandle<R>,
    files: Vec<Exported>,
) -> Result<(), String> {
    let named: Vec<(&str, &[u8])> = files
        .iter()
        .map(|file| (file.name.as_str(), file.bytes.as_slice()))
        .collect();
    replace(&cache_dir(&app, EXPORTS)?, &named)?;
    let uris: Vec<FsUri> = files
        .iter()
        .map(|file| FsUri::from_uri(content_uri(&app.config().identifier, &file.name)))
        .collect();
    app.android_fs_async()
        .opener()
        .share_files(&uris)
        .await
        .map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_root(name: &str) -> PathBuf {
        let root =
            std::env::temp_dir().join(format!("pkh-emu-exports-{name}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        root
    }

    #[test]
    fn writes_the_file_under_its_name() {
        let root = temp_root("write");

        let files = replace(&root, &[("Pikachu.pk3", &[1, 2, 3])]).unwrap();

        assert_eq!(files, [root.join("Pikachu.pk3")]);
        assert_eq!(std::fs::read(&files[0]).unwrap(), vec![1, 2, 3]);
    }

    #[test]
    fn writes_every_file_of_an_export() {
        let root = temp_root("write-all");

        replace(&root, &[("Stadium.fla", &[1]), ("Stadium.mpk", &[2])]).unwrap();

        assert_eq!(std::fs::read(root.join("Stadium.fla")).unwrap(), vec![1]);
        assert_eq!(std::fs::read(root.join("Stadium.mpk")).unwrap(), vec![2]);
    }

    #[test]
    fn removes_the_previous_file() {
        let root = temp_root("replace");
        replace(&root, &[("Pikachu.pk3", &[1])]).unwrap();

        replace(&root, &[("Mew.pk3", &[2])]).unwrap();

        let names: Vec<_> = std::fs::read_dir(&root)
            .unwrap()
            .map(|entry| entry.unwrap().file_name())
            .collect();
        assert_eq!(names, vec!["Mew.pk3"]);
    }

    #[test]
    fn refuses_names_outside_the_folder() {
        let root = temp_root("refuse");

        for name in ["", "../Pikachu.pk3", "a/Pikachu.pk3", ".pk3"] {
            assert!(replace(&root, &[("Mew.pk3", &[1]), (name, &[1])]).is_err(), "{name}");
        }
    }

    #[test]
    fn points_the_content_uri_at_the_export_provider() {
        assert_eq!(
            content_uri("fyi.openpkx.pkhemu", "Mr. Mime ♂.pk3"),
            "content://fyi.openpkx.pkhemu.exports/exports/Mr.%20Mime%20%E2%99%82.pk3"
        );
    }
}
