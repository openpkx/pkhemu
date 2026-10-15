use crate::rom::{Rom, System};
use std::io::{self, Seek};
use std::path::{Path, PathBuf};
use std::time::SystemTime;

const POKEMON: [(u64, usize); 8] = [
    (0x0004000000055D00, 0x65600),
    (0x0004000000055E00, 0x65600),
    (0x000400000011C400, 0x76000),
    (0x000400000011C500, 0x76000),
    (0x0004000000164800, 0x6BE00),
    (0x0004000000175E00, 0x6BE00),
    (0x00040000001B5000, 0x6CC00),
    (0x00040000001B5100, 0x6CC00),
];

/// The title whose save data is `dir`, when it's the archive that holds `main` on Azahar's virtual SD card.
pub fn archive_title(dir: &Path) -> Option<u64> {
    let names: Vec<&str> = dir.iter().rev().take(8).map(|name| name.to_str()).collect::<Option<_>>()?;
    match names[..] {
        ["00000001", "data", low, "00040000", "title", _, _, "Nintendo 3DS"] if low.len() == 8 => {
            u32::from_str_radix(low, 16).ok().map(|low| 0x00040000 << 32 | low as u64)
        }
        _ => None,
    }
}

pub fn fits(title_id: u64, size: u64) -> bool {
    POKEMON.iter().any(|&(id, pokemon)| id == title_id && pokemon as u64 == size)
}

/// A Pokémon game's save, the file `main` in its save data on Azahar's virtual SD card.
pub struct Main {
    dir: PathBuf,
    size: usize,
    bytes: Vec<u8>,
    modified: Option<SystemTime>,
    seen: Option<SystemTime>,
    // A save waiting for the game to format its save data, since main only loads beside the format the game chose.
    waiting: Option<Vec<u8>>,
}

impl Main {
    pub fn of(title_id: u64, azahar_dir: &Path) -> Option<Main> {
        let (_, size) = POKEMON.into_iter().find(|(id, _)| *id == title_id)?;
        let dir = crate::three_ds::sd_title_dir(azahar_dir, title_id).join("data");
        Some(Main { dir, size, bytes: Vec::new(), modified: None, seen: None, waiting: None })
    }

    fn archive(&self) -> PathBuf {
        self.dir.join("00000001")
    }

    fn path(&self) -> PathBuf {
        self.archive().join("main")
    }

    // The archive's size, directory and file counts and duplicate flag. Each game checks them against its own and
    // formats its save data over a main placed beside any other.
    fn metadata_path(&self) -> PathBuf {
        self.dir.join("00000001.metadata")
    }

    /// Puts the save where the game reads it. A game that never formatted its save data here gets nothing until it
    /// has. With no save, the game plays whatever the SD card holds, and that copies out like any save it writes.
    pub fn place(&mut self, save: Option<&[u8]>) -> io::Result<()> {
        self.waiting = None;
        self.seen = None;
        match save {
            Some(save) if save.len() != self.size => {
                let message = format!("the save is {} bytes, but the game's is {}", save.len(), self.size);
                return Err(io::Error::new(io::ErrorKind::InvalidData, message));
            }
            Some(save) if self.metadata_path().is_file() => self.write(save)?,
            Some(save) => {
                match std::fs::remove_dir_all(self.archive()) {
                    Err(e) if e.kind() != io::ErrorKind::NotFound => return Err(e),
                    _ => {}
                }
                self.waiting = Some(save.to_vec());
                self.bytes = save.to_vec();
            }
            None => {
                self.bytes.clear();
                self.modified = None;
            }
        }
        Ok(())
    }

    fn write(&mut self, save: &[u8]) -> io::Result<()> {
        std::fs::create_dir_all(self.archive())?;
        std::fs::write(self.path(), save)?;
        self.bytes = save.to_vec();
        self.modified = std::fs::metadata(self.path())?.modified().ok();
        Ok(())
    }

    pub fn is_waiting(&self) -> bool {
        self.waiting.is_some()
    }

    pub fn settle(&mut self) -> io::Result<bool> {
        if self.waiting.is_none() || !self.metadata_path().is_file() {
            return Ok(false);
        }
        let save = self.waiting.take().unwrap_or_default();
        if let Err(e) = self.write(&save) {
            self.waiting = Some(save);
            return Err(e);
        }
        Ok(true)
    }

    // The game writes main over several frames, so while it runs a change counts once main holds still between two
    // checks.
    pub fn refresh(&mut self) -> &[u8] {
        if self.waiting.is_none() {
            let changed = self.changed();
            if changed.is_some() && changed == self.seen {
                self.take(changed);
            }
            self.seen = changed;
        }
        &self.bytes
    }

    pub fn read(&mut self) -> &[u8] {
        if self.waiting.is_none() {
            let changed = self.changed();
            if changed.is_some() {
                self.take(changed);
            }
        }
        &self.bytes
    }

    fn changed(&self) -> Option<SystemTime> {
        let modified = std::fs::metadata(self.path()).and_then(|metadata| metadata.modified()).ok();
        modified.filter(|_| modified != self.modified)
    }

    // A short file is the start of a game's first save, never a save to keep.
    fn take(&mut self, modified: Option<SystemTime>) {
        if let Ok(file) = std::fs::read(self.path()).inspect_err(|e| eprintln!("reading the 3DS save: {e}")) {
            self.modified = modified;
            if file.len() == self.size {
                self.bytes = file;
            }
        }
    }

    pub fn bytes(&self) -> &[u8] {
        &self.bytes
    }
}

/// Places the save of a 3DS Pokémon game before it starts. Other 3DS games keep theirs on the virtual SD card.
pub fn placed(rom: &Rom, save: Option<&[u8]>, azahar_dir: &Path) -> Result<Option<Main>, String> {
    let Some(file) = rom.file.as_ref().filter(|_| rom.system() == System::ThreeDs) else { return Ok(None) };
    let mut open = &file.open;
    let title_id = crate::three_ds::title_id(&mut open).map_err(|refused| refused.message(&rom.name))?;
    open.rewind().map_err(|e| format!("{}: {e}", rom.name))?;
    let Some(mut main) = title_id.and_then(|title_id| Main::of(title_id, azahar_dir)) else { return Ok(None) };
    main.place(save).map_err(|e| format!("couldn't place the save: {e}"))?;
    Ok(Some(main))
}

#[cfg(test)]
pub mod tests {
    use super::*;
    use crate::test_games::pattern;

    pub const X: u64 = 0x0004000000055D00;
    pub const X_SIZE: usize = 0x65600;
    const USUM: u64 = 0x00040000001B5100;

    fn azahar_dir(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("pkh-emu-3ds-save-{name}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        dir
    }

    fn data(dir: &Path, title_id: u64) -> PathBuf {
        Main::of(title_id, dir).unwrap().dir
    }

    pub fn main_path(dir: &Path, title_id: u64) -> PathBuf {
        data(dir, title_id).join("00000001/main")
    }

    fn written_later(path: &Path, bytes: &[u8], seconds: u64) {
        std::fs::write(path, bytes).unwrap();
        let file = std::fs::File::options().write(true).open(path).unwrap();
        file.set_modified(SystemTime::now() + std::time::Duration::from_secs(seconds)).unwrap();
    }

    #[test]
    fn knows_only_the_eight_pokemon_games() {
        let dir = azahar_dir("titles");
        let sizes: Vec<usize> =
            POKEMON.iter().filter_map(|(id, _)| Main::of(*id, &dir)).map(|main| main.size).collect();

        assert_eq!(sizes, [0x65600, 0x65600, 0x76000, 0x76000, 0x6BE00, 0x6BE00, 0x6CC00, 0x6CC00]);
        assert!(Main::of(0x000400000EC10000, &dir).is_none());
    }

    #[test]
    fn knows_the_title_of_a_save_archive_by_its_folder() {
        let dir = azahar_dir("archive");

        assert_eq!(archive_title(&data(&dir, X).join("00000001")), Some(X));
        assert_eq!(archive_title(&data(&dir, X).join("00000002")), None);
        assert_eq!(archive_title(Path::new("title/00040000/00055d00/data/00000001")), None);
        assert_eq!(archive_title(&dir.join("sdmc/Nintendo 3DS/a/b/title/0004000e/00055d00/data/00000001")), None);
        assert_eq!(archive_title(&dir.join("sdmc/Nintendo 3DS/a/b/title/00040000/0055d00/data/00000001")), None);
        assert!(fits(X, X_SIZE as u64));
        assert!(!fits(X, 0x76000));
        assert!(!fits(0x000400000EC10000, X_SIZE as u64));
    }

    // What the game does when it finds no format info: format its save data and make a new main.
    pub fn format(dir: &Path, title_id: u64, size: usize) {
        let data = data(dir, title_id);
        std::fs::create_dir_all(data.join("00000001")).unwrap();
        std::fs::write(data.join("00000001.metadata"), [7; 16]).unwrap();
        std::fs::write(data.join("00000001/main"), vec![0; size]).unwrap();
    }

    #[test]
    fn places_main_beside_the_format_the_game_made() {
        let dir = azahar_dir("place");
        format(&dir, USUM, 0x6CC00);
        let mut main = Main::of(USUM, &dir).unwrap();

        main.place(Some(&pattern(0x6CC00, 1))).unwrap();

        let no_id = "00000000000000000000000000000000";
        let data = dir.join("sdmc/Nintendo 3DS").join(no_id).join(no_id).join("title/00040000/001b5100/data");
        assert_eq!(std::fs::read(data.join("00000001/main")).unwrap(), pattern(0x6CC00, 1));
        assert_eq!(std::fs::read(data.join("00000001.metadata")).unwrap(), [7; 16]);
        assert_eq!(main.settle().unwrap(), false);
        assert_eq!(main.refresh(), pattern(0x6CC00, 1));
    }

    #[test]
    fn holds_the_save_until_the_game_formats_its_save_data() {
        let dir = azahar_dir("waiting");
        let mut main = Main::of(X, &dir).unwrap();

        main.place(Some(&pattern(X_SIZE, 1))).unwrap();
        assert!(!data(&dir, X).join("00000001").exists());
        assert_eq!(main.settle().unwrap(), false);
        format(&dir, X, X_SIZE);

        assert_eq!(main.refresh(), pattern(X_SIZE, 1));
        assert_eq!(main.settle().unwrap(), true);
        assert_eq!(std::fs::read(main_path(&dir, X)).unwrap(), pattern(X_SIZE, 1));
        assert_eq!(main.settle().unwrap(), false);
        assert_eq!(main.refresh(), pattern(X_SIZE, 1));
    }

    #[test]
    fn places_nothing_without_a_save_and_reads_the_one_on_the_sd_card() {
        let dir = azahar_dir("none");
        format(&dir, X, X_SIZE);
        std::fs::write(main_path(&dir, X), pattern(X_SIZE, 4)).unwrap();
        let mut main = Main::of(X, &dir).unwrap();

        main.place(None).unwrap();

        assert!(main.bytes().is_empty());
        assert_eq!(main.read(), pattern(X_SIZE, 4));
        assert_eq!(main.settle().unwrap(), false);
    }

    #[test]
    fn refuses_a_save_the_size_of_another_game() {
        let dir = azahar_dir("size");
        format(&dir, X, X_SIZE);
        let mut main = Main::of(X, &dir).unwrap();

        assert!(main.place(Some(&pattern(0x76000, 1))).is_err());
        assert_eq!(std::fs::read(main_path(&dir, X)).unwrap(), vec![0; X_SIZE]);
    }

    #[test]
    fn copies_main_out_once_it_holds_still_between_two_checks() {
        let dir = azahar_dir("still");
        format(&dir, X, X_SIZE);
        let mut main = Main::of(X, &dir).unwrap();
        main.place(Some(&pattern(X_SIZE, 1))).unwrap();
        let path = main_path(&dir, X);

        written_later(&path, &pattern(X_SIZE, 2), 5);
        assert_eq!(main.refresh(), pattern(X_SIZE, 1));
        written_later(&path, &pattern(X_SIZE, 3), 6);
        assert_eq!(main.refresh(), pattern(X_SIZE, 1));

        assert_eq!(main.refresh(), pattern(X_SIZE, 3));
    }

    #[test]
    fn reads_main_again_only_once_the_game_writes_it() {
        let dir = azahar_dir("refresh");
        format(&dir, X, X_SIZE);
        let mut main = Main::of(X, &dir).unwrap();
        main.place(Some(&pattern(X_SIZE, 1))).unwrap();
        let path = main_path(&dir, X);
        assert_eq!(main.refresh(), pattern(X_SIZE, 1));

        written_later(&path, &pattern(X_SIZE, 2), 5);

        assert_eq!(main.read(), pattern(X_SIZE, 2));
    }

    #[test]
    fn keeps_the_last_whole_save_while_main_is_short() {
        let dir = azahar_dir("short");
        format(&dir, X, X_SIZE);
        let mut main = Main::of(X, &dir).unwrap();
        main.place(Some(&pattern(X_SIZE, 1))).unwrap();
        let path = main_path(&dir, X);

        written_later(&path, &pattern(0x100, 2), 5);

        assert_eq!(main.read(), pattern(X_SIZE, 1));
    }

    #[test]
    fn reads_the_save_a_new_game_makes() {
        let dir = azahar_dir("made");
        let mut main = Main::of(X, &dir).unwrap();
        main.place(None).unwrap();
        assert!(main.read().is_empty());

        format(&dir, X, X_SIZE);
        std::fs::write(main_path(&dir, X), pattern(X_SIZE, 3)).unwrap();

        assert_eq!(main.read(), pattern(X_SIZE, 3));
    }
}
