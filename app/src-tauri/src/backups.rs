use crate::games_folder::GamesFolder;
use crate::save::{self, Slot};
use crate::{resume, rom};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::cmp::Reverse;
use tauri::Runtime;

// Within a minute a game starts before it's edited, and a restore comes last.
#[derive(Clone, Copy, Serialize, Debug, PartialEq, Eq, PartialOrd, Ord)]
#[serde(rename_all = "lowercase")]
pub enum Reason {
    Start,
    Cheats,
    #[serde(rename = "transferPak")]
    TransferPak,
    Edit,
    Transfer,
    Load,
    Restore,
    Sync,
    Import,
}

impl Reason {
    const ALL: [Reason; 9] = [
        Reason::Start,
        Reason::Cheats,
        Reason::TransferPak,
        Reason::Edit,
        Reason::Transfer,
        Reason::Load,
        Reason::Restore,
        Reason::Sync,
        Reason::Import,
    ];

    fn name(self) -> &'static str {
        match self {
            Reason::Start => "start",
            Reason::Cheats => "cheats",
            Reason::TransferPak => "transfer-pak",
            Reason::Edit => "edit",
            Reason::Transfer => "transfer",
            Reason::Load => "load",
            Reason::Restore => "restore",
            Reason::Sync => "sync",
            Reason::Import => "import",
        }
    }

    fn keep(self) -> usize {
        match self {
            Reason::Start => 5,
            Reason::Cheats => 10,
            Reason::TransferPak => 10,
            Reason::Edit => 20,
            Reason::Transfer => 10,
            Reason::Load => 10,
            Reason::Restore => 10,
            Reason::Sync => 10,
            Reason::Import => 10,
        }
    }
}

const TIME_FORMAT: &str = "%Y-%m-%d_%H%M";
const TIME_FORMAT_LEN: usize = "2026-10-05_1412".len();

pub fn now() -> String {
    chrono::Local::now().format(TIME_FORMAT).to_string()
}

const EXTENSIONS: [&str; 3] = ["sav", "dsv", "srm"];

// A second backup in the same minute gets a number, so it can't replace the first.
#[derive(PartialEq, Eq, PartialOrd, Ord)]
struct Backup {
    at: String,
    seq: u32,
    extension: &'static str,
}

impl Backup {
    fn parse(name: &str, reason: Reason) -> Option<Backup> {
        let (stem, extension) = EXTENSIONS
            .into_iter()
            .find_map(|extension| Some((name.strip_suffix(extension)?.strip_suffix('.')?, extension)))?;
        let (at, rest) = stem.split_at_checked(TIME_FORMAT_LEN)?;
        chrono::NaiveDateTime::parse_from_str(at, TIME_FORMAT).ok()?;
        let seq = match rest.strip_prefix('_')?.strip_prefix(reason.name())? {
            "" => 1,
            seq => seq.strip_prefix('_')?.parse().ok()?,
        };
        let backup = Backup { at: at.into(), seq, extension };
        (backup.name(reason) == name).then_some(backup)
    }

    fn parse_any(name: &str) -> Option<(Backup, Reason)> {
        Reason::ALL.into_iter().find_map(|reason| Some((Backup::parse(name, reason)?, reason)))
    }

    fn stem(&self, reason: Reason) -> String {
        match self.seq {
            1 => format!("{}_{}", self.at, reason.name()),
            seq => format!("{}_{}_{seq}", self.at, reason.name()),
        }
    }

    fn name(&self, reason: Reason) -> String {
        format!("{}.{}", self.stem(reason), self.extension)
    }

    fn note_name(&self, reason: Reason) -> String {
        format!("{}.json", self.stem(reason))
    }
}

#[derive(Serialize, Deserialize)]
struct Note {
    note: String,
}

#[derive(Serialize, Debug, PartialEq)]
pub struct Listed {
    name: String,
    at: String,
    reason: Reason,
    sha256: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    note: Option<String>,
}

fn dir(rom: &str) -> String {
    format!("{}/backups", rom::data_dir(rom))
}

async fn files<R: Runtime>(folder: &GamesFolder<'_, R>, dir: &str) -> Result<Vec<String>, String> {
    match folder.read_dir(dir).await {
        Ok(entries) => Ok(entries.into_iter().filter(|entry| !entry.is_directory).map(|entry| entry.name).collect()),
        Err(_) if !folder.has_file(dir).await => Ok(Vec::new()),
        Err(e) => Err(format!("{dir}: {e}")),
    }
}

async fn read_note<R: Runtime>(folder: &GamesFolder<'_, R>, path: &str) -> Result<String, String> {
    let file = folder.read(path).await.map_err(|e| format!("{path}: {e}"))?;
    let Note { note } = serde_json::from_slice(&file).map_err(|e| format!("{path}: {e}"))?;
    Ok(note)
}

async fn remove_note<R: Runtime>(folder: &GamesFolder<'_, R>, rom: &str, backup: &Backup, reason: Reason) -> Result<(), String> {
    let path = format!("{}/{}", dir(rom), backup.note_name(reason));
    match folder.has_file(&path).await {
        true => folder.remove(rom, &path).await.map_err(|e| format!("{path}: {e}")),
        false => Ok(()),
    }
}

pub async fn list<R: Runtime>(folder: &GamesFolder<'_, R>, rom: &str) -> Result<Vec<Listed>, String> {
    let dir = dir(rom);
    let names = files(folder, &dir).await?;
    let mut found: Vec<(Backup, Reason)> = names
        .iter()
        .filter_map(|name| Backup::parse_any(name))
        .collect();
    found.sort_by_cached_key(|(backup, reason)| Reverse((backup.at.clone(), *reason, backup.seq)));
    let mut listed = Vec::with_capacity(found.len());
    for (backup, reason) in found {
        let name = backup.name(reason);
        let bytes = match read(folder, rom, &name).await {
            Ok(bytes) => bytes,
            Err(e) => {
                eprintln!("{e}");
                continue;
            }
        };
        let note_name = backup.note_name(reason);
        let note = match names.contains(&note_name) {
            true => read_note(folder, &format!("{dir}/{note_name}")).await.inspect_err(|e| eprintln!("{e}")).ok(),
            false => None,
        };
        listed.push(Listed {
            at: chrono::NaiveDateTime::parse_from_str(&backup.at, TIME_FORMAT)
                .map(|at| at.format("%Y-%m-%dT%H:%M").to_string())
                .unwrap_or_default(),
            name,
            reason,
            sha256: save::sha256(&bytes),
            note,
        });
    }
    Ok(listed)
}

fn parse(name: &str) -> Result<(Backup, Reason), String> {
    Backup::parse_any(name).ok_or_else(|| format!("{name} isn't a backup"))
}

fn file_path(rom: &str, name: &str) -> Result<String, String> {
    parse(name)?;
    Ok(format!("{}/{name}", dir(rom)))
}

async fn open<R: Runtime>(folder: &GamesFolder<'_, R>, rom: &str, name: &str) -> Result<(Slot, Vec<u8>), String> {
    let path = file_path(rom, name)?;
    let file = folder.read(&path).await.map_err(|e| format!("{path}: {e}"))?;
    Ok(Slot::new(path, file))
}

pub async fn read<R: Runtime>(folder: &GamesFolder<'_, R>, rom: &str, name: &str) -> Result<Vec<u8>, String> {
    Ok(open(folder, rom, name).await?.1)
}

pub async fn remove<R: Runtime>(folder: &GamesFolder<'_, R>, rom: &str, name: &str) -> Result<(), String> {
    let (backup, reason) = parse(name)?;
    // The note goes first, so a backup taken later under the same name can't pick it up.
    remove_note(folder, rom, &backup, reason).await?;
    let path = format!("{}/{name}", dir(rom));
    folder.remove(rom, &path).await.map_err(|e| format!("{path}: {e}"))
}

/// For a backup whose name is taken, a free name and the notes to move with it: `(note, free name, free note)`.
pub fn free_name(name: &str, taken: impl Fn(&str) -> bool) -> Option<(String, String, String)> {
    let (backup, reason) = Backup::parse_any(name)?;
    let free = (backup.seq + 1..)
        .map(|seq| Backup { at: backup.at.clone(), seq, extension: backup.extension })
        .find(|free| !taken(&free.name(reason)) && !taken(&free.note_name(reason)))?;
    Some((backup.note_name(reason), free.name(reason), free.note_name(reason)))
}

pub async fn restore<R: Runtime>(folder: &GamesFolder<'_, R>, rom: &str, name: &str, at: &str, keep: usize) -> Result<(), String> {
    let (from, backup) = open(folder, rom, name).await?;
    let slot = match save::open(folder, rom).await? {
        (slot, Some(save)) => {
            take_keeping(folder, rom, &slot, Reason::Restore, keep, &save, at, None)
                .await
                .map_err(|e| format!("couldn't back up the save: {e}"))?;
            slot
        }
        (_, None) => from.beside(rom),
    };
    slot.write(folder, &backup).await?;
    resume::remove(folder, rom).await
}

pub async fn take<R: Runtime>(
    folder: &GamesFolder<'_, R>,
    rom: &str,
    slot: &Slot,
    reason: Reason,
    save: &[u8],
    at: &str,
    note: Option<&str>,
) -> Result<(), String> {
    take_keeping(folder, rom, slot, reason, reason.keep(), save, at, note).await
}

async fn take_keeping<R: Runtime>(
    folder: &GamesFolder<'_, R>,
    rom: &str,
    slot: &Slot,
    reason: Reason,
    keep: usize,
    save: &[u8],
    at: &str,
    note: Option<&str>,
) -> Result<(), String> {
    if slot.files(save).is_empty() {
        return Ok(());
    }
    let dir = dir(rom);
    let names = files(folder, &dir).await?;
    let hash = Sha256::digest(save);
    for name in names.iter().filter(|name| Backup::parse_any(name).is_some()) {
        if open(folder, rom, name).await.is_ok_and(|(_, kept)| Sha256::digest(kept) == hash) {
            return Ok(());
        }
    }
    let mut taken: Vec<Backup> = names.iter().filter_map(|name| Backup::parse(name, reason)).collect();
    let seq = taken.iter().filter(|b| b.at == at).map(|b| b.seq + 1).max().unwrap_or(1);
    let backup = Backup { at: at.into(), seq, extension: slot.extension() };
    folder.write(&format!("{dir}/{}", backup.name(reason)), &slot.file(save)).await?;
    if let Some(note) = note {
        let json = serde_json::to_vec(&Note { note: note.into() }).map_err(|e| e.to_string())?;
        folder.write(&format!("{dir}/{}", backup.note_name(reason)), &json).await?;
    }
    // The clock can go back, so the backup just taken stays even if its name sorts first.
    taken.sort();
    for old in &taken[..(taken.len() + 1).saturating_sub(keep.max(1))] {
        if let Err(e) = remove_note(folder, rom, old, reason).await {
            eprintln!("{e}");
            continue;
        }
        let path = format!("{dir}/{}", old.name(reason));
        if let Err(e) = folder.remove(rom, &path).await {
            eprintln!("{path}: {e}");
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tauri::async_runtime::block_on;

    fn temp_folder(name: &str) -> GamesFolder<'static, tauri::Wry> {
        let root = std::env::temp_dir().join(format!("pkh-emu-backups-{name}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        std::fs::create_dir_all(&root).unwrap();
        GamesFolder::at(root)
    }

    fn backups(folder: &GamesFolder<'static, tauri::Wry>) -> Vec<(String, Vec<u8>)> {
        let mut names: Vec<_> = block_on(folder.read_dir("gba/Emerald/backups"))
            .unwrap()
            .into_iter()
            .map(|entry| entry.name)
            .collect();
        names.sort();
        names
            .into_iter()
            .map(|name| {
                let bytes = block_on(folder.read(&format!("gba/Emerald/backups/{name}"))).unwrap();
                (name, bytes)
            })
            .collect()
    }

    fn take_at(folder: &GamesFolder<'static, tauri::Wry>, reason: Reason, save: &[u8], at: &str) {
        take_noted(folder, reason, save, at, None);
    }

    fn take_noted(folder: &GamesFolder<'static, tauri::Wry>, reason: Reason, save: &[u8], at: &str, note: Option<&str>) {
        let (slot, _) = Slot::new("gba/Emerald.sav".into(), Vec::new());
        block_on(take(folder, "gba/Emerald.gba", &slot, reason, save, at, note)).unwrap();
    }

    fn names(folder: &GamesFolder<'static, tauri::Wry>) -> Vec<String> {
        backups(folder).into_iter().map(|(name, _)| name).collect()
    }

    fn footer() -> Vec<u8> {
        [vec![7; 0x7A - 16], b"|-DESMUME SAVE-|".to_vec()].concat()
    }

    fn dsv(save: &[u8]) -> Vec<u8> {
        [save, &footer()].concat()
    }

    fn dsv_game(name: &str, save: Option<&[u8]>) -> GamesFolder<'static, tauri::Wry> {
        let folder = temp_folder(name);
        if let Some(save) = save {
            block_on(folder.write("nds/HeartGold.dsv", &dsv(save))).unwrap();
        }
        let (slot, _) = Slot::new("nds/HeartGold.dsv".into(), dsv(b""));
        block_on(take(&folder, "nds/HeartGold.nds", &slot, Reason::Edit, b"older", "2026-10-05_1400", None)).unwrap();
        folder
    }

    fn stadium_save() -> Vec<u8> {
        let mut save = crate::save::tests::stadium_memory();
        save[0xB00..0xB20].fill(1);
        save
    }

    fn stadium(name: &str) -> GamesFolder<'static, tauri::Wry> {
        let folder = temp_folder(name);
        let (slot, _) = block_on(save::open(&folder, "n64/Stadium.z64")).unwrap();
        block_on(slot.write(&folder, &stadium_save())).unwrap();
        folder
    }

    fn take_stadium(folder: &GamesFolder<'static, tauri::Wry>, at: &str) {
        let (slot, save) = block_on(save::open(folder, "n64/Stadium.z64")).unwrap();
        block_on(take(folder, "n64/Stadium.z64", &slot, Reason::Start, &save.unwrap(), at, None)).unwrap();
    }

    #[test]
    fn backs_up_every_file_of_an_n64_game_as_one_srm() {
        let folder = stadium("n64");

        take_stadium(&folder, "2026-10-05_1400");

        assert_eq!(block_on(folder.read("n64/Stadium/backups/2026-10-05_1400_start.srm")).unwrap(), stadium_save());
        assert_eq!(block_on(read(&folder, "n64/Stadium.z64", "2026-10-05_1400_start.srm")).unwrap(), stadium_save());
    }

    #[test]
    fn restores_an_n64_backup_to_the_files_it_holds() {
        let folder = stadium("n64-restore");
        take_stadium(&folder, "2026-10-05_1400");
        block_on(folder.write("n64/Stadium.fla", &[0; 0x20000])).unwrap();
        block_on(folder.write("n64/Stadium.sra", &[0; 0x8000])).unwrap();

        block_on(restore(&folder, "n64/Stadium.z64", "2026-10-05_1400_start.srm", "2026-10-05_1412", 10)).unwrap();

        let (_, save) = block_on(save::open(&folder, "n64/Stadium.z64")).unwrap();
        assert_eq!(save.unwrap(), stadium_save());
        assert_eq!(block_on(folder.read("n64/Stadium.sra")).unwrap(), vec![0xFF; 0x8000]);
    }

    #[test]
    fn restores_an_n64_backup_for_a_game_without_a_save() {
        let folder = stadium("n64-restore-none");
        take_stadium(&folder, "2026-10-05_1400");
        for extension in ["fla", "mpk"] {
            block_on(folder.remove_unlogged(&format!("n64/Stadium.{extension}"))).unwrap();
        }

        block_on(restore(&folder, "n64/Stadium.z64", "2026-10-05_1400_start.srm", "2026-10-05_1412", 10)).unwrap();

        assert_eq!(block_on(save::open(&folder, "n64/Stadium.z64")).unwrap().1.unwrap(), stadium_save());
        assert!(!block_on(folder.has_file("n64/Stadium.srm")));
    }

    #[test]
    fn backs_up_nothing_for_an_n64_game_that_wrote_nothing() {
        let folder = temp_folder("n64-nothing");
        let (slot, _) = block_on(save::open(&folder, "n64/Stadium.z64")).unwrap();
        let fresh = crate::save::n64::tests::fresh_memory(9);

        block_on(take(&folder, "n64/Stadium.z64", &slot, Reason::Cheats, &fresh, "2026-10-05_1400", None)).unwrap();

        assert!(!block_on(folder.has_file("n64/Stadium/backups")));
    }

    #[test]
    fn backs_up_a_dsv_game_as_a_dsv_with_its_footer() {
        let folder = dsv_game("dsv", None);

        assert_eq!(block_on(folder.read("nds/HeartGold/backups/2026-10-05_1400_edit.dsv")).unwrap(), dsv(b"older"));
        assert_eq!(block_on(read(&folder, "nds/HeartGold.nds", "2026-10-05_1400_edit.dsv")).unwrap(), b"older");
    }

    #[test]
    fn lists_a_dsv_backup_by_the_hash_of_its_save() {
        let folder = dsv_game("dsv-list", None);

        let backups = block_on(list(&folder, "nds/HeartGold.nds")).unwrap();

        assert_eq!(
            backups,
            [Listed {
                name: "2026-10-05_1400_edit.dsv".into(),
                at: "2026-10-05T14:00".into(),
                reason: Reason::Edit,
                sha256: save::sha256(b"older"),
                note: None,
            }]
        );
    }

    #[test]
    fn restores_a_dsv_backup_keeping_the_footer() {
        let folder = dsv_game("dsv-restore", Some(b"current"));

        block_on(restore(&folder, "nds/HeartGold.nds", "2026-10-05_1400_edit.dsv", "2026-10-05_1412", 10)).unwrap();

        assert_eq!(block_on(folder.read("nds/HeartGold.dsv")).unwrap(), dsv(b"older"));
        assert!(!block_on(folder.has_file("nds/HeartGold.sav")));
        assert_eq!(
            block_on(folder.read("nds/HeartGold/backups/2026-10-05_1412_restore.dsv")).unwrap(),
            dsv(b"current")
        );
    }

    #[test]
    fn restores_a_dsv_backup_as_a_dsv_for_a_game_without_a_save() {
        let folder = dsv_game("dsv-restore-none", None);

        block_on(restore(&folder, "nds/HeartGold.nds", "2026-10-05_1400_edit.dsv", "2026-10-05_1412", 10)).unwrap();

        assert_eq!(block_on(folder.read("nds/HeartGold.dsv")).unwrap(), dsv(b"older"));
        assert!(!block_on(folder.has_file("nds/HeartGold.sav")));
    }

    #[test]
    fn stores_the_save_in_the_rom_folder_named_by_time_and_reason() {
        let folder = temp_folder("named");

        take_at(&folder, Reason::Start, b"started", "2026-10-05_1400");
        take_at(&folder, Reason::Edit, b"edited", "2026-10-05_1412");

        assert_eq!(
            backups(&folder),
            [
                ("2026-10-05_1400_start.sav".to_string(), b"started".to_vec()),
                ("2026-10-05_1412_edit.sav".to_string(), b"edited".to_vec()),
            ]
        );
    }

    #[test]
    fn keeps_the_last_20_edit_backups() {
        let folder = temp_folder("edits");

        for i in 0..21u8 {
            take_at(&folder, Reason::Edit, &[i], "2026-10-05_1412");
        }

        let mut kept: Vec<_> = backups(&folder).into_iter().map(|(_, bytes)| bytes[0]).collect();
        kept.sort();
        assert_eq!(kept, (1..21).collect::<Vec<u8>>());
    }

    #[test]
    fn keeps_the_last_10_cheats_backups() {
        let folder = temp_folder("cheats");

        for i in 0..11u8 {
            take_at(&folder, Reason::Cheats, &[i], "2026-10-05_1412");
        }

        let names = names(&folder);
        assert_eq!(names.len(), 10);
        assert!(names.contains(&"2026-10-05_1412_cheats_11.sav".to_string()));
        assert!(!names.contains(&"2026-10-05_1412_cheats.sav".to_string()));
    }

    #[test]
    fn keeps_the_last_10_transfer_pak_backups_apart_from_transfers() {
        let folder = temp_folder("transfer-pak");
        take_at(&folder, Reason::Transfer, b"traded", "2026-10-05_1412");

        for i in 0..11u8 {
            take_at(&folder, Reason::TransferPak, &[i], "2026-10-05_1412");
        }

        let names = names(&folder);
        assert_eq!(names.len(), 11);
        assert!(names.contains(&"2026-10-05_1412_transfer.sav".to_string()));
        assert!(names.contains(&"2026-10-05_1412_transfer-pak_11.sav".to_string()));
        assert!(!names.contains(&"2026-10-05_1412_transfer-pak.sav".to_string()));
    }

    #[test]
    fn keeps_the_last_10_load_backups() {
        let folder = temp_folder("loads");
        take_at(&folder, Reason::Edit, b"edit", "2026-10-05_1300");

        for i in 0..11u8 {
            take_at(&folder, Reason::Load, &[i], "2026-10-05_1412");
        }

        let names: Vec<_> = backups(&folder).into_iter().map(|(name, _)| name).collect();
        assert_eq!(names.len(), 11);
        assert!(names.contains(&"2026-10-05_1300_edit.sav".to_string()));
        assert!(names.contains(&"2026-10-05_1412_load_11.sav".to_string()));
        assert!(!names.contains(&"2026-10-05_1412_load.sav".to_string()));
    }

    #[test]
    fn keeps_the_last_5_start_backups_apart_from_edits() {
        let folder = temp_folder("starts");
        take_at(&folder, Reason::Edit, b"edit", "2026-10-05_1300");

        for minute in 0..6u8 {
            take_at(&folder, Reason::Start, &[minute], &format!("2026-10-05_14{minute:02}"));
        }

        let names = names(&folder);
        assert_eq!(
            names,
            [
                "2026-10-05_1300_edit.sav",
                "2026-10-05_1401_start.sav",
                "2026-10-05_1402_start.sav",
                "2026-10-05_1403_start.sav",
                "2026-10-05_1404_start.sav",
                "2026-10-05_1405_start.sav",
            ]
        );
    }

    #[test]
    fn keeps_the_last_10_transfer_backups() {
        let folder = temp_folder("transfers");

        for i in 0..11u8 {
            take_at(&folder, Reason::Transfer, &[i], "2026-10-05_1412");
        }

        let mut kept: Vec<_> = backups(&folder).into_iter().map(|(_, bytes)| bytes[0]).collect();
        kept.sort();
        assert_eq!(kept, (1..11).collect::<Vec<u8>>());
    }

    #[test]
    fn writes_a_note_beside_the_backup_and_lists_it() {
        let folder = temp_folder("note");

        take_noted(&folder, Reason::Transfer, b"before", "2026-10-06_1412", Some("Sent Pikachu to Emerald"));
        take_at(&folder, Reason::Edit, b"edited", "2026-10-06_1413");

        let note = block_on(folder.read("gba/Emerald/backups/2026-10-06_1412_transfer.json")).unwrap();
        assert_eq!(
            serde_json::from_slice::<serde_json::Value>(&note).unwrap(),
            serde_json::json!({"note": "Sent Pikachu to Emerald"})
        );
        let notes: Vec<_> = block_on(list(&folder, "gba/Emerald.gba")).unwrap().into_iter().map(|backup| backup.note).collect();
        assert_eq!(notes, [None, Some("Sent Pikachu to Emerald".to_string())]);
    }

    #[test]
    fn skips_an_identical_backup_without_touching_notes() {
        let folder = temp_folder("note-skipped");
        take_at(&folder, Reason::Start, b"started", "2026-10-06_1400");
        take_noted(&folder, Reason::Transfer, b"before", "2026-10-06_1405", Some("first"));

        take_noted(&folder, Reason::Transfer, b"started", "2026-10-06_1410", Some("second"));
        take_noted(&folder, Reason::Transfer, b"before", "2026-10-06_1412", Some("third"));

        assert_eq!(names(&folder), ["2026-10-06_1400_start.sav", "2026-10-06_1405_transfer.json", "2026-10-06_1405_transfer.sav"]);
        let notes: Vec<_> = block_on(list(&folder, "gba/Emerald.gba")).unwrap().into_iter().map(|backup| backup.note).collect();
        assert_eq!(notes, [Some("first".to_string()), None]);
    }

    #[test]
    fn removes_a_backups_note_with_it() {
        let folder = temp_folder("note-remove");
        take_noted(&folder, Reason::Transfer, b"before", "2026-10-06_1412", Some("note"));

        block_on(remove(&folder, "gba/Emerald.gba", "2026-10-06_1412_transfer.sav")).unwrap();

        assert!(names(&folder).is_empty());
    }

    #[test]
    fn drops_notes_with_the_backups_it_no_longer_keeps() {
        let folder = temp_folder("note-keep");

        for i in 0..11u8 {
            take_noted(&folder, Reason::Transfer, &[i], &format!("2026-10-06_14{i:02}"), Some(&format!("note {i}")));
        }

        let names = names(&folder);
        assert!(!names.iter().any(|name| name.starts_with("2026-10-06_1400")), "{names:?}");
        assert_eq!(names.len(), 20);
    }

    #[test]
    fn keeps_the_newest_backup_when_the_clock_goes_back() {
        let folder = temp_folder("clock");
        for minute in 0..5u8 {
            take_at(&folder, Reason::Start, &[minute], &format!("2026-10-05_14{minute:02}"));
        }

        take_at(&folder, Reason::Start, b"newest", "2026-10-05_1300");

        let kept: Vec<_> = backups(&folder).into_iter().map(|(_, bytes)| bytes).collect();
        assert_eq!(kept, [b"newest".to_vec(), vec![1], vec![2], vec![3], vec![4]]);
    }

    #[test]
    fn leaves_other_files_alone() {
        let folder = temp_folder("others");
        block_on(folder.write("gba/Emerald/backups/mine.sav", b"mine")).unwrap();
        block_on(folder.write("gba/Emerald/backups/2026-10-05_1300_start_01.sav", b"mine")).unwrap();

        for minute in 0..6u8 {
            take_at(&folder, Reason::Start, &[minute], &format!("2026-10-05_14{minute:02}"));
        }

        assert!(block_on(folder.has_file("gba/Emerald/backups/mine.sav")));
        assert!(block_on(folder.has_file("gba/Emerald/backups/2026-10-05_1300_start_01.sav")));
    }

    #[test]
    fn skips_a_start_backup_when_the_save_has_not_changed() {
        let folder = temp_folder("unchanged");

        take_at(&folder, Reason::Start, b"save", "2026-10-05_1400");
        take_at(&folder, Reason::Start, b"save", "2026-10-05_1412");

        assert_eq!(backups(&folder), [("2026-10-05_1400_start.sav".to_string(), b"save".to_vec())]);
    }

    #[test]
    fn skips_a_backup_matching_one_kept_for_another_reason() {
        let folder = temp_folder("matching");
        take_at(&folder, Reason::Start, b"started", "2026-10-05_1400");
        take_at(&folder, Reason::Edit, b"edited", "2026-10-05_1405");

        take_at(&folder, Reason::Edit, b"started", "2026-10-05_1412");

        let names = names(&folder);
        assert_eq!(names, ["2026-10-05_1400_start.sav", "2026-10-05_1405_edit.sav"]);
    }

    #[test]
    fn backs_up_a_changed_save() {
        let folder = temp_folder("changed");

        take_at(&folder, Reason::Start, b"save", "2026-10-05_1400");
        take_at(&folder, Reason::Start, b"saved again", "2026-10-05_1412");

        let names = names(&folder);
        assert_eq!(names, ["2026-10-05_1400_start.sav", "2026-10-05_1412_start.sav"]);
    }

    #[test]
    fn lists_backups_newest_first_with_time_reason_and_hash() {
        let folder = temp_folder("list");
        take_at(&folder, Reason::Start, b"started", "2026-10-05_1400");
        take_at(&folder, Reason::Start, b"started again", "2026-10-05_1412");
        take_at(&folder, Reason::Edit, b"edited", "2026-10-05_1412");
        take_at(&folder, Reason::Edit, b"edited again", "2026-10-05_1412");
        take_at(&folder, Reason::Restore, b"restored", "2026-10-05_1412");
        block_on(folder.write("gba/Emerald/backups/mine.sav", b"mine")).unwrap();

        let backups = block_on(list(&folder, "gba/Emerald.gba")).unwrap();

        let listed = |name: &str, at: &str, reason, bytes: &[u8]| Listed {
            name: name.into(),
            at: at.into(),
            reason,
            sha256: save::sha256(bytes),
            note: None,
        };
        assert_eq!(
            backups,
            [
                listed("2026-10-05_1412_restore.sav", "2026-10-05T14:12", Reason::Restore, b"restored"),
                listed("2026-10-05_1412_edit_2.sav", "2026-10-05T14:12", Reason::Edit, b"edited again"),
                listed("2026-10-05_1412_edit.sav", "2026-10-05T14:12", Reason::Edit, b"edited"),
                listed("2026-10-05_1412_start.sav", "2026-10-05T14:12", Reason::Start, b"started again"),
                listed("2026-10-05_1400_start.sav", "2026-10-05T14:00", Reason::Start, b"started"),
            ]
        );
    }

    #[test]
    #[cfg(unix)]
    fn lists_the_backups_it_can_read() {
        use std::os::unix::fs::PermissionsExt;
        let folder = temp_folder("list-unreadable");
        take_at(&folder, Reason::Start, b"started", "2026-10-05_1400");
        take_at(&folder, Reason::Edit, b"edited", "2026-10-05_1412");
        let root = folder.root();
        let unreadable = root.join("gba/Emerald/backups/2026-10-05_1412_edit.sav");
        std::fs::set_permissions(&unreadable, std::fs::Permissions::from_mode(0o000)).unwrap();

        let names: Vec<_> = block_on(list(&folder, "gba/Emerald.gba")).unwrap().into_iter().map(|backup| backup.name).collect();

        assert_eq!(names, ["2026-10-05_1400_start.sav"]);
    }

    #[test]
    fn lists_no_backups_for_a_game_without_any() {
        let folder = temp_folder("none");

        assert!(block_on(list(&folder, "gba/Emerald.gba")).unwrap().is_empty());
    }

    #[test]
    fn reads_a_backup_by_name() {
        let folder = temp_folder("read");
        take_at(&folder, Reason::Edit, b"edited", "2026-10-05_1412");

        assert_eq!(block_on(read(&folder, "gba/Emerald.gba", "2026-10-05_1412_edit.sav")).unwrap(), b"edited");
    }

    #[test]
    fn reads_only_backups() {
        let folder = temp_folder("read-others");
        block_on(folder.write("gba/Emerald.sav", b"save")).unwrap();

        assert!(block_on(read(&folder, "gba/Emerald.gba", "../../Emerald.sav")).is_err());
    }

    #[test]
    fn removes_a_backup_and_leaves_the_others() {
        let folder = temp_folder("remove");
        take_at(&folder, Reason::Start, b"started", "2026-10-05_1400");
        take_at(&folder, Reason::Edit, b"edited", "2026-10-05_1412");

        block_on(remove(&folder, "gba/Emerald.gba", "2026-10-05_1412_edit.sav")).unwrap();

        let names = names(&folder);
        assert_eq!(names, ["2026-10-05_1400_start.sav"]);
    }

    #[test]
    fn finds_a_free_name_for_a_backup_taken_elsewhere() {
        let taken = ["2026-10-05_1412_start_2.sav", "2026-10-05_1412_start_3.json"];

        let free = free_name("2026-10-05_1412_start.sav", |name| taken.contains(&name));

        assert_eq!(
            free,
            Some(("2026-10-05_1412_start.json".into(), "2026-10-05_1412_start_4.sav".into(), "2026-10-05_1412_start_4.json".into()))
        );
        assert_eq!(free_name("mine.sav", |_| false), None);
    }

    #[test]
    fn removes_only_backups() {
        let folder = temp_folder("remove-others");
        block_on(folder.write("gba/Emerald/backups/mine.sav", b"mine")).unwrap();

        assert_eq!(
            block_on(remove(&folder, "gba/Emerald.gba", "mine.sav")),
            Err("mine.sav isn't a backup".to_string())
        );
        assert!(block_on(folder.has_file("gba/Emerald/backups/mine.sav")));
    }

    fn saved_game(name: &str) -> GamesFolder<'static, tauri::Wry> {
        let folder = temp_folder(name);
        block_on(folder.write("gba/Emerald.sav", b"current")).unwrap();
        for file in ["resume.state", "resume.png", "resume.json"] {
            block_on(folder.write(&format!("gba/Emerald/states/{file}"), b"resume")).unwrap();
        }
        take_at(&folder, Reason::Edit, b"older", "2026-10-05_1400");
        folder
    }

    fn restore_at(folder: &GamesFolder<'static, tauri::Wry>, name: &str) -> Result<(), String> {
        block_on(restore(folder, "gba/Emerald.gba", name, "2026-10-05_1412", 10))
    }

    #[test]
    fn keeps_as_many_restore_backups_as_asked_apart_from_the_others() {
        let folder = saved_game("restore-keep");
        take_at(&folder, Reason::Start, b"started", "2026-10-05_1300");
        take_at(&folder, Reason::Transfer, b"transferred", "2026-10-05_1301");
        take_at(&folder, Reason::Load, b"loaded", "2026-10-05_1302");
        for minute in 0..3u8 {
            take_at(&folder, Reason::Restore, &[minute], &format!("2026-10-05_14{minute:02}"));
        }

        block_on(restore(&folder, "gba/Emerald.gba", "2026-10-05_1400_edit.sav", "2026-10-05_1412", 3)).unwrap();

        assert_eq!(
            names(&folder),
            [
                "2026-10-05_1300_start.sav",
                "2026-10-05_1301_transfer.sav",
                "2026-10-05_1302_load.sav",
                "2026-10-05_1400_edit.sav",
                "2026-10-05_1401_restore.sav",
                "2026-10-05_1402_restore.sav",
                "2026-10-05_1412_restore.sav",
            ]
        );
    }

    #[test]
    fn keeps_the_backup_taken_before_a_restore_when_asked_to_keep_none() {
        let folder = saved_game("restore-keep-none");
        take_at(&folder, Reason::Restore, b"restored", "2026-10-05_1405");

        block_on(restore(&folder, "gba/Emerald.gba", "2026-10-05_1400_edit.sav", "2026-10-05_1412", 0)).unwrap();

        assert_eq!(names(&folder), ["2026-10-05_1400_edit.sav", "2026-10-05_1412_restore.sav"]);
    }

    #[test]
    fn restores_a_backup_as_the_save_after_backing_up_the_current_one() {
        let folder = saved_game("restore");

        restore_at(&folder, "2026-10-05_1400_edit.sav").unwrap();

        assert_eq!(block_on(folder.read("gba/Emerald.sav")).unwrap(), b"older");
        assert_eq!(block_on(folder.read("gba/Emerald/backups/2026-10-05_1412_restore.sav")).unwrap(), b"current");
    }

    #[test]
    fn drops_the_resume_point_when_restoring() {
        let folder = saved_game("restore-resume");

        restore_at(&folder, "2026-10-05_1400_edit.sav").unwrap();

        for file in ["resume.state", "resume.png", "resume.json"] {
            assert!(!block_on(folder.has_file(&format!("gba/Emerald/states/{file}"))), "{file}");
        }
    }

    #[test]
    fn skips_backing_up_a_save_already_kept() {
        let folder = saved_game("restore-kept");
        take_at(&folder, Reason::Start, b"current", "2026-10-05_1405");

        restore_at(&folder, "2026-10-05_1400_edit.sav").unwrap();

        let names = names(&folder);
        assert_eq!(names, ["2026-10-05_1400_edit.sav", "2026-10-05_1405_start.sav"]);
    }

    #[test]
    fn restores_a_backup_for_a_game_without_a_save() {
        let folder = temp_folder("restore-none");
        take_at(&folder, Reason::Edit, b"older", "2026-10-05_1400");

        restore_at(&folder, "2026-10-05_1400_edit.sav").unwrap();

        assert_eq!(block_on(folder.read("gba/Emerald.sav")).unwrap(), b"older");
        assert_eq!(backups(&folder).len(), 1);
    }

    #[test]
    fn leaves_the_save_and_resume_point_alone_when_the_backup_is_missing() {
        let folder = saved_game("restore-missing");

        assert!(restore_at(&folder, "2026-10-05_1300_edit.sav").is_err());
        assert_eq!(block_on(folder.read("gba/Emerald.sav")).unwrap(), b"current");
        assert!(block_on(folder.has_file("gba/Emerald/states/resume.state")));
    }
}
