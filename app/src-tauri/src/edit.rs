use crate::backups::{self, Reason};
use crate::games_folder::GamesFolder;
use crate::retro::Core;
use crate::save::{self, Slot, Watch};
use crate::resume;
use tauri::Runtime;

pub struct Undo {
    state: Vec<u8>,
    save: Vec<u8>,
    watch: Watch,
}

pub trait Cart {
    fn save_memory(&mut self) -> [&mut [u8]; 2];
    fn serialize(&mut self) -> Option<Vec<u8>>;
    fn reset(&mut self);
}

impl Cart for Core {
    fn save_memory(&mut self) -> [&mut [u8]; 2] {
        Core::save_memory(self)
    }

    fn serialize(&mut self) -> Option<Vec<u8>> {
        Core::serialize(self)
    }

    fn reset(&mut self) {
        Core::reset(self)
    }
}

pub fn read(cart: &mut impl Cart) -> Option<Vec<u8>> {
    let [save_ram, _] = cart.save_memory();
    let save = &save_ram[save::editable(save_ram)];
    (!save.iter().all(|&byte| byte == 0xFF)).then(|| save.to_vec())
}

pub fn apply(
    cart: &mut impl Cart,
    watch: &mut Watch,
    edited: &[u8],
    back_up: impl FnOnce(&[u8]) -> Result<(), String>,
) -> Result<(Undo, Vec<u8>), String> {
    let [save_ram, _] = cart.save_memory();
    let at = save::editable(save_ram);
    if edited.len() != at.len() {
        return Err(format!("the edited save is {} bytes, but the game's is {}", edited.len(), at.len()));
    }
    let state = cart.serialize().ok_or("the core couldn't save its state")?;
    let [save_ram, rtc] = cart.save_memory();
    let save = [&*save_ram, &*rtc].concat();
    back_up(&save).map_err(|e| format!("couldn't back up the save: {e}"))?;
    let before = watch.clone();
    cart.reset();
    // melonDS DS's reset copies the cart's old save back into save RAM, and the cart only takes save RAM on the next frame.
    let [save_ram, rtc] = cart.save_memory();
    save_ram[at].copy_from_slice(edited);
    let flushed = watch.flush([save_ram, rtc]);
    Ok((Undo { state, save, watch: before }, flushed))
}

#[derive(serde::Deserialize)]
pub struct TransferWrite {
    pub path: String,
    pub save: Vec<u8>,
    pub note: String,
}

pub async fn apply_file<R: Runtime>(
    folder: &GamesFolder<'_, R>,
    rom: &str,
    edited: &[u8],
    at: &str,
) -> Result<(), String> {
    let opened = open_for(folder, rom, edited).await?;
    write_over(folder, rom, opened, edited, Reason::Edit, None, at).await
}

// The destination goes first, so a failure in between leaves the Pokémon in both saves rather than in neither.
pub async fn write_transfer<R: Runtime>(
    folder: &GamesFolder<'_, R>,
    destination: &TransferWrite,
    source: &TransferWrite,
    at: &str,
) -> Result<(), String> {
    let mut opened = Vec::new();
    for game in [destination, source] {
        opened.push(open_for(folder, &game.path, &game.save).await.map_err(|e| format!("{}: {e}", game.path))?);
    }
    for (game, opened) in [destination, source].into_iter().zip(opened) {
        write_over(folder, &game.path, opened, &game.save, Reason::Transfer, Some(&game.note), at)
            .await
            .map_err(|e| format!("{}: {e}", game.path))?;
    }
    Ok(())
}

async fn open_for<R: Runtime>(folder: &GamesFolder<'_, R>, rom: &str, new_save: &[u8]) -> Result<(Slot, Vec<u8>), String> {
    let (slot, save) = save::open(folder, rom).await?;
    let save = save.ok_or("the game has no save to write over")?;
    let size = save::editable(&save).len();
    if new_save.len() > size {
        return Err(format!("the new save is {} bytes, but the game's is {size}", new_save.len()));
    }
    Ok((slot, save))
}

async fn write_over<R: Runtime>(
    folder: &GamesFolder<'_, R>,
    rom: &str,
    (slot, save): (Slot, Vec<u8>),
    new_save: &[u8],
    reason: Reason,
    note: Option<&str>,
    at: &str,
) -> Result<(), String> {
    backups::take(folder, rom, &slot, reason, &save, at, note)
        .await
        .map_err(|e| format!("couldn't back up the save: {e}"))?;
    // The file can end with the emulator's clock after the save RAM, which the new save leaves as it was.
    let mut file = save;
    let start = save::editable(&file).start;
    file[start..start + new_save.len()].copy_from_slice(new_save);
    slot.write(folder, &file).await?;
    resume::remove(folder, rom).await
}

pub fn undo(core: &mut Core, watch: &mut Watch, before: Undo) -> Result<Vec<u8>, String> {
    if !core.unserialize(&before.state) {
        return Err("the core couldn't load the state from before the edit".into());
    }
    let [save_ram, rtc] = core.save_memory();
    save::fill(save_ram, rtc, &before.save);
    *watch = before.watch;
    Ok(before.save)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_games::{boot_counting_rom, counting_rom, lock_core, pattern};
    use std::sync::MutexGuard;
    use tauri::async_runtime::block_on;

    fn save_memory(core: &mut Core) -> Vec<u8> {
        let [save_ram, rtc] = core.save_memory();
        [&*save_ram, &*rtc].concat()
    }

    fn no_backup(_: &[u8]) -> Result<(), String> {
        Ok(())
    }

    // Fields drop in order, so the core unloads before the next test can load one.
    struct Game {
        core: Core,
        watch: Watch,
        _lock: MutexGuard<'static, ()>,
    }

    impl Game {
        fn start(rom: crate::rom::Rom, file: Option<&[u8]>) -> Game {
            let lock = lock_core();
            let mut core = Core::load(rom, &std::env::temp_dir()).unwrap();
            if let Some(file) = file {
                let [save_ram, rtc] = core.save_memory();
                save::fill(save_ram, rtc, file);
            }
            let mut game = Game { core, watch: Watch::new(), _lock: lock };
            game.play(1);
            game
        }

        fn play(&mut self, frames: u32) -> Vec<Vec<u8>> {
            let Game { core, watch, .. } = self;
            (0..frames)
                .filter_map(|_| {
                    core.run_frame();
                    watch.after_frame(|| {
                        let [save_ram, rtc] = core.save_memory();
                        [&*save_ram, &*rtc]
                    })
                })
                .collect()
        }
    }

    #[test]
    fn reads_save_ram_without_the_clock() {
        let file = pattern(0x8030, 1);
        let mut game = Game::start(counting_rom(), Some(&file));

        assert_eq!(read(&mut game.core).as_deref(), Some(&file[..0x8000]));
    }

    #[test]
    fn reads_no_save_yet_when_the_game_has_never_saved() {
        let mut game = Game::start(counting_rom(), None);

        assert_eq!(read(&mut game.core), None);
    }

    #[test]
    fn writes_the_edit_into_save_ram_and_restarts_the_game_on_it() {
        let mut game = Game::start(boot_counting_rom(), Some(&pattern(0x8030, 1)));
        game.play(60);
        let clock = game.core.save_memory()[1].to_vec();
        let mut edited = pattern(0x8000, 7);
        edited[0] = 40;

        let (_, flushed) = apply(&mut game.core, &mut game.watch, &edited, no_backup).unwrap();
        game.play(60);

        assert_eq!(flushed, [&edited[..], &clock].concat());
        assert_eq!(game.core.save_ram()[0], 41);
        assert_eq!(game.core.save_ram()[1..], edited[1..]);
    }

    #[test]
    fn does_not_write_the_flushed_edit_again() {
        let mut game = Game::start(counting_rom(), Some(&pattern(0x8030, 1)));
        game.play(60);

        apply(&mut game.core, &mut game.watch, &pattern(0x8000, 7), no_backup).unwrap();

        assert!(game.play(120).is_empty());
    }

    #[test]
    fn backs_up_the_save_as_it_was_before_the_edit() {
        let mut game = Game::start(boot_counting_rom(), Some(&pattern(0x8030, 1)));
        game.play(60);
        let save = save_memory(&mut game.core);
        let mut backup = None;

        apply(&mut game.core, &mut game.watch, &pattern(0x8000, 7), |file| {
            backup = Some(file.to_vec());
            Ok(())
        })
        .unwrap();

        assert_eq!(backup, Some(save));
    }

    #[test]
    fn leaves_the_game_alone_when_the_backup_fails() {
        let file = pattern(0x8030, 1);
        let mut game = Game::start(counting_rom(), Some(&file));
        game.play(60);
        let paused = game.core.serialize().unwrap();

        let applied = apply(&mut game.core, &mut game.watch, &pattern(0x8000, 7), |_| Err("disk full".into()));

        assert!(applied.is_err());
        assert_eq!(save_memory(&mut game.core), file);
        assert_eq!(game.core.serialize().unwrap(), paused);
    }

    #[test]
    fn refuses_an_edit_the_size_of_a_different_save() {
        let file = pattern(0x8030, 1);
        let mut game = Game::start(counting_rom(), Some(&file));

        assert!(apply(&mut game.core, &mut game.watch, &pattern(0x8030, 7), no_backup).is_err());
        assert_eq!(save_memory(&mut game.core), file);
    }

    #[test]
    fn undo_brings_back_the_paused_game_with_its_unsaved_progress_and_save() {
        let mut game = Game::start(boot_counting_rom(), Some(&pattern(0x8030, 1)));
        game.play(60);
        let paused = game.core.serialize().unwrap();
        let save = save_memory(&mut game.core);
        let (previous, _) = apply(&mut game.core, &mut game.watch, &pattern(0x8000, 7), no_backup).unwrap();
        game.play(60);

        let flushed = undo(&mut game.core, &mut game.watch, previous).unwrap();

        assert_eq!(flushed, save);
        assert_eq!(game.core.serialize().unwrap(), paused);
        assert!(game.play(120).is_empty());
    }

    struct N64Memory {
        save_ram: Vec<u8>,
        resets: u32,
    }

    impl Cart for N64Memory {
        fn save_memory(&mut self) -> [&mut [u8]; 2] {
            [&mut self.save_ram, &mut []]
        }

        fn serialize(&mut self) -> Option<Vec<u8>> {
            Some(vec![])
        }

        fn reset(&mut self) {
            self.resets += 1;
        }
    }

    fn n64_memory(memory: &[u8]) -> N64Memory {
        N64Memory { save_ram: memory.to_vec(), resets: 0 }
    }

    #[test]
    fn reads_and_applies_only_the_flash_ram_of_an_n64_save() {
        let mut memory = crate::save::tests::stadium_memory();
        memory[..0x800].copy_from_slice(&pattern(0x800, 3));
        let mut cart = n64_memory(&memory);
        let edited = pattern(0x20000, 7);

        assert_eq!(read(&mut cart), Some(memory[0x28800..].to_vec()));
        let (_, flushed) = apply(&mut cart, &mut Watch::new(), &edited, no_backup).unwrap();

        memory[0x28800..].copy_from_slice(&edited);
        assert_eq!(cart.save_ram, memory);
        assert_eq!(flushed, memory);
        assert_eq!(cart.resets, 1);
    }

    #[test]
    fn reads_and_applies_the_sram_of_an_n64_save_without_flash_ram() {
        let mut memory = crate::save::n64::tests::fresh_memory(9);
        memory[0x20800..0x28800].copy_from_slice(&pattern(0x8000, 1));
        let mut cart = n64_memory(&memory);
        let edited = pattern(0x8000, 7);

        assert_eq!(read(&mut cart), Some(pattern(0x8000, 1)));
        apply(&mut cart, &mut Watch::new(), &edited, no_backup).unwrap();

        memory[0x20800..0x28800].copy_from_slice(&edited);
        assert_eq!(cart.save_ram, memory);
    }

    #[test]
    fn reads_no_save_yet_when_an_n64_game_has_written_neither_flash_ram_nor_sram() {
        let mut memory = crate::save::n64::tests::fresh_memory(9);
        memory[..0x800].copy_from_slice(&pattern(0x800, 3));

        assert_eq!(read(&mut n64_memory(&memory)), None);
    }

    #[test]
    fn refuses_an_n64_edit_the_size_of_the_whole_save_memory() {
        let memory = crate::save::tests::stadium_memory();
        let mut cart = n64_memory(&memory);

        assert!(apply(&mut cart, &mut Watch::new(), &pattern(memory.len(), 7), no_backup).is_err());
        assert_eq!(cart.save_ram, memory);
        assert_eq!(cart.resets, 0);
    }

    fn temp_folder(name: &str) -> GamesFolder<'static, tauri::Wry> {
        let root = std::env::temp_dir().join(format!("pkh-emu-edit-{name}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        std::fs::create_dir_all(&root).unwrap();
        GamesFolder::at(root)
    }

    fn saved_game(name: &str) -> GamesFolder<'static, tauri::Wry> {
        let folder = temp_folder(name);
        block_on(folder.write("gba/Emerald.sav", b"saved")).unwrap();
        for file in ["resume.state", "resume.png", "resume.json"] {
            block_on(folder.write(&format!("gba/Emerald/states/{file}"), b"resume")).unwrap();
        }
        folder
    }

    #[test]
    fn writes_the_edit_to_the_save_file_after_backing_it_up() {
        let folder = saved_game("file");

        block_on(apply_file(&folder, "gba/Emerald.gba", b"EDITS", "2026-10-05_1412")).unwrap();

        assert_eq!(block_on(folder.read("gba/Emerald.sav")).unwrap(), b"EDITS");
        assert_eq!(block_on(folder.read("gba/Emerald/backups/2026-10-05_1412_edit.sav")).unwrap(), b"saved");
    }

    #[test]
    fn drops_the_resume_point_when_writing_the_edit_to_the_file() {
        let folder = saved_game("file-resume");

        block_on(apply_file(&folder, "gba/Emerald.gba", b"EDITS", "2026-10-05_1412")).unwrap();

        for file in ["resume.state", "resume.png", "resume.json"] {
            assert!(!block_on(folder.has_file(&format!("gba/Emerald/states/{file}"))), "{file}");
        }
    }

    #[test]
    fn keeps_the_clock_after_the_edited_save_ram() {
        let folder = temp_folder("file-clock");
        block_on(folder.write("gba/Emerald.sav", b"saveCLOCK")).unwrap();

        block_on(apply_file(&folder, "gba/Emerald.gba", b"EDIT", "2026-10-05_1412")).unwrap();

        assert_eq!(block_on(folder.read("gba/Emerald.sav")).unwrap(), b"EDITCLOCK");
    }

    #[test]
    fn writes_the_edit_to_a_dsv_before_its_footer() {
        let folder = temp_folder("file-dsv");
        let footer = [vec![7; 0x7A - 16], b"|-DESMUME SAVE-|".to_vec()].concat();
        block_on(folder.write("nds/HeartGold.dsv", &[b"saved".as_slice(), &footer].concat())).unwrap();

        block_on(apply_file(&folder, "nds/HeartGold.nds", b"EDITS", "2026-10-05_1412")).unwrap();

        assert_eq!(block_on(folder.read("nds/HeartGold.dsv")).unwrap(), [b"EDITS".as_slice(), &footer].concat());
        assert_eq!(
            block_on(folder.read("nds/HeartGold/backups/2026-10-05_1412_edit.dsv")).unwrap(),
            [b"saved".as_slice(), &footer].concat()
        );
    }

    #[test]
    fn writes_the_edit_to_an_n64_games_flash_ram_file_only() {
        let folder = temp_folder("file-n64");
        block_on(folder.write("n64/Stadium.fla", &pattern(0x20000, 1))).unwrap();
        block_on(folder.write("n64/Stadium.eep", &pattern(0x800, 2))).unwrap();

        block_on(apply_file(&folder, "n64/Stadium.z64", &pattern(0x20000, 7), "2026-10-05_1412")).unwrap();

        assert_eq!(block_on(folder.read("n64/Stadium.fla")).unwrap(), pattern(0x20000, 7));
        assert_eq!(block_on(folder.read("n64/Stadium.eep")).unwrap(), pattern(0x800, 2));
    }

    #[test]
    fn writes_a_transferred_n64_save_to_its_sram_file() {
        let folder = saved_game("transfer-n64");
        block_on(folder.write("n64/Stadium.sra", &pattern(0x8000, 1))).unwrap();

        block_on(write_transfer(
            &folder,
            &sent("n64/Stadium.z64", &pattern(0x8000, 7), "Received"),
            &sent("gba/Emerald.gba", b"SAVED", "Sent"),
            "2026-10-06_1412",
        ))
        .unwrap();

        assert_eq!(block_on(folder.read("n64/Stadium.sra")).unwrap(), pattern(0x8000, 7));
        assert!(!block_on(folder.has_file("n64/Stadium.fla")));
    }

    #[test]
    fn writes_a_transferred_stadium_save_to_its_flash_ram_file_only_after_backing_it_up() {
        let folder = saved_game("transfer-stadium");
        let files = [("fla", pattern(0x20000, 1)), ("eep", pattern(0x800, 2)), ("mpk", pattern(0x20000, 3))];
        for (extension, file) in &files {
            block_on(folder.write(&format!("n64/Stadium.{extension}"), file)).unwrap();
        }
        let before = save::n64::join(files.iter().map(|(extension, file)| (*extension, file.as_slice())));

        block_on(write_transfer(
            &folder,
            &sent("n64/Stadium.z64", &pattern(0x20000, 7), "Received BIDOOF from Emerald"),
            &sent("gba/Emerald.gba", b"SAVED", "Sent BIDOOF to Stadium"),
            "2026-10-06_1412",
        ))
        .unwrap();

        assert_eq!(block_on(folder.read("n64/Stadium.fla")).unwrap(), pattern(0x20000, 7));
        assert_eq!(block_on(folder.read("n64/Stadium.eep")).unwrap(), pattern(0x800, 2));
        assert_eq!(block_on(folder.read("n64/Stadium.mpk")).unwrap(), pattern(0x20000, 3));
        assert_eq!(block_on(folder.read("n64/Stadium/backups/2026-10-06_1412_transfer.srm")).unwrap(), before);
        assert_eq!(
            note(&folder, "n64/Stadium/backups/2026-10-06_1412_transfer.json"),
            serde_json::json!({ "note": "Received BIDOOF from Emerald" })
        );
    }

    #[test]
    fn refuses_an_edit_bigger_than_the_save_file() {
        let folder = saved_game("file-bigger");

        assert!(block_on(apply_file(&folder, "gba/Emerald.gba", b"EDITED SAVE", "2026-10-05_1412")).is_err());
        assert_eq!(block_on(folder.read("gba/Emerald.sav")).unwrap(), b"saved");
        assert!(block_on(folder.has_file("gba/Emerald/states/resume.state")));
    }

    #[test]
    fn refuses_to_write_an_edit_for_a_game_without_a_save() {
        let folder = temp_folder("file-none");

        assert!(block_on(apply_file(&folder, "gba/Emerald.gba", b"EDITS", "2026-10-05_1412")).is_err());
        assert!(!block_on(folder.has_file("gba/Emerald.sav")));
    }

    fn traded_games(name: &str) -> GamesFolder<'static, tauri::Wry> {
        let folder = saved_game(name);
        block_on(folder.write("gba/FireRed.sav", b"theirs")).unwrap();
        block_on(folder.write("gba/FireRed/states/resume.state", b"resume")).unwrap();
        folder
    }

    fn sent(path: &str, save: &[u8], note: &str) -> TransferWrite {
        TransferWrite { path: path.into(), save: save.to_vec(), note: note.into() }
    }

    fn note(folder: &GamesFolder<'static, tauri::Wry>, path: &str) -> serde_json::Value {
        serde_json::from_slice(&block_on(folder.read(path)).unwrap()).unwrap()
    }

    #[test]
    fn writes_both_saves_of_a_transfer_after_backing_them_up_with_notes() {
        let folder = traded_games("transfer");

        block_on(write_transfer(
            &folder,
            &sent("gba/FireRed.gba", b"THEIRS", "Received Kadabra from Emerald"),
            &sent("gba/Emerald.gba", b"SAVED", "Sent Kadabra to FireRed"),
            "2026-10-06_1412",
        ))
        .unwrap();

        assert_eq!(block_on(folder.read("gba/FireRed.sav")).unwrap(), b"THEIRS");
        assert_eq!(block_on(folder.read("gba/Emerald.sav")).unwrap(), b"SAVED");
        assert_eq!(block_on(folder.read("gba/FireRed/backups/2026-10-06_1412_transfer.sav")).unwrap(), b"theirs");
        assert_eq!(block_on(folder.read("gba/Emerald/backups/2026-10-06_1412_transfer.sav")).unwrap(), b"saved");
        assert_eq!(
            note(&folder, "gba/FireRed/backups/2026-10-06_1412_transfer.json"),
            serde_json::json!({"note": "Received Kadabra from Emerald"})
        );
        assert_eq!(
            note(&folder, "gba/Emerald/backups/2026-10-06_1412_transfer.json"),
            serde_json::json!({"note": "Sent Kadabra to FireRed"})
        );
    }

    #[test]
    fn drops_both_resume_points_after_a_transfer() {
        let folder = traded_games("transfer-resume");

        block_on(write_transfer(
            &folder,
            &sent("gba/FireRed.gba", b"THEIRS", "Received"),
            &sent("gba/Emerald.gba", b"SAVED", "Sent"),
            "2026-10-06_1412",
        ))
        .unwrap();

        assert!(!block_on(folder.has_file("gba/FireRed/states/resume.state")));
        assert!(!block_on(folder.has_file("gba/Emerald/states/resume.state")));
    }

    #[test]
    fn leaves_the_source_alone_when_the_destination_fails() {
        let folder = saved_game("transfer-failed");

        assert!(block_on(write_transfer(
            &folder,
            &sent("gba/FireRed.gba", b"THEIRS", "Received"),
            &sent("gba/Emerald.gba", b"SAVED", "Sent"),
            "2026-10-06_1412",
        ))
        .is_err());

        assert_eq!(block_on(folder.read("gba/Emerald.sav")).unwrap(), b"saved");
        assert!(!block_on(folder.has_file("gba/Emerald/backups/2026-10-06_1412_transfer.sav")));
        assert!(block_on(folder.has_file("gba/Emerald/states/resume.state")));
    }

    #[test]
    fn writes_neither_save_when_the_source_cant_take_its_save() {
        let folder = traded_games("transfer-source-failed");

        assert!(block_on(write_transfer(
            &folder,
            &sent("gba/FireRed.gba", b"THEIRS", "Received"),
            &sent("gba/Emerald.gba", b"TOO BIG FOR IT", "Sent"),
            "2026-10-06_1412",
        ))
        .is_err());

        assert_eq!(block_on(folder.read("gba/FireRed.sav")).unwrap(), b"theirs");
        assert!(!block_on(folder.has_file("gba/FireRed/backups/2026-10-06_1412_transfer.sav")));
        assert!(block_on(folder.has_file("gba/FireRed/states/resume.state")));
    }

    #[test]
    fn writes_a_transferred_ds_save_to_its_dsv() {
        let folder = saved_game("transfer-dsv");
        let footer = [vec![7; 0x7A - 16], b"|-DESMUME SAVE-|".to_vec()].concat();
        block_on(folder.write("nds/Platinum.dsv", &[b"saved".as_slice(), &footer].concat())).unwrap();

        block_on(write_transfer(
            &folder,
            &sent("nds/Platinum.nds", b"TRADE", "Received"),
            &sent("gba/Emerald.gba", b"SAVED", "Sent"),
            "2026-10-06_1412",
        ))
        .unwrap();

        assert_eq!(block_on(folder.read("nds/Platinum.dsv")).unwrap(), [b"TRADE".as_slice(), &footer].concat());
        assert!(!block_on(folder.has_file("nds/Platinum.sav")));
    }

    fn node(script: &str, args: &[&std::ffi::OsStr]) -> String {
        let output = std::process::Command::new("node")
            .arg(format!("{}/tests/{script}", env!("CARGO_MANIFEST_DIR")))
            .args(args)
            .output()
            .unwrap();
        assert!(output.status.success(), "{}", String::from_utf8_lossy(&output.stderr));
        String::from_utf8(output.stdout).unwrap().trim().to_string()
    }

    fn first_level(save: &std::path::Path) -> String {
        node("engine.mjs", &[save.as_ref()])
    }

    fn set_first_level(save: &std::path::Path, level: u8, edited: &std::path::Path) {
        node("engine.mjs", &[save.as_ref(), level.to_string().as_ref(), edited.as_ref()]);
    }

    fn engine_dir() -> std::path::PathBuf {
        let dir = std::env::temp_dir().join(format!("pkh-emu-edit-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        dir
    }

    fn apply_level_42(rom: crate::rom::Rom, file: &[u8]) -> (Game, Vec<u8>, Undo) {
        let dir = engine_dir();
        let (before, edited, after) = (dir.join("before.sav"), dir.join("edited.sav"), dir.join("after.sav"));
        let mut game = Game::start(rom, Some(file));
        game.play(600);
        let save = read(&mut game.core).unwrap();

        std::fs::write(&before, &save).unwrap();
        assert_ne!(first_level(&before), "42");
        set_first_level(&before, 42, &edited);
        let (previous, _) = apply(&mut game.core, &mut game.watch, &std::fs::read(&edited).unwrap(), no_backup).unwrap();
        game.play(600);
        std::fs::write(&after, read(&mut game.core).unwrap()).unwrap();

        assert_eq!(first_level(&after), "42");
        (game, save, previous)
    }

    #[test]
    #[ignore = "needs Node, the app's npm packages, and PKH_EMU_TEST_GAME and PKH_EMU_TEST_SAVE, a Gen 1 or 2 game and a save for it"]
    fn the_engine_reads_an_applied_level_after_the_restart() {
        let rom = std::env::var("PKH_EMU_TEST_GAME").expect("PKH_EMU_TEST_GAME");
        let file = std::fs::read(std::env::var("PKH_EMU_TEST_SAVE").expect("PKH_EMU_TEST_SAVE")).unwrap();

        apply_level_42(crate::rom::unpack(&rom, std::fs::read(&rom).unwrap()).unwrap(), &file);
    }

    // Loading a state copies the cart's save into save RAM, so this reads the save the game itself sees.
    fn cart_save(game: &mut Game) -> Vec<u8> {
        let state = game.core.serialize().unwrap();
        assert!(game.core.unserialize(&state));
        read(&mut game.core).unwrap()
    }

    #[test]
    #[ignore = "needs Node and the app's npm packages"]
    fn heartgold_restarts_on_an_applied_level_and_undo_brings_its_save_back() {
        let Some((rom, file)) = crate::test_games::heartgold() else { return };
        let (mut game, save, previous) = apply_level_42(rom, &file);
        let applied = engine_dir().join("applied.sav");
        std::fs::write(&applied, cart_save(&mut game)).unwrap();
        assert_eq!(first_level(&applied), "42");

        undo(&mut game.core, &mut game.watch, previous).unwrap();
        game.play(600);

        assert!(cart_save(&mut game) == save, "the cart's save isn't the one from before the edit");
    }

    #[test]
    #[cfg(target_arch = "aarch64")]
    #[ignore = "needs Node and the app's npm packages"]
    fn the_engine_lists_the_boxes_in_stadiums_flash_ram() {
        let Some((rom, fla)) = crate::test_games::stadium_with_save() else { return };
        let mut game = Game::start(rom, Some(&save::n64::join([("fla", fla.as_slice())])));
        game.play(120);
        let read = read(&mut game.core).unwrap();
        let path = engine_dir().join("stadium.fla");
        std::fs::write(&path, &read).unwrap();

        assert_eq!(read.len(), 0x20000);
        assert_eq!(node("boxes.mjs", &[path.as_ref()]), "12");
    }
}
