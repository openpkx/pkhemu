use chrono::{Days, Local, NaiveDate};
use std::path::{Path, PathBuf};

pub(super) const DATE_FORMAT: &str = "%Y-%m-%d";
const KEPT_FOR: Days = Days::new(30);

pub fn today(root: &Path) -> PathBuf {
    root.join(Local::now().format(DATE_FORMAT).to_string())
}

pub fn free_path(dir: &Path, path: &str) -> PathBuf {
    let file = dir.join(path);
    if !file.exists() {
        return file;
    }
    let name = super::file_name(path);
    let (stem, extension) = match name.rsplit_once('.') {
        Some((stem, extension)) if !stem.is_empty() => (stem, format!(".{extension}")),
        _ => (name, String::new()),
    };
    (2..)
        .map(|n| file.with_file_name(format!("{stem} ({n}){extension}")))
        .find(|file| !file.exists())
        .expect("a free name")
}

pub fn clear_old(root: &Path) -> std::io::Result<()> {
    let entries = match std::fs::read_dir(root) {
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(()),
        entries => entries?,
    };
    let today = Local::now().date_naive();
    for entry in entries.flatten() {
        let dated = entry.file_name().to_str().and_then(|name| NaiveDate::parse_from_str(name, DATE_FORMAT).ok());
        if dated.is_some_and(|date| date + KEPT_FOR < today) {
            if let Err(e) = std::fs::remove_dir_all(entry.path()) {
                eprintln!("{}: {e}", entry.path().display());
            }
        }
    }
    Ok(())
}
