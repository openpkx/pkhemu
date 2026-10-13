use std::sync::{Mutex, MutexGuard};
use tokio::sync::Notify;

#[derive(Default)]
struct Games {
    playing: Vec<String>,
    lent: bool,
    syncing: Option<String>,
}

impl Games {
    fn plays(&self, rom: &str) -> bool {
        self.playing.iter().any(|playing| playing == rom)
    }
}

/// Keeps a sync and a game from using one game's files at once. A game played with a cart in the
/// Transfer Pak writes the cart's save too, so the cart counts as played alongside it.
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

fn game_and_cart(rom: Option<&str>, cart: Option<&str>) -> Vec<String> {
    rom.map(|rom| [Some(rom), cart].into_iter().flatten().map(String::from).collect()).unwrap_or_default()
}

impl InUse {
    fn games(&self) -> MutexGuard<'_, Games> {
        self.games.lock().unwrap_or_else(|e| e.into_inner())
    }

    /// Waits for a sync of the game or its cart to finish, then keeps later syncs off both until it stops.
    pub async fn start_playing(&self, rom: &str, cart: Option<&str>) {
        let playing = game_and_cart(Some(rom), cart);
        self.after_sync(&playing.clone(), |games| games.playing = playing).await
    }

    async fn after_sync(&self, roms: &[String], then: impl FnOnce(&mut Games)) {
        loop {
            let synced = self.synced.notified();
            {
                let mut games = self.games();
                if !games.syncing.as_ref().is_some_and(|syncing| roms.contains(syncing)) {
                    games.lent = false;
                    then(&mut games);
                    return;
                }
            }
            synced.await;
        }
    }

    pub fn playing(&self, rom: Option<&str>, cart: Option<&str>) {
        let mut games = self.games();
        games.playing = game_and_cart(rom, cart);
        games.lent = false;
    }

    /// Lets syncs take the game being played while it's paused.
    pub fn lend(&self) {
        let mut games = self.games();
        games.lent = !games.playing.is_empty();
    }

    /// Waits for a sync of the lent game to finish, then keeps later syncs off it again.
    pub async fn take_back(&self) {
        let playing = self.games().playing.clone();
        self.after_sync(&playing, |_| {}).await
    }

    /// A lent game is still loaded, so a sync only sends its files up.
    pub fn lent(&self, rom: &str) -> bool {
        let games = self.games();
        games.lent && games.plays(rom)
    }

    pub fn any_playing(&self) -> bool {
        !self.games().playing.is_empty()
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
        if games.plays(rom) && !(lent_too && games.lent) {
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
            spawn(async move { in_use.start_playing("gba/Emerald.gba", None).await })
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

        block_on(in_use.start_playing("gba/Ruby.gba", None));

        assert!(in_use.start_syncing("gba/Ruby.gba").is_none());
    }

    #[test]
    fn a_lent_game_syncs_until_it_is_taken_back() {
        let in_use = InUse::default();
        block_on(in_use.start_playing("gba/Emerald.gba", None));

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
        block_on(in_use.start_playing("gba/Emerald.gba", None));
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
        block_on(in_use.start_playing("gba/Emerald.gba", None));

        assert!(in_use.start_syncing("gba/Emerald.gba").is_none());
    }

    #[test]
    fn a_cart_in_the_transfer_pak_syncs_only_while_its_game_is_lent() {
        let in_use = InUse::default();
        block_on(in_use.start_playing("n64/Stadium.z64", Some("gb/Red.gb")));

        assert!(in_use.start_syncing("gb/Red.gb").is_none());
        assert!(in_use.start_removing("gb/Red.gb").is_none());
        in_use.lend();
        assert!(in_use.lent("gb/Red.gb"));
        assert!(in_use.start_syncing("gb/Red.gb").is_some());
        assert!(in_use.start_removing("gb/Red.gb").is_none());
    }

    #[test]
    fn a_game_waits_for_its_carts_sync_to_finish() {
        let in_use = Arc::new(InUse::default());
        let syncing = in_use.start_syncing("gb/Red.gb").unwrap();
        let started = {
            let in_use = in_use.clone();
            spawn(async move { in_use.start_playing("n64/Stadium.z64", Some("gb/Red.gb")).await })
        };
        std::thread::sleep(Duration::from_millis(50));
        assert!(!started.inner().is_finished());

        drop(syncing);

        block_on(started).unwrap();
    }

    #[test]
    fn taking_a_game_back_waits_for_its_carts_sync() {
        let in_use = Arc::new(InUse::default());
        block_on(in_use.start_playing("n64/Stadium.z64", Some("gb/Red.gb")));
        in_use.lend();
        let syncing = in_use.start_syncing("gb/Red.gb").unwrap();
        let taken = {
            let in_use = in_use.clone();
            spawn(async move { in_use.take_back().await })
        };
        std::thread::sleep(Duration::from_millis(50));
        assert!(!taken.inner().is_finished());

        drop(syncing);

        block_on(taken).unwrap();
        assert!(in_use.start_syncing("gb/Red.gb").is_none());
    }

    #[test]
    fn a_stopped_game_syncs_again() {
        let in_use = InUse::default();
        block_on(in_use.start_playing("gba/Emerald.gba", None));

        in_use.playing(None, None);

        assert!(in_use.start_syncing("gba/Emerald.gba").is_some());
    }
}
