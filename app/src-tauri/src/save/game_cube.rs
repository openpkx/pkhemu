use super::Memory;
use crate::rom::{Rom, System};
use std::io;
use std::path::PathBuf;
use std::time::SystemTime;

// Dolphin's raw cards, from 59 blocks at 512 KB to 2,043 at 16 MB.
pub fn fits(len: usize) -> bool {
    (0..=5).any(|shift| len == 0x80000 << shift)
}

/// A GameCube game's memory card, the raw card Dolphin keeps in slot A.
pub struct Card {
    path: PathBuf,
    bytes: Vec<u8>,
    hash: u64,
    modified: Option<SystemTime>,
    seen: Option<SystemTime>,
}

impl Card {
    pub fn at(path: PathBuf) -> Card {
        Card { path, bytes: Vec::new(), hash: hash(&[]), modified: None, seen: None }
    }

    /// Puts the card where Dolphin reads it as the game boots. Without one, Dolphin formats a fresh card.
    pub fn place(&mut self, card: Option<&[u8]>) -> io::Result<()> {
        self.seen = None;
        match card {
            Some(card) if !fits(card.len()) => {
                let message = format!("the card is {} bytes, which no memory card is", card.len());
                return Err(io::Error::new(io::ErrorKind::InvalidData, message));
            }
            Some(card) => {
                if let Some(dir) = self.path.parent() {
                    std::fs::create_dir_all(dir)?;
                }
                std::fs::write(&self.path, card)?;
                self.modified = std::fs::metadata(&self.path)?.modified().ok();
                self.hold(card.to_vec());
            }
            None => {
                match std::fs::remove_file(&self.path) {
                    Err(e) if e.kind() != io::ErrorKind::NotFound => return Err(e),
                    _ => {}
                }
                self.modified = None;
                self.hold(Vec::new());
            }
        }
        Ok(())
    }

    // Dolphin writes the whole card from its own thread, so while the game runs a change counts once the card holds
    // still between two checks.
    pub fn refresh(&mut self) -> Memory<'_> {
        let changed = self.changed();
        if changed.is_some() && changed == self.seen {
            self.take(changed);
        }
        self.seen = changed;
        self.memory()
    }

    pub fn read(&mut self) -> Memory<'_> {
        let changed = self.changed();
        if changed.is_some() {
            self.take(changed);
        }
        self.memory()
    }

    fn memory(&self) -> Memory<'_> {
        Memory::File { file: &self.bytes, hash: self.hash }
    }

    fn changed(&self) -> Option<SystemTime> {
        let modified = std::fs::metadata(&self.path).and_then(|metadata| metadata.modified()).ok();
        modified.filter(|_| modified != self.modified)
    }

    // Dolphin makes a fresh card's file as it first writes it, so a short one is still being written.
    fn take(&mut self, modified: Option<SystemTime>) {
        if let Ok(file) = std::fs::read(&self.path).inspect_err(|e| eprintln!("reading the memory card: {e}")) {
            self.modified = modified;
            if fits(file.len()) {
                self.hold(file);
            }
        }
    }

    fn hold(&mut self, bytes: Vec<u8>) {
        self.hash = hash(&bytes);
        self.bytes = bytes;
    }
}

fn hash(card: &[u8]) -> u64 {
    super::hash([card, &[]])
}

pub fn placed(rom: &Rom, card: Option<&[u8]>, path: PathBuf) -> Result<Option<Card>, String> {
    if rom.system() != System::GameCube {
        return Ok(None);
    }
    let mut placed = Card::at(path);
    placed.place(card).map_err(|e| format!("couldn't place the memory card: {e}"))?;
    Ok(Some(placed))
}

#[cfg(test)]
pub mod tests {
    use super::*;
    use crate::save::Watch;
    use crate::test_games::pattern;
    use std::path::Path;

    pub const SIZE: usize = 0x200000;

    pub fn card_path(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("pkh-emu-card-{name}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        dir.join("User/GC/card.raw")
    }

    fn written_later(path: &Path, bytes: &[u8], seconds: u64) {
        std::fs::write(path, bytes).unwrap();
        let file = std::fs::File::options().write(true).open(path).unwrap();
        file.set_modified(SystemTime::now() + std::time::Duration::from_secs(seconds)).unwrap();
    }

    #[test]
    fn places_the_card_where_dolphin_reads_it() {
        let path = card_path("place");
        let mut card = Card::at(path.clone());

        card.place(Some(&pattern(SIZE, 1))).unwrap();

        assert_eq!(std::fs::read(&path).unwrap(), pattern(SIZE, 1));
        assert_eq!(card.refresh().concat(), pattern(SIZE, 1));
    }

    #[test]
    fn leaves_no_card_for_a_new_game_so_dolphin_formats_one() {
        let path = card_path("new");
        std::fs::create_dir_all(path.parent().unwrap()).unwrap();
        std::fs::write(&path, pattern(SIZE, 2)).unwrap();
        let mut card = Card::at(path.clone());

        card.place(None).unwrap();

        assert!(!path.exists());
        assert!(card.read().concat().is_empty());
    }

    #[test]
    fn refuses_a_file_no_memory_card_is_the_size_of() {
        let path = card_path("size");
        let mut card = Card::at(path.clone());

        assert!(card.place(Some(&pattern(SIZE + 1, 1))).is_err());
        assert!(!path.exists());
        assert!(fits(0x80000) && fits(0x1000000) && !fits(0x40000) && !fits(0x2000000));
    }

    #[test]
    fn copies_the_card_out_once_it_holds_still_between_two_checks() {
        let path = card_path("still");
        let mut card = Card::at(path.clone());
        card.place(Some(&pattern(SIZE, 1))).unwrap();

        written_later(&path, &pattern(SIZE, 2), 5);
        assert_eq!(card.refresh().concat(), pattern(SIZE, 1));
        written_later(&path, &pattern(SIZE, 3), 6);
        assert_eq!(card.refresh().concat(), pattern(SIZE, 1));

        assert_eq!(card.refresh().concat(), pattern(SIZE, 3));
    }

    #[test]
    fn reads_the_card_a_new_game_formats_once_dolphin_has_written_all_of_it() {
        let path = card_path("formatted");
        let mut card = Card::at(path.clone());
        card.place(None).unwrap();
        std::fs::create_dir_all(path.parent().unwrap()).unwrap();

        written_later(&path, &pattern(0x1000, 4), 5);
        assert!(card.read().concat().is_empty());
        written_later(&path, &pattern(SIZE, 4), 6);

        assert_eq!(card.read().concat(), pattern(SIZE, 4));
    }

    #[test]
    fn tells_the_watch_when_the_card_changes() {
        let path = card_path("watch");
        let mut card = Card::at(path.clone());
        card.place(Some(&pattern(SIZE, 1))).unwrap();
        let mut watch = Watch::new();
        assert_eq!(watch.check(card.refresh()), None);
        assert_eq!(watch.check([&pattern(SIZE, 1)[..], &[]]), None);

        written_later(&path, &pattern(SIZE, 2), 5);

        assert_eq!(watch.check(card.read()), Some(pattern(SIZE, 2)));
        assert_eq!(watch.check(card.refresh()), None);
    }
}
