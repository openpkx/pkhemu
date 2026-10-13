#[cfg_attr(target_os = "android", path = "export/android.rs")]
#[cfg_attr(target_os = "ios", path = "export/ios.rs")]
#[cfg_attr(desktop, path = "export/desktop.rs")]
mod platform;

use crate::bytes;
use crate::files::cache_dir;
use std::path::{Path, PathBuf};
use tauri::ipc::Request;
use tauri::{AppHandle, Runtime};

const EXPORTS: &str = "exports";

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
    let files = replace(&cache_dir(&app, EXPORTS)?, &[(&name, &contents)])?;
    platform::share_file(&app, &files[0]).await
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
    let files = replace(&cache_dir(&app, EXPORTS)?, &named)?;
    platform::share_files(&app, &files).await
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
}
