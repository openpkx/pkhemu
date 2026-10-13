#[cfg_attr(target_os = "android", path = "files/android.rs")]
#[cfg_attr(target_os = "ios", path = "files/ios.rs")]
#[cfg_attr(desktop, path = "files/desktop.rs")]
mod platform;

use std::fs::File;
use std::io::{Read, Seek, SeekFrom};
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager, Runtime};

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

/// Access to a file or folder the player picked, held until it's dropped.
#[derive(Default)]
pub struct Reading(Option<Box<dyn FnOnce() + Send>>);

impl Reading {
    #[cfg_attr(not(target_os = "ios"), allow(dead_code))]
    pub fn until(stop: impl FnOnce() + Send + 'static) -> Self {
        Self(Some(Box::new(stop)))
    }
}

impl Drop for Reading {
    fn drop(&mut self) {
        if let Some(stop) = self.0.take() {
            stop();
        }
    }
}

pub async fn reading<R: Runtime>(app: &AppHandle<R>, path: &str) -> Result<Reading, String> {
    platform::reading(app, path).await
}

pub struct PickedFile {
    file: File,
    _reading: Reading,
}

impl PickedFile {
    pub fn new(file: File, reading: Reading) -> Self {
        Self { file, _reading: reading }
    }

    #[cfg_attr(not(target_os = "ios"), allow(dead_code))]
    pub fn metadata(&self) -> std::io::Result<std::fs::Metadata> {
        self.file.metadata()
    }
}

impl Read for PickedFile {
    fn read(&mut self, buf: &mut [u8]) -> std::io::Result<usize> {
        self.file.read(buf)
    }
}

impl Seek for PickedFile {
    fn seek(&mut self, pos: SeekFrom) -> std::io::Result<u64> {
        self.file.seek(pos)
    }
}

pub async fn open_picked<R: Runtime>(app: &AppHandle<R>, file: &str) -> Result<PickedFile, String> {
    let reading = reading(app, file).await?;
    Ok(PickedFile::new(platform::open_picked(app, file).await?, reading))
}

fn open_path(file: &str) -> Result<File, String> {
    File::open(file).map_err(|e| format!("{file}: {e}"))
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
