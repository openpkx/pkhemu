use std::sync::{Mutex, MutexGuard};
use tokio::sync::Notify;

#[derive(Default)]
struct Games {
    playing: Option<String>,
    lent: bool,
    syncing: Option<String>,
}

/// Keeps a sync and a game from using one game's files at once.
#[derive(Default)]
pub struct InUse {
    games: Mutex<Games>,
    synced: Notify,
}

pub struct Syncing<'a>(&'a InUse);

impl Drop for Syncing<'_> {
    fn drop(&mut self) {
        self.0.games().syncing = None;
        self.0.synced.notify_waiters();
    }
}

impl InUse {
    fn games(&self) -> MutexGuard<'_, Games> {
        self.games.lock().unwrap_or_else(|e| e.into_inner())
    }

    /// Waits for a sync of the game to finish, then keeps later syncs off it until it stops.
    pub async fn start_playing(&self, rom: &str) {
        self.after_sync(Some(rom), |games| games.playing = Some(rom.into())).await
    }

    async fn after_sync(&self, rom: Option<&str>, then: impl FnOnce(&mut Games)) {
        loop {
            let synced = self.synced.notified();
            {
                let mut games = self.games();
                if rom.is_none() || games.syncing.as_deref() != rom {
                    games.lent = false;
                    then(&mut games);
                    return;
                }
            }
            synced.await;
        }
    }

    pub fn playing(&self, rom: Option<&str>) {
        let mut games = self.games();
        games.playing = rom.map(String::from);
        games.lent = false;
    }

    /// Lets syncs take the game being played while it's paused.
    pub fn lend(&self) {
        let mut games = self.games();
        games.lent = games.playing.is_some();
    }

    /// Waits for a sync of the lent game to finish, then keeps later syncs off it again.
    pub async fn take_back(&self) {
        let playing = self.games().playing.clone();
        self.after_sync(playing.as_deref(), |_| {}).await
    }

    /// A lent game is still loaded, so a sync only sends its files up.
    pub fn lent(&self, rom: &str) -> bool {
        let games = self.games();
        games.lent && games.playing.as_deref() == Some(rom)
    }

    pub fn any_playing(&self) -> bool {
        self.games().playing.is_some()
    }

    pub fn start_syncing(&self, rom: &str) -> Option<Syncing<'_>> {
        self.start(rom, true)
    }

    /// Unlike a sync, removing a game's files waits for it to stop, even while it's lent.
    pub fn start_removing(&self, rom: &str) -> Option<Syncing<'_>> {
        self.start(rom, false)
    }

    fn start(&self, rom: &str, lent_too: bool) -> Option<Syncing<'_>> {
        let mut games = self.games();
        if games.playing.as_deref() == Some(rom) && !(lent_too && games.lent) {
            return None;
        }
        games.syncing = Some(rom.into());
        Some(Syncing(self))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Arc;
    use std::time::Duration;
    use tauri::async_runtime::{block_on, spawn};

    #[test]
    fn a_game_waits_for_its_sync_to_finish() {
        let in_use = Arc::new(InUse::default());
        let syncing = in_use.start_syncing("gba/Emerald.gba").unwrap();
        let started = {
            let in_use = in_use.clone();
            spawn(async move { in_use.start_playing("gba/Emerald.gba").await })
        };
        std::thread::sleep(Duration::from_millis(50));
        assert!(!started.inner().is_finished());

        drop(syncing);

        block_on(started).unwrap();
        assert!(in_use.start_syncing("gba/Emerald.gba").is_none());
    }

    #[test]
    fn another_game_starts_while_one_syncs() {
        let in_use = InUse::default();
        let _syncing = in_use.start_syncing("gba/Emerald.gba").unwrap();

        block_on(in_use.start_playing("gba/Ruby.gba"));

        assert!(in_use.start_syncing("gba/Ruby.gba").is_none());
    }

    #[test]
    fn a_lent_game_syncs_until_it_is_taken_back() {
        let in_use = InUse::default();
        block_on(in_use.start_playing("gba/Emerald.gba"));

        in_use.lend();

        assert!(in_use.lent("gba/Emerald.gba"));
        assert!(in_use.start_syncing("gba/Emerald.gba").is_some());
        assert!(in_use.start_removing("gba/Emerald.gba").is_none());
        block_on(in_use.take_back());
        assert!(!in_use.lent("gba/Emerald.gba"));
        assert!(in_use.start_syncing("gba/Emerald.gba").is_none());
    }

    #[test]
    fn taking_a_game_back_waits_for_its_sync() {
        let in_use = Arc::new(InUse::default());
        block_on(in_use.start_playing("gba/Emerald.gba"));
        in_use.lend();
        let syncing = in_use.start_syncing("gba/Emerald.gba").unwrap();
        let taken = {
            let in_use = in_use.clone();
            spawn(async move { in_use.take_back().await })
        };
        std::thread::sleep(Duration::from_millis(50));
        assert!(!taken.inner().is_finished());

        drop(syncing);

        block_on(taken).unwrap();
        assert!(in_use.start_syncing("gba/Emerald.gba").is_none());
    }

    #[test]
    fn nothing_is_lent_with_no_game_playing() {
        let in_use = InUse::default();

        in_use.lend();
        block_on(in_use.start_playing("gba/Emerald.gba"));

        assert!(in_use.start_syncing("gba/Emerald.gba").is_none());
    }

    #[test]
    fn a_stopped_game_syncs_again() {
        let in_use = InUse::default();
        block_on(in_use.start_playing("gba/Emerald.gba"));

        in_use.playing(None);

        assert!(in_use.start_syncing("gba/Emerald.gba").is_some());
    }
}
