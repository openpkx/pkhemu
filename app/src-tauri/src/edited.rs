use crate::games_folder::GamesFolder;
use crate::{rom, save};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Runtime};

/// Says pkhemu changed a save, by an edit, a transfer or a cheat. RetroAchievements counts hardcore unlocks on it as
/// cheating, so it stays until a new game starts on the save.
#[derive(Serialize, Deserialize, Clone, Debug, Default, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Mark {
    /// The trainer the engine first read from the save after the change, as "TID/SID name".
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub trainer: Option<String>,
}

impl Mark {
    /// The mark once the engine reads `trainer` from the save, or None when that's a new game's trainer.
    pub fn settled(self, trainer: &str) -> Option<Mark> {
        match self.trainer {
            None => Some(Mark { trainer: Some(trainer.into()) }),
            Some(marked) if marked == trainer => Some(Mark { trainer: Some(marked) }),
            Some(_) => None,
        }
    }
}

pub fn path(rom: &str) -> String {
    format!("{}/edited.json", rom::data_dir(rom))
}

async fn has_save<R: Runtime>(folder: &GamesFolder<'_, R>, rom: &str) -> bool {
    for path in save::paths(rom) {
        if folder.has_file(&path).await {
            return true;
        }
    }
    false
}

/// The save's mark. A save that's gone takes its mark with it.
pub async fn read<R: Runtime>(folder: &GamesFolder<'_, R>, rom: &str) -> Option<Mark> {
    let path = path(rom);
    let json = folder.read(&path).await.ok()?;
    if !has_save(folder, rom).await {
        let _ = folder.remove_unlogged(&path).await;
        return None;
    }
    Some(serde_json::from_slice(&json).unwrap_or_default())
}

/// Forgets the trainer read before, since the change may have been to the trainer.
pub async fn mark<R: Runtime>(folder: &GamesFolder<'_, R>, rom: &str) -> Result<(), String> {
    put(folder, rom, Some(&Mark::default())).await
}

pub async fn put<R: Runtime>(folder: &GamesFolder<'_, R>, rom: &str, mark: Option<&Mark>) -> Result<(), String> {
    let path = path(rom);
    match mark {
        Some(mark) => {
            let json = serde_json::to_vec(mark).map_err(|e| e.to_string())?;
            folder.write(&path, &json).await
        }
        None if folder.has_file(&path).await => folder.remove_unlogged(&path).await,
        None => Ok(()),
    }
    .map_err(|e| format!("{path}: {e}"))
}

/// `sha256` names the save the engine read `trainer` from, so a read of a save sync has since replaced changes nothing.
pub async fn settle<R: Runtime>(
    folder: &GamesFolder<'_, R>,
    rom: &str,
    trainer: &str,
    sha256: &str,
) -> Result<bool, String> {
    let Some(mark) = read(folder, rom).await else { return Ok(false) };
    if save::read_file(folder, rom).await?.is_none_or(|save| save.sha256 != sha256) {
        return Ok(true);
    }
    let settled = mark.clone().settled(trainer);
    if settled.as_ref() != Some(&mark) {
        put(folder, rom, settled.as_ref()).await?;
    }
    Ok(settled.is_some())
}

#[tauri::command]
pub async fn edited_mark<R: Runtime>(app: AppHandle<R>, folder: String, path: String) -> bool {
    read(&GamesFolder::open(&app, &folder), &path).await.is_some()
}

#[tauri::command]
pub async fn settle_edited_mark<R: Runtime>(
    app: AppHandle<R>,
    folder: String,
    path: String,
    trainer: String,
    sha256: String,
) -> Result<bool, String> {
    settle(&GamesFolder::open(&app, &folder), &path, &trainer, &sha256).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use tauri::async_runtime::block_on;

    const EMERALD: &str = "gba/Emerald.gba";

    fn with_save(name: &str) -> GamesFolder<'static, tauri::Wry> {
        let root = std::env::temp_dir().join(format!("pkh-emu-edited-{name}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        std::fs::create_dir_all(root.join("gba")).unwrap();
        std::fs::write(root.join("gba/Emerald.sav"), b"save").unwrap();
        GamesFolder::at(root)
    }

    fn marked(folder: &GamesFolder<'static, tauri::Wry>) -> Option<Mark> {
        block_on(read(folder, EMERALD))
    }

    fn settled(folder: &GamesFolder<'static, tauri::Wry>, trainer: &str) -> bool {
        let save = block_on(save::read_file(folder, EMERALD)).unwrap().unwrap();
        block_on(settle(folder, EMERALD, trainer, &save.sha256)).unwrap()
    }

    #[test]
    fn a_save_pkhemu_never_changed_has_no_mark() {
        let folder = with_save("never");

        assert_eq!(marked(&folder), None);
        assert!(!settled(&folder, "12345/54321 MAY"));
    }

    #[test]
    fn a_change_marks_the_save() {
        let folder = with_save("change");

        block_on(mark(&folder, EMERALD)).unwrap();

        assert_eq!(marked(&folder), Some(Mark { trainer: None }));
    }

    #[test]
    fn keeps_the_mark_while_the_engine_reads_the_trainer_it_first_read() {
        let folder = with_save("same-trainer");
        block_on(mark(&folder, EMERALD)).unwrap();

        assert!(settled(&folder, "12345/54321 MAY"));
        assert!(settled(&folder, "12345/54321 MAY"));
        assert_eq!(marked(&folder), Some(Mark { trainer: Some("12345/54321 MAY".into()) }));
    }

    #[test]
    fn clears_the_mark_once_a_new_game_has_another_trainer() {
        let folder = with_save("new-game");
        block_on(mark(&folder, EMERALD)).unwrap();
        settled(&folder, "12345/54321 MAY");

        assert!(!settled(&folder, "40404/11111 BRENDAN"));
        assert_eq!(marked(&folder), None);
        assert!(!folder.root().join(path(EMERALD)).exists());
    }

    #[test]
    fn a_new_change_forgets_the_trainer_read_before() {
        let folder = with_save("renamed");
        block_on(mark(&folder, EMERALD)).unwrap();
        settled(&folder, "12345/54321 MAY");

        block_on(mark(&folder, EMERALD)).unwrap();

        assert!(settled(&folder, "12345/54321 APRIL"));
    }

    #[test]
    fn ignores_a_trainer_read_from_a_save_that_has_since_been_replaced() {
        let folder = with_save("replaced-read");
        block_on(mark(&folder, EMERALD)).unwrap();
        settled(&folder, "12345/54321 MAY");

        let stale = save::sha256(b"an older save");

        assert!(block_on(settle(&folder, EMERALD, "40404/11111 BRENDAN", &stale)).unwrap());
        assert_eq!(marked(&folder), Some(Mark { trainer: Some("12345/54321 MAY".into()) }));
    }

    #[test]
    fn a_deleted_save_takes_its_mark_with_it() {
        let folder = with_save("deleted");
        block_on(mark(&folder, EMERALD)).unwrap();

        std::fs::remove_file(folder.root().join("gba/Emerald.sav")).unwrap();

        assert_eq!(marked(&folder), None);
        std::fs::write(folder.root().join("gba/Emerald.sav"), b"another save").unwrap();
        assert_eq!(marked(&folder), None);
    }

    #[test]
    fn puts_and_clears_the_mark_a_sync_brings() {
        let folder = with_save("synced");
        let mark = Mark { trainer: Some("12345/54321 MAY".into()) };

        block_on(put(&folder, EMERALD, Some(&mark))).unwrap();
        assert_eq!(marked(&folder), Some(mark));

        block_on(put(&folder, EMERALD, None)).unwrap();
        block_on(put(&folder, EMERALD, None)).unwrap();
        assert_eq!(marked(&folder), None);
    }
}
