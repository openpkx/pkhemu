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
    fn needs_a_sys_folder_to_unpack() {
        let dir = fresh("pkh-emu-dolphin-sys-none");

        assert!(install_sys(&dir, &[]).is_err());
    }
}
