use crate::files::write_file;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::time::SystemTime;
use tauri::{AppHandle, Manager, Runtime};

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct StoredCopy {
    pub identity_key: String,
    pub generation: u8,
    pub game: String,
    pub bytes: Vec<u8>,
    #[serde(default)]
    pub aliases: Vec<String>,
    #[serde(default)]
    pub ambiguous: bool,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CopyFile {
    #[serde(default)]
    identity_key: Option<String>,
    generation: u8,
    game: String,
    bytes: Vec<u8>,
    #[serde(default)]
    aliases: Vec<String>,
    #[serde(default)]
    ambiguous: bool,
}

pub fn marker(key: &str) -> StoredCopy {
    StoredCopy {
        identity_key: key.into(),
        generation: 0,
        game: String::new(),
        bytes: Vec::new(),
        aliases: Vec::new(),
        ambiguous: true,
    }
}

pub fn clash(key: &str, a: &StoredCopy, b: &StoredCopy) -> Option<StoredCopy> {
    (a.ambiguous || b.ambiguous || a.identity_key != b.identity_key).then(|| marker(key))
}

pub fn holds(key: &str, copy: &StoredCopy) -> bool {
    copy.identity_key == key || copy.aliases.iter().any(|alias| alias == key)
}

fn is_key(key: &str) -> bool {
    !key.is_empty() && key.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
}

fn file(root: &Path, key: &str) -> Result<PathBuf, String> {
    if !is_key(key) {
        return Err(format!("{key}: not an identity key"));
    }
    Ok(root.join(format!("{key}.json")))
}

pub fn read(root: &Path, key: &str) -> Result<Option<StoredCopy>, String> {
    let contents = match std::fs::read(file(root, key)?) {
        Ok(contents) => contents,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(e) => return Err(format!("{key}: {e}")),
    };
    let CopyFile { identity_key, generation, game, bytes, aliases, ambiguous } =
        serde_json::from_slice(&contents).map_err(|e| format!("{key}: {e}"))?;
    let identity_key = identity_key.unwrap_or_else(|| key.into());
    Ok(Some(StoredCopy { identity_key, generation, game, bytes, aliases, ambiguous }))
}

pub fn read_all(root: &Path, keys: &[String]) -> Result<Vec<StoredCopy>, String> {
    keys.iter().filter_map(|key| read(root, key).transpose()).collect()
}

pub fn stored(root: &Path) -> Result<Vec<(String, StoredCopy, SystemTime)>, String> {
    let entries = match std::fs::read_dir(root) {
        Ok(entries) => entries,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(Vec::new()),
        Err(e) => return Err(format!("{}: {e}", root.display())),
    };
    let mut copies = Vec::new();
    for entry in entries {
        let entry = entry.map_err(|e| format!("{}: {e}", root.display()))?;
        let name = entry.file_name();
        let Some(key) = name.to_str().and_then(|name| name.strip_suffix(".json")).filter(|key| is_key(key)) else {
            continue;
        };
        let modified = entry.metadata().and_then(|metadata| metadata.modified()).map_err(|e| format!("{key}: {e}"));
        match (read(root, key), modified) {
            (Ok(Some(copy)), Ok(modified)) => copies.push((key.to_string(), copy, modified)),
            (Ok(None), _) => {}
            (Err(e), _) | (_, Err(e)) => eprintln!("kept copy {e}"),
        }
    }
    Ok(copies)
}

pub fn write(root: &Path, key: &str, copy: &StoredCopy) -> Result<(), String> {
    let StoredCopy { identity_key, generation, game, bytes, aliases, ambiguous } = copy.clone();
    let contents =
        serde_json::to_vec(&CopyFile { identity_key: Some(identity_key), generation, game, bytes, aliases, ambiguous })
            .map_err(|e| e.to_string())?;
    write_file(&file(root, key)?, &contents).map_err(|e| format!("{key}: {e}"))
}

pub fn keep(root: &Path, copies: Vec<StoredCopy>) -> Result<(), String> {
    for copy in copies {
        let kept = read(root, &copy.identity_key)?.filter(|kept| !kept.ambiguous);
        let mut newest = match &kept {
            Some(kept) if kept.generation > copy.generation => kept.clone(),
            _ => copy.clone(),
        };
        for alias in kept.iter().flat_map(|kept| &kept.aliases).chain(&copy.aliases) {
            if !newest.aliases.contains(alias) {
                newest.aliases.push(alias.clone());
            }
        }
        for key in std::iter::once(&newest.identity_key).chain(&newest.aliases) {
            let next = match read(root, key)? {
                None => newest.clone(),
                Some(kept) => match clash(key, &kept, &newest) {
                    Some(_) if kept.ambiguous => continue,
                    Some(marker) => marker,
                    None if kept.generation > newest.generation => continue,
                    None => newest.clone(),
                },
            };
            write(root, key, &next)?;
        }
    }
    Ok(())
}

pub fn dir(data_dir: &Path) -> PathBuf {
    data_dir.join("kept-copies")
}

fn root<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    Ok(dir(&app.path().app_data_dir().map_err(|e| e.to_string())?))
}

#[tauri::command]
pub async fn kept_copies<R: Runtime>(app: AppHandle<R>, keys: Vec<String>) -> Result<Vec<StoredCopy>, String> {
    read_all(&root(&app)?, &keys)
}

#[tauri::command]
pub async fn keep_copies<R: Runtime>(app: AppHandle<R>, copies: Vec<StoredCopy>) -> Result<(), String> {
    keep(&root(&app)?, copies)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_root(name: &str) -> PathBuf {
        let root = std::env::temp_dir().join(format!("pkh-emu-kept-copies-{name}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        root
    }

    fn copy(key: &str, generation: u8, game: &str) -> StoredCopy {
        StoredCopy {
            identity_key: key.into(),
            generation,
            game: game.into(),
            bytes: vec![generation, 1, 2],
            aliases: Vec::new(),
            ambiguous: false,
        }
    }

    fn copy_as(key: &str, alias: &str, generation: u8, game: &str) -> StoredCopy {
        StoredCopy { aliases: vec![alias.into()], ..copy(key, generation, game) }
    }

    #[test]
    fn reads_a_copy_back_by_its_alias_with_its_own_key() {
        let root = temp_root("alias");

        keep(&root, vec![copy_as("a1", "GB-a1", 5, "Black")]).unwrap();

        assert_eq!(read(&root, "GB-a1"), Ok(Some(copy_as("a1", "GB-a1", 5, "Black"))));
        assert_eq!(read(&root, "a1"), Ok(Some(copy_as("a1", "GB-a1", 5, "Black"))));
    }

    #[test]
    fn marks_an_alias_two_pokemon_share() {
        let root = temp_root("alias-clash");
        keep(&root, vec![copy_as("a1", "GB-x", 5, "Black")]).unwrap();

        keep(&root, vec![copy_as("b2", "GB-x", 4, "Platinum")]).unwrap();

        assert_eq!(read(&root, "GB-x"), Ok(Some(marker("GB-x"))));
        assert_eq!(read(&root, "b2"), Ok(Some(copy_as("b2", "GB-x", 4, "Platinum"))));
    }

    #[test]
    fn keeps_a_marker_when_another_copy_comes_for_the_alias() {
        let root = temp_root("alias-marked");
        keep(&root, vec![copy_as("a1", "GB-x", 5, "Black"), copy_as("b2", "GB-x", 5, "White")]).unwrap();

        keep(&root, vec![copy_as("a1", "GB-x", 5, "Black")]).unwrap();

        assert_eq!(read(&root, "GB-x"), Ok(Some(marker("GB-x"))));
    }

    #[test]
    fn keeps_the_newer_generations_copy_under_an_alias() {
        let root = temp_root("alias-newer");
        keep(&root, vec![copy_as("a1", "GB-a1", 5, "Black")]).unwrap();

        keep(&root, vec![copy_as("a1", "GB-a1", 4, "Platinum")]).unwrap();

        assert_eq!(read(&root, "GB-a1"), Ok(Some(copy_as("a1", "GB-a1", 5, "Black"))));
    }

    #[test]
    fn keeps_the_newest_copy_under_a_new_alias() {
        let root = temp_root("alias-new");
        keep(&root, vec![copy_as("a1", "GB-old", 5, "Black")]).unwrap();

        keep(&root, vec![copy_as("a1", "GB-new", 4, "Platinum")]).unwrap();

        let newest = StoredCopy { aliases: vec!["GB-old".into(), "GB-new".into()], ..copy("a1", 5, "Black") };
        assert_eq!(read_all(&root, &["a1".into(), "GB-old".into(), "GB-new".into()]), Ok(vec![newest; 3]));
    }

    #[test]
    fn reads_a_file_kept_before_aliases() {
        let root = temp_root("old-file");
        std::fs::create_dir_all(&root).unwrap();
        std::fs::write(root.join("a1.json"), br#"{"generation":5,"game":"Black","bytes":[5,1,2]}"#).unwrap();

        assert_eq!(read(&root, "a1"), Ok(Some(copy("a1", 5, "Black"))));
    }

    #[test]
    fn reads_back_kept_copies() {
        let root = temp_root("round-trip");

        keep(&root, vec![copy("a1", 5, "Black"), copy("b2", 4, "Platinum")]).unwrap();

        assert_eq!(
            read_all(&root, &["a1".into(), "b2".into()]),
            Ok(vec![copy("a1", 5, "Black"), copy("b2", 4, "Platinum")])
        );
    }

    #[test]
    fn returns_only_the_keys_asked_for() {
        let root = temp_root("only-asked");
        keep(&root, vec![copy("a1", 5, "Black"), copy("b2", 4, "Platinum")]).unwrap();

        assert_eq!(read_all(&root, &["b2".into(), "c3".into()]), Ok(vec![copy("b2", 4, "Platinum")]));
    }

    #[test]
    fn keeps_the_newer_generations_copy() {
        let root = temp_root("newer");
        keep(&root, vec![copy("a1", 5, "Black")]).unwrap();

        keep(&root, vec![copy("a1", 4, "Platinum")]).unwrap();

        assert_eq!(read_all(&root, &["a1".into()]), Ok(vec![copy("a1", 5, "Black")]));
    }

    #[test]
    fn replaces_an_older_generations_copy() {
        let root = temp_root("older");
        keep(&root, vec![copy("a1", 4, "Platinum")]).unwrap();

        keep(&root, vec![copy("a1", 5, "Black")]).unwrap();

        assert_eq!(read_all(&root, &["a1".into()]), Ok(vec![copy("a1", 5, "Black")]));
    }

    #[test]
    fn refuses_a_key_that_is_not_a_file_name() {
        let root = temp_root("bad-key");

        assert!(keep(&root, vec![copy("../a1", 5, "Black")]).is_err());
        assert!(read_all(&root, &["../a1".into()]).is_err());
    }
}
