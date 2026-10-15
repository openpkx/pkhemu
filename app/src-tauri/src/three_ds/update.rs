use std::fs::File;
use std::io::{self, Read, Seek, SeekFrom};
use std::path::{Path, PathBuf};

use super::{kind, ncch_header, no_crypto_fix, read_cia, sd_title_dir, start, Content, Fixed, Kind, Refused, UPDATE};
use crate::rom::{self, Rom, System};

const OPTIONAL: u16 = 0x4000;

/// Where a game's update lives in the games folder, so it moves and goes away with the game.
pub fn path(rom: &str) -> String {
    format!("{}/update.cia", rom::data_dir(rom))
}

/// A decrypted update CIA: the TMD Azahar reads and the contents it names, each with its header fixes.
pub struct Update {
    title_id: u64,
    pub version: u16,
    tmd: Vec<u8>,
    contents: Vec<(Content, Vec<(u64, u8)>)>,
    // Azahar takes a title whose second content is optional for DLC and keeps its contents in a folder of their own.
    in_folder: bool,
}

/// The update `file` holds, or None for any other file.
pub fn read(file: &mut (impl Read + Seek)) -> Result<Option<Update>, Refused> {
    let start = start(file)?;
    if !matches!(kind(&start), Ok(Kind::Cia)) {
        return Ok(None);
    }
    let cia = read_cia(file, &start)?;
    if (cia.title_id >> 32) as u32 != UPDATE {
        return Ok(None);
    }
    if cia.contents.is_empty() {
        return Err(Refused::NotAGame);
    }
    let in_folder = cia.contents.get(1).is_some_and(|content| content.kind & OPTIONAL != 0);
    let mut contents = Vec::with_capacity(cia.contents.len());
    // Azahar boots the first content and leaves the others, like a manual, alone.
    for (position, content) in cia.contents.into_iter().enumerate() {
        let header = ncch_header(file, content.offset);
        let fixes = match position {
            0 => no_crypto_fix(file, content.offset, &header?)?,
            _ => header.and_then(|header| no_crypto_fix(file, content.offset, &header)).unwrap_or_default(),
        };
        contents.push((content, fixes));
    }
    Ok(Some(Update { title_id: cia.title_id, version: cia.version, tmd: cia.tmd, contents, in_folder }))
}

fn remove_dir(dir: &Path) -> io::Result<()> {
    match std::fs::remove_dir_all(dir) {
        Err(e) if e.kind() != io::ErrorKind::NotFound => Err(e),
        _ => Ok(()),
    }
}

impl Update {
    pub fn updates(&self, title_id: u64) -> bool {
        self.title_id as u32 == title_id as u32
    }

    fn tmd_path(title_dir: &Path) -> PathBuf {
        title_dir.join("content/00000000.tmd")
    }

    fn app(&self, title_dir: &Path, content: &Content) -> PathBuf {
        let dir = title_dir.join("content");
        let dir = if self.in_folder { dir.join("00000000") } else { dir };
        dir.join(format!("{:08x}.app", content.id))
    }

    fn installed(&self, title_dir: &Path) -> bool {
        std::fs::read(Update::tmd_path(title_dir)).is_ok_and(|tmd| tmd == self.tmd)
            && self.contents.iter().all(|(content, _)| {
                std::fs::metadata(self.app(title_dir, content)).is_ok_and(|app| app.len() == content.size)
            })
    }

    // The TMD goes last, so an install cut short never looks installed.
    fn install(&self, file: &mut (impl Read + Seek), title_dir: &Path) -> io::Result<()> {
        remove_dir(title_dir)?;
        for (content, fixes) in &self.contents {
            let app = self.app(title_dir, content);
            std::fs::create_dir_all(app.parent().unwrap_or(title_dir))?;
            file.seek(SeekFrom::Start(content.offset))?;
            let (start, len) = (content.offset, content.size);
            let mut fixed = Fixed { inner: file.by_ref(), start, len, at: 0, fixes: fixes.clone() };
            if io::copy(&mut fixed, &mut File::create(app)?)? < content.size {
                return Err(io::ErrorKind::UnexpectedEof.into());
            }
        }
        std::fs::write(Update::tmd_path(title_dir), &self.tmd)
    }
}

/// Installs a 3DS game's update on the virtual SD card before it starts, where the core finds it by itself. A game
/// without one gets the update another copy of it left there taken away.
pub fn placed(rom: &Rom, update: Option<File>, azahar_dir: &Path) -> Result<(), String> {
    let Some(file) = rom.file.as_ref().filter(|_| rom.system() == System::ThreeDs) else { return Ok(()) };
    let mut open = &file.open;
    let title_id = super::title_id(&mut open).map_err(|refused| refused.message(&rom.name))?;
    open.rewind().map_err(|e| format!("{}: {e}", rom.name))?;
    let Some(title_id) = title_id else { return Ok(()) };
    let dir = sd_title_dir(azahar_dir, (UPDATE as u64) << 32 | title_id & 0xFFFF_FFFF);
    let failed = |e: io::Error| format!("couldn't install the update: {e}");
    let Some(mut cia) = update else { return remove_dir(&dir).map_err(failed) };
    let name = format!("{}'s update", rom::game_name(&rom.name));
    let update = read(&mut cia).map_err(|refused| refused.message(&name))?;
    let update = update.filter(|update| update.updates(title_id)).ok_or(format!("{name} is for another game"))?;
    if !update.installed(&dir) {
        update.install(&mut cia, &dir).map_err(failed)?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::super::tests::{cia_of, ncch};
    use super::super::{CONTENT_ENCRYPTED, FLAGS, KEY_SLOT, NO_CRYPTO};
    use super::*;
    use std::io::Cursor;

    const X: u64 = 0x0004000000055D00;
    const X_UPDATE: u64 = 0x0004000E00055D00;

    fn azahar_dir(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("pkh-emu-3ds-update-{name}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        dir
    }

    fn title_dir(azahar_dir: &Path) -> PathBuf {
        let no_id = "00000000000000000000000000000000";
        azahar_dir.join("sdmc/Nintendo 3DS").join(no_id).join(no_id).join("title/0004000e/00055d00")
    }

    fn game(azahar_dir: &Path) -> Rom {
        std::fs::create_dir_all(azahar_dir).unwrap();
        let path = azahar_dir.join("X.cxi");
        std::fs::write(&path, ncch(X, true, true)).unwrap();
        Rom::at("3ds/X.cxi", rom::RomFile::new(File::open(&path).unwrap(), path.to_string_lossy().into_owned()))
    }

    fn update_file(azahar_dir: &Path, cia: &[u8]) -> File {
        let path = azahar_dir.join("update.cia");
        std::fs::write(&path, cia).unwrap();
        File::open(path).unwrap()
    }

    fn files(root: &Path) -> Vec<String> {
        let mut found = Vec::new();
        let mut dirs = vec![root.to_path_buf()];
        while let Some(dir) = dirs.pop() {
            for entry in std::fs::read_dir(&dir).into_iter().flatten().map(Result::unwrap) {
                match entry.file_type().unwrap().is_dir() {
                    true => dirs.push(entry.path()),
                    false => found.push(entry.path().strip_prefix(root).unwrap().to_string_lossy().into_owned()),
                }
            }
        }
        found.sort();
        found
    }

    fn tmd_of(cia: &[u8]) -> Vec<u8> {
        let tmd_at = 0x2040 + 0xA00 + 0x380;
        cia[tmd_at..tmd_at + 0x140 + 0xC4 + 0x900 + 2 * 0x30].to_vec()
    }

    #[test]
    fn installs_the_update_as_azahar_lays_out_a_cia() {
        let dir = azahar_dir("install");
        let (main, manual) = (ncch(X_UPDATE, false, true), ncch(X_UPDATE, true, true));
        let cia = cia_of(X_UPDATE, 5232, &[(0x2A, 0, main.clone()), (0x1B, 0, manual.clone())]);

        placed(&game(&dir), Some(update_file(&dir, &cia)), &dir).unwrap();

        let title = title_dir(&dir);
        let mut fixed = main;
        fixed[KEY_SLOT as usize] = 0;
        fixed[FLAGS as usize] = NO_CRYPTO;
        assert_eq!(files(&title), ["content/00000000.tmd", "content/0000001b.app", "content/0000002a.app"]);
        assert_eq!(std::fs::read(title.join("content/0000002a.app")).unwrap(), fixed);
        assert_eq!(std::fs::read(title.join("content/0000001b.app")).unwrap(), manual);
        assert_eq!(std::fs::read(title.join("content/00000000.tmd")).unwrap(), tmd_of(&cia));
    }

    #[test]
    fn keeps_an_installed_update_and_replaces_one_that_differs() {
        let dir = azahar_dir("replace");
        let older = cia_of(X_UPDATE, 1040, &[(0x10, 0, ncch(X_UPDATE, true, true))]);
        let newer = cia_of(X_UPDATE, 5232, &[(0x2A, 0, ncch(X_UPDATE, true, true))]);
        placed(&game(&dir), Some(update_file(&dir, &older)), &dir).unwrap();
        let app = title_dir(&dir).join("content/00000010.app");
        std::fs::write(&app, vec![7; ncch(X_UPDATE, true, true).len()]).unwrap();

        placed(&game(&dir), Some(update_file(&dir, &older)), &dir).unwrap();
        assert_eq!(std::fs::read(&app).unwrap()[0], 7);

        placed(&game(&dir), Some(update_file(&dir, &newer)), &dir).unwrap();
        assert_eq!(files(&title_dir(&dir)), ["content/00000000.tmd", "content/0000002a.app"]);
    }

    #[test]
    fn installs_again_over_an_install_cut_short() {
        let dir = azahar_dir("cut-short");
        let cia = cia_of(X_UPDATE, 5232, &[(0x2A, 0, ncch(X_UPDATE, true, true))]);
        placed(&game(&dir), Some(update_file(&dir, &cia)), &dir).unwrap();
        let app = title_dir(&dir).join("content/0000002a.app");
        std::fs::write(&app, [0; 0x10]).unwrap();

        placed(&game(&dir), Some(update_file(&dir, &cia)), &dir).unwrap();

        assert_eq!(std::fs::read(&app).unwrap(), ncch(X_UPDATE, true, true));
    }

    #[test]
    fn takes_away_the_update_when_the_game_has_none() {
        let dir = azahar_dir("none");
        let cia = cia_of(X_UPDATE, 5232, &[(0x2A, 0, ncch(X_UPDATE, true, true))]);
        placed(&game(&dir), Some(update_file(&dir, &cia)), &dir).unwrap();

        placed(&game(&dir), None, &dir).unwrap();

        assert!(!title_dir(&dir).exists());
    }

    #[test]
    fn puts_dlc_shaped_contents_in_their_own_folder() {
        let dir = azahar_dir("optional");
        let cia =
            cia_of(X_UPDATE, 5232, &[(0, 0, ncch(X_UPDATE, true, true)), (1, OPTIONAL, ncch(X_UPDATE, true, true))]);

        placed(&game(&dir), Some(update_file(&dir, &cia)), &dir).unwrap();

        let expected = ["content/00000000.tmd", "content/00000000/00000000.app", "content/00000000/00000001.app"];
        assert_eq!(files(&title_dir(&dir)), expected);
    }

    #[test]
    fn refuses_an_update_for_another_game_or_an_encrypted_one() {
        let dir = azahar_dir("refused");
        let other = cia_of(0x0004000E00055E00, 5232, &[(0, 0, ncch(0x0004000E00055E00, true, true))]);
        let encrypted = cia_of(X_UPDATE, 5232, &[(0, 0, ncch(X_UPDATE, false, false))]);
        let flagged = cia_of(X_UPDATE, 5232, &[(0, CONTENT_ENCRYPTED, ncch(X_UPDATE, true, true))]);

        assert!(placed(&game(&dir), Some(update_file(&dir, &other)), &dir).is_err());
        assert!(placed(&game(&dir), Some(update_file(&dir, &encrypted)), &dir).is_err());
        assert_eq!(read(&mut Cursor::new(encrypted)).err(), Some(Refused::Encrypted));
        assert_eq!(read(&mut Cursor::new(flagged)).err(), Some(Refused::Encrypted));
        assert!(!title_dir(&dir).exists());
    }

    #[test]
    fn reads_an_updates_version_and_ignores_other_files() {
        let update = read(&mut Cursor::new(cia_of(X_UPDATE, 5232, &[(0, 0, ncch(X_UPDATE, true, true))]))).unwrap();
        let game = cia_of(X, 0, &[(0, 0, ncch(X, true, true))]);

        assert_eq!(update.map(|update| (update.version, update.updates(X))), Some((5232, true)));
        assert!(read(&mut Cursor::new(game)).unwrap().is_none());
        assert!(read(&mut Cursor::new(ncch(X, true, true))).unwrap().is_none());
    }
}
