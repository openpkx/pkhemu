use std::fs::File;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager, Runtime};
use tauri_plugin_android_fs::{AndroidFsExt, FsUri};

pub fn write_file(file: &Path, contents: &[u8]) -> std::io::Result<()> {
    if let Some(parent) = file.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let mut partial = file.as_os_str().to_owned();
    partial.push(".partial");
    std::fs::write(&partial, contents)?;
    std::fs::rename(&partial, file)
}

pub fn cache_dir<R: Runtime>(app: &AppHandle<R>, name: &str) -> Result<PathBuf, String> {
    Ok(app.path().app_cache_dir().map_err(|e| e.to_string())?.join(name))
}

pub async fn open_picked<R: Runtime>(app: &AppHandle<R>, file: &str) -> Result<File, String> {
    match FsUri::from_json_str(file) {
        Ok(uri) => app.android_fs_async().open_file_readable(&uri).await.map_err(|e| e.to_string()),
        Err(_) => File::open(file).map_err(|e| format!("{file}: {e}")),
    }
}

/// Deletes the sprites earlier versions downloaded, which game art replaced.
pub fn remove_old_sprites(cache: &Path) {
    let sprites = cache.join("sprites");
    if let Err(e) = std::fs::remove_dir_all(&sprites) {
        if e.kind() != std::io::ErrorKind::NotFound {
            eprintln!("removing {}: {e}", sprites.display());
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_root(name: &str) -> PathBuf {
        let root = std::env::temp_dir().join(format!("pkh-emu-files-{name}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        root
    }

    #[test]
    fn writes_a_file_and_its_folders_without_leaving_the_partial_file() {
        let file = temp_root("write").join("a/b.png");

        write_file(&file, b"png").unwrap();

        assert_eq!(std::fs::read(&file).unwrap(), b"png");
        assert!(!file.with_extension("png.partial").exists());
    }

    #[test]
    fn removes_old_sprites_and_keeps_the_rest_of_the_cache() {
        let cache = temp_root("old-sprites");
        write_file(&cache.join("sprites/pokemon/25.png"), b"png").unwrap();
        write_file(&cache.join("box-art/gba/game.png"), b"png").unwrap();

        remove_old_sprites(&cache);
        remove_old_sprites(&cache);

        assert!(!cache.join("sprites").exists());
        assert!(cache.join("box-art/gba/game.png").exists());
    }
}
