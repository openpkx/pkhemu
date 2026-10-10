use crate::nds::{icon, palette, transparent, u16_at, Cartridge, Graphic, Narc};
use crate::{AnimatedSprite, Frame, Image, Key, Status};
use std::io::{Read, Seek};

#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub enum Build {
    DiamondPearl,
    Platinum,
    HeartGoldSoulSilver,
}

impl Build {
    pub fn of(code: &str) -> Option<Build> {
        match code.get(..3)? {
            "ADA" | "APA" => Some(Build::DiamondPearl),
            "CPU" => Some(Build::Platinum),
            "IPK" | "IPG" => Some(Build::HeartGoldSoulSilver),
            _ => None,
        }
    }

    fn paths(self) -> [&'static str; 5] {
        match self {
            Build::DiamondPearl => [
                "poketool/pokegra/pokegra.narc",
                "poketool/pokegra/otherpoke.narc",
                "poketool/icongra/poke_icon.narc",
                "itemtool/itemdata/item_icon.narc",
                "poketool/pokeanm/pokeanm.narc",
            ],
            Build::Platinum => [
                "poketool/pokegra/pl_pokegra.narc",
                "poketool/pokegra/pl_otherpoke.narc",
                "poketool/icongra/pl_poke_icon.narc",
                "itemtool/itemdata/item_icon.narc",
                "poketool/poke_edit/pl_poke_data.narc",
            ],
            // The Hall of Fame reads animation records from a/1/8/0 (pret/pokeheartgold, src/register_hall_of_fame.c).
            Build::HeartGoldSoulSilver => ["a/0/0/4", "a/1/1/4", "a/0/2/0", "a/0/1/8", "a/1/8/0"],
        }
    }

    // A Diamond and Pearl record ends in steps of a frame and a duration. The later games' record opens with
    // the front's cry delay, motion ID and start delay, then steps that add an x and y shift.
    fn layout(self) -> RecordLayout {
        match self {
            Build::DiamondPearl => RecordLayout { len: 28, first_step: 8, step_len: 2 },
            _ => RecordLayout { len: 89, first_step: 3, step_len: 4 },
        }
    }

    // otherpoke keeps every form sprite first, then their palettes.
    fn first_form_palette(self) -> usize {
        match self {
            Build::DiamondPearl => 134,
            Build::Platinum => 154,
            Build::HeartGoldSoulSilver => 158,
        }
    }

    fn last_item(self) -> u16 {
        match self {
            Build::DiamondPearl => 464,
            Build::Platinum => 467,
            Build::HeartGoldSoulSilver => 536,
        }
    }
}

const SPECIES: u16 = 493;
const MOST_STEPS: usize = 10;
const MOST_VISITS: usize = 64;
const HOLD: u16 = 120;

struct RecordLayout {
    len: usize,
    first_step: usize,
    step_len: usize,
}

type RawStep = (i8, u8, i8, i8);

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
struct Step {
    frame: usize,
    delay: u16,
    x: i8,
    y: i8,
}

fn steps(record: &[u8], layout: &RecordLayout) -> Vec<RawStep> {
    let shift = |step: &[u8], at: usize| step.get(at).map_or(0, |&shift| shift as i8);
    record
        .get(layout.first_step..)
        .unwrap_or_default()
        .chunks_exact(layout.step_len)
        .take(MOST_STEPS)
        .map(|step| (step[0] as i8, step[1], shift(step, 2), shift(step, 3)))
        .collect()
}

// A frame below -1 jumps back to step -2 - frame until it has jumped `duration` times, as the game's player does.
// The player shows a step for one frame more than its duration.
fn script(steps: &[RawStep]) -> Option<Vec<Step>> {
    let mut played = Vec::new();
    let mut jumps = [0u8; MOST_STEPS];
    let mut at = 0;
    for _ in 0..MOST_VISITS {
        match steps.get(at) {
            None | Some((-1, ..)) => {
                let moves = played.iter().any(|step: &Step| step.frame != 0 || (step.x, step.y) != (0, 0));
                return moves.then_some(played);
            }
            Some(&(frame @ 0..=1, duration, x, y)) => {
                played.push(Step { frame: frame as usize, delay: duration as u16 + 1, x, y });
                at += 1;
            }
            Some(&(frame @ ..-1, duration, ..)) => {
                let back = (-2 - frame) as usize;
                if back >= at {
                    return None;
                }
                jumps[at] += 1;
                if jumps[at] >= duration {
                    jumps[at] = 0;
                    at += 1;
                } else {
                    at = back;
                }
            }
            _ => return None,
        }
    }
    None
}

fn scripts(records: &Narc, build: Build) -> Vec<Option<Vec<Step>>> {
    let layout = build.layout();
    match records.get(0) {
        Some(table) if table.len() == (SPECIES as usize + 1) * layout.len => {
            table.chunks_exact(layout.len).map(|record| script(&steps(record, &layout))).collect()
        }
        _ => Vec::new(),
    }
}

// Diamond and Pearl encrypt each sprite seeded from its last word, the later games from its first.
fn decrypt(data: &mut [u8], build: Build) {
    let words = data.len() / 2;
    let at = |n: usize| {
        if build == Build::DiamondPearl {
            words - 1 - n
        } else {
            n
        }
    };
    let word = |data: &[u8], i: usize| u16::from_le_bytes([data[2 * i], data[2 * i + 1]]);
    let Some(mut seed) = (words > 0).then(|| word(data, at(0)) as u32) else {
        return;
    };
    for n in 0..words {
        let i = at(n);
        let plain = word(data, i) ^ seed as u16;
        data[2 * i..2 * i + 2].copy_from_slice(&plain.to_le_bytes());
        seed = seed.wrapping_mul(0x41C6_4E6D).wrapping_add(0x6073);
    }
}

struct Forms {
    species: u16,
    count: u8,
    sprite: usize,
    palette: usize,
    // Most species keep back and front side by side per form. These keep every back first, then every front.
    backs_first: bool,
    palettes: Palettes,
    since: Build,
}

enum Palettes {
    PerForm,
    // Every normal palette first, then every shiny one.
    NormalsFirst,
    Shared,
}

const fn forms(species: u16, count: u8, sprite: usize, palette: usize, since: Build) -> Forms {
    Forms { species, count, sprite, palette, backs_first: false, palettes: Palettes::PerForm, since }
}

const FORM_SPRITES: [Forms; 13] = [
    Forms { palettes: Palettes::Shared, ..forms(386, 4, 0, 0, Build::DiamondPearl) },
    Forms { palettes: Palettes::Shared, ..forms(201, 28, 8, 2, Build::DiamondPearl) },
    Forms { backs_first: true, palettes: Palettes::NormalsFirst, ..forms(351, 4, 64, 4, Build::DiamondPearl) },
    forms(412, 3, 72, 12, Build::DiamondPearl),
    forms(413, 3, 78, 18, Build::DiamondPearl),
    Forms { backs_first: true, ..forms(422, 2, 84, 24, Build::DiamondPearl) },
    Forms { backs_first: true, ..forms(423, 2, 88, 28, Build::DiamondPearl) },
    Forms { backs_first: true, palettes: Palettes::NormalsFirst, ..forms(421, 2, 92, 32, Build::DiamondPearl) },
    forms(493, 18, 96, 36, Build::DiamondPearl),
    forms(492, 2, 134, 74, Build::Platinum),
    forms(479, 6, 138, 78, Build::Platinum),
    forms(487, 2, 150, 90, Build::Platinum),
    forms(172, 2, 154, 94, Build::HeartGoldSoulSilver),
];

const EGG_SPRITE: usize = 132;
const EGG_PALETTE: usize = 72;

impl Forms {
    fn front(&self, form: usize) -> usize {
        if self.backs_first {
            self.sprite + self.count as usize + form
        } else {
            self.sprite + 1 + 2 * form
        }
    }

    fn palette(&self, form: usize, shiny: bool) -> usize {
        let shiny = shiny as usize;
        match self.palettes {
            Palettes::PerForm => self.palette + 2 * form + shiny,
            Palettes::NormalsFirst => self.palette + shiny * self.count as usize + form,
            Palettes::Shared => self.palette + shiny,
        }
    }
}

const FIRST_ICON: usize = 7;
const EGG_ICON: usize = 501;

struct FormIcons {
    species: u16,
    second_form: usize,
    extra_forms: u8,
    since: Build,
}

const fn form_icons(species: u16, second_form: usize, extra_forms: u8, since: Build) -> FormIcons {
    FormIcons { species, second_form, extra_forms, since }
}

const FORM_ICONS: [FormIcons; 11] = [
    form_icons(386, 503, 3, Build::DiamondPearl),
    form_icons(201, 507, 27, Build::DiamondPearl),
    form_icons(412, 534, 2, Build::DiamondPearl),
    form_icons(413, 536, 2, Build::DiamondPearl),
    form_icons(422, 538, 1, Build::DiamondPearl),
    form_icons(423, 539, 1, Build::DiamondPearl),
    form_icons(487, 540, 1, Build::Platinum),
    form_icons(492, 541, 1, Build::Platinum),
    form_icons(479, 542, 5, Build::Platinum),
    form_icons(351, 547, 3, Build::HeartGoldSoulSilver),
    form_icons(421, 550, 1, Build::HeartGoldSoulSilver),
];

// The palettes of the first sixteen menu icons, the same in every Gen 4 game, mark where the game keeps its icon palette table.
const ICON_PALETTES_START: [u8; 16] = [0, 1, 1, 1, 0, 0, 0, 0, 2, 2, 1, 1, 0, 1, 2, 2];

const SPRITE_SIZE: usize = 80;

struct Sheet {
    pictures: [Vec<u8>; 2],
    palette: Vec<[u8; 4]>,
}

fn sheet(graphic: &[u8], colours: &[u8], build: Build) -> Option<Sheet> {
    let mut graphic = Graphic::read(graphic)?;
    if (graphic.width, graphic.height, graphic.depth, graphic.scanned) != (2 * SPRITE_SIZE, SPRITE_SIZE, 4, true) {
        return None;
    }
    decrypt(&mut graphic.data, build);
    let both = graphic.pixels(2 * SPRITE_SIZE, SPRITE_SIZE)?;
    let picture = |half: usize| {
        both.chunks(2 * SPRITE_SIZE).flat_map(|row| &row[half * SPRITE_SIZE..][..SPRITE_SIZE]).copied().collect()
    };
    let palette = palette(colours)?;
    if palette.len() < 16 {
        return None;
    }
    Some(Sheet { pictures: [picture(0), picture(1)], palette: transparent(palette[..16].to_vec()) })
}

fn shifted(picture: &[u8], x: i8, y: i8) -> Vec<u8> {
    let size = SPRITE_SIZE as isize;
    let inside = |at: isize| (0..size).contains(&at);
    (0..size)
        .flat_map(|row| (0..size).map(move |col| (row - y as isize, col - x as isize)))
        .map(|(row, col)| if inside(row) && inside(col) { picture[(row * size + col) as usize] } else { 0 })
        .collect()
}

impl Sheet {
    fn still(&self, key: Key) -> Image {
        Image {
            key,
            width: SPRITE_SIZE as u32,
            height: SPRITE_SIZE as u32,
            pixels: self.pictures[0].clone(),
            palette: self.palette.clone(),
        }
    }

    fn animated(&self, key: Key, script: &[Step]) -> Option<AnimatedSprite> {
        let frames = script
            .iter()
            .map(|step| Frame { pixels: shifted(&self.pictures[step.frame], step.x, step.y), delay: step.delay })
            .chain([Frame { pixels: self.pictures[0].clone(), delay: HOLD }])
            .collect();
        Some(AnimatedSprite {
            key: key.animated()?,
            width: SPRITE_SIZE as u32,
            height: SPRITE_SIZE as u32,
            palette: self.palette.clone(),
            frames,
        })
    }
}

struct Decoder {
    build: Build,
    images: Vec<Image>,
    animations: Vec<AnimatedSprite>,
    scripts: Vec<Option<Vec<Step>>>,
    missing: bool,
}

impl Decoder {
    fn add(&mut self, image: Option<Image>) {
        match image {
            Some(image) => self.images.push(image),
            None => self.missing = true,
        }
    }

    // Forms have no animation record of their own, so they play their species'.
    fn add_sheet(&mut self, key: Key, sheet: Option<Sheet>) {
        let Some(sheet) = sheet else {
            self.missing = true;
            return;
        };
        if let Key::Sprite { species, .. } = key {
            if let Some(script) = self.scripts.get(species as usize).and_then(Option::as_ref) {
                self.animations.extend(sheet.animated(key, script));
            }
        }
        self.images.push(sheet.still(key));
    }

    fn add_sprite(&mut self, key: Key, graphic: Option<&[u8]>, colours: Option<&[u8]>) {
        let build = self.build;
        self.add_sheet(key, graphic.zip(colours).and_then(|(graphic, colours)| sheet(graphic, colours, build)));
    }

    fn sprites(&mut self, pokemon: &Narc) {
        for species in 1..=SPECIES {
            if FORM_SPRITES.iter().any(|forms| forms.species == species && forms.since <= self.build) {
                continue;
            }
            let at = species as usize * 6;
            let (Some(female), Some(male), Some(normal), Some(shiny)) =
                (pokemon.get(at + 2), pokemon.get(at + 3), pokemon.get(at + 4), pokemon.get(at + 5))
            else {
                self.missing = true;
                continue;
            };
            let key = |shiny, female| Key::Sprite { species, form: 0, shiny, female };
            // Female-only species leave the male picture empty.
            let male = if male.is_empty() { female } else { male };
            let front = sheet(male, normal, self.build);
            if !female.is_empty() && female != male {
                let female_front = sheet(female, normal, self.build);
                fn still(sheet: &Option<Sheet>) -> Option<&Vec<u8>> {
                    sheet.as_ref().map(|sheet| &sheet.pictures[0])
                }
                if still(&female_front) != still(&front) {
                    self.add_sheet(key(false, true), female_front);
                    self.add_sheet(key(true, true), sheet(female, shiny, self.build));
                }
            }
            self.add_sheet(key(true, false), sheet(male, shiny, self.build));
            self.add_sheet(key(false, false), front);
        }
    }

    fn forms(&mut self, others: &Narc) {
        let (build, base) = (self.build, self.build.first_form_palette());
        for forms in FORM_SPRITES.iter().filter(|forms| forms.since <= build) {
            for form in 0..forms.count {
                for shiny in [false, true] {
                    let key = Key::Sprite { species: forms.species, form, shiny, female: false };
                    self.add_sprite(
                        key,
                        others.get(forms.front(form as usize)),
                        others.get(base + forms.palette(form as usize, shiny)),
                    );
                }
            }
        }
        for (manaphy, key) in [Key::Egg, Key::ManaphyEgg].into_iter().enumerate() {
            self.add_sprite(key, others.get(EGG_SPRITE + manaphy), others.get(base + EGG_PALETTE + manaphy));
        }
    }

    fn icons(&mut self, icons: &Narc, arm9: &[u8]) {
        let table_len = icons.len.saturating_sub(FIRST_ICON);
        let Some(palettes) = icon_palettes(arm9, table_len) else {
            self.missing = true;
            return;
        };
        let Some(colours) = icons.get(0).and_then(palette) else {
            self.missing = true;
            return;
        };
        let mut wanted: Vec<(Key, usize)> = (1..=SPECIES)
            .map(|species| (Key::MenuIcon { species, form: 0, female: false }, FIRST_ICON + species as usize))
            .collect();
        wanted.push((Key::EggIcon, EGG_ICON));
        wanted.push((Key::ManaphyEggIcon, EGG_ICON + 1));
        for icons in FORM_ICONS.iter().filter(|icons| icons.since <= self.build) {
            wanted.extend((1..=icons.extra_forms).map(|form| {
                (Key::MenuIcon { species: icons.species, form, female: false }, icons.second_form + form as usize - 1)
            }));
        }
        for (key, at) in wanted {
            let palette =
                palettes.get(at - FIRST_ICON).and_then(|&p| colours.get(p as usize * 16..p as usize * 16 + 16));
            self.add(icons.get(at).zip(palette).and_then(|(graphic, palette)| icon(key, graphic, palette.to_vec())));
        }
    }

    fn items(&mut self, items: &Narc, arm9: &[u8]) {
        let Some(table) = item_table(arm9, items.len, self.build.last_item()) else {
            self.missing = true;
            return;
        };
        let none = items.len - 4;
        for (id, row) in table.chunks(8).enumerate().skip(1) {
            let (graphic, colours) = (u16_at(row, 2).unwrap_or(0) as usize, u16_at(row, 4).unwrap_or(0) as usize);
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

fn icon_palettes(arm9: &[u8], len: usize) -> Option<&[u8]> {
    let at = arm9.windows(ICON_PALETTES_START.len()).position(|window| window == ICON_PALETTES_START)?;
    let table = arm9.get(at..at + len)?;
    table.iter().all(|&palette| palette <= 2).then_some(table)
}

// Each item has a row of four u16: its data, icon and palette in the item icon archive, and its Gen 3 id.
// Item 0 and item 1 open the table, with item 0 pointing at the archive's placeholder icon.
fn item_table(arm9: &[u8], members: usize, last: u16) -> Option<&[u8]> {
    let none = members.checked_sub(4)? as u16;
    let start: Vec<u8> = [0, none, none + 1, 0, 1, 2, 3, 1].iter().flat_map(|v: &u16| v.to_le_bytes()).collect();
    let at = arm9.windows(start.len()).position(|window| window == start)?;
    let table = arm9.get(at..at + (last as usize + 1) * 8)?;
    let fits = table.chunks(8).all(|row| {
        let (graphic, colours) = (u16_at(row, 2).unwrap_or(u16::MAX), u16_at(row, 4).unwrap_or(u16::MAX));
        (graphic as usize) < members && (colours as usize) < members
    });
    fits.then_some(table)
}

// Every Gen 4 sprite leaves its corners clear, and a wrong decryption would leave them random.
fn decrypted_cleanly(sprites: &[Image]) -> bool {
    let last = SPRITE_SIZE * SPRITE_SIZE - 1;
    let clear =
        |image: &&Image| [0, SPRITE_SIZE - 1, last - (SPRITE_SIZE - 1), last].iter().all(|&at| image.pixels[at] == 0);
    !sprites.is_empty() && sprites.iter().filter(clear).count() * 10 >= sprites.len() * 9
}

pub fn extract(rom: impl Read + Seek, build: Build) -> (Vec<Image>, Vec<AnimatedSprite>, Status) {
    let unsupported = (Vec::new(), Vec::new(), Status::Unsupported);
    let Some(mut cartridge) = Cartridge::open(rom) else {
        return unsupported;
    };
    let files = build.paths().map(|path| cartridge.file(path));
    let [pokemon, others, icons, items, records] = files.each_ref().map(|file| file.as_deref().and_then(Narc::open));
    let (Some(pokemon), Some(others)) = (pokemon, others) else {
        return unsupported;
    };
    if pokemon.len < (SPECIES as usize + 1) * 6 {
        return unsupported;
    }
    let scripts = records.map(|records| scripts(&records, build)).unwrap_or_default();
    let mut decoder = Decoder { build, images: Vec::new(), animations: Vec::new(), scripts, missing: false };
    decoder.sprites(&pokemon);
    decoder.forms(&others);
    if !decrypted_cleanly(&decoder.images) {
        return unsupported;
    }
    let arm9 = cartridge.arm9();
    match (icons, arm9.as_deref()) {
        (Some(icons), Some(arm9)) => decoder.icons(&icons, arm9),
        _ => decoder.missing = true,
    }
    match (items, arm9.as_deref()) {
        (Some(items), Some(arm9)) => decoder.items(&items, arm9),
        _ => decoder.missing = true,
    }
    let status = if decoder.missing { Status::Partial } else { Status::Done };
    (decoder.images, decoder.animations, status)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::nds::build;

    fn encrypt(plain: &[u16], seed: u16, backward: bool) -> Vec<u8> {
        let mut words = plain.to_vec();
        if backward {
            words.reverse();
        }
        let mut key = seed as u32;
        for word in words.iter_mut() {
            *word ^= key as u16;
            key = key.wrapping_mul(1103515245).wrapping_add(24691);
        }
        if backward {
            words.reverse();
        }
        words.iter().flat_map(|w| w.to_le_bytes()).collect()
    }

    #[test]
    fn recognises_each_gen_4_game_in_any_language() {
        assert_eq!(
            ["ADAE", "APAJ", "CPUD", "IPKE", "IPGS"].map(Build::of),
            [
                Some(Build::DiamondPearl),
                Some(Build::DiamondPearl),
                Some(Build::Platinum),
                Some(Build::HeartGoldSoulSilver),
                Some(Build::HeartGoldSoulSilver)
            ]
        );
        assert_eq!(["IRBO", "BPRE", "AD", ""].map(Build::of), [None; 4]);
    }

    #[test]
    fn decrypts_platinum_and_later_from_the_first_word() {
        let plain = [0, 0x1234, 0xBEEF, 0x0F0F];
        let mut data = encrypt(&plain, 0xA5A5, false);

        decrypt(&mut data, Build::Platinum);

        assert_eq!(data, plain.iter().flat_map(|w| w.to_le_bytes()).collect::<Vec<u8>>());
    }

    #[test]
    fn decrypts_diamond_and_pearl_from_the_last_word() {
        let plain = [0x1234, 0xBEEF, 0x0F0F, 0];
        let mut data = encrypt(&plain, 0x5A5A, true);

        decrypt(&mut data, Build::DiamondPearl);

        assert_eq!(data, plain.iter().flat_map(|w| w.to_le_bytes()).collect::<Vec<u8>>());
        decrypt(&mut [], Build::DiamondPearl);
    }

    #[test]
    fn gives_each_form_its_own_sprite_and_palettes() {
        for build in [Build::DiamondPearl, Build::Platinum, Build::HeartGoldSoulSilver] {
            let mut sprites = vec![EGG_SPRITE, EGG_SPRITE + 1];
            let mut palettes = vec![EGG_PALETTE, EGG_PALETTE + 1];
            for forms in FORM_SPRITES.iter().filter(|forms| forms.since <= build) {
                for form in 0..forms.count as usize {
                    sprites.push(forms.front(form));
                    palettes.extend([forms.palette(form, false), forms.palette(form, true)]);
                }
            }
            let shared = 2 * (4 - 1) + 2 * (28 - 1);
            let count = sprites.len();
            sprites.sort();
            sprites.dedup();
            palettes.sort();
            palettes.dedup();
            assert_eq!(sprites.len(), count, "{build:?}");
            assert_eq!(palettes.len(), 2 * (count - 2) + 2 - shared, "{build:?}");
            assert!(sprites.iter().all(|&sprite| sprite < build.first_form_palette()), "{build:?}");
        }
    }

    #[test]
    fn finds_the_icon_palette_table_by_its_first_entries() {
        let arm9 = [&[7, 9, 1][..], &ICON_PALETTES_START, &[2, 1, 0, 9]].concat();

        assert_eq!(icon_palettes(&arm9, 19), Some(&arm9[3..22]));
        assert_eq!(icon_palettes(&arm9, 20), None);
        assert_eq!(icon_palettes(&arm9[..10], 4), None);
    }

    fn rows(rows: &[[u16; 4]]) -> Vec<u8> {
        rows.iter().flatten().flat_map(|v| v.to_le_bytes()).collect()
    }

    #[test]
    fn finds_the_item_table_by_its_first_two_rows() {
        let table = rows(&[[0, 6, 7, 0], [1, 2, 3, 1], [2, 4, 5, 2]]);
        let arm9 = [&[1, 2, 3][..], &table, &[0xFF; 8]].concat();

        assert_eq!(item_table(&arm9, 10, 2), Some(&table[..]));
        assert_eq!(item_table(&arm9, 11, 2), None);
        assert_eq!(item_table(&arm9, 10, 3), None);
    }

    #[test]
    fn refuses_an_item_table_pointing_past_the_archive() {
        let arm9 = rows(&[[0, 6, 7, 0], [1, 2, 3, 1], [2, 4, 12, 2]]);

        assert_eq!(item_table(&arm9, 10, 2), None);
    }

    fn sprite_with_corners(corner: u8) -> Image {
        let mut pixels = vec![5; SPRITE_SIZE * SPRITE_SIZE];
        for at in [0, SPRITE_SIZE - 1, SPRITE_SIZE * (SPRITE_SIZE - 1), SPRITE_SIZE * SPRITE_SIZE - 1] {
            pixels[at] = corner;
        }
        Image { key: Key::Egg, width: 80, height: 80, pixels, palette: Vec::new() }
    }

    #[test]
    fn trusts_sprites_whose_corners_are_clear() {
        let mostly_clear: Vec<Image> = (0..10).map(|n| sprite_with_corners(if n == 0 { 3 } else { 0 })).collect();
        let mostly_noise: Vec<Image> = (0..10).map(|n| sprite_with_corners(if n < 2 { 3 } else { 0 })).collect();

        assert!(decrypted_cleanly(&mostly_clear));
        assert!(!decrypted_cleanly(&mostly_noise));
        assert!(!decrypted_cleanly(&[]));
    }

    fn step(frame: usize, delay: u16, x: i8, y: i8) -> Step {
        Step { frame, delay, x, y }
    }

    fn platinum_record(steps: &[[u8; 4]]) -> Vec<u8> {
        let mut record = vec![9, 7, 30];
        record.extend(steps.iter().flatten());
        record.resize(89, 0xEE);
        record
    }

    #[test]
    fn reads_the_front_steps_of_a_platinum_record_with_their_shifts() {
        let record = platinum_record(&[[0, 10, 0, 0], [1, 6, 0xFC, 2], [0xFF, 0, 0, 0]]);

        for build in [Build::Platinum, Build::HeartGoldSoulSilver] {
            assert_eq!(script(&steps(&record, &build.layout())), Some(vec![step(0, 11, 0, 0), step(1, 7, -4, 2)]));
        }
    }

    #[test]
    fn reads_two_byte_steps_from_a_diamond_and_pearl_record() {
        let mut record = vec![7, 0, 0x56, 0, 0x57, 0, 0x58, 0, 0, 6, 1, 4];
        record.resize(28, 0xFF);

        assert_eq!(
            script(&steps(&record, &Build::DiamondPearl.layout())),
            Some(vec![step(0, 7, 0, 0), step(1, 5, 0, 0)])
        );
    }

    #[test]
    fn plays_a_loop_back_as_many_times_as_its_duration() {
        let steps = [(1, 4, 0, 0), (0, 2, 0, 0), (-3, 3, 0, 0), (1, 5, 0, 0), (-1, 0, 0, 0)];

        assert_eq!(
            script(&steps),
            Some(vec![step(1, 5, 0, 0), step(0, 3, 0, 0), step(0, 3, 0, 0), step(0, 3, 0, 0), step(1, 6, 0, 0)])
        );
    }

    #[test]
    fn shows_a_step_for_one_frame_more_than_its_duration() {
        let steps = [(1, 1, 0, 0), (0, 4, 0, 0), (-1, 0, 0, 0)];

        assert_eq!(script(&steps), Some(vec![step(1, 2, 0, 0), step(0, 5, 0, 0)]));
    }

    #[test]
    fn shows_a_zero_duration_step_for_one_frame() {
        let steps = [(1, 0, 0, 0), (0, 3, 0, 0), (-1, 0, 0, 0)];

        assert_eq!(script(&steps), Some(vec![step(1, 1, 0, 0), step(0, 4, 0, 0)]));
    }

    #[test]
    fn ends_a_script_that_fills_every_step() {
        let steps = [(1, 2, 0, 0); MOST_STEPS];

        assert_eq!(script(&steps).map(|script| script.len()), Some(MOST_STEPS));
    }

    #[test]
    fn skips_a_script_that_does_not_check_out() {
        let end = (-1, 0, 0, 0);
        for steps in [
            vec![(2, 4, 0, 0), end],
            vec![(1, 4, 0, 0), (-2, 0, 0, 0), (-4, 2, 0, 0), end],
            vec![(1, 4, 0, 0), (-4, 2, 0, 0), (0, 4, 0, 0), end],
            vec![(1, 1, 0, 0), (-2, 200, 0, 0), end],
            vec![(0, 4, 0, 0), end],
            vec![end],
        ] {
            assert_eq!(script(&steps), None, "{steps:?}");
        }
    }

    fn sheet_of(pictures: [Vec<u8>; 2]) -> Sheet {
        Sheet { pictures, palette: vec![[0; 4]; 16] }
    }

    #[test]
    fn draws_each_step_at_its_shift_and_clips_what_leaves_the_frame() {
        let mut moved = vec![0; SPRITE_SIZE * SPRITE_SIZE];
        moved[0] = 3;
        moved[SPRITE_SIZE * SPRITE_SIZE - 1] = 4;
        let sheet = sheet_of([vec![1; SPRITE_SIZE * SPRITE_SIZE], moved]);
        let key = Key::Sprite { species: 1, form: 0, shiny: false, female: false };

        let animated = sheet.animated(key, &[step(1, 6, 2, 1), step(1, 3, -1, 0)]).unwrap();

        assert_eq!(animated.key, Key::AnimatedSprite { species: 1, form: 0, shiny: false, female: false });
        let delays: Vec<u16> = animated.frames.iter().map(|frame| frame.delay).collect();
        assert_eq!(delays, [6, 3, HOLD]);
        let drawn = |frame: usize| -> Vec<(usize, u8)> {
            animated.frames[frame].pixels.iter().copied().enumerate().filter(|&(_, pixel)| pixel != 0).collect()
        };
        assert_eq!(drawn(0), [(SPRITE_SIZE + 2, 3)]);
        assert_eq!(drawn(1), [(SPRITE_SIZE * SPRITE_SIZE - 2, 4)]);
        assert_eq!(animated.frames[2].pixels, sheet.pictures[0]);
    }

    #[test]
    fn animates_species_sprites_and_leaves_eggs_still() {
        let mut decoder = Decoder {
            build: Build::Platinum,
            images: Vec::new(),
            animations: Vec::new(),
            scripts: vec![None, Some(vec![step(1, 6, 0, 0)])],
            missing: false,
        };
        let sheet = || Some(sheet_of([vec![1; SPRITE_SIZE * SPRITE_SIZE], vec![2; SPRITE_SIZE * SPRITE_SIZE]]));

        decoder.add_sheet(Key::Sprite { species: 1, form: 2, shiny: true, female: false }, sheet());
        decoder.add_sheet(Key::Egg, sheet());
        decoder.add_sheet(Key::Sprite { species: 1, form: 0, shiny: false, female: true }, None);

        assert_eq!(decoder.images.len(), 2);
        let keys: Vec<Key> = decoder.animations.iter().map(|animated| animated.key).collect();
        assert_eq!(keys, [Key::AnimatedSprite { species: 1, form: 2, shiny: true, female: false }]);
        assert!(decoder.missing);
    }

    #[test]
    fn supports_no_cartridge_without_the_sprite_archives() {
        let rom = build::cartridge(&build::narc(&[]), b"");

        for build in [Build::DiamondPearl, Build::Platinum, Build::HeartGoldSoulSilver] {
            assert_eq!(extract(std::io::Cursor::new(&rom), build), (Vec::new(), Vec::new(), Status::Unsupported));
        }
    }
}
