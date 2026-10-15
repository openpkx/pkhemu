use crate::nds::{u16_at, u32_at};
use crate::three_ds::{picture, render, Garc, Picture, Title};
use crate::{Image, Key, Status};
use std::io::{Read, Seek};

// Every region shares one title ID per game.
const X: &str = "0004000000055D00";
const Y: &str = "0004000000055E00";
const OMEGA_RUBY: &str = "000400000011C400";
const ALPHA_SAPPHIRE: &str = "000400000011C500";

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Build {
    XY,
    OmegaRubyAlphaSapphire,
}

// X and Y's paths are from Project Pokémon's X/Y file system list, and Omega Ruby's were checked against its dump:
// https://projectpokemon.org/home/docs/gen-6/xy-file-system-r89/
impl Build {
    pub fn of(code: &str) -> Option<Build> {
        match code {
            X | Y => Some(Build::XY),
            OMEGA_RUBY | ALPHA_SAPPHIRE => Some(Build::OmegaRubyAlphaSapphire),
            _ => None,
        }
    }

    const fn layout(self) -> Layout {
        match self {
            Build::XY => {
                Layout { species: 721, last_item: 717, icons: "a/0/9/3", items: "a/0/9/4", unlisted_forms: &[] }
            }
            Build::OmegaRubyAlphaSapphire => Layout {
                species: 721,
                last_item: 775,
                icons: "a/0/9/1",
                items: "a/0/9/2",
                unlisted_forms: SCATTERBUG_AND_SPEWPA,
            },
        }
    }

    const fn renders(self) -> Option<&'static str> {
        match self {
            Build::XY => None,
            Build::OmegaRubyAlphaSapphire => Some("a/2/6/3"),
        }
    }
}

pub struct Layout {
    pub species: usize,
    pub last_item: usize,
    pub icons: &'static str,
    pub items: &'static str,
    /// Species the icon table lists with one form although they have more, as Scatterbug and Spewpa take the 20 forms
    /// of the Vivillon they become. The game draws every form as the base.
    pub unlisted_forms: &'static [(u16, usize)],
}

pub const SCATTERBUG_AND_SPEWPA: &[(u16, usize)] = &[(664, 20), (665, 20)];

const ROW: usize = 16;
// The tables hold addresses, and `.code` is loaded here.
const LOADED_AT: usize = 0x10_0000;
// Gen 7 centres the same 40×30 icons in a bigger texture.
const ICON_WIDTH: u32 = 40;
const ICON_HEIGHT: u32 = 30;

struct Icons {
    default: u16,
    female: u16,
    forms: Vec<u16>,
}

fn indices(code: &[u8], pointer: usize, count: u16) -> Option<Vec<u16>> {
    match (pointer, count) {
        (0, 0) => Some(Vec::new()),
        (0, _) | (_, 0) => None,
        _ => {
            let at = pointer.checked_sub(LOADED_AT)?;
            let bytes = code.get(at..at + 2 * count as usize)?;
            (0..bytes.len()).step_by(2).map(|at| u16_at(bytes, at)).collect()
        }
    }
}

// A row per species from 0: its icon, its female icon, pointers to its forms' icons and its right-facing icons, then
// the two counts. The egg is the archive's last icon, which no row names.
fn icon_rows(code: &[u8], at: usize, egg: usize, species: usize) -> Option<Vec<Icons>> {
    let rows = code.get(at..at + (species + 1) * ROW)?;
    if rows[..ROW].iter().any(|&b| b != 0) {
        return None;
    }
    let in_archive = |index: &u16| (1..egg).contains(&(*index as usize));
    rows.chunks(ROW)
        .skip(1)
        .map(|row| {
            let (default, female) = (u16_at(row, 0)?, u16_at(row, 2)?);
            let forms = indices(code, u32_at(row, 4)?, u16_at(row, 12)?)?;
            let right_facing = indices(code, u32_at(row, 8)?, u16_at(row, 14)?)?;
            let fits = [default, female].iter().chain(&forms).chain(&right_facing).all(in_archive)
                && forms.first().is_none_or(|&first| first == default)
                && forms.len() <= 0x100;
            fits.then_some(Icons { default, female, forms })
        })
        .collect()
}

fn icon_table(code: &[u8], icons: usize, species: usize) -> Option<Vec<Icons>> {
    let egg = icons.checked_sub(1)?;
    (0..code.len()).step_by(4).find_map(|at| icon_rows(code, at, egg, species))
}

// One u32 per item, its icon. Item 0 names the archive's placeholder, and the Poké Balls, items 1 to 16, its first icons.
fn item_table(code: &[u8], icons: usize, last_item: usize) -> Option<Vec<usize>> {
    let balls: Vec<u8> = (0..16u32).flat_map(u32::to_le_bytes).collect();
    (4..code.len()).step_by(4).filter(|&at| code.get(at..at + balls.len()) == Some(&balls)).find_map(|at| {
        let table = code.get(at - 4..at - 4 + (last_item + 1) * 4)?;
        let table: Vec<usize> = table
            .chunks_exact(4)
            .map(|word| u32::from_le_bytes([word[0], word[1], word[2], word[3]]) as usize)
            .collect();
        table.iter().all(|&icon| icon < icons).then_some(table)
    })
}

pub struct Decoded {
    pub images: Vec<Image>,
    pub missing: bool,
    /// Each species' number of forms, from species 1.
    pub forms: Vec<usize>,
}

pub fn icons_and_items<R: Read + Seek>(title: &mut Title<R>, code: &[u8], layout: &Layout) -> Option<Decoded> {
    let (icon_file, item_file) = (title.file(layout.icons)?, title.file(layout.items)?);
    let (icons, items) = (Garc::open(&icon_file)?, Garc::open(&item_file)?);
    let species = icon_table(code, icons.len, layout.species)?;
    let item_icons = item_table(code, items.len, layout.last_item)?;
    let mut images = Vec::new();
    let mut missing = false;
    let mut add = |key: Key, archive: &Garc, index: usize| {
        let picture = archive.get(index).and_then(picture);
        let picture = match key {
            Key::Item(_) => picture,
            _ => picture.map(|p| p.centred(ICON_WIDTH, ICON_HEIGHT)),
        };
        match picture {
            Some(picture) => images.push(picture.image(key)),
            None => missing = true,
        }
    };
    // Right-facing icons are left out, as every slot shows the default.
    for (species, row) in (1..).zip(&species) {
        add(Key::MenuIcon { species, form: 0, female: false }, &icons, row.default as usize);
        for (form, &index) in row.forms.iter().enumerate().skip(1) {
            add(Key::MenuIcon { species, form: form as u8, female: false }, &icons, index as usize);
        }
        if row.female != row.default {
            add(Key::MenuIcon { species, form: 0, female: true }, &icons, row.female as usize);
        }
    }
    add(Key::EggIcon, &icons, icons.len - 1);
    let placeholder = item_icons[0];
    for (id, &icon) in item_icons.iter().enumerate().skip(1).filter(|&(_, &icon)| icon != placeholder) {
        add(Key::Item(id as u16), &items, icon);
    }
    let mut forms: Vec<usize> = species.iter().map(|row| row.forms.len().max(1)).collect();
    for &(species, count) in layout.unlisted_forms {
        let listed = forms[species as usize - 1];
        forms[species as usize - 1] = listed.max(count);
        let base = Key::MenuIcon { species, form: 0, female: false };
        let Some(icon) = images.iter().find(|image| image.key == base).cloned() else {
            continue;
        };
        let key = |form: usize| Key::MenuIcon { species, form: form as u8, female: false };
        images.extend((listed..count).map(|form| Image { key: key(form), ..icon.clone() }));
    }
    Some(Decoded { images, missing, forms })
}

pub fn status(missing: bool) -> Status {
    if missing {
        Status::Partial
    } else {
        Status::Done
    }
}

// The genders' looks run from 0, male only, to 4, a female drawn apart from the male.
const FEMALE_APART: u8 = 4;

struct Renders {
    female: bool,
    forms: usize,
    first: usize,
}

// A row per species from 0: its genders' looks, its number of forms and its first render. Each species' renders run
// as its base form, the female's where she is drawn apart, then each other form, and end where the next one's start.
fn render_rows(code: &[u8], at: usize, species: usize, count: usize) -> Option<Vec<Renders>> {
    let rows = code.get(at..at + (species + 1) * 4)?;
    if rows[..4].iter().any(|&b| b != 0) {
        return None;
    }
    let mut next = 1;
    let table = rows
        .chunks(4)
        .skip(1)
        .map(|row| {
            let (looks, forms, first) = (row[0], row[1] as usize, u16_at(row, 2)? as usize);
            if looks > FEMALE_APART || forms == 0 || first != next {
                return None;
            }
            let female = looks == FEMALE_APART;
            next += forms + usize::from(female);
            Some(Renders { female, forms, first })
        })
        .collect::<Option<Vec<_>>>()?;
    (next == count + 1).then_some(table)
}

fn render_table(code: &[u8], count: usize, species: usize) -> Option<Vec<Renders>> {
    (0..code.len()).step_by(2).find_map(|at| render_rows(code, at, species, count))
}

fn blank(picture: &Picture) -> bool {
    picture.pixels.chunks(4).all(|pixel| pixel[3] == 0)
}

// The archive's first render is a placeholder, then come the normal renders and the shiny ones in the same order.
fn sprites(archive: &Garc, code: &[u8], forms: &[usize]) -> Option<(Vec<Image>, bool)> {
    let count = archive.len.checked_sub(1)? / 2;
    if archive.len != 2 * count + 1 {
        return None;
    }
    let table = render_table(code, count, forms.len())?;
    if table.iter().zip(forms).any(|(row, &listed)| row.forms > listed) {
        return None;
    }
    let mut images = Vec::new();
    let mut missing = false;
    for ((species, row), &listed) in (1..).zip(&table).zip(forms) {
        let looks: Vec<(usize, bool)> = [(0, false)]
            .into_iter()
            .chain(row.female.then_some((0, true)))
            .chain((1..row.forms).map(|f| (f, false)))
            .collect();
        for shiny in [false, true] {
            let mut base: Option<Picture> = None;
            for (k, &(form, female)) in looks.iter().enumerate() {
                let index = row.first + k + if shiny { count } else { 0 };
                // Pikachu's costumes have blank renders, so they show the base form's.
                let picture = match (archive.get(index).and_then(render), &base) {
                    (Some(picture), Some(base)) if blank(&picture) && form > 0 => base.clone(),
                    (Some(picture), _) if !blank(&picture) => picture,
                    _ => {
                        missing = true;
                        continue;
                    }
                };
                if form == 0 && !female {
                    base = Some(picture.clone());
                }
                images.push(picture.image(Key::Sprite { species, form: form as u8, shiny, female }));
            }
            let Some(base) = base else {
                continue;
            };
            for form in row.forms..listed {
                images.push(base.clone().image(Key::Sprite { species, form: form as u8, shiny, female: false }));
            }
        }
    }
    Some((images, missing))
}

pub fn extract(rom: impl Read + Seek, build: Build) -> (Vec<Image>, Status) {
    let unsupported = (Vec::new(), Status::Unsupported);
    let Some(mut title) = Title::open(rom) else {
        return unsupported;
    };
    let Some(code) = title.code() else {
        return unsupported;
    };
    let Some(Decoded { mut images, missing, forms }) = icons_and_items(&mut title, &code, &build.layout()) else {
        return unsupported;
    };
    let Some(path) = build.renders() else {
        return (images, status(missing));
    };
    let Some((sprites, unreadable)) = title.file(path).and_then(|file| sprites(&Garc::open(&file)?, &code, &forms))
    else {
        return unsupported;
    };
    images.extend(sprites);
    (images, status(missing || unreadable))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::lz77;
    use crate::three_ds::build::{self, Counted};
    use std::io::Cursor;

    const XY: Layout = Build::XY.layout();
    const ORAS: Build = Build::OmegaRubyAlphaSapphire;
    const SPECIES: usize = XY.species;
    const ICON_COUNT: usize = 12;
    const ITEM_COUNT: usize = 21;
    const VENUSAUR: usize = 3;
    const PIKACHU: usize = 25;
    const NIDORAN_F: usize = 29;
    const DITTO: usize = 132;
    const BLANK_RENDER: usize = 29;
    const UNFEZANT: usize = 521;
    const UNOWN: usize = 201;
    const ITEMS_AT: usize = 0x40;
    const RENDERS: usize = SPECIES + 5;

    fn put_u16(code: &mut [u8], at: usize, value: u16) {
        code[at..at + 2].copy_from_slice(&value.to_le_bytes());
    }

    fn put_u32(code: &mut [u8], at: usize, value: usize) {
        code[at..at + 4].copy_from_slice(&(value as u32).to_le_bytes());
    }

    // Venusaur's forms are icons 2 and 7, Unfezant's female icon is 9, and Unown has right-facing icons only.
    // Items point at icons in turn, skipping the placeholder 20 every 50 items.
    fn code_of(layout: &Layout, items_at: usize) -> (Vec<u8>, usize) {
        let last_item = layout.last_item;
        let table_at = items_at + (last_item + 1) * 4;
        let arrays_at = table_at + (SPECIES + 1) * ROW;
        let mut code = vec![0xEE; items_at];
        code.resize(arrays_at + 8, 0);
        put_u32(&mut code, items_at, ITEM_COUNT - 1);
        for item in 1..=last_item {
            let icon = if item % 50 == 0 { ITEM_COUNT - 1 } else { (item - 1) % (ITEM_COUNT - 1) };
            put_u32(&mut code, items_at + 4 * item, icon);
        }
        for species in 1..=SPECIES {
            let row = table_at + species * ROW;
            let icon = 1 + (species % 10) as u16;
            put_u16(&mut code, row, icon);
            put_u16(&mut code, row + 2, icon);
        }
        let venusaur = table_at + VENUSAUR * ROW;
        put_u16(&mut code, venusaur, 2);
        put_u16(&mut code, venusaur + 2, 2);
        put_u32(&mut code, venusaur + 4, LOADED_AT + arrays_at);
        put_u16(&mut code, venusaur + 12, 2);
        put_u16(&mut code, arrays_at, 2);
        put_u16(&mut code, arrays_at + 2, 7);
        put_u16(&mut code, table_at + UNFEZANT * ROW + 2, 9);
        let unown = table_at + UNOWN * ROW;
        put_u32(&mut code, unown + 8, LOADED_AT + arrays_at + 4);
        put_u16(&mut code, unown + 14, 2);
        put_u16(&mut code, arrays_at + 4, 5);
        put_u16(&mut code, arrays_at + 6, 6);
        (code, table_at)
    }

    fn code() -> (Vec<u8>, usize) {
        code_of(&XY, ITEMS_AT)
    }

    // Venusaur's female is drawn apart and it has a second form, and Pikachu's female too, with two more forms, which
    // its icons list.
    // The table starts halfway through a word, as in Omega Ruby.
    fn oras_code() -> (Vec<u8>, usize) {
        let (mut code, icons) = code_of(&ORAS.layout(), ITEMS_AT);
        let pikachu_forms = code.len();
        code.extend([6u16, 3, 4].map(u16::to_le_bytes).concat());
        put_u32(&mut code, icons + PIKACHU * ROW + 4, LOADED_AT + pikachu_forms);
        put_u16(&mut code, icons + PIKACHU * ROW + 12, 3);
        let at = code.len() + 6;
        code.resize(at + (SPECIES + 1) * 4 + 0x10, 0xEE);
        let mut first = 1;
        for species in 0..=SPECIES {
            let (looks, forms) = match species {
                0 => (0, 0),
                VENUSAUR => (FEMALE_APART, 2),
                PIKACHU => (FEMALE_APART, 3),
                NIDORAN_F => (1, 1),
                DITTO => (2, 1),
                _ => (3, 1),
            };
            let row = at + species * 4;
            code[row..row + 2].copy_from_slice(&[looks, forms]);
            put_u16(&mut code, row + 2, if species == 0 { 0 } else { first as u16 });
            first += forms as usize + usize::from(looks == FEMALE_APART);
        }
        (code, at)
    }

    // Each picture's second colour tells which icon it is.
    fn archive(count: usize, width: u16, height: u16) -> Vec<u8> {
        let stored = (width.next_power_of_two() as usize) * (height.next_power_of_two() as usize) / 2;
        let pictures: Vec<Vec<u8>> =
            (0..count).map(|k| build::clim(width, height, &[0, 2 * k as u16 + 1], &vec![0x10; stored])).collect();
        build::garc(&pictures.iter().map(Vec::as_slice).collect::<Vec<_>>())
    }

    // Each render's first pixel spells its place in the archive, and Pikachu's second form's is blank.
    fn render_at(number: usize) -> Vec<u8> {
        let mut data = vec![0; 8 * 8 * 2];
        if number % RENDERS != BLANK_RENDER {
            data[..4].copy_from_slice(&[(number as u16).to_le_bytes(), [0xFF; 2]].concat());
        }
        lz77::stored_extended(&build::rgba_clim(8, 8, 8, &data))
    }

    fn renders_with(count: usize, change: impl Fn(usize) -> Option<Vec<u8>>) -> Vec<u8> {
        let renders: Vec<Vec<u8>> = (0..count)
            .map(|k| change(k).unwrap_or_else(|| if k == 0 { b"placeholder".to_vec() } else { render_at(k) }))
            .collect();
        build::garc(&renders.iter().map(Vec::as_slice).collect::<Vec<_>>())
    }

    fn renders() -> Vec<u8> {
        renders_with(2 * RENDERS + 1, |_| None)
    }

    fn number(image: &Image) -> usize {
        let [r, g, b, a] = [0, 1, 2, 3].map(|c| image.pixels[c] as usize / 0x11);
        r << 12 | g << 8 | b << 4 | a
    }

    fn rom_of(build: Build, title_id: &str, code: &[u8], icons: &[u8], renders: Option<&[u8]>, junk: usize) -> Vec<u8> {
        let layout = build.layout();
        let items = archive(ITEM_COUNT, 30, 30);
        let filler = vec![0xA5; junk];
        let mut files: Vec<(&str, &[u8])> = vec![(layout.icons, icons), (layout.items, &items), ("a/1/0/0", &filler)];
        files.extend(build.renders().zip(renders));
        let romfs = build::romfs(&files, 0x360, 12);
        let id = u64::from_str_radix(title_id, 16).unwrap();
        build::ncsd(id, &build::ncch(id, false, code, &filler, &romfs), &filler)
    }

    fn rom_with(code: &[u8], icons: &[u8], junk: usize) -> Vec<u8> {
        rom_of(Build::XY, X, code, icons, None, junk)
    }

    fn rom(code: &[u8]) -> Vec<u8> {
        rom_with(code, &archive(ICON_COUNT, 40, 30), 0)
    }

    fn oras_rom(code: &[u8], renders: &[u8]) -> Vec<u8> {
        rom_of(ORAS, OMEGA_RUBY, code, &archive(ICON_COUNT, 40, 30), Some(renders), 0)
    }

    fn extracted(code: &[u8], renders: &[u8]) -> (Vec<Image>, Status) {
        extract(Cursor::new(oras_rom(code, renders)), ORAS)
    }

    fn keys(images: &[Image]) -> Vec<String> {
        images.iter().map(|image| image.key.to_string()).collect()
    }

    fn found<'a>(images: &'a [Image], key: &str) -> &'a Image {
        images.iter().find(|image| image.key.to_string() == key).unwrap_or_else(|| panic!("no {key}"))
    }

    fn icon_number(images: &[Image], key: &str) -> u8 {
        found(images, key).palette[1][2] >> 3
    }

    #[test]
    fn recognises_x_y_omega_ruby_and_alpha_sapphire_in_every_region() {
        assert_eq!(
            [X, Y, OMEGA_RUBY, ALPHA_SAPPHIRE, "0004000000055D01", "0004000000164800", ""].map(Build::of),
            [Some(Build::XY), Some(Build::XY), Some(ORAS), Some(ORAS), None, None, None]
        );
    }

    #[test]
    fn decodes_each_species_its_forms_female_icons_the_egg_and_items() {
        let (images, status) = extract(Cursor::new(rom(&code().0)), Build::XY);

        assert_eq!(status, Status::Done);
        let keys = keys(&images);
        let items = XY.last_item - XY.last_item / 50;
        assert_eq!(keys.len(), SPECIES + 1 + 1 + 1 + items);
        for key in ["icon-1-0", "icon-3-0", "icon-3-1", "icon-521-0-female", "icon-721-0", "icon-egg", "item-1"] {
            assert!(keys.contains(&key.to_string()), "{key}");
        }
        for key in ["icon-3-0-female", "icon-201-1", "icon-0-0", "item-0", "item-50", "item-718", "sprite-1-0"] {
            assert!(!keys.contains(&key.to_string()), "{key}");
        }
        let numbers = ["icon-3-0", "icon-3-1", "icon-521-0", "icon-521-0-female", "icon-egg", "item-1", "item-21"]
            .map(|key| icon_number(&images, key));
        assert_eq!(numbers, [2, 7, 2, 9, 11, 0, 0]);
        let icon = images.iter().find(|image| image.key == Key::EggIcon).unwrap();
        assert_eq!((icon.width, icon.height, icon.pixels.len()), (40, 30, 1200));
    }

    #[test]
    fn finds_the_tables_wherever_an_update_moves_them() {
        let (images, status) = extract(Cursor::new(rom(&code_of(&XY, 0x1244).0)), Build::XY);

        assert_eq!(status, Status::Done);
        assert_eq!(images, extract(Cursor::new(rom(&code().0)), Build::XY).0);
    }

    #[test]
    fn supports_no_rom_whose_icon_table_does_not_check_out() {
        let (code, table) = code();
        let venusaur = table + VENUSAUR * ROW;
        let changes = [
            (table + 5, 0x01),
            (table + 25 * ROW + 1, 0x80),
            (table + 25 * ROW, ICON_COUNT as u8 - 1),
            (venusaur, 7),
            (venusaur + 6, 0x20),
            (venusaur + 12, 9),
            (table + UNOWN * ROW + 14, 0),
        ];
        for (at, value) in changes {
            let mut changed = code.clone();
            changed[at] = value;
            assert_eq!(extract(Cursor::new(rom(&changed)), Build::XY), (Vec::new(), Status::Unsupported), "{at:#x}");
        }
    }

    #[test]
    fn supports_no_rom_whose_item_table_points_past_the_archive() {
        let (mut code, _) = code();
        put_u32(&mut code, ITEMS_AT + 4 * XY.last_item, ITEM_COUNT);

        assert_eq!(extract(Cursor::new(rom(&code)), Build::XY).1, Status::Unsupported);
    }

    #[test]
    fn supports_no_rom_whose_icon_archive_is_short() {
        let icons = archive(ICON_COUNT - 2, 40, 30);

        assert_eq!(extract(Cursor::new(rom_with(&code().0, &icons, 0)), Build::XY).1, Status::Unsupported);
    }

    #[test]
    fn keeps_the_other_icons_when_one_does_not_decode() {
        let mut pictures: Vec<Vec<u8>> =
            (0..ICON_COUNT).map(|k| build::clim(40, 30, &[0, k as u16], &[0x10; 1024])).collect();
        pictures[7] = b"broken".to_vec();
        let icons = build::garc(&pictures.iter().map(Vec::as_slice).collect::<Vec<_>>());

        let (images, status) = extract(Cursor::new(rom_with(&code().0, &icons, 0)), Build::XY);

        assert_eq!(status, Status::Partial);
        assert!(keys(&images).contains(&"icon-3-0".to_string()));
        assert!(!keys(&images).contains(&"icon-3-1".to_string()));
    }

    #[test]
    fn reads_only_the_code_the_romfs_tables_and_the_two_archives() {
        let (code, icons) = (code().0, archive(ICON_COUNT, 40, 30));
        let rom = rom_with(&code, &icons, 1 << 20);
        let mut counted = Counted { rom: Cursor::new(&rom), read: 0 };

        assert_eq!(extract(&mut counted, Build::XY).1, Status::Done);
        let archives = icons.len() + archive(ITEM_COUNT, 30, 30).len();
        let headers = 0x200 + 0x200 + 0x10 + 0x200 + 0x60 + 0x28 + 0x200;
        assert!(rom.len() > 3 << 20);
        assert!(counted.read <= code.len() + archives + headers, "read {} bytes", counted.read);
    }

    #[test]
    fn decodes_omega_ruby_icons_items_and_each_species_normal_and_shiny_renders() {
        let (images, status) = extracted(&oras_code().0, &renders());

        assert_eq!(status, Status::Done);
        let keys = keys(&images);
        for key in ["icon-3-1", "icon-521-0-female", "icon-egg", "item-1", "item-775", "sprite-3-0-female-shiny"] {
            assert!(keys.contains(&key.to_string()), "{key}");
        }
        for species in 1..=SPECIES {
            for shiny in ["", "-shiny"] {
                assert!(keys.contains(&format!("sprite-{species}-0{shiny}")), "{species}{shiny}");
            }
        }
        for key in ["item-776", "sprite-0-0", "sprite-722-0", "sprite-29-0-female", "sprite-3-1-female", "sprite-25-3"]
        {
            assert!(!keys.contains(&key.to_string()), "{key}");
        }
        assert_eq!(keys.iter().filter(|key| key.contains("-female")).count(), 1 + 2 * 2);
        let sprite = found(&images, "sprite-1-0");
        assert_eq!((sprite.width, sprite.height, sprite.pixels.len(), sprite.palette.len()), (8, 8, 256, 0));
    }

    #[test]
    fn maps_each_render_by_its_species_row() {
        let (images, _) = extracted(&oras_code().0, &renders());

        let numbers = [
            "sprite-1-0",
            "sprite-1-0-shiny",
            "sprite-3-0",
            "sprite-3-0-female",
            "sprite-3-1",
            "sprite-3-1-shiny",
            "sprite-4-0",
            "sprite-25-0-female",
            "sprite-25-2",
            "sprite-26-0",
            "sprite-721-0-shiny",
        ]
        .map(|key| number(found(&images, key)));
        assert_eq!(numbers, [1, RENDERS + 1, 3, 4, 5, RENDERS + 5, 6, 28, 30, 31, 2 * RENDERS]);
    }

    #[test]
    fn gives_a_blank_render_its_base_forms() {
        let (images, status) = extracted(&oras_code().0, &renders());

        assert_eq!(status, Status::Done);
        let numbers = ["sprite-25-1", "sprite-25-1-shiny"].map(|key| number(found(&images, key)));
        assert_eq!(numbers, [27, RENDERS + 27]);
    }

    #[test]
    fn draws_scatterbug_and_spewpas_unlisted_forms_as_the_base() {
        let (images, _) = extracted(&oras_code().0, &renders());

        for (form, base) in [("icon-664-19", "icon-664-0"), ("icon-665-1", "icon-665-0")] {
            assert_eq!(found(&images, form).pixels, found(&images, base).pixels, "{form}");
        }
        for (form, base) in [("sprite-664-19-shiny", "sprite-664-0-shiny"), ("sprite-665-1", "sprite-665-0")] {
            assert_eq!(number(found(&images, form)), number(found(&images, base)), "{form}");
        }
        let keys = keys(&images);
        assert!(!keys.contains(&"icon-664-20".to_string()));
        assert!(!keys.contains(&"sprite-665-20".to_string()));
        let (xy, _) = extract(Cursor::new(rom(&code().0)), Build::XY);
        assert!(!xy.iter().any(|image| image.key.to_string() == "icon-664-1"));
    }

    #[test]
    fn supports_no_rom_whose_render_table_does_not_check_out() {
        let (code, table) = oras_code();
        let changes = [(table + 1, 1), (table + 4 * 2, 5), (table + 4 * 2 + 1, 0), (table + 4 * 7 + 2, 10)];
        let mut more_forms = code.clone();
        more_forms[table + 4 * SPECIES + 1] = 2;
        assert_eq!(extracted(&more_forms, &renders_with(2 * RENDERS + 3, |_| None)).1, Status::Unsupported);
        for (at, value) in changes {
            let mut changed = code.clone();
            changed[at] = value;
            assert_eq!(extracted(&changed, &renders()).1, Status::Unsupported, "{at:#x} of {table:#x}");
        }
        for count in [2 * RENDERS, 2 * RENDERS + 3] {
            assert_eq!(extracted(&code, &renders_with(count, |_| None)).1, Status::Unsupported, "{count}");
        }
    }

    #[test]
    fn supports_no_omega_ruby_without_its_renders() {
        let rom = rom_of(ORAS, ALPHA_SAPPHIRE, &oras_code().0, &archive(ICON_COUNT, 40, 30), None, 0);

        assert_eq!(extract(Cursor::new(rom), ORAS), (Vec::new(), Status::Unsupported));
    }

    #[test]
    fn keeps_the_other_renders_when_one_does_not_decode_or_is_blank() {
        let broken = renders_with(2 * RENDERS + 1, |k| (k == 5).then(|| b"broken".to_vec()));
        let blank = renders_with(2 * RENDERS + 1, |k| (k == 1).then(|| build::rgba_clim(8, 8, 8, &[0; 128])));

        for (renders, gone) in [(broken, "sprite-3-1"), (blank, "sprite-1-0")] {
            let (images, status) = extracted(&oras_code().0, &renders);
            assert_eq!(status, Status::Partial);
            assert!(!keys(&images).contains(&gone.to_string()), "{gone}");
            assert!(keys(&images).contains(&format!("{gone}-shiny")), "{gone}");
        }
    }

    #[test]
    fn reads_only_the_code_the_romfs_tables_and_the_three_archives() {
        let rom = rom_of(ORAS, OMEGA_RUBY, &oras_code().0, &archive(ICON_COUNT, 40, 30), Some(&renders()), 1 << 20);
        let mut counted = Counted { rom: Cursor::new(&rom), read: 0 };

        assert_eq!(extract(&mut counted, ORAS).1, Status::Done);
        assert!(rom.len() > 3 << 20);
        assert!(counted.read < rom.len() - (3 << 20), "read {} bytes", counted.read);
    }
}
