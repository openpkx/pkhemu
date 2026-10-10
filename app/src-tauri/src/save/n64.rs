use std::ops::Range;

pub const SIZE: usize = 0x48800;
pub const EXTENSIONS: [&str; 4] = ["eep", "mpk", "sra", "fla"];
const REGIONS: [Range<usize>; 4] = [0..0x800, 0x800..0x20800, 0x20800..0x28800, 0x28800..SIZE];
const PAK: usize = 0x8000;
const PAK_PAGE: usize = 0x100;

// PKHeX reads Stadium 1 and 2 from FlashRAM and Pocket Monsters Stadium from SRAM.
pub fn editable(save: &[u8]) -> Range<usize> {
    let [sram, flash] = [REGIONS[2].clone(), REGIONS[3].clone()];
    if !written("fla", &save[flash.clone()]) && written("sra", &save[sram.clone()]) {
        sram
    } else {
        flash
    }
}

fn region(extension: &str) -> Option<Range<usize>> {
    EXTENSIONS.iter().position(|known| *known == extension).map(|at| REGIONS[at].clone())
}

pub fn join<'a>(files: impl IntoIterator<Item = (&'a str, &'a [u8])>) -> Vec<u8> {
    let mut save = vec![0xFF; SIZE];
    for (extension, file) in files {
        let Some(at) = region(extension) else { continue };
        let len = file.len().min(at.len());
        save[at.start..at.start + len].copy_from_slice(&file[..len]);
    }
    save
}

pub fn split(save: &[u8]) -> impl Iterator<Item = (&'static str, &[u8])> {
    EXTENSIONS.into_iter().zip(REGIONS).map(|(extension, at)| (extension, &save[at]))
}

// A region holds 0xFF until the game writes it, except the Controller Paks, which the core formats with a random serial.
pub fn written(extension: &str, region: &[u8]) -> bool {
    match extension {
        "mpk" => !region.chunks(PAK).all(|pak| unformatted(pak) || fresh(pak)),
        _ => !region.iter().all(|&byte| byte == 0xFF),
    }
}

fn unformatted(pak: &[u8]) -> bool {
    pak.iter().all(|&byte| byte == 0xFF)
}

fn fresh(pak: &[u8]) -> bool {
    let index = empty_index_page();
    pak.len() == PAK
        && pak[PAK_PAGE..2 * PAK_PAGE] == index
        && pak[2 * PAK_PAGE..3 * PAK_PAGE] == index
        && pak[3 * PAK_PAGE..].iter().all(|&byte| byte == 0)
}

// mupen64plus's format_mempak: five reserved inodes, then 123 free ones (0x0003), with their checksum in byte 1.
fn empty_index_page() -> [u8; PAK_PAGE] {
    let mut page = [0; PAK_PAGE];
    for inode in 5..PAK_PAGE / 2 {
        page[2 * inode + 1] = 3;
    }
    page[1] = page[10..].iter().fold(0u8, |sum, &byte| sum.wrapping_add(byte));
    page
}

fn paks() -> impl Iterator<Item = Range<usize>> {
    REGIONS[1].clone().step_by(PAK).map(|at| at..at + PAK)
}

// A Controller Pak with no file reads as 0xFF, which a game takes for a broken pak, so the core's own format stays.
pub fn fill(save_ram: &mut [u8], save: &[u8]) {
    let pieces = [REGIONS[0].clone()].into_iter().chain(paks()).chain(REGIONS[2..].iter().cloned());
    for at in pieces {
        let (Some(from), Some(to)) = (save.get(at.clone()), save_ram.get_mut(at.clone())) else { continue };
        if !(REGIONS[1].contains(&at.start) && unformatted(from)) {
            to.copy_from_slice(from);
        }
    }
}

#[cfg(test)]
pub mod tests {
    use super::*;
    use crate::test_games::pattern;

    // What the core holds right after loading a game with no save: 0xFF, and four freshly formatted paks.
    pub fn fresh_memory(serial: u8) -> Vec<u8> {
        let mut memory = vec![0xFF; SIZE];
        for at in paks() {
            let pak = &mut memory[at];
            pak.fill(0);
            pak[0x20..0x38].fill(serial);
            pak[PAK_PAGE..2 * PAK_PAGE].copy_from_slice(&empty_index_page());
            pak[2 * PAK_PAGE..3 * PAK_PAGE].copy_from_slice(&empty_index_page());
        }
        memory
    }

    #[test]
    fn splits_and_joins_every_region_back_to_the_same_bytes() {
        let save = pattern(SIZE, 7);

        let files: Vec<_> = split(&save).collect();

        assert_eq!(
            files.iter().map(|(extension, file)| (*extension, file.len())).collect::<Vec<_>>(),
            [("eep", 0x800), ("mpk", 0x20000), ("sra", 0x8000), ("fla", 0x20000)]
        );
        assert_eq!(join(files), save);
    }

    #[test]
    fn puts_each_file_at_its_region() {
        for (extension, at) in EXTENSIONS.into_iter().zip(REGIONS) {
            let file = pattern(at.len(), 3);

            let save = join([(extension, file.as_slice())]);

            assert_eq!(save[at.clone()], file, "{extension}");
            assert!(save[..at.start].iter().chain(&save[at.end..]).all(|&byte| byte == 0xFF), "{extension}");
        }
    }

    #[test]
    fn counts_a_region_as_written_once_it_differs_from_a_fresh_one() {
        let fresh = fresh_memory(9);
        assert!(split(&fresh).all(|(extension, region)| !written(extension, region)));

        let mut memory = fresh.clone();
        memory[0x800 + 3 * PAK + 0x300] = 1;
        memory[0x28800] = 0;

        let written: Vec<_> = split(&memory).filter(|(extension, region)| written(extension, region)).collect();
        assert_eq!(written.iter().map(|(extension, _)| *extension).collect::<Vec<_>>(), ["mpk", "fla"]);
    }

    #[test]
    fn edits_the_flash_ram_or_the_sram_when_only_it_was_written() {
        let fresh = fresh_memory(9);
        let mut sram = fresh.clone();
        sram[0x20800] = 0;
        let mut both = sram.clone();
        both[0x28800] = 0;

        assert_eq!(editable(&fresh), 0x28800..SIZE);
        assert_eq!(editable(&sram), 0x20800..0x28800);
        assert_eq!(editable(&both), 0x28800..SIZE);
    }

    #[test]
    fn keeps_the_cores_paks_where_the_save_has_none() {
        let mut save_ram = fresh_memory(9);
        let mut save = join([("fla", pattern(0x20000, 1).as_slice())]);
        save[0x800 + PAK..0x800 + 2 * PAK].copy_from_slice(&pattern(PAK, 2));

        fill(&mut save_ram, &save);

        let mut expected = fresh_memory(9);
        expected[0x28800..].copy_from_slice(&pattern(0x20000, 1));
        expected[0x800 + PAK..0x800 + 2 * PAK].copy_from_slice(&pattern(PAK, 2));
        assert_eq!(save_ram, expected);
    }
}
