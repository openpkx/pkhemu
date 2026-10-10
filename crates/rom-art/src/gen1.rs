use crate::gb::{self, far, Far, Order, Rom, Tile, TILE};
use crate::{Image, Key, Status};

mod pic;

pub struct Tables {
    base_stats: Far,
    // Red, Blue and the Japanese games keep Mew's base stats apart from the rest.
    mew_base_stats: Option<Far>,
    dex_order: Far,
    monster_palettes: Far,
    super_palettes: Far,
    icon_kinds: Far,
    icon_graphics: Far,
    icon_graphics_count: usize,
    pic_banks: PicBanks,
}

// The game picks the bank of a species' picture from its species index.
struct PicBanks {
    mew: Option<u8>,
    limits: [u8; 4],
}

const PIC_BANKS: [u8; 5] = [0x09, 0x0A, 0x0B, 0x0C, 0x0D];
const MEW_INDEX: u8 = 0x15;

impl PicBanks {
    fn of(&self, index: u8) -> u8 {
        match self.mew {
            Some(bank) if index == MEW_INDEX => bank,
            _ => PIC_BANKS[self.limits.iter().take_while(|&&limit| index >= limit).count()],
        }
    }
}

pub const RED_BLUE: Tables = Tables {
    base_stats: far(0x0E, 0x43DE),
    mew_base_stats: Some(far(0x01, 0x425B)),
    dex_order: far(0x10, 0x5024),
    monster_palettes: far(0x1C, 0x65C8),
    super_palettes: far(0x1C, 0x6660),
    icon_kinds: far(0x1C, 0x590D),
    icon_graphics: far(0x1C, 0x57C0),
    icon_graphics_count: 28,
    pic_banks: PicBanks { mew: Some(0x01), limits: [0x1F, 0x4A, 0x74, 0x99] },
};

pub const YELLOW: Tables = Tables {
    base_stats: far(0x0E, 0x43DE),
    mew_base_stats: None,
    dex_order: far(0x10, 0x50B1),
    monster_palettes: far(0x1C, 0x6921),
    super_palettes: far(0x1C, 0x69B9),
    icon_kinds: far(0x1C, 0x59BA),
    icon_graphics: far(0x1C, 0x584D),
    icon_graphics_count: 30,
    pic_banks: PicBanks { mew: None, limits: [0x1F, 0x4A, 0x74, 0x99] },
};

pub const JAPANESE: Tables = Tables {
    base_stats: far(0x0E, 0x4000),
    mew_base_stats: Some(far(0x01, 0x4200)),
    dex_order: far(0x10, 0x679A),
    monster_palettes: far(0x1C, 0x6A1E),
    super_palettes: far(0x1C, 0x6AB6),
    icon_kinds: far(0x1C, 0x5DD1),
    icon_graphics: far(0x1C, 0x5C84),
    icon_graphics_count: 28,
    pic_banks: PicBanks { mew: Some(0x01), limits: [0x1F, 0x4A, 0x75, 0x9A] },
};

const SPECIES: usize = 151;
const SPECIES_INDICES: usize = 190;
const BASE_STATS: usize = 28;
const PIC_DIMENSIONS: usize = 10;
const FRONT_PIC: usize = 11;
const PARTY_MENU_PALETTE: u8 = 0x10;
const HELIX: u8 = 2;
const ICON_SIZE: usize = 16;
const ICON_FRAME_TILES: usize = 4;
const VRAM_TILES: u16 = 0x8000;
// The party menu draws icons through OBP0 %11010000, which shows colours 1, 2 and 3 as shades 0, 1 and 3.
const ICON_SHADES: [usize; 4] = [0, 0, 1, 3];

fn species_indices(rom: &Rom, tables: &Tables) -> Option<[u8; SPECIES + 1]> {
    let order = rom.bytes(tables.dex_order, SPECIES_INDICES)?;
    let mut indices = [0; SPECIES + 1];
    for (index, &dex) in (1..).zip(order) {
        match indices.get_mut(dex as usize) {
            Some(_) if dex == 0 => {}
            Some(slot @ 0) => *slot = index,
            _ => return None,
        }
    }
    indices[1..].iter().all(|&index| index != 0).then_some(indices)
}

fn super_palette(rom: &Rom, tables: &Tables, id: u8) -> Option<[u16; 4]> {
    let bytes = rom.bytes(tables.super_palettes.plus(id as usize * 8), 8)?;
    Some(gb::colours(bytes))
}

fn sprite(rom: &Rom, tables: &Tables, dex: usize, index: u8) -> Option<Image> {
    let at = match tables.mew_base_stats {
        Some(mew) if dex == SPECIES => mew,
        _ => tables.base_stats.plus((dex - 1) * BASE_STATS),
    };
    let base = rom.bytes(at, BASE_STATS)?;
    if base[0] as usize != dex {
        return None;
    }
    let address = u16::from_le_bytes([base[FRONT_PIC], base[FRONT_PIC + 1]]);
    let picture = pic::decompress(rom.rest_of_bank(far(tables.pic_banks.of(index), address))?)?;
    if base[PIC_DIMENSIONS] as usize != (picture.width << 4 | picture.height) {
        return None;
    }
    let palette = super_palette(rom, tables, *rom.rest_of_bank(tables.monster_palettes.plus(dex))?.first()?)?;
    let key = Key::Sprite { species: dex as u16, form: 0, shiny: false, female: false };
    Some(gb::sprite(key, gb::pad(&picture.pixels, picture.width, picture.height), palette))
}

fn icons(rom: &Rom, tables: &Tables) -> Option<Vec<Image>> {
    let mut vram = [0; 0x100 * TILE];
    for entry in rom.bytes(tables.icon_graphics, 6 * tables.icon_graphics_count)?.chunks(6) {
        let source = far(entry[3], u16::from_le_bytes([entry[0], entry[1]]));
        let len = entry[2] as usize * TILE;
        let start = u16::from_le_bytes([entry[4], entry[5]]).checked_sub(VRAM_TILES)? as usize;
        vram.get_mut(start..start + len)?.copy_from_slice(rom.bytes(source, len)?);
    }
    let colours = super_palette(rom, tables, PARTY_MENU_PALETTE)?;
    let palette = gb::palette(ICON_SHADES.map(|shade| colours[shade]));
    let kinds = rom.bytes(tables.icon_kinds, SPECIES.div_ceil(2))?;
    let images = (1..=SPECIES).map(|dex| {
        let pair = kinds[(dex - 1) / 2];
        let kind = if dex % 2 == 1 { pair >> 4 } else { pair & 0xF };
        let tile = |n: usize| -> Tile {
            let at = (kind as usize * ICON_FRAME_TILES + n) * TILE;
            gb::tile(&vram[at..at + TILE])
        };
        // Every icon but the helix is symmetric, so the game mirrors its left half.
        let tiles = if kind == HELIX {
            [tile(0), tile(1), tile(2), tile(3)]
        } else {
            [tile(0), gb::flipped(tile(0)), tile(2), gb::flipped(tile(2))]
        };
        let key = Key::MenuIcon { species: dex as u16, form: 0, female: false };
        gb::image(key, ICON_SIZE, gb::compose(&tiles, 2, 2, Order::ByRow), palette.clone())
    });
    Some(images.collect())
}

pub fn extract(rom: &Rom, tables: &Tables) -> (Vec<Image>, Status) {
    let Some(indices) = species_indices(rom, tables) else {
        return (Vec::new(), Status::Unsupported);
    };
    let sprites: Vec<Option<Image>> = (1..=SPECIES).map(|dex| sprite(rom, tables, dex, indices[dex])).collect();
    let mut missing = sprites.iter().any(Option::is_none);
    let mut images: Vec<Image> = sprites.into_iter().flatten().collect();
    if images.is_empty() {
        return (Vec::new(), Status::Unsupported);
    }
    match icons(rom, tables) {
        Some(icons) => images.extend(icons),
        None => missing = true,
    }
    (images, if missing { Status::Partial } else { Status::Done })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn picks_the_bank_of_a_picture_by_species_index() {
        let banks = &RED_BLUE.pic_banks;

        assert_eq!(
            [0x01, 0x15, 0x1E, 0x1F, 0x49, 0x4A, 0x73, 0x74, 0x98, 0x99, 0xBE].map(|i| banks.of(i)),
            [0x09, 0x01, 0x09, 0x0A, 0x0A, 0x0B, 0x0B, 0x0C, 0x0C, 0x0D, 0x0D]
        );
        assert_eq!(YELLOW.pic_banks.of(MEW_INDEX), 0x09);
        assert_eq!(JAPANESE.pic_banks.of(0x74), 0x0B);
    }

    fn with_dex_order(order: &[u8]) -> Vec<u8> {
        let mut rom = vec![0; 0x11 * 0x4000];
        let at = 0x10 * 0x4000 + 0x5024 - 0x4000;
        rom[at..at + order.len()].copy_from_slice(order);
        rom
    }

    #[test]
    fn maps_each_species_to_its_index() {
        let mut order: Vec<u8> = (1..=SPECIES as u8).rev().collect();
        order.insert(3, 0);
        let rom = with_dex_order(&order);

        let indices = species_indices(&Rom(&rom), &RED_BLUE).unwrap();

        assert_eq!([indices[151], indices[149], indices[148], indices[1]], [1, 3, 5, 152]);
    }

    #[test]
    fn refuses_a_dex_order_that_misses_or_repeats_a_species() {
        let mut order: Vec<u8> = (1..=SPECIES as u8).collect();
        order[5] = 1;

        assert_eq!(species_indices(&Rom(&with_dex_order(&order)), &RED_BLUE), None);
        assert_eq!(species_indices(&Rom(&with_dex_order(&[200])), &RED_BLUE), None);
    }

    #[test]
    fn supports_no_rom_without_a_dex_order() {
        let rom = with_dex_order(&[]);

        assert_eq!(extract(&Rom(&rom), &RED_BLUE), (Vec::new(), Status::Unsupported));
    }
}
