use crate::clock::Clock;
use crate::games_folder::GamesFolder;
use crate::resume;
use crate::retro::{Core, CoreInfo};
use crate::rom::{self, StateName};
use crate::save::{self, game_cube::Card, Slot, Watch};
use serde::{Deserialize, Serialize};
use tauri::Runtime;

pub const REJECTED: &str = "state-rejected";

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Default)]
#[serde(rename_all = "camelCase")]
pub struct Info {
    pub saved_at: f64,
    pub play_since_save: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub slot: Option<u8>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub core: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub core_version: Option<String>,
}

impl Info {
    pub fn loads_in(&self, running: &CoreInfo) -> bool {
        running.wrote(self.core.as_deref(), self.core_version.as_deref())
    }
}

pub struct Saved {
    pub state: Vec<u8>,
    pub screenshot: Option<Vec<u8>>,
    pub save: Vec<u8>,
    pub info: Info,
}

pub struct Loaded {
    pub state: Vec<u8>,
    pub save: Vec<u8>,
    pub info: Info,
}

#[derive(Serialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Listed {
    pub slot: u8,
    pub loadable: bool,
    #[serde(flatten)]
    pub info: Info,
}

pub fn check(slot: u8) -> Result<u8, String> {
    (1..=rom::STATE_SLOTS).contains(&slot).then_some(slot).ok_or_else(|| format!("there's no slot {slot}"))
}

fn other_extension(extension: &str) -> &'static str {
    if extension == "dsv" { "sav" } else { "dsv" }
}

pub async fn write<R: Runtime>(
    folder: &GamesFolder<'_, R>,
    rom: &str,
    save_slot: &Slot,
    name: impl Into<StateName>,
    saved: Saved,
) -> Result<(), String> {
    let name = name.into();
    let screenshot_path = rom::state_screenshot_path(rom, name);
    match saved.screenshot {
        Some(screenshot) => {
            if let Err(e) = folder.write(&screenshot_path, &screenshot).await {
                eprintln!("{screenshot_path}: {e}");
            }
        }
        None => {
            let _ = folder.remove(rom, &screenshot_path).await;
        }
    }
    let extension = save_slot.extension();
    let stale = rom::state_save_path(rom, name, other_extension(extension));
    if folder.has_file(&stale).await {
        folder.remove(rom, &stale).await.map_err(|e| format!("{stale}: {e}"))?;
    }
    let state_path = rom::state_path(rom, name);
    // A slot counts as filled once its state is there, so the state goes last and an old one goes first.
    if folder.has_file(&state_path).await {
        folder.remove(rom, &state_path).await.map_err(|e| format!("{state_path}: {e}"))?;
    }
    let info = serde_json::to_vec(&saved.info).expect("the state info is plain JSON");
    let files = [
        (rom::state_info_path(rom, name), info),
        (rom::state_save_path(rom, name, extension), save_slot.file(&saved.save)),
        (state_path, saved.state),
    ];
    for (path, file) in files {
        folder.write(&path, &file).await.map_err(|e| format!("{path}: {e}"))?;
    }
    Ok(())
}

async fn info<R: Runtime>(folder: &GamesFolder<'_, R>, rom: &str, name: StateName) -> Result<Info, String> {
    let path = rom::state_info_path(rom, name);
    let file = folder.read(&path).await.map_err(|e| format!("{path}: {e}"))?;
    serde_json::from_slice(&file).map_err(|e| format!("{path}: {e}"))
}

pub async fn list<R: Runtime>(folder: &GamesFolder<'_, R>, rom: &str, running: Option<&CoreInfo>) -> Vec<Listed> {
    let dir = format!("{}/states", rom::data_dir(rom));
    let names: Vec<String> = match folder.read_dir(&dir).await {
        Ok(entries) => entries.into_iter().map(|entry| entry.name).collect(),
        Err(_) => return Vec::new(),
    };
    let mut listed = Vec::new();
    for slot in 1..=rom::STATE_SLOTS {
        if !names.contains(&format!("{}.state", StateName::Slot(slot))) {
            continue;
        }
        match info(folder, rom, slot.into()).await {
            Ok(info) => {
                let loadable = running.is_none_or(|running| info.loads_in(running));
                listed.push(Listed { slot, loadable, info })
            }
            Err(e) => eprintln!("{e}"),
        }
    }
    listed
}

pub async fn screenshot<R: Runtime>(folder: &GamesFolder<'_, R>, rom: &str, slot: u8) -> Option<Vec<u8>> {
    folder.read(&rom::state_screenshot_path(rom, slot)).await.ok()
}

pub async fn read<R: Runtime>(
    folder: &GamesFolder<'_, R>,
    rom: &str,
    name: impl Into<StateName>,
    running: &CoreInfo,
) -> Result<Loaded, String> {
    let name = name.into();
    let info = info(folder, rom, name).await?;
    if !info.loads_in(running) {
        let (core, version) = (info.core.unwrap_or_default(), info.core_version.unwrap_or_default());
        return Err(format!("{name} was saved by {core} {version}"));
    }
    let path = rom::state_path(rom, name);
    let state = folder.read(&path).await.map_err(|e| format!("{path}: {e}"))?;
    let mut save = Err(format!("{name} has no save"));
    for extension in ["dsv", "sav", "srm", "raw"] {
        let path = rom::state_save_path(rom, name, extension);
        if let Ok(file) = folder.read(&path).await {
            save = Ok(Slot::new(path, file).1);
            break;
        }
    }
    Ok(Loaded { state, save: save?, info })
}

pub async fn has<R: Runtime>(folder: &GamesFolder<'_, R>, rom: &str, name: impl Into<StateName>) -> bool {
    folder.has_file(&rom::state_path(rom, name)).await
}

pub async fn remove<R: Runtime>(folder: &GamesFolder<'_, R>, rom: &str, name: impl Into<StateName>) -> Result<(), String> {
    let name = name.into();
    let paths = [
        rom::state_path(rom, name),
        rom::state_info_path(rom, name),
        rom::state_screenshot_path(rom, name),
        rom::state_save_path(rom, name, "sav"),
        rom::state_save_path(rom, name, "dsv"),
        rom::state_save_path(rom, name, "srm"),
        rom::state_save_path(rom, name, "raw"),
    ];
    for path in paths {
        if folder.has_file(&path).await {
            folder.remove(rom, &path).await.map_err(|e| format!("{path}: {e}"))?;
        }
    }
    Ok(())
}

pub async fn delete<R: Runtime>(folder: &GamesFolder<'_, R>, rom: &str, slot: u8) -> Result<(), String> {
    remove(folder, rom, slot).await?;
    if let Some(before) = info(folder, rom, StateName::BeforeLoad).await.ok().filter(|info| info.slot == Some(slot)) {
        let path = rom::state_info_path(rom, StateName::BeforeLoad);
        let info = serde_json::to_vec(&Info { slot: None, ..before }).expect("the state info is plain JSON");
        folder.write(&path, &info).await.map_err(|e| format!("{path}: {e}"))?;
    }
    resume::forget_slot(folder, rom, slot).await
}

pub fn load(
    core: &mut Core,
    clock: &Clock,
    watch: &mut Watch,
    loaded: &Loaded,
    frames_since_save: Option<u64>,
    before: &Saved,
    back_up: impl FnOnce(&[u8]) -> Result<(), String>,
) -> Result<Vec<u8>, String> {
    let mut state = loaded.state.clone();
    clock.set(&mut state).map_err(|e| {
        eprintln!("{e}");
        REJECTED.to_string()
    })?;
    back_up(&before.save).map_err(|e| format!("couldn't back up the save: {e}"))?;
    if !core.unserialize(&state) {
        if !core.unserialize(&before.state) {
            eprintln!("the core couldn't go back to the state from before the load");
        }
        let [save_ram, rtc] = core.save_memory();
        save::fill(save_ram, rtc, &before.save);
        return Err(REJECTED.into());
    }
    // mGBA leaves save memory alone when loading a state and melonDS DS restores it, so the copy makes both alike.
    let [save_ram, rtc] = core.save_memory();
    save::fill(save_ram, rtc, &loaded.save);
    let [save_ram, rtc] = core.save_memory();
    Ok(watch.load([save_ram, rtc], frames_since_save))
}

// Dolphin leaves the memory card out of its states and reads it only as the game boots, so the game boots again with
// the state's card. A state saved before Dolphin first wrote its card keeps the card there is.
pub fn load_with_card(
    core: &mut Core,
    card: &mut Card,
    watch: &mut Watch,
    loaded: &Loaded,
    frames_since_save: Option<u64>,
    before: &mut Saved,
    back_up: impl FnOnce(&[u8]) -> Result<(), String>,
) -> Result<Vec<u8>, String> {
    let placed = core.reboot(|| {
        // Dolphin has just written the card as it unloaded, with any save from the last 15 seconds.
        before.save = card.read().concat();
        back_up(&before.save).map_err(|e| format!("couldn't back up the save: {e}"))?;
        place_unless_empty(card, &loaded.save)
    })?;
    if let Err(e) = placed {
        go_back(core, &before.state);
        return Err(e);
    }
    if !core.unserialize(&loaded.state) {
        if let Err(e) = core.reboot(|| place_unless_empty(card, &before.save))? {
            eprintln!("{e}");
        }
        go_back(core, &before.state);
        return Err(REJECTED.into());
    }
    Ok(watch.load(card.read(), frames_since_save))
}

fn place_unless_empty(card: &mut Card, save: &[u8]) -> Result<(), String> {
    if save.is_empty() {
        return Ok(());
    }
    card.place(Some(save)).map_err(|e| format!("couldn't place the memory card: {e}"))
}

fn go_back(core: &mut Core, state: &[u8]) {
    if !core.unserialize(state) {
        eprintln!("the core couldn't go back to the state from before the load");
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tauri::async_runtime::block_on;

    fn temp_folder(name: &str) -> GamesFolder<'static, tauri::Wry> {
        let root = std::env::temp_dir().join(format!("pkh-emu-states-{name}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        std::fs::create_dir_all(&root).unwrap();
        GamesFolder::at(root)
    }

    fn saved(state: &[u8], save: &[u8], saved_at: f64) -> Saved {
        Saved {
            state: state.to_vec(),
            screenshot: Some(b"png".to_vec()),
            save: save.to_vec(),
            info: Info { saved_at, play_since_save: Some(12.5), ..made_by(&mgba()) },
        }
    }

    fn mgba() -> CoreInfo {
        CoreInfo { name: "mGBA".into(), version: "0.10.5".into() }
    }

    fn made_by(core: &CoreInfo) -> Info {
        Info { core: Some(core.name.clone()), core_version: Some(core.version.clone()), ..Info::default() }
    }

    fn sav() -> Slot {
        Slot::new("gba/Emerald.sav".into(), Vec::new()).0
    }

    fn footer() -> Vec<u8> {
        [vec![7; 0x7A - 16], b"|-DESMUME SAVE-|".to_vec()].concat()
    }

    #[test]
    fn writes_the_slot_files_in_the_states_folder() {
        let folder = temp_folder("write");

        block_on(write(&folder, "gba/Emerald.gba", &sav(), 3, saved(b"state", b"save", 1000.0))).unwrap();

        let read = |name: &str| block_on(folder.read(&format!("gba/Emerald/states/{name}"))).unwrap();
        assert_eq!(read("slot-3.state"), b"state");
        assert_eq!(read("slot-3.png"), b"png");
        assert_eq!(read("slot-3.sav"), b"save");
        assert_eq!(
            read("slot-3.json"),
            br#"{"savedAt":1000.0,"playSinceSave":12.5,"core":"mGBA","coreVersion":"0.10.5"}"#
        );
    }

    #[test]
    fn keeps_a_dsv_footer_on_the_save_copy_and_reads_it_back_without() {
        let folder = temp_folder("dsv");
        let dsv = Slot::new("nds/HeartGold.dsv".into(), [b"".as_slice(), &footer()].concat()).0;

        block_on(write(&folder, "nds/HeartGold.nds", &dsv, 1, saved(b"state", b"save", 1000.0))).unwrap();

        assert_eq!(
            block_on(folder.read("nds/HeartGold/states/slot-1.dsv")).unwrap(),
            [b"save".as_slice(), &footer()].concat()
        );
        assert_eq!(block_on(read(&folder, "nds/HeartGold.nds", 1, &mgba())).unwrap().save, b"save");
    }

    #[test]
    fn keeps_an_n64_games_whole_save_memory_with_its_state() {
        let folder = temp_folder("n64");
        let (slot, _) = block_on(crate::save::open(&folder, "n64/Stadium.z64")).unwrap();
        let memory = crate::save::tests::stadium_memory();

        block_on(write(&folder, "n64/Stadium.z64", &slot, 2, saved(b"state", &memory, 1000.0))).unwrap();

        assert_eq!(block_on(folder.read("n64/Stadium/states/slot-2.srm")).unwrap(), memory);
        assert_eq!(block_on(read(&folder, "n64/Stadium.z64", 2, &mgba())).unwrap().save, memory);
        block_on(remove(&folder, "n64/Stadium.z64", 2)).unwrap();
        assert!(!block_on(folder.has_file("n64/Stadium/states/slot-2.srm")));
    }

    #[test]
    fn lists_the_filled_slots_with_when_they_were_saved() {
        let folder = temp_folder("list");
        block_on(write(&folder, "gba/Emerald.gba", &sav(), 7, saved(b"seven", b"save", 2000.0))).unwrap();
        block_on(write(&folder, "gba/Emerald.gba", &sav(), 2, saved(b"two", b"save", 1000.0))).unwrap();
        block_on(folder.write("gba/Emerald/states/resume.state", b"resume")).unwrap();

        let listed = block_on(list(&folder, "gba/Emerald.gba", Some(&mgba())));

        let info = |saved_at| Info { saved_at, play_since_save: Some(12.5), ..made_by(&mgba()) };
        assert_eq!(
            listed,
            [
                Listed { slot: 2, loadable: true, info: info(1000.0) },
                Listed { slot: 7, loadable: true, info: info(2000.0) }
            ]
        );
    }

    #[test]
    fn refuses_a_slot_saved_by_another_core_version() {
        let folder = temp_folder("other-version");
        let newer = CoreInfo { version: "0.11.0".into(), ..mgba() };
        let saved = Saved { info: Info { saved_at: 1000.0, ..made_by(&newer) }, ..saved(b"state", b"save", 1000.0) };
        block_on(write(&folder, "gba/Emerald.gba", &sav(), 4, saved)).unwrap();

        let listed = block_on(list(&folder, "gba/Emerald.gba", Some(&mgba())));

        assert_eq!(listed.iter().map(|listed| (listed.slot, listed.loadable)).collect::<Vec<_>>(), [(4, false)]);
        assert!(block_on(read(&folder, "gba/Emerald.gba", 4, &mgba())).is_err());
        assert!(block_on(read(&folder, "gba/Emerald.gba", 4, &newer)).is_ok());
    }

    #[test]
    fn loads_a_slot_from_before_cores_were_recorded() {
        let folder = temp_folder("unrecorded");
        block_on(write(&folder, "gba/Emerald.gba", &sav(), 4, saved(b"state", b"save", 1000.0))).unwrap();
        block_on(folder.write("gba/Emerald/states/slot-4.json", br#"{"savedAt":1000.0,"playSinceSave":null}"#))
            .unwrap();

        let listed = block_on(list(&folder, "gba/Emerald.gba", Some(&mgba())));

        assert!(listed[0].loadable);
        assert_eq!(block_on(read(&folder, "gba/Emerald.gba", 4, &mgba())).unwrap().state, b"state");
    }

    #[test]
    fn lists_no_slots_for_a_game_without_states() {
        assert_eq!(block_on(list(&temp_folder("none"), "gba/Emerald.gba", Some(&mgba()))), []);
    }

    #[test]
    fn reads_a_slot_back() {
        let folder = temp_folder("read");
        block_on(write(&folder, "gba/Emerald.gba", &sav(), 4, saved(b"state", b"save", 1000.0))).unwrap();

        let loaded = block_on(read(&folder, "gba/Emerald.gba", 4, &mgba())).unwrap();

        assert_eq!((loaded.state, loaded.save, loaded.info.saved_at), (b"state".to_vec(), b"save".to_vec(), 1000.0));
        assert_eq!(block_on(screenshot(&folder, "gba/Emerald.gba", 4)), Some(b"png".to_vec()));
    }

    #[test]
    fn overwrites_a_slot() {
        let folder = temp_folder("overwrite");
        block_on(write(&folder, "gba/Emerald.gba", &sav(), 4, saved(b"old", b"old save", 1000.0))).unwrap();

        block_on(write(&folder, "gba/Emerald.gba", &sav(), 4, saved(b"new", b"new save", 2000.0))).unwrap();

        let loaded = block_on(read(&folder, "gba/Emerald.gba", 4, &mgba())).unwrap();
        assert_eq!((loaded.state, loaded.save), (b"new".to_vec(), b"new save".to_vec()));
    }

    #[test]
    fn empties_an_overwritten_slot_when_its_new_state_can_not_be_written() {
        let folder = temp_folder("overwrite-failed");
        block_on(write(&folder, "gba/Emerald.gba", &sav(), 4, saved(b"old", b"old save", 1000.0))).unwrap();
        let root = folder.root();
        std::fs::create_dir_all(root.join("gba/Emerald/states/slot-4.state.partial")).unwrap();

        assert!(block_on(write(&folder, "gba/Emerald.gba", &sav(), 4, saved(b"new", b"new save", 2000.0))).is_err());

        assert_eq!(block_on(list(&folder, "gba/Emerald.gba", Some(&mgba()))), []);
    }

    #[test]
    fn keeps_the_current_slot_in_the_info_of_the_state_before_a_load() {
        let folder = temp_folder("before-load");
        let before = Saved { info: Info { slot: Some(3), ..saved(b"", b"", 1000.0).info }, ..saved(b"state", b"save", 1000.0) };

        block_on(write(&folder, "gba/Emerald.gba", &sav(), StateName::BeforeLoad, before)).unwrap();

        let loaded = block_on(read(&folder, "gba/Emerald.gba", StateName::BeforeLoad, &mgba())).unwrap();
        assert_eq!((loaded.state, loaded.save, loaded.info.slot), (b"state".to_vec(), b"save".to_vec(), Some(3)));
        assert!(block_on(has(&folder, "gba/Emerald.gba", StateName::BeforeLoad)));
        assert_eq!(block_on(list(&folder, "gba/Emerald.gba", Some(&mgba()))), []);
    }

    #[test]
    fn removes_every_file_of_a_state() {
        let folder = temp_folder("remove");
        block_on(write(&folder, "gba/Emerald.gba", &sav(), StateName::BeforeLoad, saved(b"state", b"save", 1000.0))).unwrap();
        block_on(write(&folder, "gba/Emerald.gba", &sav(), 2, saved(b"two", b"save", 1000.0))).unwrap();

        block_on(remove(&folder, "gba/Emerald.gba", StateName::BeforeLoad)).unwrap();

        let mut names: Vec<_> =
            block_on(folder.read_dir("gba/Emerald/states")).unwrap().into_iter().map(|entry| entry.name).collect();
        names.sort();
        assert_eq!(names, ["slot-2.json", "slot-2.png", "slot-2.sav", "slot-2.state"]);
        assert!(!block_on(has(&folder, "gba/Emerald.gba", StateName::BeforeLoad)));
    }

    #[test]
    fn deletes_every_file_of_a_slot() {
        let folder = temp_folder("delete");
        block_on(write(&folder, "gba/Emerald.gba", &sav(), 3, saved(b"three", b"save", 1000.0))).unwrap();
        block_on(write(&folder, "gba/Emerald.gba", &sav(), 5, saved(b"five", b"save", 2000.0))).unwrap();

        block_on(delete(&folder, "gba/Emerald.gba", 3)).unwrap();

        let mut names: Vec<_> =
            block_on(folder.read_dir("gba/Emerald/states")).unwrap().into_iter().map(|entry| entry.name).collect();
        names.sort();
        assert_eq!(names, ["slot-5.json", "slot-5.png", "slot-5.sav", "slot-5.state"]);
    }

    #[test]
    fn deleting_the_slot_the_resume_state_came_from_clears_it() {
        let folder = temp_folder("delete-current");
        block_on(write(&folder, "gba/Emerald.gba", &sav(), 3, saved(b"three", b"save", 1000.0))).unwrap();
        block_on(folder.write("gba/Emerald/states/resume.json", br#"{"playSinceSave":4.0,"slot":3}"#)).unwrap();

        block_on(delete(&folder, "gba/Emerald.gba", 3)).unwrap();

        let info = block_on(resume::info(&folder, "gba/Emerald.gba")).unwrap();
        assert_eq!(info, resume::Info { play_since_save: Some(4.0), ..resume::Info::default() });
    }

    #[test]
    fn deleting_the_slot_a_load_can_go_back_to_clears_it() {
        let folder = temp_folder("delete-before-load");
        let before = Saved { info: Info { slot: Some(3), ..saved(b"", b"", 1000.0).info }, ..saved(b"state", b"save", 1000.0) };
        block_on(write(&folder, "gba/Emerald.gba", &sav(), StateName::BeforeLoad, before)).unwrap();
        block_on(write(&folder, "gba/Emerald.gba", &sav(), 3, saved(b"three", b"save", 1000.0))).unwrap();

        block_on(delete(&folder, "gba/Emerald.gba", 3)).unwrap();

        let loaded = block_on(read(&folder, "gba/Emerald.gba", StateName::BeforeLoad, &mgba())).unwrap();
        assert_eq!((loaded.state, loaded.info.slot), (b"state".to_vec(), None));
    }

    #[test]
    fn deleting_another_slot_keeps_the_one_the_resume_state_came_from() {
        let folder = temp_folder("delete-other");
        block_on(write(&folder, "gba/Emerald.gba", &sav(), 3, saved(b"three", b"save", 1000.0))).unwrap();
        block_on(folder.write("gba/Emerald/states/resume.json", br#"{"playSinceSave":4.0,"slot":5}"#)).unwrap();

        block_on(delete(&folder, "gba/Emerald.gba", 3)).unwrap();

        assert_eq!(block_on(resume::info(&folder, "gba/Emerald.gba")).unwrap().slot, Some(5));
    }

    #[test]
    fn refuses_slots_out_of_range() {
        assert!(check(0).is_err());
        assert!(check(11).is_err());
        assert_eq!(check(10), Ok(10));
    }
}
