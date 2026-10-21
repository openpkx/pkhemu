use std::io::{Read, Seek};
use std::path::Path;

pub fn install_sys(dir: &Path, zipped: &[u8]) -> Result<(), String> {
    let (sys, unpacking, version) = (dir.join("Sys"), dir.join("Sys.unpacking"), dir.join("Sys.sha256"));
    let sha256 = crate::save::sha256(zipped);
    if sys.is_dir() && std::fs::read_to_string(&version).is_ok_and(|installed| installed == sha256) {
        return Ok(());
    }
    let failed = |e: &dyn std::fmt::Display| format!("Dolphin's Sys folder: {e}");
    let mut archive = zip::ZipArchive::new(std::io::Cursor::new(zipped)).map_err(|e| failed(&e))?;
    let _ = std::fs::remove_dir_all(&unpacking);
    archive.extract(&unpacking).map_err(|e| failed(&e))?;
    if sys.exists() {
        std::fs::remove_dir_all(&sys).map_err(|e| failed(&e))?;
    }
    std::fs::rename(&unpacking, &sys).map_err(|e| failed(&e))?;
    std::fs::write(&version, sha256).map_err(|e| failed(&e))
}

// Slot A takes the game's raw card, and slot B stays empty.
pub fn use_card(dir: &Path, card: &Path) -> Result<(), String> {
    let config = dir.join("User/Config");
    let failed = |e: std::io::Error| format!("Dolphin's settings: {e}");
    std::fs::create_dir_all(&config).map_err(failed)?;
    let ini = format!("[Core]\nSlotA = 1\nSlotB = 255\nMemcardAPath = {}\n", card.display());
    std::fs::write(config.join("Dolphin.ini"), ini).map_err(failed)
}

// Dolphin formats a new card at 2,043 blocks unless the game's own settings ask for fewer, and it ignores the size in
// Dolphin.ini. 2 makes 251 blocks, 2 MB. A card that exists keeps the size of its file.
pub fn use_small_cards(dir: &Path, disc: impl Read + Seek) -> Result<(), String> {
    let Ok(Some(header)) = crate::game_cube::header(disc) else { return Ok(()) };
    let id = &header[..6];
    if !id.iter().all(u8::is_ascii_alphanumeric) || japanese(&header) {
        return Ok(());
    }
    let failed = |e: std::io::Error| format!("Dolphin's game settings: {e}");
    let settings = dir.join("User/GameSettings");
    std::fs::create_dir_all(&settings).map_err(failed)?;
    let ini = settings.join(format!("{}.ini", String::from_utf8_lossy(id)));
    std::fs::write(ini, "[Core]\nMemoryCardSize = 2\n").map_err(failed)
}

// Dolphin formats a card in Shift-JIS only when its name ends in .JAP.raw, and a 251-block card's name ends in
// .JAP.251.raw, so Japanese discs keep 2,043 blocks. The country codes are the ones Dolphin counts as NTSC-J or NTSC-K.
fn japanese(header: &[u8]) -> bool {
    matches!(header[3], b'J' | b'W' | b'K' | b'Q' | b'T') || (header[3] == b'E' && header[7] >= 0x30)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_games::zip_of;
    use std::path::PathBuf;

    fn fresh(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(name);
        let _ = std::fs::remove_dir_all(&dir);
        dir
    }

    #[test]
    fn unpacks_the_sys_folder() {
        let dir = fresh("pkh-emu-dolphin-sys");
        let zipped = zip_of(&[("GameSettings/GXX.ini", b"[Core]"), ("GC/font_western.bin", b"font")]);

        install_sys(&dir, &zipped).unwrap();

        assert_eq!(std::fs::read(dir.join("Sys/GameSettings/GXX.ini")).unwrap(), b"[Core]");
        assert_eq!(std::fs::read(dir.join("Sys/GC/font_western.bin")).unwrap(), b"font");
    }

    #[test]
    fn replaces_a_sys_folder_from_another_build() {
        let dir = fresh("pkh-emu-dolphin-sys-update");
        install_sys(&dir, &zip_of(&[("GameSettings/GXX.ini", b"old"), ("GameSettings/Gone.ini", b"gone")])).unwrap();

        install_sys(&dir, &zip_of(&[("GameSettings/GXX.ini", b"new")])).unwrap();

        assert_eq!(std::fs::read(dir.join("Sys/GameSettings/GXX.ini")).unwrap(), b"new");
        assert!(!dir.join("Sys/GameSettings/Gone.ini").exists());
    }

    #[test]
    fn leaves_the_same_sys_folder_alone() {
        let dir = fresh("pkh-emu-dolphin-sys-same");
        let zipped = zip_of(&[("GameSettings/GXX.ini", b"[Core]")]);
        install_sys(&dir, &zipped).unwrap();
        std::fs::write(dir.join("Sys/marker"), b"kept").unwrap();

        install_sys(&dir, &zipped).unwrap();

        assert!(dir.join("Sys/marker").exists());
    }

    #[test]
    fn puts_the_card_in_slot_a_and_nothing_in_slot_b() {
        let dir = fresh("pkh-emu-dolphin-card");
        std::fs::create_dir_all(dir.join("User/Config")).unwrap();
        std::fs::write(dir.join("User/Config/Dolphin.ini"), "[Core]\nSlotA = 8\nSlotB = 1\n").unwrap();

        use_card(&dir, &dir.join("User/GC/card.raw")).unwrap();

        let ini = std::fs::read_to_string(dir.join("User/Config/Dolphin.ini")).unwrap();
        let card = dir.join("User/GC/card.raw");
        assert_eq!(ini, format!("[Core]\nSlotA = 1\nSlotB = 255\nMemcardAPath = {}\n", card.display()));
    }

    #[test]
    fn formats_new_cards_for_the_disc_at_251_blocks() {
        let dir = fresh("pkh-emu-dolphin-card-size");
        let disc = crate::game_cube::tests::iso(b"GC6P01", 0);

        use_small_cards(&dir, std::io::Cursor::new(disc)).unwrap();

        let ini = std::fs::read_to_string(dir.join("User/GameSettings/GC6P01.ini")).unwrap();
        assert_eq!(ini, "[Core]\nMemoryCardSize = 2\n");
    }

    #[test]
    fn leaves_the_card_size_alone_for_a_japanese_disc() {
        let dir = fresh("pkh-emu-dolphin-card-size-japan");

        use_small_cards(&dir, std::io::Cursor::new(crate::game_cube::tests::iso(b"GC6J01", 0))).unwrap();

        assert!(!dir.join("User/GameSettings").exists());
    }

    #[test]
    fn leaves_the_card_size_alone_for_a_file_that_isnt_a_disc() {
        let dir = fresh("pkh-emu-dolphin-card-size-none");

        use_small_cards(&dir, std::io::Cursor::new(b"not a disc".to_vec())).unwrap();

        assert!(!dir.join("User/GameSettings").exists());
    }

    #[test]
    fn needs_a_sys_folder_to_unpack() {
        let dir = fresh("pkh-emu-dolphin-sys-none");

        assert!(install_sys(&dir, &[]).is_err());
    }
}
