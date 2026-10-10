use crate::gb::{self, far, Far, Order, Rom, Tile, SPRITE_SIZE, TILE};
use crate::{AnimatedSprite, Frame, Image, Key, Status};

mod lz;

pub struct Tables {
    base_data: Far,
    pic_pointers: Far,
    unown_pic_pointers: Far,
    egg_pic: Far,
    palettes: Far,
    menu_icons: Far,
    icon_pointers: Far,
    party_menu_palettes: Far,
    pic_banks: PicBanks,
    animations: Option<Animations>,
}

pub struct Animations {
    species: AnimationTables,
    johto_frames_bank: u8,
    unown: AnimationTables,
}

// Each table holds a two-byte address per species or letter, into its own bank except for Johto species' frames.
struct AnimationTables {
    scripts: Far,
    frames: Far,
    bitmasks: Far,
}

// The pic pointer tables store some banks as other numbers, which the game maps back before reading.
enum PicBanks {
    Offset(u8),
    Moved(&'static [(u8, u8)]),
}

impl PicBanks {
    fn of(&self, stored: u8) -> u8 {
        match self {
            PicBanks::Offset(offset) => stored.wrapping_add(*offset),
            PicBanks::Moved(moves) => moves.iter().find(|(from, _)| *from == stored).map_or(stored, |(_, to)| *to),
        }
    }
}

const GOLD_SILVER_PIC_BANKS: PicBanks = PicBanks::Moved(&[(0x13, 0x1F), (0x14, 0x20), (0x1F, 0x2E)]);

pub const GOLD: Tables = Tables {
    base_data: far(0x14, 0x5B0B),
    pic_pointers: far(0x12, 0x4000),
    unown_pic_pointers: far(0x1F, 0x4000),
    egg_pic: far(0x14, 0x7A83),
    palettes: far(0x02, 0x6D3D),
    menu_icons: far(0x23, 0x6975),
    icon_pointers: far(0x23, 0x6A70),
    party_menu_palettes: far(0x02, 0x7AC6),
    pic_banks: GOLD_SILVER_PIC_BANKS,
    animations: None,
};

pub const SILVER: Tables = Tables { menu_icons: far(0x23, 0x695B), icon_pointers: far(0x23, 0x6A56), ..GOLD };

pub const CRYSTAL: Tables = Tables {
    base_data: far(0x14, 0x5424),
    pic_pointers: far(0x48, 0x4000),
    unown_pic_pointers: far(0x49, 0x4000),
    egg_pic: far(0x54, 0x5CAF),
    palettes: far(0x02, 0x68CE),
    menu_icons: far(0x23, 0x6AC4),
    icon_pointers: far(0x23, 0x6BBF),
    party_menu_palettes: far(0x02, 0x7681),
    pic_banks: PicBanks::Offset(0x36),
    animations: Some(Animations {
        species: AnimationTables { scripts: far(0x34, 0x4695), frames: far(0x35, 0x4000), bitmasks: far(0x34, 0x64EF) },
        johto_frames_bank: 0x36,
        unown: AnimationTables { scripts: far(0x34, 0x6229), frames: far(0x36, 0x59A9), bitmasks: far(0x34, 0x7AD3) },
    }),
};

const SPECIES: usize = 251;
const UNOWN: usize = 201;
const UNOWN_LETTERS: u8 = 26;
const JOHTO: usize = 152;
const EGG: usize = 0xFD;
const EGG_SIZE: usize = 5;
const BASE_DATA: usize = 32;
const PIC_SIZE: usize = 17;
const PIC_POINTER: usize = 6;
const PALETTE: usize = 4;
const WHITE: u16 = 0x7FFF;
const BLACK: u16 = 0;
// Front pics carry their animation tiles after the picture.
const MOST_DECOMPRESSED: usize = 0x2000;
const ICON_EGG: usize = 28;
const ICON_SIZE: usize = 16;

struct Picture {
    tiles: Vec<Tile>,
    size: usize,
    colours: [[u16; 4]; 2],
}

impl Picture {
    fn read(rom: &Rom, at: Far, size: usize, colours: &[u8]) -> Option<Picture> {
        let data = lz::decompress(rom.rest_of_bank(at)?, MOST_DECOMPRESSED)?;
        let tiles: Vec<Tile> = data.chunks_exact(TILE).map(gb::tile).collect();
        if tiles.len() < size * size {
            return None;
        }
        let [normal_light, normal_dark, shiny_light, shiny_dark] = gb::colours(colours);
        let colours = [[WHITE, normal_light, normal_dark, BLACK], [WHITE, shiny_light, shiny_dark, BLACK]];
        Some(Picture { tiles, size, colours })
    }

    fn still(&self) -> Cells {
        (0..self.size * self.size).collect()
    }

    fn pixels(&self, cells: &[usize]) -> Vec<u8> {
        let tiles: Vec<Tile> = cells.iter().map(|&tile| self.tiles[tile]).collect();
        gb::whiten_inside(gb::pad(&gb::compose(&tiles, self.size, self.size, Order::ByColumn), self.size, self.size))
    }

    fn palette(&self, shiny: bool) -> Vec<[u8; 4]> {
        gb::sprite_palette(self.colours[shiny as usize])
    }

    fn image(&self, key: Key, shiny: bool) -> Image {
        gb::image(key, SPRITE_SIZE, self.pixels(&self.still()), self.palette(shiny))
    }

    fn animations(&self, species: u16, form: u8, script: &[Step], frames: &[Cells]) -> Option<[AnimatedSprite; 2]> {
        let frames = script
            .iter()
            .chain([&(0, HOLD)])
            .map(|&(frame, delay)| Some(Frame { pixels: self.pixels(frames.get(frame)?), delay }))
            .collect::<Option<Vec<_>>>()?;
        Some([false, true].map(|shiny| AnimatedSprite {
            key: Key::AnimatedSprite { species, form, shiny, female: false },
            width: SPRITE_SIZE as u32,
            height: SPRITE_SIZE as u32,
            palette: self.palette(shiny),
            frames: frames.clone(),
        }))
    }

    // Frame 0 is the still picture, and the game loads only as many animation tiles as the picture has.
    fn frames(&self, rom: &Rom, sources: &Sources) -> Option<Vec<Cells>> {
        let list = sources.frames;
        let count = (rom.u16(list)?.checked_sub(list.address)? / 2) as usize;
        if !(1..=MOST_FRAMES).contains(&count) {
            return None;
        }
        let tiles = self.tiles.len().min(2 * self.size * self.size);
        let mask_len = (self.size * self.size).div_ceil(8);
        let mut frames = vec![self.still()];
        for n in 0..count {
            let data = rom.rest_of_bank(far(list.bank, rom.u16(list.plus(2 * n))?))?;
            let (&mask, ids) = data.split_first()?;
            let bitmask = rom.bytes(sources.bitmasks.plus(mask as usize * mask_len), mask_len)?;
            let cells = replace_cells(self.still(), bitmask, ids)?;
            if cells.iter().any(|&tile| tile >= tiles) {
                return None;
            }
            frames.push(cells);
        }
        Some(frames)
    }
}

type Cells = Vec<usize>;

// A frame swaps the cells its bitmask sets, counted down each column, for its own tiles in turn.
fn replace_cells(mut cells: Cells, bitmask: &[u8], ids: &[u8]) -> Option<Cells> {
    let set = |bit: usize| bitmask.get(bit / 8).is_some_and(|byte| byte >> (bit % 8) & 1 == 1);
    if (cells.len()..bitmask.len() * 8).any(set) {
        return None;
    }
    let mut ids = ids.iter();
    for (bit, cell) in cells.iter_mut().enumerate() {
        if set(bit) {
            *cell = *ids.next()? as usize;
        }
    }
    Some(cells)
}

type Step = (usize, u16);

const END: u8 = 0xFF;
const SET_REPEAT: u8 = 0xFE;
const DO_REPEAT: u8 = 0xFD;
const MOST_COMMANDS: usize = 256;
const MOST_FRAMES: usize = 64;
const HOLD: u16 = 120;

// Each command is a frame and its duration, or a repeat. A repeat jumps back to a command index.
fn script(bytes: &[u8]) -> Option<Vec<Step>> {
    let mut steps = Vec::new();
    let (mut at, mut repeats) = (0, 0);
    for _ in 0..MOST_COMMANDS {
        let command = *bytes.get(2 * at)?;
        if command == END {
            return (!steps.is_empty()).then_some(steps);
        }
        let parameter = *bytes.get(2 * at + 1)?;
        at += 1;
        match command {
            SET_REPEAT => repeats = parameter,
            // The count includes the pass already played.
            DO_REPEAT if repeats > 1 => {
                repeats -= 1;
                at = parameter as usize;
            }
            DO_REPEAT => repeats = 0,
            _ if parameter == 0 => return None,
            frame => steps.push((frame as usize, parameter as u16)),
        }
    }
    None
}

struct Sources {
    script: Far,
    frames: Far,
    bitmasks: Far,
}

fn sources(rom: &Rom, animations: &Animations, species: usize, letter: u8) -> Option<Sources> {
    let (tables, index) =
        if species == UNOWN { (&animations.unown, letter as usize) } else { (&animations.species, species - 1) };
    let frames_bank =
        if species >= JOHTO && species != UNOWN { animations.johto_frames_bank } else { tables.frames.bank };
    let entry = |table: Far, bank: u8| Some(far(bank, rom.u16(table.plus(index * 2))?));
    Some(Sources {
        script: entry(tables.scripts, tables.scripts.bank)?,
        frames: entry(tables.frames, frames_bank)?,
        bitmasks: entry(tables.bitmasks, tables.bitmasks.bank)?,
    })
}

fn animated_sprites(
    rom: &Rom,
    tables: &Animations,
    picture: &Picture,
    species: u16,
    form: u8,
) -> Option<[AnimatedSprite; 2]> {
    let sources = sources(rom, tables, species as usize, form)?;
    let script = script(rom.rest_of_bank(sources.script)?)?;
    picture.animations(species, form, &script, &picture.frames(rom, &sources)?)
}

fn pic_address(rom: &Rom, tables: &Tables, at: Far) -> Option<Far> {
    let bank = *rom.rest_of_bank(at)?.first()?;
    Some(far(tables.pic_banks.of(bank), rom.u16(at.plus(1))?))
}

fn sprites(rom: &Rom, tables: &Tables, species: usize) -> Option<(Vec<Image>, Vec<AnimatedSprite>)> {
    let base = rom.bytes(tables.base_data.plus((species - 1) * BASE_DATA), BASE_DATA)?;
    let size = (base[PIC_SIZE] & 0xF) as usize;
    if base[0] as usize != species || base[PIC_SIZE] >> 4 != size as u8 || !(1..=7).contains(&size) {
        return None;
    }
    let colours = rom.bytes(tables.palettes.plus(species * 2 * PALETTE), 2 * PALETTE)?;
    let pictures: Vec<(u8, Far)> = if species == UNOWN {
        (0..UNOWN_LETTERS)
            .map(|letter| (letter, tables.unown_pic_pointers.plus(letter as usize * PIC_POINTER)))
            .collect()
    } else {
        vec![(0, tables.pic_pointers.plus((species - 1) * PIC_POINTER))]
    };
    let mut images = Vec::new();
    let mut animated = Vec::new();
    for (form, pointer) in pictures {
        let picture = Picture::read(rom, pic_address(rom, tables, pointer)?, size, colours)?;
        for shiny in [false, true] {
            images.push(picture.image(Key::Sprite { species: species as u16, form, shiny, female: false }, shiny));
        }
        if let Some(animations) = &tables.animations {
            animated.extend(animated_sprites(rom, animations, &picture, species as u16, form).into_iter().flatten());
        }
    }
    Some((images, animated))
}

fn egg(rom: &Rom, tables: &Tables) -> Option<Image> {
    let colours = rom.bytes(tables.palettes.plus(EGG * 2 * PALETTE), 2 * PALETTE)?;
    Some(Picture::read(rom, tables.egg_pic, EGG_SIZE, colours)?.image(Key::Egg, false))
}

fn icons(rom: &Rom, tables: &Tables) -> Option<Vec<Image>> {
    let colours = rom.bytes(tables.party_menu_palettes, 8)?;
    let palette = gb::palette(gb::colours(colours));
    let icon = |key: Key, id: usize| -> Option<Image> {
        let graphics = far(tables.icon_pointers.bank, rom.u16(tables.icon_pointers.plus(id * 2))?);
        let tiles: Vec<Tile> = rom.bytes(graphics, 4 * TILE)?.chunks(TILE).map(gb::tile).collect();
        Some(gb::image(key, ICON_SIZE, gb::compose(&tiles, 2, 2, Order::ByRow), palette.clone()))
    };
    let ids = rom.bytes(tables.menu_icons, SPECIES)?;
    let mut images = vec![icon(Key::EggIcon, ICON_EGG)?];
    for (species, &id) in (1..).zip(ids) {
        let forms = if species == UNOWN as u16 { UNOWN_LETTERS } else { 1 };
        for form in 0..forms {
            images.push(icon(Key::MenuIcon { species, form, female: false }, id as usize)?);
        }
    }
    Some(images)
}

pub fn extract(rom: &Rom, tables: &Tables) -> (Vec<Image>, Vec<AnimatedSprite>, Status) {
    let mut images = Vec::new();
    let mut animations = Vec::new();
    let mut missing = false;
    for species in 1..=SPECIES {
        match sprites(rom, tables, species) {
            Some((sprites, animated)) => {
                images.extend(sprites);
                animations.extend(animated);
            }
            None => missing = true,
        }
    }
    if images.is_empty() {
        return (Vec::new(), Vec::new(), Status::Unsupported);
    }
    for found in [egg(rom, tables).map(|egg| vec![egg]), icons(rom, tables)] {
        match found {
            Some(found) => images.extend(found),
            None => missing = true,
        }
    }
    (images, animations, if missing { Status::Partial } else { Status::Done })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn maps_stored_pic_banks_back_to_the_real_ones() {
        assert_eq!(CRYSTAL.pic_banks.of(0x1D), 0x53);
        assert_eq!([0x12, 0x13, 0x14, 0x1F, 0x2E].map(|bank| GOLD.pic_banks.of(bank)), [0x12, 0x1F, 0x20, 0x2E, 0x2E]);
    }

    #[test]
    fn replaces_the_cells_a_bitmask_sets_down_each_column() {
        let cells = replace_cells((0..25).collect(), &[0b0000_0110, 0, 0, 1], &[30, 31, 32]).unwrap();

        assert_eq!(&cells[..4], [0, 30, 31, 3]);
        assert_eq!(cells[24], 32);
        assert_eq!(replace_cells((0..25).collect(), &[0b11, 0, 0, 0], &[30]), None);
        assert_eq!(replace_cells((0..25).collect(), &[0, 0, 0, 0b10], &[30]), None);
    }

    #[test]
    fn unrolls_an_entry_script_with_its_repeats() {
        let bytes = [1, 10, SET_REPEAT, 3, 0, 5, 2, 6, DO_REPEAT, 2, 3, 7, END];

        assert_eq!(script(&bytes), Some(vec![(1, 10), (0, 5), (2, 6), (0, 5), (2, 6), (0, 5), (2, 6), (3, 7)]));
    }

    #[test]
    fn skips_a_script_that_never_ends() {
        assert_eq!(script(&[1, 10, 2, 10]), None);
        assert_eq!(script(&[SET_REPEAT, 2, 1, 10, DO_REPEAT, 1, END]), Some(vec![(1, 10), (1, 10)]));
        assert_eq!(script(&[1, 10, SET_REPEAT, 255, DO_REPEAT, 0, END]), None);
        assert_eq!(script(&[1, 0, END]), None);
        assert_eq!(script(&[END]), None);
    }

    fn picture() -> Picture {
        let tiles = (0..50).map(|n| [[(n % 4) as u8; 8]; 8]).collect();
        Picture { tiles, size: 5, colours: [[WHITE, 1, 2, BLACK], [WHITE, 3, 4, BLACK]] }
    }

    #[test]
    fn plays_each_step_then_holds_the_still_picture() {
        let picture = picture();
        let frames = vec![picture.still(), replace_cells(picture.still(), &[1, 0, 0, 0], &[27]).unwrap()];

        let [normal, shiny] = picture.animations(1, 0, &[(1, 10), (0, 5)], &frames).unwrap();

        assert_eq!(normal.key, Key::AnimatedSprite { species: 1, form: 0, shiny: false, female: false });
        assert_eq!(shiny.key, Key::AnimatedSprite { species: 1, form: 0, shiny: true, female: false });
        assert_eq!(normal.frames.iter().map(|frame| frame.delay).collect::<Vec<_>>(), [10, 5, HOLD]);
        assert_eq!(normal.frames[0].pixels, picture.pixels(&frames[1]));
        assert_eq!(normal.frames[2].pixels, picture.pixels(&picture.still()));
        assert_ne!(normal.palette, shiny.palette);
    }

    #[test]
    fn skips_a_script_with_a_frame_out_of_range() {
        let picture = picture();

        assert!(picture.animations(1, 0, &[(1, 10), (2, 5)], &[picture.still(), picture.still()]).is_none());
    }

    #[test]
    fn supports_no_rom_without_base_data() {
        let rom = vec![0; 0x80 * 0x4000];

        assert_eq!(extract(&Rom(&rom), &CRYSTAL), (Vec::new(), Vec::new(), Status::Unsupported));
    }
}
