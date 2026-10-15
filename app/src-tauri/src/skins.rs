use crate::files::write_file;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::{AppHandle, Manager, Runtime};

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Choice {
    pub skin: String,
    pub look: String,
    pub changed_at: i64,
}

pub type Skins = BTreeMap<String, Choice>;

static WRITING: Mutex<()> = Mutex::new(());

pub fn file(data_dir: &Path) -> PathBuf {
    data_dir.join("skins.json")
}

pub fn read(file: &Path) -> Result<Skins, String> {
    let contents = match std::fs::read(file) {
        Ok(contents) => contents,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(Skins::new()),
        Err(e) => return Err(format!("{}: {e}", file.display())),
    };
    Ok(serde_json::from_slice(&contents).unwrap_or_else(|e| {
        eprintln!("{}: {e}", file.display());
        Skins::new()
    }))
}

fn write(file: &Path, skins: &Skins) -> Result<(), String> {
    let contents = serde_json::to_vec(skins).map_err(|e| e.to_string())?;
    write_file(file, &contents).map_err(|e| format!("{}: {e}", file.display()))
}

// The skin and look break a tie, so two devices that changed a system in the same millisecond still agree.
pub fn newest(a: &Skins, b: &Skins) -> Skins {
    let mut newest = a.clone();
    for (system, choice) in b {
        let key = |choice: &Choice| (choice.changed_at, choice.skin.clone(), choice.look.clone());
        if newest.get(system).is_none_or(|kept| key(choice) > key(kept)) {
            newest.insert(system.clone(), choice.clone());
        }
    }
    newest
}

// Returns every choice and the ones that won over this device's. Read under the lock, so a choice made while a sync
// was talking to the cloud isn't written over.
pub fn merge(file: &Path, from: &Skins) -> Result<(Skins, Skins), String> {
    let _writing = WRITING.lock().unwrap_or_else(|e| e.into_inner());
    let here = read(file)?;
    let merged = newest(&here, from);
    let won: Skins = merged
        .iter()
        .filter(|(system, choice)| here.get(*system) != Some(choice))
        .map(|(system, choice)| (system.clone(), choice.clone()))
        .collect();
    if !won.is_empty() {
        write(file, &merged)?;
    }
    Ok((merged, won))
}

pub fn choose(file: &Path, system: &str, choice: Choice) -> Result<(), String> {
    let _writing = WRITING.lock().unwrap_or_else(|e| e.into_inner());
    let mut skins = read(file)?;
    skins.insert(system.into(), choice);
    write(file, &skins)
}

fn app_file<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    Ok(file(&app.path().app_data_dir().map_err(|e| e.to_string())?))
}

#[tauri::command]
pub fn skins<R: Runtime>(app: AppHandle<R>) -> Result<Skins, String> {
    read(&app_file(&app)?)
}

#[tauri::command]
pub fn choose_skin<R: Runtime>(app: AppHandle<R>, system: String, skin: String, look: String) -> Result<(), String> {
    choose(&app_file(&app)?, &system, Choice { skin, look, changed_at: crate::index::now() })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_file(name: &str) -> PathBuf {
        let root = std::env::temp_dir().join(format!("pkh-emu-skins-{name}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        file(&root)
    }

    fn choice(skin: &str, changed_at: i64) -> Choice {
        Choice { skin: skin.into(), look: "moulded".into(), changed_at }
    }

    #[test]
    fn nothing_chosen_reads_as_no_choices() {
        assert_eq!(read(&temp_file("none")).unwrap(), Skins::new());
    }

    #[test]
    fn a_choice_is_kept_per_system() {
        let file = temp_file("choose");
        let frosted = Choice { look: "frosted".into(), ..choice("glacier", 5) };
        choose(&file, "gba", frosted.clone()).unwrap();
        choose(&file, "gb", choice("classic-grey", 6)).unwrap();

        let skins = read(&file).unwrap();

        assert_eq!(skins["gba"], frosted);
        assert_eq!(skins["gb"], choice("classic-grey", 6));
    }

    #[test]
    fn the_newer_choice_wins_for_each_system() {
        let a = Skins::from([("gb".into(), choice("classic-grey", 2)), ("gba".into(), choice("glacier", 1))]);
        let b = Skins::from([("gb".into(), choice("pkhemu", 1)), ("gba".into(), choice("black", 3))]);

        let expected = Skins::from([("gb".into(), choice("classic-grey", 2)), ("gba".into(), choice("black", 3))]);
        assert_eq!(newest(&a, &b), expected);
        assert_eq!(newest(&b, &a), expected);
    }

    #[test]
    fn merging_keeps_a_choice_made_since() {
        let file = temp_file("merge");
        choose(&file, "gba", choice("glacier", 5)).unwrap();

        let (merged, won) = merge(&file, &Skins::from([("gba".into(), choice("black", 4))])).unwrap();

        assert_eq!(merged["gba"], choice("glacier", 5));
        assert_eq!(won, Skins::new());
        assert_eq!(read(&file).unwrap(), merged);
    }

    #[test]
    fn merging_names_the_choices_that_won() {
        let file = temp_file("won");
        choose(&file, "gb", choice("classic-grey", 5)).unwrap();
        choose(&file, "gba", choice("glacier", 5)).unwrap();

        let (merged, won) = merge(&file, &Skins::from([("gba".into(), choice("black", 6))])).unwrap();

        assert_eq!(won, Skins::from([("gba".into(), choice("black", 6))]));
        assert_eq!(merged["gb"], choice("classic-grey", 5));
    }

    #[test]
    fn a_file_it_cant_read_counts_as_no_choices() {
        let file = temp_file("unreadable");
        write_file(&file, b"not json").unwrap();

        assert_eq!(read(&file).unwrap(), Skins::new());
    }
}
