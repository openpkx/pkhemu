use serde::Serialize;
use std::collections::{HashMap, HashSet};
use std::sync::{Mutex, MutexGuard};

pub trait Events: Send + Sync {
    fn game(&self, rom: &str, state: &GameState);
    fn run(&self, run: &RunProgress);
    fn box_art(&self, _rom: &str) {}
    fn skins(&self, _skins: &crate::skins::Skins) {}
}

#[derive(Serialize, Clone, Copy, Debug, Default, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum Stage {
    #[default]
    UploadingSaves,
    DownloadingSaves,
    UploadingRom,
    UploadingUpdate,
    DownloadingUpdate,
}

#[derive(Serialize, Clone, Copy, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum Wait {
    Offline,
    MobileData,
    Playing,
    Stopped,
}

#[derive(Serialize, Clone, Debug, PartialEq)]
#[serde(tag = "state", rename_all = "camelCase")]
pub enum GameState {
    Queued,
    Transferring {
        done: u64,
        total: u64,
        stage: Stage,
    },
    Waiting {
        reason: Wait,
    },
    Conflict,
    Error {
        message: String,
    },
    Synced {
        #[serde(rename = "lastSynced")]
        last_synced: i64,
    },
}

#[derive(Serialize, Clone, Debug, PartialEq)]
#[serde(tag = "phase", rename_all = "camelCase")]
pub enum RunProgress {
    Checking {
        done: usize,
        total: usize,
    },
    Transferring {
        done: u64,
        total: u64,
        #[serde(rename = "waitingRoms")]
        waiting_roms: Vec<String>,
    },
}

#[derive(Clone, Copy, Default)]
struct Bytes {
    done: u64,
    total: u64,
}

#[derive(Default)]
struct Tracked {
    run: Bytes,
    games: HashMap<String, Bytes>,
    waiting_roms: Vec<String>,
    rom: String,
    path: String,
    stage: Stage,
    file: Bytes,
    counted: HashSet<(String, String)>,
}

/// Counts a run's bytes, planned by the check and moved by the transfers.
#[derive(Default)]
pub struct Tracker(Mutex<Tracked>);

impl Tracker {
    fn tracked(&self) -> MutexGuard<'_, Tracked> {
        self.0.lock().unwrap_or_else(|e| e.into_inner())
    }

    pub fn plan(&self, rom: &str, bytes: u64) {
        let mut tracked = self.tracked();
        tracked.run.total += bytes;
        tracked.games.entry(rom.into()).or_default().total += bytes;
    }

    pub fn game(&self, rom: &str) {
        self.tracked().rom = rom.into();
    }

    // A game that syncs again after another device wrote its record at the same time finds its uploads done.
    pub fn begin(&self, path: &str, stage: Stage, size: u64) {
        let mut tracked = self.tracked();
        let counted = tracked.counted.contains(&(tracked.rom.clone(), path.to_string()));
        tracked.path = path.into();
        tracked.stage = stage;
        tracked.file = Bytes { done: if counted { size } else { 0 }, total: size };
    }

    /// The game's progress once the other side holds `held` bytes of the file, if that moved anything.
    pub fn sent(&self, held: u64) -> Option<(String, GameState)> {
        let mut guard = self.tracked();
        let tracked = &mut *guard;
        let held = held.min(tracked.file.total);
        if held <= tracked.file.done {
            return None;
        }
        let moved = held - tracked.file.done;
        tracked.file.done = held;
        let game = tracked.games.entry(tracked.rom.clone()).or_default();
        game.done += moved;
        tracked.run.done += moved;
        // A transfer the check didn't plan, such as a cheat list two devices both changed, grows the total.
        if game.done > game.total {
            tracked.run.total += game.done - game.total;
            game.total = game.done;
        }
        let state = GameState::Transferring { done: game.done, total: game.total, stage: tracked.stage };
        Some((tracked.rom.clone(), state))
    }

    pub fn finish_file(&self) -> Option<(String, GameState)> {
        let size = self.tracked().file.total;
        let moved = self.sent(size);
        let mut tracked = self.tracked();
        let counted = (tracked.rom.clone(), tracked.path.clone());
        tracked.counted.insert(counted);
        moved
    }

    /// Takes off the game's planned bytes that won't move, all but `keep` of what's left.
    pub fn settle(&self, rom: &str, keep: u64) {
        let mut guard = self.tracked();
        let tracked = &mut *guard;
        let Some(game) = tracked.games.get_mut(rom) else { return };
        let rest = (game.total - game.done).saturating_sub(keep);
        game.total -= rest;
        tracked.run.total -= rest;
    }

    pub fn wait_for_wifi(&self, rom: &str) {
        self.tracked().waiting_roms.push(rom.into());
    }

    pub fn run(&self) -> RunProgress {
        let tracked = self.tracked();
        let (done, total) = (tracked.run.done, tracked.run.total);
        RunProgress::Transferring { done, total, waiting_roms: tracked.waiting_roms.clone() }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const EMERALD: &str = "gba/Emerald.gba";

    fn transferring(done: u64, total: u64) -> RunProgress {
        RunProgress::Transferring { done, total, waiting_roms: Vec::new() }
    }

    #[test]
    fn planned_bytes_that_never_move_come_off_the_total() {
        let tracker = Tracker::default();
        tracker.plan(EMERALD, 10);
        tracker.game(EMERALD);
        tracker.begin("gba/Emerald.sav", Stage::UploadingSaves, 4);
        tracker.finish_file();

        tracker.settle(EMERALD, 0);

        assert_eq!(tracker.run(), transferring(4, 4));
    }

    #[test]
    fn settling_keeps_the_rom_still_to_go() {
        let tracker = Tracker::default();
        tracker.plan(EMERALD, 20);
        tracker.game(EMERALD);
        tracker.begin("gba/Emerald.sav", Stage::UploadingSaves, 4);
        tracker.finish_file();

        tracker.settle(EMERALD, 8);

        assert_eq!(tracker.run(), transferring(4, 12));
    }

    #[test]
    fn a_file_moved_again_after_a_retry_counts_once() {
        let tracker = Tracker::default();
        tracker.plan(EMERALD, 4);
        tracker.game(EMERALD);
        tracker.begin("gba/Emerald.sav", Stage::UploadingSaves, 4);
        tracker.finish_file();

        tracker.begin("gba/Emerald.sav", Stage::UploadingSaves, 4);

        assert_eq!(tracker.finish_file(), None);
        assert_eq!(tracker.run(), transferring(4, 4));
    }
}
