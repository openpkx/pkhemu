use crate::index::SyncedFile;
use crate::rom::{self, StateName};
use crate::save;
use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Record {
    pub id: String,
    pub rom: Rom,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub update: Option<Update>,
    pub files: Vec<Entry>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Rom {
    pub path: String,
    pub sha1: String,
    pub size: u64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub blob: Option<Blob>,
}

/// A 3DS game's update, which syncs with the ROM. The higher version wins on either side.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Update {
    pub version: u16,
    pub sha1: String,
    pub size: u64,
    pub blob: String,
}

/// The ROM's file as the games folder holds it. Its hash differs from the ROM's when the file is an archive.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Blob {
    pub id: String,
    pub sha1: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Entry {
    pub path: String,
    pub sha1: String,
    pub size: u64,
    pub blob: String,
    pub modified: i64,
    pub device: String,
    #[serde(default, skip_serializing_if = "std::ops::Not::not")]
    pub cheats: bool,
}

impl Record {
    pub fn put(&mut self, entry: Entry) -> Option<Entry> {
        let old = self.remove(&entry.path);
        self.files.push(entry);
        self.files.sort_by(|a, b| a.path.cmp(&b.path));
        old
    }

    pub fn remove(&mut self, path: &str) -> Option<Entry> {
        let at = self.files.iter().position(|entry| entry.path == path)?;
        Some(self.files.remove(at))
    }

    pub fn names(&self, blob: &str) -> bool {
        self.files.iter().any(|entry| entry.blob == blob)
            || self.rom.blob.as_ref().is_some_and(|rom| rom.id == blob)
            || self.update.as_ref().is_some_and(|update| update.blob == blob)
    }

    pub fn move_to(&mut self, path: &str) {
        let from = std::mem::replace(&mut self.rom.path, path.into());
        for entry in &mut self.files {
            entry.path = moved(&entry.path, &from, path);
        }
    }
}

pub fn moved(path: &str, from: &str, to: &str) -> String {
    if is_save(from, path) {
        let extension = Path::new(path).extension().unwrap_or_default();
        return Path::new(to).with_extension(extension).to_string_lossy().into_owned();
    }
    match path.strip_prefix(&format!("{}/", rom::data_dir(from))) {
        Some(rest) => format!("{}/{rest}", rom::data_dir(to)),
        None => path.into(),
    }
}

/// Files that change together, so the player picks one side's whole set.
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum Unit {
    Save,
    Slot(u8),
    File(String),
}

impl Unit {
    pub fn of(rom: &str, path: &str) -> Unit {
        if is_save(rom, path) {
            return Unit::Save;
        }
        let states = format!("{}/states/", rom::data_dir(rom));
        let Some(name) = path.strip_prefix(&states).and_then(|name| name.split_once('.')).map(|(stem, _)| stem) else {
            return Unit::File(path.into());
        };
        // The resume state goes with the save, so a player picking a save gets the resume point from the same device.
        if name == "resume" {
            return Unit::Save;
        }
        match name.strip_prefix("slot-").and_then(|slot| slot.parse().ok()) {
            Some(slot) => Unit::Slot(slot),
            None => Unit::File(path.into()),
        }
    }

    pub fn key(&self) -> String {
        match self {
            Unit::Save => "save".into(),
            Unit::Slot(slot) => StateName::Slot(*slot).to_string(),
            Unit::File(path) => path.clone(),
        }
    }
}

pub fn is_save(rom: &str, path: &str) -> bool {
    save::paths(rom).iter().any(|save| save == path)
}

pub fn decides(rom: &str, path: &str) -> bool {
    match Unit::of(rom, path) {
        Unit::Save => is_save(rom, path),
        Unit::Slot(_) => [".state", ".sav", ".dsv", ".srm"].iter().any(|extension| path.ends_with(extension)),
        Unit::File(_) => false,
    }
}

// A 3DS update syncs with the ROM, outside the game's other files.
pub fn syncs(rom: &str, path: &str) -> bool {
    let name = path.rsplit('/').next().unwrap_or(path);
    let before_load = format!("{}/states/{}.", rom::data_dir(rom), StateName::BeforeLoad);
    !name.starts_with('.')
        && !name.ends_with(".partial")
        && !name.ends_with(".incomplete")
        && !path.starts_with(&before_load)
        && path != crate::three_ds::update::path(rom)
}

impl From<&Entry> for SyncedFile {
    fn from(entry: &Entry) -> SyncedFile {
        SyncedFile { path: entry.path.clone(), sha1: entry.sha1.clone(), blob: entry.blob.clone() }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn moves_a_games_files_with_its_rom() {
        let moved = |path| moved(path, "gba/Emerald.gba", "gba/Hacks/Emerald 2.gba");

        assert_eq!(moved("gba/Emerald.sav"), "gba/Hacks/Emerald 2.sav");
        assert_eq!(moved("gba/Emerald.dsv"), "gba/Hacks/Emerald 2.dsv");
        assert_eq!(moved("gba/Emerald/states/slot-1.state"), "gba/Hacks/Emerald 2/states/slot-1.state");
        assert_eq!(moved("gba/Emerald 3.sav"), "gba/Emerald 3.sav");
        assert_eq!(moved("gba/Emerald.fla"), "gba/Emerald.fla");
    }

    #[test]
    fn moves_each_save_file_of_an_n64_game() {
        let moved = |path| moved(path, "n64/Stadium.zip", "n64/Old/Stadium.zip");

        assert_eq!(moved("n64/Stadium.fla"), "n64/Old/Stadium.fla");
        assert_eq!(moved("n64/Stadium.mpk"), "n64/Old/Stadium.mpk");
        assert_eq!(moved("n64/Stadium.sav"), "n64/Stadium.sav");
    }

    #[test]
    fn groups_the_files_of_an_n64_save_together() {
        let unit = |path: &str| Unit::of("n64/Stadium.z64", path);

        for extension in ["eep", "mpk", "sra", "fla"] {
            assert_eq!(unit(&format!("n64/Stadium.{extension}")), Unit::Save, "{extension}");
        }
        assert_eq!(unit("n64/Stadium.srm"), Unit::File("n64/Stadium.srm".into()));
        assert_eq!(unit("n64/Stadium/states/slot-2.srm"), Unit::Slot(2));
        assert!(decides("n64/Stadium.z64", "n64/Stadium/states/slot-2.srm"));
    }

    #[test]
    fn groups_the_resume_state_with_the_save_and_a_slots_files_together() {
        let unit = |path| Unit::of("gba/Emerald.gba", path);

        assert_eq!(unit("gba/Emerald.sav"), Unit::Save);
        assert_eq!(unit("gba/Emerald/states/resume.state"), Unit::Save);
        assert_eq!(unit("gba/Emerald/states/resume.png"), Unit::Save);
        assert_eq!(unit("gba/Emerald/states/slot-3.sav"), Unit::Slot(3));
        assert_eq!(unit("gba/Emerald/states/slot-10.json"), Unit::Slot(10));
        assert_eq!(
            unit("gba/Emerald/backups/2026-10-05_1412_edit.sav"),
            Unit::File("gba/Emerald/backups/2026-10-05_1412_edit.sav".into())
        );
    }

    #[test]
    fn leaves_out_the_state_from_before_a_load_and_unfinished_writes() {
        let syncs = |path| syncs("gba/Emerald.gba", path);

        assert!(syncs("gba/Emerald/states/slot-1.state"));
        assert!(!syncs("gba/Emerald/states/before-load.state"));
        assert!(!syncs("gba/Emerald/states/before-load.sav"));
        assert!(!syncs("gba/Emerald.sav.partial"));
        assert!(!syncs("gba/Emerald/states/slot-1.state.incomplete"));
        assert!(!syncs("gba/Emerald/.DS_Store"));
    }

    #[test]
    fn leaves_out_a_3ds_update() {
        assert!(!syncs("3ds/X.3ds", "3ds/X/update.cia"));
        assert!(syncs("3ds/X.3ds", "3ds/X/backups/2026-10-05_1412_edit.sav"));
    }
}
