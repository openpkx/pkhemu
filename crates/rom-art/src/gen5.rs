mod animation;

use crate::lz77;
use crate::nds::{icon, palette, transparent, u16_at, Cartridge, Graphic, Narc};
use crate::{AnimatedSprite, Image, Key, Status};
use animation::{Rig, Sheet};
use std::io::{Read, Seek};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Build {
    BlackWhite,
    Black2White2,
}

impl Build {
    pub fn of(code: &str) -> Option<Build> {
        match code.get(..3)? {
            "IRB" | "IRA" => Some(Build::BlackWhite),
            "IRE" | "IRD" => Some(Build::Black2White2),
            _ => None,
        }
    }

    // Black 2 and White 2 keep 33 Pokéstar Studios props between the last species and the egg.
    fn egg(self) -> usize {
        match self {
            Build::BlackWhite => 650,
            Build::Black2White2 => 683,
        }
    }

    // Black 2 and White 2 add a second palette file before the icons.
    fn first_icon(self) -> usize {
        match self {
            Build::BlackWhite => 7,
            Build::Black2White2 => 8,
        }
    }

    fn last_item(self) -> u16 {
        match self {
            Build::BlackWhite => 626,
            Build::Black2White2 => 638,
        }
    }
}

// Paths from Project Pokémon's B2W2 file system list, which Black and White share:
// https://projectpokemon.org/home/docs/gen-5/b2w2-file-system-r8/
const SPRITES: &str = "a/0/0/4";
const ICONS: &str = "a/0/0/7";
const PERSONAL: &str = "a/0/1/6";
const ITEMS: &str = "a/0/2/5";

const SPECIES: u16 = 649;
const UNOWN: u16 = 201;
const ARCEUS: u16 = 493;

// Each sprite entry has 20 files: the still front, its female variant or nothing, the front's parts sheets and
// animation, the same nine for the back, then the normal and shiny palettes.
// Layout from https://github.com/magical/pokemon-nds-sprites/blob/master/docs/pokegra.rst
const FILES: usize = 20;
const FRONT: usize = 0;
const FEMALE_FRONT: usize = 1;
const PARTS: usize = 2;
const FEMALE_PARTS: usize = 3;
const CELLS: usize = 4;
const NORMAL: usize = 18;
const SHINY: usize = 19;

const SPRITE_SIZE: usize = 96;
const MAX_GRAPHIC: usize = 0x10000;

#[derive(Clone, Copy, Debug)]
struct Cell {
    x: usize,
    y: usize,
    width: usize,
    height: usize,
}

const fn cell(x: usize, y: usize, width: usize, height: usize) -> Cell {
    Cell { x, y, width, height }
}

// The still front is four OAM cells whose tiles follow one another, as the DS maps sprite tiles in 1D.
const STILL: [Cell; 4] = [cell(0, 0, 64, 64), cell(64, 0, 32, 64), cell(0, 64, 64, 32), cell(64, 64, 32, 32)];

fn compose(tiles: &[u8], cells: &[Cell], width: usize, height: usize) -> Option<Vec<u8>> {
    let mut pixels = vec![0; width * height];
    let mut tile = 0;
    for cell in cells {
        if cell.x + cell.width > width || cell.y + cell.height > height {
            return None;
        }
        for ty in 0..cell.height / 8 {
            for tx in 0..cell.width / 8 {
                let source = tiles.get(tile * 64..(tile + 1) * 64)?;
                for (row, line) in source.chunks(8).enumerate() {
                    let at = (cell.y + ty * 8 + row) * width + cell.x + tx * 8;
                    pixels[at..at + 8].copy_from_slice(line);
                }
                tile += 1;
            }
        }
    }
    Some(pixels)
}

fn front(graphic: &[u8]) -> Option<Vec<u8>> {
    let graphic = Graphic::read(&lz77::decompress_extended(graphic, MAX_GRAPHIC)?)?;
    if (graphic.width, graphic.height, graphic.depth, graphic.scanned) != (SPRITE_SIZE, SPRITE_SIZE, 4, false) {
        return None;
    }
    let tiles = graphic.pixels(8, SPRITE_SIZE * SPRITE_SIZE / 8)?;
    compose(&tiles, &STILL, SPRITE_SIZE, SPRITE_SIZE)
}

fn colours(file: &[u8]) -> Option<Vec<[u8; 4]>> {
    let palette = palette(file)?;
    (palette.len() >= 16).then(|| transparent(palette[..16].to_vec()))
}

const FORM_SPRITE: usize = 0x1E;
const FORM_COUNT: usize = 0x20;

struct Forms {
    species: u16,
    count: u8,
    after_eggs: usize,
}

impl Forms {
    fn entry(&self, build: Build, form: u8) -> usize {
        build.egg() + 2 + self.after_eggs + form as usize - 1
    }
}

// Personal data keeps a species' form count and where its other forms' sprites start after the eggs.
// PKHeX's PersonalInfo5BW reads the same fields. Unown's forms come first, at 0, so 0 means none for everyone else.
// Arceus has 0 too: its forms only swap palettes.
fn form_sprites(personal: &Narc) -> Vec<Forms> {
    (1..=SPECIES)
        .filter_map(|species| {
            let row = personal.get(species as usize)?;
            let (after_eggs, count) = (u16_at(row, FORM_SPRITE)? as usize, *row.get(FORM_COUNT)?);
            (count > 1 && (after_eggs != 0 || species == UNOWN)).then_some(Forms { species, count, after_eggs })
        })
        .collect()
}

fn form_count(personal: &Narc, species: u16) -> u8 {
    personal.get(species as usize).and_then(|row| row.get(FORM_COUNT)).copied().unwrap_or(1)
}

// One byte per icon: the palette of the icon in the low nibble and of its female variant in the high one.
// Its first entries, Gen 4's icon palettes in both nibbles, mark where the game keeps it.
const ICON_PALETTES_START: [u8; 16] =
    [0x00, 0x11, 0x11, 0x11, 0x00, 0x00, 0x00, 0x00, 0x22, 0x22, 0x11, 0x11, 0x00, 0x11, 0x22, 0x22];

fn icon_palettes(arm9: &[u8], len: usize) -> Option<&[u8]> {
    let at = arm9.windows(ICON_PALETTES_START.len()).position(|window| window == ICON_PALETTES_START)?;
    let table = arm9.get(at..at + len)?;
    table.iter().all(|&palettes| palettes & 0x0F <= 2 && palettes >> 4 <= 2).then_some(table)
}

// Each item has a row of two u16: its icon and palette in the item icon archive.
// Item 0 opens the table, pointing at the archive's placeholder icon.
fn item_table(arm9: &[u8], members: usize, last: u16) -> Option<&[u8]> {
    let none = members.checked_sub(4)? as u16;
    let start: Vec<u8> = [none, none + 1, 2, 3].iter().flat_map(|v: &u16| v.to_le_bytes()).collect();
    let at = arm9.windows(start.len()).position(|window| window == start)?;
    let table = arm9.get(at..at + (last as usize + 1) * 4)?;
    let fits = table.chunks(4).all(|row| {
        let (graphic, colours) = (u16_at(row, 0).unwrap_or(u16::MAX), u16_at(row, 2).unwrap_or(u16::MAX));
        (graphic as usize) < members && (colours as usize) < members
    });
    fits.then_some(table)
}

struct Decoder<'a> {
    build: Build,
    images: Vec<Image>,
    on_animation: &'a mut dyn FnMut(AnimatedSprite),
    missing: bool,
}

impl Decoder<'_> {
    fn add(&mut self, image: Option<Image>) {
        match image {
            Some(image) => self.images.push(image),
            None => self.missing = true,
        }
    }

    // The shiny and Arceus's other palettes reuse the frames drawn once.
    fn add_front(&mut self, sprites: &Narc, entry: usize, female: bool, palettes: &[(Key, usize)]) {
        let file = |kind: usize| sprites.get(entry * FILES + kind);
        let still = file(if female { FEMALE_FRONT } else { FRONT }).and_then(front);
        let animates = palettes.iter().any(|(key, _)| key.animated().is_some());
        let frames = still.as_ref().filter(|_| animates).and_then(|still| {
            let sheet = Sheet::read(file(if female { FEMALE_PARTS } else { PARTS })?)?;
            let [ncer, nanr, nmcr, nmar] = [0, 1, 2, 3].map(|k| file(CELLS + k));
            Rig::read(ncer?, nanr?, nmcr?, nmar?)?.play(&sheet, still)
        });
        for &(key, palette) in palettes {
            let (Some(pixels), Some(palette)) = (still.clone(), sprites.get(palette).and_then(colours)) else {
                self.missing = true;
                continue;
            };
            let size = SPRITE_SIZE as u32;
            if let (Some(frames), Some(animated)) = (&frames, key.animated()) {
                let (palette, frames) = (palette.clone(), frames.clone());
                (self.on_animation)(AnimatedSprite { key: animated, width: size, height: size, palette, frames });
            }
            self.images.push(Image { key, width: size, height: size, pixels, palette });
        }
    }

    fn sprites(&mut self, sprites: &Narc, forms: &[Forms], arceus_forms: u8) {
        let palette = |entry: usize, shiny: bool| entry * FILES + if shiny { SHINY } else { NORMAL };
        let both = |entry: usize, key: &dyn Fn(bool) -> Key| -> Vec<(Key, usize)> {
            [false, true].map(|shiny| (key(shiny), palette(entry, shiny))).to_vec()
        };
        for species in 1..=SPECIES {
            let entry = species as usize;
            let mut palettes = both(entry, &|shiny| Key::Sprite { species, form: 0, shiny, female: false });
            if species == ARCEUS {
                // Arceus's other forms keep their normal and shiny palettes in pairs at the end of the archive.
                let first = sprites.len.saturating_sub(2 * (arceus_forms as usize).saturating_sub(1));
                palettes.extend((1..arceus_forms).flat_map(|form| {
                    [false, true].map(|shiny| {
                        (
                            Key::Sprite { species, form, shiny, female: false },
                            first + 2 * (form as usize - 1) + shiny as usize,
                        )
                    })
                }));
            }
            self.add_front(sprites, entry, false, &palettes);
            if sprites.get(entry * FILES + FEMALE_FRONT).is_some_and(|female| !female.is_empty()) {
                let palettes = both(entry, &|shiny| Key::Sprite { species, form: 0, shiny, female: true });
                self.add_front(sprites, entry, true, &palettes);
            }
        }
        for forms in forms {
            for form in 1..forms.count {
                let entry = forms.entry(self.build, form);
                let species = forms.species;
                let palettes = both(entry, &|shiny| Key::Sprite { species, form, shiny, female: false });
                self.add_front(sprites, entry, false, &palettes);
            }
        }
        for (manaphy, key) in [Key::Egg, Key::ManaphyEgg].into_iter().enumerate() {
            let entry = self.build.egg() + manaphy;
            self.add_front(sprites, entry, false, &[(key, palette(entry, false))]);
        }
    }

    fn icons(&mut self, icons: &Narc, arm9: &[u8], forms: &[Forms]) {
        let first = self.build.first_icon();
        let Some(palettes) = icon_palettes(arm9, icons.len.saturating_sub(first) / 2) else {
            self.missing = true;
            return;
        };
        let Some(colours) = icons.get(0).and_then(palette) else {
            self.missing = true;
            return;
        };
        let has_female = |entry: usize| icons.get(first + 2 * entry + 1).is_some_and(|female| !female.is_empty());
        let mut wanted: Vec<(Key, usize, bool)> = Vec::new();
        for species in 1..=SPECIES {
            let entry = species as usize;
            wanted.push((Key::MenuIcon { species, form: 0, female: false }, entry, false));
            if has_female(entry) {
                wanted.push((Key::MenuIcon { species, form: 0, female: true }, entry, true));
            }
        }
        let egg = self.build.egg();
        wanted.extend([(Key::EggIcon, egg, false), (Key::ManaphyEggIcon, egg + 1, false)]);
        for forms in forms {
            wanted.extend((1..forms.count).map(|form| {
                (Key::MenuIcon { species: forms.species, form, female: false }, forms.entry(self.build, form), false)
            }));
        }
        for (key, entry, female) in wanted {
            let palette = palettes
                .get(entry)
                .map(|&palettes| if female { palettes >> 4 } else { palettes & 0x0F } as usize)
                .and_then(|p| colours.get(p * 16..p * 16 + 16));
            let graphic = icons.get(first + 2 * entry + female as usize);
            self.add(graphic.zip(palette).and_then(|(graphic, palette)| icon(key, graphic, palette.to_vec())));
        }
    }

    fn items(&mut self, items: &Narc, arm9: &[u8]) {
        let Some(table) = item_table(arm9, items.len, self.build.last_item()) else {
            self.missing = true;
            return;
        };
        let none = items.len - 4;
        for (id, row) in table.chunks(4).enumerate().skip(1) {
            let (graphic, colours) = (u16_at(row, 0).unwrap_or(0) as usize, u16_at(row, 2).unwrap_or(0) as usize);
            if graphic == none {
                continue;
            }
            let palette = items.get(colours).and_then(palette);
            self.add(
                items
                    .get(graphic)
                    .zip(palette)
                    .and_then(|(graphic, palette)| icon(Key::Item(id as u16), graphic, palette)),
            );
        }
    }
}

pub fn extract(
    rom: impl Read + Seek,
    build: Build,
    on_animation: &mut dyn FnMut(AnimatedSprite),
) -> (Vec<Image>, Status) {
    let unsupported = (Vec::new(), Status::Unsupported);
    let Some(mut cartridge) = Cartridge::open(rom) else {
        return unsupported;
    };
    let files = [SPRITES, ICONS, PERSONAL, ITEMS].map(|path| cartridge.file(path));
    let [sprites, icons, personal, items] = files.each_ref().map(|file| file.as_deref().and_then(Narc::open));
    let Some(sprites) = sprites.filter(|sprites| sprites.len >= (build.egg() + 2) * FILES) else {
        return unsupported;
    };
    let forms = personal.as_ref().map(form_sprites).unwrap_or_default();
    let arceus_forms = personal.as_ref().map_or(1, |personal| form_count(personal, ARCEUS));
    let mut decoder = Decoder { build, images: Vec::new(), on_animation, missing: personal.is_none() };
    decoder.sprites(&sprites, &forms, arceus_forms);
    if decoder.images.is_empty() {
        return unsupported;
    }
    let arm9 = cartridge.arm9();
    match (icons, arm9.as_deref()) {
        (Some(icons), Some(arm9)) => decoder.icons(&icons, arm9, &forms),
        _ => decoder.missing = true,
    }
    match (items, arm9.as_deref()) {
        (Some(items), Some(arm9)) => decoder.items(&items, arm9),
        _ => decoder.missing = true,
    }
    let status = if decoder.missing { Status::Partial } else { Status::Done };
    (decoder.images, status)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::lz77::stored_extended;
    use crate::nds::build;

    #[test]
    fn recognises_each_gen_5_game_in_any_language() {
        assert_eq!(
            ["IRBO", "IRAJ", "IREO", "IRDF"].map(Build::of),
            [Some(Build::BlackWhite), Some(Build::BlackWhite), Some(Build::Black2White2), Some(Build::Black2White2)]
        );
        assert_eq!(["IPKE", "BPRE", "IR", ""].map(Build::of), [None; 4]);
    }

    fn numbered_tiles(count: usize) -> Vec<u8> {
        (0..count).flat_map(|tile| [tile as u8; 64]).collect()
    }

    #[test]
    fn places_each_cells_tiles_row_by_row() {
        let cells = [cell(0, 0, 16, 8), cell(0, 8, 8, 16)];

        let pixels = compose(&numbered_tiles(4), &cells, 16, 24).unwrap();

        let at = |x: usize, y: usize| pixels[y * 16 + x];
        assert_eq!([at(0, 0), at(15, 7), at(0, 8), at(7, 23), at(8, 8)], [0, 1, 2, 3, 0]);
    }

    #[test]
    fn keeps_a_tiles_rows_in_order() {
        let tile: Vec<u8> = (0..64).collect();

        let pixels = compose(&tile, &[cell(8, 0, 8, 8)], 16, 8).unwrap();

        assert_eq!(&pixels[8..16], &tile[..8]);
        assert_eq!(&pixels[7 * 16 + 8..], &tile[56..]);
    }

    #[test]
    fn fills_the_still_front_with_its_four_cells() {
        let pixels = compose(&numbered_tiles(144), &STILL, SPRITE_SIZE, SPRITE_SIZE).unwrap();

        let at = |x: usize, y: usize| pixels[y * SPRITE_SIZE + x];
        assert_eq!(
            [at(0, 0), at(56, 56), at(64, 0), at(88, 56), at(0, 64), at(56, 88), at(64, 64), at(95, 95)],
            [0, 63, 64, 95, 96, 127, 128, 143]
        );
    }

    #[test]
    fn refuses_cells_without_enough_tiles_or_outside_the_picture() {
        assert_eq!(compose(&numbered_tiles(143), &STILL, SPRITE_SIZE, SPRITE_SIZE), None);
        assert_eq!(compose(&numbered_tiles(4), &[cell(8, 0, 16, 8)], 16, 8), None);
    }

    fn still_graphic(tile_value: u8) -> Vec<u8> {
        let data = vec![tile_value; SPRITE_SIZE * SPRITE_SIZE / 2];
        stored_extended(&build::ncgr(12, 12, 3, false, &data))
    }

    #[test]
    fn decodes_a_compressed_still_front() {
        let values: Vec<u16> = (0..16).collect();

        let (pixels, palette) = (front(&still_graphic(0x21)).unwrap(), colours(&build::nclr(&values)).unwrap());

        assert_eq!(pixels.len(), 96 * 96);
        assert_eq!(&pixels[..2], [1, 2]);
        assert_eq!(palette.len(), 16);
        assert_eq!(palette[0][3], 0);
    }

    #[test]
    fn refuses_a_front_that_is_not_a_compressed_still() {
        let uncompressed = build::ncgr(12, 12, 3, false, &[0; 4608]);
        let sheet = stored_extended(&build::ncgr(32, 16, 3, true, &[0; 16384]));

        assert!(front(&uncompressed).is_none());
        assert!(front(&sheet).is_none());
        assert!(colours(&build::nclr(&[0; 15])).is_none());
    }

    fn personal_row(first: u16, count: u8) -> Vec<u8> {
        let mut row = vec![0; 0x3C];
        row[FORM_SPRITE..FORM_SPRITE + 2].copy_from_slice(&first.to_le_bytes());
        row[FORM_COUNT] = count;
        row
    }

    #[test]
    fn finds_form_sprites_in_personal_data() {
        let mut rows = vec![personal_row(0, 1); SPECIES as usize + 1];
        rows[UNOWN as usize] = personal_row(0, 28);
        rows[351] = personal_row(27, 4);
        rows[ARCEUS as usize] = personal_row(0, 17);
        let rows: Vec<&[u8]> = rows.iter().map(Vec::as_slice).collect();
        let file = build::narc(&rows);
        let personal = Narc::open(&file).unwrap();

        let forms: Vec<(u16, u8, usize)> =
            form_sprites(&personal).iter().map(|forms| (forms.species, forms.count, forms.after_eggs)).collect();

        assert_eq!(forms, [(UNOWN, 28, 0), (351, 4, 27)]);
        assert_eq!(form_count(&personal, ARCEUS), 17);
    }

    #[test]
    fn finds_the_icon_palette_table_by_its_first_entries() {
        let arm9 = [&[7, 9, 1][..], &ICON_PALETTES_START, &[0x10, 0x01, 0x33]].concat();

        assert_eq!(icon_palettes(&arm9, 18), Some(&arm9[3..21]));
        assert_eq!(icon_palettes(&arm9, 19), None);
        assert_eq!(icon_palettes(&arm9, 20), None);
    }

    fn rows(rows: &[[u16; 2]]) -> Vec<u8> {
        rows.iter().flatten().flat_map(|v| v.to_le_bytes()).collect()
    }

    #[test]
    fn finds_the_item_table_by_its_first_two_rows() {
        let table = rows(&[[6, 7], [2, 3], [4, 5]]);
        let arm9 = [&[1, 2, 3][..], &table, &[0xFF; 4]].concat();

        assert_eq!(item_table(&arm9, 10, 2), Some(&table[..]));
        assert_eq!(item_table(&arm9, 11, 2), None);
        assert_eq!(item_table(&arm9, 10, 3), None);
    }

    #[test]
    fn refuses_an_item_table_pointing_past_the_archive() {
        let arm9 = rows(&[[6, 7], [2, 3], [4, 12]]);

        assert_eq!(item_table(&arm9, 10, 2), None);
    }

    #[test]
    fn supports_no_cartridge_without_the_sprite_archive() {
        let rom = build::cartridge(&build::narc(&[]), b"");

        for build in [Build::BlackWhite, Build::Black2White2] {
            assert_eq!(extract(std::io::Cursor::new(&rom), build, &mut |_| ()), (Vec::new(), Status::Unsupported));
        }
    }
}
