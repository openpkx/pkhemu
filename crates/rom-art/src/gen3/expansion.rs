use super::{
    animation, ends, icon_palettes, image, played_script, scripts_at, status, Art, BaseForms, ItemIcon, Rom, Script,
    Who, EMERALD_ITEMS, ICON, ICON_FRAMES, ICON_PALETTES, ITEM_ICON, KANTO_AND_JOHTO, MOST_NATIONAL, PALETTE, PICTURE,
    SPECIES,
};
use crate::{Image, Key};
use std::collections::{BTreeMap, HashMap};
use std::ops::{Range, RangeInclusive};

// pokeemerald-expansion keeps each species' data in one struct: national dex number, then front picture, back picture,
// palette, shiny palette and icon, the same five for females, an optional footprint, picture sizes, icon palette indexes,
// form flags and, later, the form table. Fields come and go between versions, so offsets are found from that order.
const STRIDES: RangeInclusive<usize> = 0x40..=0x200;
const GRAPHICS: usize = 5 * 4;
const REGIONAL: Range<u32> = 10..14;
const MOST_FORMS: usize = 256;
const FORMS_END: usize = 0xFFFF;
const ITEM_STRIDES: RangeInclusive<usize> = 8..=0x200;

struct Layout<'r> {
    rom: &'r Rom<'r>,
    dex: usize,
    stride: usize,
    count: usize,
}

impl<'r> Layout<'r> {
    fn at(&self, s: usize, offset: usize) -> usize {
        self.dex + self.stride * s + offset
    }

    fn national(&self, s: usize) -> Option<usize> {
        self.rom.u16(self.at(s, 0))
    }

    fn word(&self, s: usize, offset: usize) -> Option<u32> {
        self.rom.u32(self.at(s, offset))
    }

    fn picture(&self, s: usize, offset: usize) -> Option<Vec<u8>> {
        self.rom.compressed(self.rom.pointer(self.at(s, offset))?, PICTURE)
    }

    fn palette(&self, s: usize, offset: usize) -> Option<Vec<u8>> {
        self.rom.compressed(self.rom.pointer(self.at(s, offset))?, PALETTE)
    }

    fn icon(&self, s: usize, offset: usize) -> Option<&'r [u8]> {
        self.rom.bytes(self.rom.pointer(self.at(s, offset))?, ICON * ICON_FRAMES)
    }

    fn read(&self, s: usize, at: usize) -> Option<Graphics<'r>> {
        Some(Graphics {
            front: self.picture(s, at)?,
            normal: self.palette(s, at + 8)?[..PALETTE].to_vec(),
            shiny: self.palette(s, at + 12)?[..PALETTE].to_vec(),
            icon: &self.icon(s, at + 16)?[..ICON],
        })
    }

    fn empty(&self, s: usize, at: usize) -> bool {
        (0..GRAPHICS).step_by(4).all(|field| self.word(s, at + field) == Some(0))
    }

    fn null_or(&self, s: usize, at: usize, valid: impl Fn(&Self, usize, usize) -> bool) -> bool {
        self.word(s, at) == Some(0) || valid(self, s, at)
    }

    fn species(&self) -> Range<usize> {
        1..self.count
    }

    fn aligned(&self, offset: usize) -> usize {
        offset + (4 - self.at(0, offset) % 4) % 4
    }
}

fn candidates<'r>(rom: &'r Rom<'r>) -> impl Iterator<Item = Layout<'r>> + 'r {
    (0..rom.0.len()).step_by(2).filter(move |&at| rom.u16(at) == Some(1)).flat_map(move |at| {
        STRIDES.step_by(4).filter_map(move |stride| {
            (2..=KANTO_AND_JOHTO).all(|n| rom.u16(at + stride * (n - 1)) == Some(n)).then_some(())?;
            Some(Layout { rom, dex: at.checked_sub(stride)?, stride, count: 0 })
        })
    })
}

struct Graphics<'r> {
    front: Vec<u8>,
    normal: Vec<u8>,
    shiny: Vec<u8>,
    icon: &'r [u8],
}

struct Fields {
    graphics: usize,
    animations: Option<usize>,
    female: Option<usize>,
    icon_palette: Option<usize>,
    regional: HashMap<usize, u8>,
}

fn graphics_offset(layout: &Layout) -> Option<usize> {
    (2..layout.stride).filter(|&o| layout.at(1, o).is_multiple_of(4)).find(|&o| layout.read(1, o).is_some())
}

fn count(layout: &Layout, graphics: usize) -> usize {
    (1..)
        .take_while(|&s| {
            layout.national(s).is_some_and(|n| n <= MOST_NATIONAL)
                && (layout.empty(s, graphics) || layout.read(s, graphics).is_some())
        })
        .count()
        + 1
}

fn female_offset(layout: &Layout, graphics: usize) -> Option<usize> {
    let at = graphics + GRAPHICS;
    let kinds: [fn(&Layout, usize, usize) -> bool; 5] = [
        |l, s, at| l.picture(s, at).is_some(),
        |l, s, at| l.picture(s, at).is_some(),
        |l, s, at| l.palette(s, at).is_some(),
        |l, s, at| l.palette(s, at).is_some(),
        |l, s, at| l.icon(s, at).is_some(),
    ];
    let fits = layout.species().all(|s| kinds.iter().enumerate().all(|(i, kind)| layout.null_or(s, at + 4 * i, kind)));
    let any = layout.species().any(|s| layout.word(s, at) != Some(0));
    (fits && any).then_some(at)
}

fn icon_palette_offset(layout: &Layout, graphics: usize, female: Option<usize>) -> Option<usize> {
    let end = female.map_or(graphics + GRAPHICS, |female| female + GRAPHICS);
    let footprint = layout.species().all(|s| layout.null_or(s, end, |l, s, at| l.rom.pointer(l.at(s, at)).is_some()));
    let sizes = if footprint { end + 4 } else { end };
    let byte = |s: usize, offset: usize| layout.rom.0.get(layout.at(s, offset)).copied();
    let size = |s: usize, offset: usize| {
        byte(s, offset).is_some_and(|b| (1..=8).contains(&(b >> 4)) && (1..=8).contains(&(b & 0xF)))
    };
    let icon_palette = sizes + if female.is_some() { 6 } else { 4 };
    let index = |b: u8| (b as usize & 7) < ICON_PALETTES && (b as usize >> 3 & 7) < ICON_PALETTES;
    layout
        .species()
        .filter(|&s| !layout.empty(s, graphics))
        .all(|s| size(s, sizes) && size(s, sizes + 2) && byte(s, icon_palette).is_some_and(index))
        .then_some(icon_palette)
}

fn form_list(layout: &Layout, s: usize, offset: usize) -> Option<Vec<usize>> {
    let start = layout.rom.pointer(layout.at(s, offset))?;
    let list: Vec<usize> =
        (0..MOST_FORMS).map_while(|i| layout.rom.u16(start + 2 * i).filter(|&f| f != FORMS_END)).collect();
    (list.len() < MOST_FORMS && list.contains(&s)).then_some(list)
}

fn regional_forms(layout: &Layout, icon_palette: usize) -> HashMap<usize, u8> {
    let flags = layout.aligned(icon_palette + 2);
    let forms = (flags + 4..layout.stride).step_by(4).find(|&offset| {
        layout.species().all(|s| layout.word(s, offset) == Some(0) || form_list(layout, s, offset).is_some())
            && layout.species().any(|s| layout.word(s, offset) != Some(0))
    });
    let Some(forms) = forms else {
        return HashMap::new();
    };
    let regional = layout
        .species()
        .filter(|&s| layout.word(s, flags).is_some_and(|f| REGIONAL.clone().any(|bit| f >> bit & 1 == 1)));
    let positions: Option<HashMap<usize, u8>> = regional
        .map(|s| {
            let position = form_list(layout, s, forms)?.iter().position(|&f| f == s)?;
            (position > 0).then_some((s, position as u8))
        })
        .collect();
    positions.unwrap_or_default()
}

fn animations_offset(layout: &Layout) -> Option<usize> {
    let rom = layout.rom;
    let list =
        |s: usize, o: usize| scripts_at(rom, layout.at(s, o)).is_some_and(|at| at.iter().all(|&at| ends(rom, at)));
    (0..layout.stride).filter(|&o| layout.at(1, o).is_multiple_of(4)).find(|&o| {
        layout.species().all(|s| layout.word(s, o) == Some(0) || list(s, o))
            && layout.species().any(|s| layout.word(s, o) != Some(0))
    })
}

fn fields(layout: &mut Layout) -> Option<Fields> {
    let graphics = graphics_offset(layout)?;
    layout.count = count(layout, graphics);
    (layout.count > SPECIES).then_some(())?;
    let female = female_offset(layout, graphics);
    let icon_palette = icon_palette_offset(layout, graphics, female);
    let regional = icon_palette.map(|offset| regional_forms(layout, offset)).unwrap_or_default();
    let animations = animations_offset(layout);
    Some(Fields { graphics, animations, female, icon_palette, regional })
}

fn images(layout: &Layout, fields: &Fields) -> Art {
    let g = fields.graphics;
    let egg = layout.species().rev().find(|&s| !layout.empty(s, g)).filter(|&s| layout.national(s) == Some(0));
    let palettes = icon_palettes(layout.rom);
    let icon_palette = |s: usize, female: bool| -> Option<&[u8]> {
        let byte = *layout.rom.0.get(layout.at(s, fields.icon_palette?))? as usize;
        Some(palettes.as_ref()?[if female { byte >> 3 & 7 } else { byte & 7 }])
    };
    let mut base = BaseForms::default();
    let mut sprites = Vec::new();
    let mut icons = Vec::new();
    let mut animations = Vec::new();
    for s in layout.species().filter(|&s| Some(s) != egg) {
        let (Some(national), Some(mon)) = (layout.national(s), layout.read(s, g)) else {
            continue;
        };
        let who = match fields.regional.get(&s) {
            Some(&form) if national > 0 => Who::National { species: national as u16, form },
            _ => base.who(s, national),
        };
        sprites.push(image(who.sprite(false), 64, &mon.front[..PICTURE], &mon.normal));
        sprites.push(image(who.sprite(true), 64, &mon.front[..PICTURE], &mon.shiny));
        let script: Option<Script> = fields.animations.and_then(|o| played_script(layout.rom, layout.at(s, o)));
        let mut animate = |key: Key, front: &[u8], palette: &[u8]| {
            if let Some(found) = script.as_ref().and_then(|script| animation(key.animated()?, front, palette, script)) {
                animations.push(found);
            }
        };
        animate(who.sprite(false), &mon.front, &mon.normal);
        animate(who.sprite(true), &mon.front, &mon.shiny);
        icons.push(icon_palette(s, false).map(|palette| image(who.icon(), 32, mon.icon, palette)));
        let (Who::National { species, form }, Some(f)) = (who, fields.female) else {
            continue;
        };
        if let Some(front) = layout.picture(s, f) {
            let palette =
                |at: usize, male: &[u8]| layout.palette(s, at).map_or(male.to_vec(), |p| p[..PALETTE].to_vec());
            for (shiny, palette) in [(false, palette(f + 8, &mon.normal)), (true, palette(f + 12, &mon.shiny))] {
                let key = Key::Sprite { species, form, shiny, female: true };
                sprites.push(image(key, 64, &front[..PICTURE], &palette));
                animate(key, &front, &palette);
            }
        }
        if let Some(icon) = layout.icon(s, f + 16) {
            let key = Key::MenuIcon { species, form, female: true };
            icons.push(icon_palette(s, true).map(|palette| image(key, 32, &icon[..ICON], palette)));
        }
    }
    if let Some((egg, mon)) = egg.and_then(|egg| Some((egg, layout.read(egg, g)?))) {
        sprites.push(image(Key::Egg, 64, &mon.front[..PICTURE], &mon.normal));
        icons.push(icon_palette(egg, false).map(|palette| image(Key::EggIcon, 32, mon.icon, palette)));
    }
    let icons: Option<Vec<Image>> = icons.into_iter().collect();
    let kinds = [Some(sprites), icons, items(layout.rom)];
    let status = status(&kinds);
    (kinds.into_iter().flatten().flatten().collect(), animations, status)
}

fn item_entry(rom: &Rom, at: usize) -> Option<ItemIcon> {
    let icon = rom.compressed(rom.pointer(at)?, ITEM_ICON).filter(|icon| icon.len() == ITEM_ICON)?;
    let palette = rom.compressed(rom.pointer(at + 4)?, PALETTE).filter(|palette| palette.len() == PALETTE)?;
    Some((icon, palette))
}

// Each item's struct ends with its icon and palette. Item 0 always has one, and TMs have none as the game draws theirs.
fn items(rom: &Rom) -> Option<Vec<Image>> {
    let icons: BTreeMap<usize, ItemIcon> = rom.words().filter_map(|at| Some((at, item_entry(rom, at)?))).collect();
    let null = |at: usize| rom.u32(at) == Some(0) && rom.u32(at + 4) == Some(0);
    let entry = |at: usize| icons.contains_key(&at) || null(at);
    let run = |start: usize, stride: usize| {
        let entries = (0..).map(|i| start + stride * i).take_while(|&at| entry(at));
        entries.filter(|at| icons.contains_key(at)).count()
    };
    let (start, stride, found) = icons
        .keys()
        .flat_map(|&start| ITEM_STRIDES.step_by(4).map(move |stride| (start, stride)))
        .filter(|&(start, stride)| start.checked_sub(stride).is_none_or(|before| !icons.contains_key(&before)))
        .map(|(start, stride)| (start, stride, run(start, stride)))
        .max_by_key(|&(.., found)| found)?;
    // Expansion builds keep every item Emerald has.
    (found >= EMERALD_ITEMS).then_some(())?;
    let positions = (1..).map(|i| (i, start + stride * i)).take_while(|&(_, at)| entry(at));
    Some(
        positions
            .filter_map(|(i, at)| icons.get(&at).map(|(icon, palette)| image(Key::Item(i as u16), 24, icon, palette)))
            .collect(),
    )
}

pub(super) fn extract(rom: &Rom) -> Option<Art> {
    candidates(rom).find_map(|mut layout| {
        let fields = fields(&mut layout)?;
        Some(images(&layout, &fields))
    })
}

#[cfg(test)]
mod tests {
    use super::super::tests::{
        item_icon, item_ids, palette, picture, played, script_rom, sign, step, stills, END, LOOP,
    };
    use super::super::{colors, tiles, ICON_PALETTE_TAG, ROM_START};
    use super::*;
    use crate::lz77::stored;
    use crate::Status;

    const COUNT: usize = 460;
    const EGG: usize = COUNT;
    const DEX: usize = 6;
    const GRAPHICS_AT: usize = 0x10;
    const SIZES: usize = 0x3C;
    const FLAGS: usize = 0x44;
    const FORMS: usize = 0x4C;
    const STRIDE: usize = 0x50;
    const REGIONAL_FORM: usize = 451;
    const OTHER_FORM: usize = 452;
    const HACK_ONLY: usize = 453;
    const DISABLED: usize = 455;
    const FEMALE: usize = 25;
    const SHORT_PALETTE: usize = 30;
    const ANIMATIONS: usize = 0x08;
    const LOOPS: usize = 40;
    const ITEMS: usize = 420;
    const ITEM_STRIDE: usize = 0x2C;
    const TMS: Range<usize> = 400..410;
    const SHORT_ITEM_PALETTE: usize = 13;

    fn national(s: usize) -> usize {
        match s {
            REGIONAL_FORM => 19,
            OTHER_FORM => 6,
            HACK_ONLY | EGG => 0,
            _ => s,
        }
    }

    fn icon_palette(s: usize) -> usize {
        s % ICON_PALETTES
    }

    struct Planted {
        bytes: Vec<u8>,
        species_at: usize,
    }

    impl Planted {
        fn put(&mut self, bytes: &[u8]) -> u32 {
            while !self.bytes.len().is_multiple_of(4) {
                self.bytes.push(0xFF);
            }
            let at = self.bytes.len();
            self.bytes.extend_from_slice(bytes);
            ROM_START + at as u32
        }

        fn field(&mut self, s: usize, offset: usize, bytes: &[u8]) {
            let at = self.species_at + STRIDE * s + offset;
            self.bytes[at..at + bytes.len()].copy_from_slice(bytes);
        }
    }

    fn build(icon_palettes: bool) -> Planted {
        build_with(icon_palettes, true)
    }

    fn build_with(icon_palettes: bool, items: bool) -> Planted {
        let mut rom = Planted { bytes: vec![0; 0x200], species_at: 0 };
        rom.bytes[0xA0..0xAC].copy_from_slice(b"POKEMON EMER");
        rom.bytes[0xAC..0xB0].copy_from_slice(b"BPEE");
        rom.bytes[0xB2] = 0x96;
        sign(&mut rom.bytes);
        let two_frames = |s| [picture(s, 0), picture(s, 1)].concat();
        let pictures: Vec<u32> = (0..15).map(|s| rom.put(&stored(&two_frames(s)))).collect();
        let female = rom.put(&stored(&two_frames(FEMALE + 1)));
        let commands = |rom: &mut Planted, commands: &[u32]| rom.put(&script_rom(commands));
        let still = commands(&mut rom, &[0, END]);
        let played = commands(&mut rom, &[step(1, 12), step(0, 12), END]);
        let loops = commands(&mut rom, &[step(1, 12), LOOP, END]);
        let animations = [commands(&mut rom, &[still, played]), commands(&mut rom, &[still, loops])];
        let back = rom.put(&stored(&vec![0xFF; PICTURE]));
        let icons: Vec<u32> =
            (0..15).map(|s| rom.put(&[[(s + 1) as u8 * 0x11; ICON].as_slice(), &[0; ICON]].concat())).collect();
        let female_icon = icons[(FEMALE + 2) % 15];
        let forms = [
            rom.put(&[19u16, REGIONAL_FORM as u16, 0xFFFF].map(u16::to_le_bytes).concat()),
            rom.put(&[6u16, OTHER_FORM as u16, 0xFFFF].map(u16::to_le_bytes).concat()),
        ];
        let mut palettes = Vec::new();
        for s in 0..=COUNT {
            let normal = palette(s, false);
            let normal = if s == SHORT_PALETTE { normal[..26].to_vec() } else { normal };
            palettes.push((rom.put(&stored(&normal)), rom.put(&stored(&palette(s, true)))));
        }
        if icon_palettes {
            let colors: Vec<u32> = (0..ICON_PALETTES).map(|i| rom.put(&palette(1000 + i, false))).collect();
            let table: Vec<u8> = (0..ICON_PALETTES)
                .flat_map(|i| {
                    [colors[i].to_le_bytes().as_slice(), &((ICON_PALETTE_TAG + i) as u16).to_le_bytes(), &[0, 0]]
                        .concat()
                })
                .collect();
            rom.put(&table);
        }
        if items {
            let icons: Vec<u32> = (0..15).map(|i| rom.put(&stored(&item_icon(i)))).collect();
            let mut array = vec![0xEE; ITEM_STRIDE * (ITEMS + 2)];
            for i in (0..ITEMS).filter(|i| !TMS.contains(i)) {
                let colors = palette(2000 + i, false);
                let colors = if i == SHORT_ITEM_PALETTE { &colors[..0x14] } else { &colors[..] };
                let pair = [icons[i % 15], rom.put(&stored(colors))].map(u32::to_le_bytes).concat();
                array[ITEM_STRIDE * (i + 2) - 8..][..8].copy_from_slice(&pair);
            }
            for i in TMS {
                array[ITEM_STRIDE * (i + 2) - 8..][..8].fill(0);
            }
            array[ITEM_STRIDE - 8..ITEM_STRIDE].fill(0);
            rom.put(&array);
        }
        rom.put(&[0; 2]);
        rom.species_at = rom.bytes.len() + 2;
        rom.bytes.resize(rom.species_at + STRIDE * (COUNT + 2), 0);
        for s in 1..=COUNT {
            if s == DISABLED {
                continue;
            }
            rom.field(s, DEX, &(national(s) as u16).to_le_bytes());
            let graphics = [pictures[s % 15], back, palettes[s].0, palettes[s].1, icons[s % 15]];
            rom.field(s, GRAPHICS_AT, &graphics.map(u32::to_le_bytes).concat());
            rom.field(s, ANIMATIONS, &animations[usize::from(s == LOOPS)].to_le_bytes());
            if s == FEMALE {
                rom.field(s, GRAPHICS_AT + GRAPHICS, &[female, back, 0, 0, female_icon].map(u32::to_le_bytes).concat());
            }
            rom.field(s, SIZES, &[0x88, 0, 0x88, 0, 0, 0]);
            rom.field(s, SIZES + 6, &[(icon_palette(s) | icon_palette(s + 1) << 3) as u8]);
            let flags: u32 = if s == REGIONAL_FORM { 1 << REGIONAL.start } else { 0 };
            rom.field(s, FLAGS, &flags.to_le_bytes());
            let form_table = match national(s) {
                19 => forms[0],
                6 => forms[1],
                _ => 0,
            };
            rom.field(s, FORMS, &form_table.to_le_bytes());
        }
        rom.bytes.resize(rom.bytes.len() + STRIDE, 0xFF);
        rom
    }

    fn found(images: &[Image], key: &str) -> Image {
        images.iter().find(|image| image.key.to_string() == key).unwrap_or_else(|| panic!("no {key}")).clone()
    }

    #[test]
    fn finds_the_species_data_of_a_pokeemerald_expansion_hack() {
        let (images, status) = stills(&build(true).bytes);

        assert_eq!(status, Status::Done);
        let last = COUNT - 1;
        let bulbasaur = found(&images, "sprite-1-0");
        assert_eq!((bulbasaur.width, bulbasaur.height), (64, 64));
        assert_eq!(found(&images, &format!("sprite-{last}-0")).pixels[0], (last % 15 + 1) as u8);
        assert_eq!(found(&images, &format!("sprite-{last}-0-shiny")).palette, colors(&palette(last, true)));
        assert_eq!(
            found(&images, &format!("icon-{last}-0")).palette,
            colors(&palette(1000 + icon_palette(last), false))
        );
    }

    #[test]
    fn numbers_regional_forms_by_their_place_in_the_form_table() {
        let (images, _) = stills(&build(true).bytes);

        assert_eq!(found(&images, "sprite-19-1").pixels[0], (REGIONAL_FORM % 15 + 1) as u8);
        assert_eq!(found(&images, "sprite-19-0").pixels[0], (19 % 15 + 1) as u8);
        found(&images, "icon-19-1");
    }

    #[test]
    fn keys_other_forms_and_species_with_no_national_number_by_their_index() {
        let (images, _) = stills(&build(true).bytes);

        found(&images, &format!("sprite-index-{OTHER_FORM}"));
        found(&images, &format!("sprite-index-{HACK_ONLY}-shiny"));
        found(&images, &format!("icon-index-{HACK_ONLY}"));
        assert!(images.iter().all(|image| !matches!(image.key, Key::Sprite { species: 6, form: 1, .. })));
        assert!(images
            .iter()
            .all(|image| !matches!(image.key, Key::IndexSprite { index, .. } if index as usize == DISABLED)));
    }

    #[test]
    fn decodes_female_sprites_with_the_palette_of_the_male_when_they_have_none() {
        let (images, _) = stills(&build(true).bytes);

        let female = found(&images, &format!("sprite-{FEMALE}-0-female-shiny"));
        let icon = found(&images, &format!("icon-{FEMALE}-0-female"));

        assert_eq!(female.pixels[0], ((FEMALE + 1) % 15 + 1) as u8);
        assert_eq!(female.palette, colors(&palette(FEMALE, true)));
        assert_eq!(icon.pixels[0], ((FEMALE + 2) % 15 + 1) as u8);
        assert_eq!(icon.palette, colors(&palette(1000 + icon_palette(FEMALE + 1), false)));
    }

    #[test]
    fn fills_in_the_colours_a_palette_leaves_out() {
        let (images, _) = stills(&build(true).bytes);

        let sprite = found(&images, &format!("sprite-{SHORT_PALETTE}-0"));

        assert_eq!(sprite.palette.len(), 16);
        assert_eq!(sprite.palette[..13], colors(&palette(SHORT_PALETTE, false))[..13]);
    }

    #[test]
    fn decodes_the_egg_from_the_last_species() {
        let (images, _) = stills(&build(true).bytes);

        assert_eq!(found(&images, "egg").pixels[0], (EGG % 15 + 1) as u8);
        found(&images, "icon-egg");
    }

    #[test]
    fn leaves_out_icons_without_their_palettes() {
        let (images, status) = stills(&build(false).bytes);

        assert_eq!(status, Status::Partial);
        assert!(images.iter().all(|image| !matches!(image.key, Key::MenuIcon { .. } | Key::IndexMenuIcon { .. })));
    }

    #[test]
    fn decodes_item_icons_keyed_by_their_place_in_the_item_array() {
        let (images, status) = stills(&build(true).bytes);

        assert_eq!(status, Status::Done);
        assert_eq!(item_ids(&images), (1..ITEMS as u16).filter(|i| !TMS.contains(&(*i as usize))).collect::<Vec<_>>());
        let item = found(&images, "item-30");
        assert_eq!((item.width, item.height), (24, 24));
        assert_eq!(item.pixels, tiles(&item_icon(30), 24));
        assert_eq!(item.palette, colors(&palette(2030, false)));
    }

    #[test]
    fn fills_in_the_colours_an_item_palette_leaves_out() {
        let (images, _) = stills(&build(true).bytes);

        let item = found(&images, &format!("item-{SHORT_ITEM_PALETTE}"));

        assert_eq!(item.palette.len(), 16);
        assert_eq!(item.palette[..10], colors(&palette(2000 + SHORT_ITEM_PALETTE, false))[..10]);
    }

    #[test]
    fn decodes_species_art_of_a_hack_without_an_item_array() {
        let (images, status) = stills(&build_with(true, false).bytes);

        assert_eq!(status, Status::Partial);
        found(&images, "sprite-1-0");
        assert_eq!(item_ids(&images), []);
    }

    #[test]
    fn supports_no_expansion_hack_with_a_broken_picture() {
        let mut rom = build(true);
        rom.field(100, GRAPHICS_AT, &0x0A00_0000u32.to_le_bytes());

        let (images, status) = stills(&rom.bytes);

        assert_eq!((images.len(), status), (0, Status::Unsupported));
    }

    #[test]
    fn animates_each_species_and_variant_from_its_front_animation() {
        let (_, animations, _) = super::super::extract(&build(true).bytes);

        let bulbasaur = played(&animations, "anim-1-0");
        assert_eq!(bulbasaur.frames.iter().map(|frame| frame.delay).collect::<Vec<_>>(), [12, 12, 120]);
        assert_eq!(bulbasaur.frames[0].pixels, tiles(&picture(1, 1), 64));
        assert_eq!(played(&animations, "anim-1-0-shiny").palette, colors(&palette(1, true)));
        played(&animations, "anim-19-1");
        played(&animations, &format!("anim-index-{HACK_ONLY}-shiny"));
        let female = played(&animations, &format!("anim-{FEMALE}-0-female"));
        assert_eq!(female.frames[0].pixels[0], ((FEMALE + 2) % 15 + 1) as u8);
        assert_eq!(female.palette, colors(&palette(FEMALE, false)));
        assert!(animations.iter().all(|a| !matches!(a.key, Key::AnimatedSprite { species: 40, .. })));
    }

    #[test]
    fn keeps_still_sprites_of_a_hack_without_front_animations() {
        let mut rom = build(true);
        for s in 1..=COUNT {
            rom.field(s, ANIMATIONS, &[0; 4]);
        }

        let (images, animations, status) = super::super::extract(&rom.bytes);

        assert_eq!(status, Status::Done);
        assert_eq!(animations, []);
        found(&images, "sprite-1-0");
    }
}
