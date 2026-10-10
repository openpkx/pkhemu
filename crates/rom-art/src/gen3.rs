use crate::{lz77, AnimatedSprite, Frame, Image, Key, Status};
use std::collections::HashSet;
use std::ops::{Range, RangeInclusive};

mod expansion;

const CODES: [&str; 5] = ["AXV", "AXP", "BPE", "BPR", "BPG"];
const ROM_START: u32 = 0x0800_0000;
const SPECIES: usize = 440;
const UNOWN: usize = 201;
const CASTFORM: usize = 385;
const DEOXYS: usize = 410;
const EGG: usize = 412;
const UNOWN_LETTERS: Range<usize> = 413..SPECIES;
const PLACEHOLDERS: RangeInclusive<usize> = 252..=276;
const NATIONAL_DEX: usize = 386;
const MOST_NATIONAL: usize = 1025;
const KANTO_AND_JOHTO: usize = 251;
const PICTURE: usize = 0x800;
const MOST_PER_SPECIES: usize = 4;
const PALETTE: usize = 32;
const ENTRY: usize = 8;
const SHINY_TAG: usize = 500;
const ICON_PALETTE_TAG: usize = 56000;
const ICON_PALETTES: usize = 6;
const ICON: usize = 0x200;
const ICON_FRAMES: usize = 2;
const ITEM_ICON: usize = 0x120;
const FIRERED_ITEMS: usize = 375;
const EMERALD_ITEMS: usize = 377;
// FireRed's item icon lookup. CFRU hacks replace its clamp on the item index with a nop.
const ITEM_ICON_LOOKUP: [u16; 17] = [
    0xB500, 0x0400, 0x0C03, 0x0609, 0x0E09, 0x4806, 0x4283, 0xD900, 0x2300, 0x4A05, 0x0088, 0x00D9, 0x1840, 0x1880,
    0x6800, 0xBC02, 0x4708,
];
const LOOKUP_CLAMP: usize = 8;
const LOOKUP_LOAD: usize = 9;
const MOST_STEPS: usize = 64;
const SCRIPT_END: u32 = 0xFFFF;
const LONGEST_STEP: u32 = 0x3F;
const HOLD: u16 = 120;

pub fn is_gen3(code: &str) -> bool {
    CODES.iter().any(|prefix| code.starts_with(prefix))
}

struct Rom<'a>(&'a [u8]);

impl<'a> Rom<'a> {
    fn u16(&self, at: usize) -> Option<usize> {
        Some(u16::from_le_bytes(self.0.get(at..at + 2)?.try_into().ok()?) as usize)
    }

    fn u32(&self, at: usize) -> Option<u32> {
        Some(u32::from_le_bytes(self.0.get(at..at + 4)?.try_into().ok()?))
    }

    fn pointer(&self, at: usize) -> Option<usize> {
        let offset = self.u32(at)?.checked_sub(ROM_START)? as usize;
        (offset < self.0.len()).then_some(offset)
    }

    fn bytes(&self, at: usize, len: usize) -> Option<&'a [u8]> {
        self.0.get(at..at.checked_add(len)?)
    }

    fn compressed(&self, at: usize, unit: usize) -> Option<Vec<u8>> {
        let mut data = lz77::decompress(&self.0[at..], unit * MOST_PER_SPECIES)?;
        // Some hacks store palettes without their unused last colours.
        if unit == PALETTE && data.len() % 2 == 0 {
            data.resize(data.len().next_multiple_of(PALETTE), 0);
        }
        (!data.is_empty() && data.len() % unit == 0).then_some(data)
    }

    fn words(&self) -> impl Iterator<Item = usize> {
        (0..self.0.len()).step_by(4)
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum Who {
    National { species: u16, form: u8 },
    // Forms the ROM can't number the way PKHeX does, and species with no national number, go by the index the save stores.
    Index(u16),
}

impl Who {
    fn sprite(self, shiny: bool) -> Key {
        match self {
            Who::National { species, form } => Key::Sprite { species, form, shiny, female: false },
            Who::Index(index) => Key::IndexSprite { index, shiny },
        }
    }

    fn icon(self) -> Key {
        match self {
            Who::National { species, form } => Key::MenuIcon { species, form, female: false },
            Who::Index(index) => Key::IndexMenuIcon { index },
        }
    }
}

struct Species {
    index: usize,
    who: Who,
}

struct Table {
    pointers: Vec<usize>,
    entries: Vec<Vec<u8>>,
}

fn run(entry: impl Fn(usize, usize) -> bool, at: usize) -> usize {
    (0..).take_while(|&k| entry(at + ENTRY * k, k)).count()
}

fn tables<'r>(
    rom: &'r Rom<'r>,
    unit: usize,
    count: usize,
    entry: impl Fn(usize, usize) -> bool + Copy + 'r,
) -> impl Iterator<Item = Table> + 'r {
    let fits = move |at: usize| entry(at, 0) && run(entry, at) == count;
    rom.words().filter(move |&at| fits(at)).filter_map(move |at| {
        let pointers: Vec<usize> = (0..count).map(|k| rom.pointer(at + ENTRY * k)).collect::<Option<_>>()?;
        let entries = pointers.iter().map(|&p| rom.compressed(p, unit)).collect::<Option<_>>()?;
        Some(Table { pointers, entries })
    })
}

fn palette_entry<'r>(rom: &'r Rom<'r>, tag: usize, count: usize) -> impl Fn(usize, usize) -> bool + Copy + 'r {
    // ROM hacks give Unown's letters Unown's own palette tag.
    move |at, k| {
        k < count
            && rom.pointer(at).is_some()
            && rom.u16(at + 4).is_some_and(|t| t == tag + k || UNOWN_LETTERS.contains(&k) && t == tag + UNOWN)
    }
}

fn picture_entry<'r>(rom: &'r Rom<'r>) -> impl Fn(usize, usize) -> bool + Copy + 'r {
    move |at, k| rom.pointer(at).is_some() && rom.u16(at + 4) == Some(PICTURE) && rom.u16(at + 6) == Some(k)
}

fn runs<'r>(rom: &'r Rom<'r>, entry: impl Fn(usize, usize) -> bool + Copy + 'r) -> impl Iterator<Item = usize> + 'r {
    rom.words().filter(move |&at| entry(at, 0)).map(move |at| run(entry, at)).filter(|&n| n >= SPECIES)
}

fn species_count(rom: &Rom) -> usize {
    // A hack's shiny palettes can follow its palettes with the tags running on, so the picture tables set the count.
    let palettes = runs(rom, palette_entry(rom, 0, usize::MAX)).max().unwrap_or(SPECIES);
    runs(rom, picture_entry(rom)).filter(|&n| n <= palettes).max().unwrap_or(SPECIES)
}

fn palettes(rom: &Rom, tag: usize, count: usize) -> Option<Table> {
    tables(rom, PALETTE, count, palette_entry(rom, tag, count)).next()
}

fn front_pictures(rom: &Rom, palettes: &Table, count: usize) -> Option<Table> {
    tables(rom, PICTURE, count, picture_entry(rom))
        // Front and back picture tables look alike. The games store each species' front picture before its palette and the back picture after it.
        .filter(|table| (1..EGG).filter(|&s| table.pointers[s] < palettes.pointers[s]).count() > EGG / 2)
        // Emerald keeps Ruby and Sapphire's one-frame front pictures beside its own two-frame ones.
        .max_by_key(|table| table.entries.iter().map(Vec::len).sum::<usize>())
}

fn national_dex(rom: &Rom, count: usize) -> Option<Vec<usize>> {
    let hack = count > SPECIES;
    let len = if hack { count } else { EGG };
    (0..rom.0.len()).step_by(2).find_map(|at| {
        if !(1..=KANTO_AND_JOHTO).all(|n| rom.u16(at + 2 * (n - 1)) == Some(n)) {
            return None;
        }
        let table: Vec<usize> =
            std::iter::once(Some(0)).chain((1..len).map(|s| rom.u16(at + 2 * (s - 1)))).collect::<Option<_>>()?;
        let mut seen = [false; NATIONAL_DEX + 1];
        for &n in table.iter().filter(|&&n| n <= NATIONAL_DEX) {
            if std::mem::replace(&mut seen[n], true) && !hack {
                return None;
            }
        }
        let fits_hack = || {
            table.iter().all(|&n| n <= MOST_NATIONAL)
                && table[EGG] == 0
                && table[UNOWN_LETTERS].iter().all(|&n| n == UNOWN)
        };
        (seen.iter().all(|&seen| seen) && (!hack || fits_hack())).then_some(table)
    })
}

#[derive(Default)]
struct BaseForms(HashSet<usize>);

impl BaseForms {
    // Hacks give a species' base form the lowest index of all its forms.
    fn who(&mut self, index: usize, national: usize) -> Who {
        if national > 0 && self.0.insert(national) {
            Who::National { species: national as u16, form: 0 }
        } else {
            Who::Index(index as u16)
        }
    }
}

fn species(national: &[usize], count: usize) -> Vec<Species> {
    let mut base = BaseForms::default();
    (1..count)
        .filter(|&s| s != EGG && !PLACEHOLDERS.contains(&s))
        .map(|s| {
            let who = if UNOWN_LETTERS.contains(&s) {
                Who::National { species: UNOWN as u16, form: (s - UNOWN_LETTERS.start + 1) as u8 }
            } else {
                base.who(s, national.get(s).copied().unwrap_or_default())
            };
            Species { index: s, who }
        })
        .collect()
}

fn tiles(data: &[u8], width: usize) -> Vec<u8> {
    let mut pixels = vec![0; data.len() * 2];
    for (i, &byte) in data.iter().enumerate() {
        let (tile, row, column) = (i / 32, i % 32 / 4, i % 4 * 2);
        let x = tile % (width / 8) * 8 + column;
        let y = tile / (width / 8) * 8 + row;
        pixels[y * width + x] = byte & 0xF;
        pixels[y * width + x + 1] = byte >> 4;
    }
    pixels
}

fn colors(palette: &[u8]) -> Vec<[u8; 4]> {
    palette
        .chunks(2)
        .enumerate()
        .map(|(i, color)| {
            let color = u16::from_le_bytes([color[0], color[1]]);
            let channel = |shift: u16| {
                let value = (color >> shift & 0x1F) as u8;
                value << 3 | value >> 2
            };
            [channel(0), channel(5), channel(10), if i == 0 { 0 } else { 0xFF }]
        })
        .collect()
}

fn image(key: Key, width: usize, data: &[u8], palette: &[u8]) -> Image {
    let pixels = tiles(data, width);
    Image { key, width: width as u32, height: (pixels.len() / width) as u32, pixels, palette: colors(palette) }
}

type Script = Vec<(usize, u16)>;

// Each species points to its list of sprite animations: the still frame, then the one the game plays.
fn scripts_at(rom: &Rom, at: usize) -> Option<[usize; 2]> {
    let list = rom.pointer(at)?;
    Some([rom.pointer(list)?, rom.pointer(list + 4)?])
}

fn played_script(rom: &Rom, at: usize) -> Option<Script> {
    script(rom, scripts_at(rom, at)?[1])
}

fn ends(rom: &Rom, at: usize) -> bool {
    (0..MOST_STEPS).map_while(|k| rom.u32(at + 4 * k)).any(|command| command & 0xFFFF == SCRIPT_END)
}

fn script(rom: &Rom, at: usize) -> Option<Script> {
    let mut steps = Vec::new();
    for k in 0..MOST_STEPS {
        let command = rom.u32(at + 4 * k)?;
        if command & 0xFFFF == SCRIPT_END {
            return (!steps.is_empty()).then_some(steps);
        }
        let (frame, duration) = (command & 0xFFFF, command >> 16);
        // Loops, jumps and flipped frames are more than a frame and a duration.
        if frame >= 0x8000 || duration == 0 || duration > LONGEST_STEP {
            return None;
        }
        steps.push((frame as usize, duration as u16));
    }
    None
}

fn animated(script: &Script) -> bool {
    script.iter().any(|&(frame, _)| frame != 0)
}

fn animation(key: Key, data: &[u8], palette: &[u8], script: &Script) -> Option<AnimatedSprite> {
    if !animated(script) {
        return None;
    }
    let pictures: Vec<&[u8]> = data.chunks_exact(PICTURE).collect();
    let frames = script
        .iter()
        .chain([&(0, HOLD)])
        .map(|&(frame, delay)| Some(Frame { pixels: tiles(pictures.get(frame)?, 64), delay }))
        .collect::<Option<Vec<_>>>()?;
    Some(AnimatedSprite { key, width: 64, height: 64, palette: colors(palette), frames })
}

fn front_scripts(rom: &Rom, count: usize) -> Option<Vec<Option<Script>>> {
    let mut best: Option<(usize, Vec<Option<Script>>)> = None;
    let mut run = 0;
    for at in rom.words() {
        if scripts_at(rom, at).is_some() {
            run += 1;
            continue;
        }
        // A longer run could hold the table anywhere in it, and a shifted table would animate the wrong species.
        if run == count {
            let start = at - 4 * run;
            let scripts: Vec<Option<Script>> = (0..count).map(|k| played_script(rom, start + 4 * k)).collect();
            // Emerald keeps a table shaped like it whose every species stays on its still frame.
            let animates = scripts.iter().flatten().filter(|script| animated(script)).count();
            if best.as_ref().is_none_or(|(most, _)| animates > *most) {
                best = Some((animates, scripts));
            }
        }
        run = 0;
    }
    best.filter(|(animates, _)| *animates > count / 2).map(|(_, scripts)| scripts)
}

fn animated_sprites(
    front: &Table,
    palettes: &Table,
    shiny: bool,
    species: &[Species],
    scripts: &[Option<Script>],
) -> Vec<AnimatedSprite> {
    species
        .iter()
        // Castform's and Deoxys's pictures hold forms rather than frames.
        .filter(|mon| mon.index != CASTFORM && mon.index != DEOXYS)
        .filter_map(|mon| {
            let script = scripts.get(mon.index)?.as_ref()?;
            let palette = &palettes.entries[mon.index][..PALETTE];
            animation(mon.who.sprite(shiny).animated()?, &front.entries[mon.index], palette, script)
        })
        .collect()
}

fn sprites(front: &Table, palettes: &Table, shiny: bool, species: &[Species]) -> Vec<Image> {
    let mut images = Vec::new();
    for mon in species {
        let mut pictures = front.entries[mon.index].chunks(PICTURE);
        let mut colors = palettes.entries[mon.index].chunks(PALETTE);
        match (mon.index, mon.who) {
            (CASTFORM, Who::National { species, .. }) => {
                for (form, (picture, palette)) in pictures.zip(colors).enumerate() {
                    let key = Key::Sprite { species, form: form as u8, shiny, female: false };
                    images.push(image(key, 64, picture, palette));
                }
            }
            // Deoxys's last picture is the form its own game shows: Attack in FireRed, Defense in LeafGreen, Speed in Emerald.
            (DEOXYS, _) => {
                images.push(image(mon.who.sprite(shiny), 64, pictures.next_back().unwrap(), colors.next().unwrap()))
            }
            _ => images.push(image(mon.who.sprite(shiny), 64, pictures.next().unwrap(), colors.next().unwrap())),
        }
    }
    if !shiny {
        images.push(image(Key::Egg, 64, &front.entries[EGG][..PICTURE], &palettes.entries[EGG][..PALETTE]));
    }
    images
}

fn icon_palettes<'a>(rom: &Rom<'a>) -> Option<Vec<&'a [u8]>> {
    let palette = |at: usize, i: usize| {
        (rom.u16(at + ENTRY * i + 4)? == ICON_PALETTE_TAG + i).then_some(())?;
        rom.bytes(rom.pointer(at + ENTRY * i)?, PALETTE)
    };
    rom.words().find_map(|at| (0..ICON_PALETTES).map(|i| palette(at, i)).collect())
}

fn icon_indices<'a>(rom: &Rom<'a>, at: usize, count: usize) -> Option<&'a [u8]> {
    rom.bytes(at, count).filter(|indices| indices.iter().all(|&i| (i as usize) < ICON_PALETTES))
}

fn icon_table<'a>(rom: &Rom<'a>, count: usize) -> Option<(Vec<&'a [u8]>, &'a [u8])> {
    let mut run = 0;
    for at in rom.words() {
        if rom.pointer(at).is_some() {
            run += 1;
            continue;
        }
        // Ruby and Sapphire put other pointers right before the icon table.
        if run >= count {
            let start = at - 4 * count;
            let icons = (0..count).map(|k| rom.bytes(rom.pointer(start + 4 * k)?, ICON * ICON_FRAMES));
            // FireRed puts each icon's palette index after the icon table. CFRU hacks put them before it, at a word boundary.
            let indices =
                icon_indices(rom, at, count).or_else(|| icon_indices(rom, start.checked_sub(count)? / 4 * 4, count));
            if let (Some(icons), Some(indices)) = (icons.collect::<Option<Vec<_>>>(), indices) {
                return Some((icons, indices));
            }
        }
        run = 0;
    }
    None
}

fn icons(rom: &Rom, species: &[Species], count: usize) -> Option<Vec<Image>> {
    let palettes = icon_palettes(rom)?;
    let (icons, indices) = icon_table(rom, count)?;
    let icon = |key, index: usize| image(key, 32, &icons[index][..ICON], palettes[indices[index] as usize]);
    let mut images: Vec<Image> = species.iter().map(|mon| icon(mon.who.icon(), mon.index)).collect();
    images.push(icon(Key::EggIcon, EGG));
    Some(images)
}

// Ruby and Sapphire have no item icons.
fn item_count(rom: &Rom) -> Option<usize> {
    match rom.0.get(0xAC..0xAF)? {
        b"BPE" => Some(EMERALD_ITEMS),
        b"BPR" | b"BPG" => Some(FIRERED_ITEMS),
        _ => None,
    }
}

type ItemIcon = (Vec<u8>, Vec<u8>);

fn item_entry(rom: &Rom, at: usize) -> Option<ItemIcon> {
    let exactly =
        |at: usize, len: usize| lz77::decompress_bios(&rom.0[rom.pointer(at)?..], len).filter(|data| data.len() == len);
    Some((exactly(at, ITEM_ICON)?, exactly(at + 4, PALETTE)?))
}

// One entry per item from item 0, then one for the bag's return arrow.
fn item_table(rom: &Rom, items: usize) -> Option<Vec<ItemIcon>> {
    let mut at = 0;
    while at < rom.0.len() {
        let entries: Vec<_> = (0..).map_while(|k| item_entry(rom, at + ENTRY * k)).collect();
        if entries.len() == items + 1 {
            return Some(entries);
        }
        at += (ENTRY * entries.len()).max(4);
    }
    None
}

fn item_lookup(rom: &Rom) -> Option<usize> {
    let matches = |at: usize| {
        ITEM_ICON_LOOKUP
            .iter()
            .enumerate()
            .all(|(i, &half)| i == LOOKUP_CLAMP || rom.u16(at + 2 * i) == Some(half as usize))
    };
    let load = (0..rom.0.len()).step_by(2).find(|&at| matches(at))? + 2 * LOOKUP_LOAD;
    // A Thumb ldr counts from the word-aligned address four bytes past itself.
    rom.pointer((load + 4) / 4 * 4 + 4 * (rom.u16(load)? & 0xFF))
}

// Hacks add items past FireRed's, so the table runs on as long as its entries hold two pointers.
fn looked_up_items(rom: &Rom, at: usize) -> Option<Vec<ItemIcon>> {
    (0..)
        .map(|k| at + ENTRY * k)
        .take_while(|&entry| rom.pointer(entry).is_some() && rom.pointer(entry + 4).is_some())
        .map(|entry| item_entry(rom, entry))
        .collect()
}

// The return arrow follows the base game's last item, and hacks keep its index even where it now names an item.
fn item_icons(table: &[ItemIcon], items: usize) -> Vec<Image> {
    table
        .iter()
        .enumerate()
        .filter(|&(k, _)| k != 0 && k != items)
        .map(|(k, (icon, palette))| image(Key::Item(k as u16), 24, icon, palette))
        .collect()
}

fn status<T>(kinds: &[Option<T>]) -> Status {
    match kinds.iter().filter(|kind| kind.is_some()).count() {
        0 => Status::Unsupported,
        n if n == kinds.len() => Status::Done,
        _ => Status::Partial,
    }
}

type Art = (Vec<Image>, Vec<AnimatedSprite>, Status);

fn species_tables(rom: &Rom) -> Option<Art> {
    let count = species_count(rom);
    let species = species(&national_dex(rom, count)?, count);
    let normal = palettes(rom, 0, count);
    let shiny = [SHINY_TAG, count].into_iter().find_map(|tag| palettes(rom, tag, count));
    let front = normal.as_ref().and_then(|normal| front_pictures(rom, normal, count));
    let mut kinds = vec![
        front.as_ref().zip(normal.as_ref()).map(|(front, normal)| sprites(front, normal, false, &species)),
        front.as_ref().zip(shiny.as_ref()).map(|(front, shiny)| sprites(front, shiny, true, &species)),
        icons(rom, &species, count),
    ];
    if let Some(items) = item_count(rom) {
        if let Some(at) = (items == FIRERED_ITEMS).then(|| item_lookup(rom)).flatten() {
            kinds.push(looked_up_items(rom, at).map(|table| item_icons(&table, items)));
        } else if count == SPECIES {
            // A hack can hold other tables shaped like its base game's, so only a vanilla game falls back to the scan.
            kinds.push(item_table(rom, items).map(|table| item_icons(&table, items)));
        }
    }
    let mut animations = Vec::new();
    // Ruby, Sapphire, FireRed and LeafGreen store one frame per front picture.
    let emerald = rom.0.get(0xAC..0xAF) == Some(&b"BPE"[..]);
    if let (true, Some(front)) = (emerald, &front) {
        if let Some(scripts) = front_scripts(rom, count) {
            for (palettes, shiny) in [(&normal, false), (&shiny, true)] {
                if let Some(palettes) = palettes {
                    animations.extend(animated_sprites(front, palettes, shiny, &species, &scripts));
                }
            }
        }
    }
    let status = status(&kinds);
    Some((kinds.into_iter().flatten().flatten().collect(), animations, status))
}

pub fn extract(rom: &[u8]) -> Art {
    let rom = Rom(rom);
    species_tables(&rom)
        .or_else(|| expansion::extract(&rom))
        .unwrap_or((Vec::new(), Vec::new(), Status::Unsupported))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::lz77::stored;
    use crate::{extract as extract_rom, Platform};

    const PADDING: usize = 0x1236;

    const HACK_SPECIES: usize = 460;
    const HACK_ITEMS: usize = 700;
    const NOP: u16 = 0x46C0;
    const HACK_FORM: usize = SPECIES;
    const HACK_ONLY: usize = SPECIES + 1;
    const PIKACHU: usize = 25;
    const STILL: usize = 4;
    const OUT_OF_RANGE: usize = 7;
    const LOOPS: usize = 8;
    pub(super) const END: u32 = 0xFFFF;
    pub(super) const LOOP: u32 = 0x0001_FFFD;

    fn national(s: usize) -> usize {
        match s {
            0..=KANTO_AND_JOHTO => s,
            252..=276 => s + 135,
            _ => s - 25,
        }
    }

    fn hack_national(s: usize) -> usize {
        match s {
            _ if PLACEHOLDERS.contains(&s) || s == EGG || s == HACK_ONLY => 0,
            _ if UNOWN_LETTERS.contains(&s) => UNOWN,
            HACK_FORM => 19,
            HACK_ONLY.. => s - HACK_ONLY + NATIONAL_DEX,
            _ => national(s),
        }
    }

    pub(super) fn stills(rom: &[u8]) -> (Vec<Image>, Status) {
        let (images, _, status) = extract(rom);
        (images, status)
    }

    pub(super) fn sign(rom: &mut [u8]) {
        rom[0xBD] = rom[0xA0..0xBD].iter().fold(0u8, |sum, &b| sum.wrapping_sub(b)).wrapping_sub(0x19);
    }

    fn pictures(s: usize) -> usize {
        match s {
            CASTFORM => 4,
            DEOXYS => 2,
            _ => 1,
        }
    }

    pub(super) fn picture(s: usize, n: usize) -> Vec<u8> {
        vec![((s + n) % 15 + 1) as u8 * 0x11; PICTURE]
    }

    pub(super) fn palette(s: usize, shiny: bool) -> Vec<u8> {
        (0..16).flat_map(|i| ((s * 16 + i) as u16 & 0x3FFF | if shiny { 0x4000 } else { 0 }).to_le_bytes()).collect()
    }

    pub(super) fn item_icon(id: usize) -> Vec<u8> {
        vec![(id % 15 + 1) as u8 * 0x11; ITEM_ICON]
    }

    struct Builder {
        rom: Vec<u8>,
        code: &'static [u8; 4],
        tables: bool,
        icons: bool,
        items: usize,
        decoy_items: usize,
        lookup: Option<u16>,
        decoy_dex: bool,
        species: usize,
        pointers_before_icons: usize,
        animations: bool,
    }

    struct Planted {
        rom: Vec<u8>,
        front: usize,
        dex: usize,
        items: usize,
    }

    impl Builder {
        fn new() -> Builder {
            Builder {
                rom: Vec::new(),
                code: b"BPRE",
                tables: true,
                icons: true,
                items: FIRERED_ITEMS,
                decoy_items: 0,
                lookup: Some(ITEM_ICON_LOOKUP[LOOKUP_CLAMP]),
                decoy_dex: false,
                species: SPECIES,
                pointers_before_icons: 0,
                animations: false,
            }
        }

        fn emerald() -> Builder {
            Builder { code: b"BPEE", items: EMERALD_ITEMS, lookup: None, animations: true, ..Builder::new() }
        }

        fn with_animations(self) -> Builder {
            Builder { animations: true, ..self }
        }

        fn ruby() -> Builder {
            Builder { code: b"AXVE", items: 0, lookup: None, pointers_before_icons: 35, ..Builder::new() }
        }

        fn with_items(self, items: usize) -> Builder {
            Builder { items, ..self }
        }

        fn with_decoy_items(self, decoy_items: usize) -> Builder {
            Builder { decoy_items, ..self }
        }

        fn with_clamp(self, clamp: u16) -> Builder {
            Builder { lookup: Some(clamp), ..self }
        }

        fn without_lookup(self) -> Builder {
            Builder { lookup: None, ..self }
        }

        fn hack() -> Builder {
            Builder { species: HACK_SPECIES, ..Builder::new() }
        }

        fn without_icons(self) -> Builder {
            Builder { icons: false, ..self }
        }

        fn with_decoy_dex(self) -> Builder {
            Builder { decoy_dex: true, ..self }
        }

        fn without_tables(self) -> Builder {
            Builder { tables: false, ..self }
        }

        fn put(&mut self, bytes: &[u8]) -> u32 {
            while !self.rom.len().is_multiple_of(4) {
                self.rom.push(0xFF);
            }
            let at = self.rom.len();
            self.rom.extend_from_slice(bytes);
            ROM_START + at as u32
        }

        fn table(&mut self, entries: impl Iterator<Item = (u32, u16, u16)>) -> usize {
            let bytes: Vec<u8> = entries
                .flat_map(|(p, a, b)| {
                    [p.to_le_bytes().to_vec(), a.to_le_bytes().to_vec(), b.to_le_bytes().to_vec()].concat()
                })
                .collect();
            (self.put(&bytes) - ROM_START) as usize
        }

        fn item_table(&mut self, items: usize, shade: usize) -> usize {
            let entries: Vec<(u32, u32)> = (0..=items)
                .map(|id| {
                    let icon = self.put(&stored(&item_icon(id + shade)));
                    (icon, self.put(&stored(&palette(2000 + id + shade, false))))
                })
                .collect();
            self.rom.extend_from_slice(&[0xEE; 4]);
            let pointers: Vec<u8> = entries
                .iter()
                .flat_map(|(icon, palette)| [icon.to_le_bytes(), palette.to_le_bytes()])
                .flatten()
                .collect();
            let at = (self.put(&pointers) - ROM_START) as usize;
            self.rom.extend_from_slice(&[0; 8]);
            at
        }

        fn commands(&mut self, commands: &[u32]) -> u32 {
            self.put(&script_rom(commands))
        }

        fn animation_lists(&mut self) -> Vec<u32> {
            let still = self.commands(&[0, END]);
            (0..self.species)
                .map(|s| {
                    let played = match s {
                        STILL => still,
                        OUT_OF_RANGE => self.commands(&[step(2, 10), END]),
                        LOOPS => self.commands(&[step(1, 10), LOOP, END]),
                        _ => self.commands(&script_of(s)),
                    };
                    self.commands(&[still, played])
                })
                .collect()
        }

        fn build(mut self) -> Planted {
            self.rom = vec![0; 0x200];
            self.rom[0xA0..0xAC].copy_from_slice(b"POKEMON FIRE");
            self.rom[0xAC..0xB0].copy_from_slice(self.code);
            self.rom[0xB2] = 0x96;
            sign(&mut self.rom);
            self.rom.resize(0x1000, 0);
            let mut front = Vec::new();
            let mut back = Vec::new();
            let mut normal = Vec::new();
            let mut shiny = Vec::new();
            let mut icons = Vec::new();
            let hack = self.species > SPECIES;
            for s in 0..self.species {
                let count = if self.animations && pictures(s) == 1 { 2 } else { pictures(s) };
                front.push(self.put(&stored(&(0..count).flat_map(|n| picture(s, n)).collect::<Vec<_>>())));
                let colors = |shiny| (0..count.min(4)).flat_map(|n| palette(s + n, shiny)).collect::<Vec<_>>();
                normal.push(self.put(&stored(&if s == CASTFORM { colors(false) } else { palette(s, false) })));
                back.push(self.put(&stored(&vec![0xFF; PICTURE * count])));
                shiny.push(self.put(&stored(&if s == CASTFORM { colors(true) } else { palette(s, true) })));
                icons.push(self.put(&[[(s % 15 + 1) as u8 * 0x11; ICON].as_slice(), &[0; ICON]].concat()));
            }
            let (mut planted, mut dex_at) = (0, 0);
            if self.tables {
                self.rom.resize(self.rom.len() + PADDING, 0);
                let n = self.species;
                let tag = |k: usize| if hack && UNOWN_LETTERS.contains(&k) { UNOWN } else { k };
                let shiny_tag = if hack { n } else { SHINY_TAG };
                planted = self.table((0..n).map(|k| (front[k], PICTURE as u16, k as u16)));
                self.table((0..n).map(|k| (back[k], PICTURE as u16, k as u16)));
                self.table((0..n).map(|k| (normal[k], tag(k) as u16, 0)));
                self.table((0..n).map(|k| (shiny[k], (shiny_tag + tag(k)) as u16, 0)));
                if self.decoy_dex {
                    let decoy: Vec<u8> = (1..EGG).flat_map(|s| (s.min(KANTO_AND_JOHTO) as u16).to_le_bytes()).collect();
                    self.rom.extend_from_slice(&decoy);
                }
                self.rom.extend_from_slice(&[0xEE; 2]);
                dex_at = self.rom.len();
                let dex: Vec<u8> = if hack {
                    (1..self.species).flat_map(|s| (hack_national(s) as u16).to_le_bytes()).collect()
                } else {
                    (1..EGG).flat_map(|s| (national(s) as u16).to_le_bytes()).collect()
                };
                self.rom.extend_from_slice(&dex);
            }
            if self.animations {
                let lists = self.animation_lists();
                let decoy: Vec<u32> = (0..self.species).map(|_| lists[STILL]).collect();
                for table in [decoy, lists] {
                    self.rom.extend_from_slice(&[0xEE; 4]);
                    self.put(&table.iter().flat_map(|p| p.to_le_bytes()).collect::<Vec<_>>());
                }
                self.rom.extend_from_slice(&[0xEE; 4]);
            }
            if self.icons {
                let before = std::iter::repeat_n(&front[0], self.pointers_before_icons);
                let pointers: Vec<u8> = before.chain(&icons).flat_map(|p| p.to_le_bytes()).collect();
                let indices: Vec<u8> = (0..self.species).map(|s| (s % ICON_PALETTES) as u8).collect();
                if hack {
                    self.put(&indices);
                    self.put(&pointers);
                    self.rom.extend_from_slice(&[0xFF; 4]);
                } else {
                    self.put(&pointers);
                    self.rom.extend_from_slice(&indices);
                }
                let palettes: Vec<u32> = (0..ICON_PALETTES).map(|i| self.put(&palette(1000 + i, false))).collect();
                self.table((0..ICON_PALETTES).map(|i| (palettes[i], (ICON_PALETTE_TAG + i) as u16, 0)));
            }
            if self.decoy_items > 0 {
                self.item_table(self.decoy_items, 1);
            }
            let mut items_at = 0;
            if self.items > 0 {
                items_at = self.item_table(self.items, 0);
                if let Some(clamp) = self.lookup {
                    let mut code = ITEM_ICON_LOOKUP;
                    code[LOOKUP_CLAMP] = clamp;
                    let mut function: Vec<u8> = code.iter().flat_map(|half| half.to_le_bytes()).collect();
                    function.extend([0; 2]);
                    function
                        .extend([self.items as u32, ROM_START + items_at as u32].iter().flat_map(|w| w.to_le_bytes()));
                    self.put(&function);
                }
            }
            Planted { rom: self.rom, front: planted, dex: dex_at, items: items_at }
        }
    }

    pub(super) fn step(frame: u32, duration: u32) -> u32 {
        duration << 16 | frame
    }

    fn script_of(s: usize) -> Vec<u32> {
        let wait = s as u32 % 20 + 1;
        vec![step(1, wait), step(0, 5), step(1, wait), step(0, 1), END]
    }

    fn found(images: &[Image], key: &str) -> Image {
        images.iter().find(|image| image.key.to_string() == key).unwrap_or_else(|| panic!("no {key}")).clone()
    }

    fn sprite_count(images: &[Image]) -> usize {
        images.iter().filter(|image| matches!(image.key, Key::Sprite { .. })).count()
    }

    #[test]
    fn recognises_each_gen_3_game_code() {
        for code in ["AXVE", "AXPJ", "BPEE", "BPRF", "BPGS"] {
            assert!(is_gen3(code), "{code}");
        }
        assert!(!is_gen3("AGBE"));
        assert!(!is_gen3("IPKE"));
    }

    #[test]
    fn reads_4bpp_tiles_left_to_right() {
        let mut data = vec![0; 64];
        data[0] = 0x21;
        data[4] = 0x03;
        data[32] = 0x04;

        let pixels = tiles(&data, 16);

        assert_eq!((pixels[0], pixels[1], pixels[16], pixels[8]), (1, 2, 3, 4));
    }

    #[test]
    fn turns_gba_colors_into_rgba_with_the_first_one_clear() {
        let colors = colors(&[0xFF, 0x7F, 0x1F, 0x00, 0xE0, 0x03, 0x00, 0x7C]);

        assert_eq!(colors, [[255, 255, 255, 0], [255, 0, 0, 255], [0, 255, 0, 255], [0, 0, 255, 255]]);
    }

    #[test]
    fn finds_tables_planted_at_an_address_no_game_uses() {
        let (images, status) = stills(&Builder::new().build().rom);

        assert_eq!(status, Status::Done);
        let unown_forms = 27;
        let castform_forms = 3;
        assert_eq!(sprite_count(&images), (NATIONAL_DEX + unown_forms + castform_forms) * 2);
        for key in ["sprite-1-0", "sprite-1-0-shiny", "egg", "icon-1-0", "icon-egg", "sprite-201-27", "icon-201-27"] {
            found(&images, key);
        }
    }

    #[test]
    fn keys_art_by_national_dex_number() {
        let (images, _) = stills(&Builder::new().build().rom);

        let treecko = found(&images, "sprite-252-0");

        assert_eq!(treecko.pixels[0], ((277 % 15) + 1) as u8);
        assert!(images.iter().all(|image| !matches!(image.key, Key::Sprite { species: 387.., .. })));
    }

    #[test]
    fn decodes_front_sprites_with_their_palettes() {
        let (images, _) = stills(&Builder::new().build().rom);

        let bulbasaur = found(&images, "sprite-1-0");
        let shiny = found(&images, "sprite-1-0-shiny");

        assert_eq!((bulbasaur.width, bulbasaur.height), (64, 64));
        assert!(bulbasaur.pixels.iter().all(|&p| p == 2));
        assert_eq!(bulbasaur.palette, colors(&palette(1, false)));
        assert_eq!(shiny.pixels, bulbasaur.pixels);
        assert_eq!(shiny.palette, colors(&palette(1, true)));
    }

    #[test]
    fn decodes_unown_letters_as_forms() {
        let (images, _) = stills(&Builder::new().build().rom);

        assert_eq!(found(&images, "sprite-201-1").pixels[0], (UNOWN_LETTERS.start % 15 + 1) as u8);
        assert_eq!(found(&images, "icon-201-1").pixels[0], (UNOWN_LETTERS.start % 15 + 1) as u8);
    }

    #[test]
    fn shows_deoxys_in_the_form_of_its_own_game() {
        let (images, _) = stills(&Builder::new().build().rom);

        assert_eq!(found(&images, &format!("sprite-{}-0", national(DEOXYS))).pixels[0], ((DEOXYS + 1) % 15 + 1) as u8);
    }

    #[test]
    fn decodes_each_castform_form_with_its_own_palette() {
        let (images, _) = stills(&Builder::new().build().rom);

        let rainy = found(&images, &format!("sprite-{}-2-shiny", national(CASTFORM)));

        assert_eq!(rainy.pixels[0], ((CASTFORM + 2) % 15 + 1) as u8);
        assert_eq!(rainy.palette, colors(&palette(CASTFORM + 2, true)));
    }

    #[test]
    fn decodes_the_first_frame_of_menu_icons_with_their_palette() {
        let (images, _) = stills(&Builder::new().build().rom);

        let icon = found(&images, "icon-1-0");

        assert_eq!((icon.width, icon.height), (32, 32));
        assert!(icon.pixels.iter().all(|&p| p == 2));
        assert_eq!(icon.palette, colors(&palette(1001, false)));
    }

    #[test]
    fn leaves_out_sprites_when_a_front_picture_pointer_is_broken() {
        let mut planted = Builder::new().build();
        planted.rom[planted.front + ENTRY * 25..][..4].copy_from_slice(&0x0A00_0000u32.to_le_bytes());

        let (images, status) = stills(&planted.rom);

        assert_eq!(status, Status::Partial);
        assert_eq!(sprite_count(&images), 0);
        found(&images, "icon-25-0");
    }

    #[test]
    fn leaves_out_sprites_when_a_front_picture_is_not_lz77() {
        let mut planted = Builder::new().build();
        let pointer = u32::from_le_bytes(planted.rom[planted.front + ENTRY * 25..][..4].try_into().unwrap());
        planted.rom[(pointer - ROM_START) as usize] = 0x30;

        let (images, status) = stills(&planted.rom);

        assert_eq!(status, Status::Partial);
        assert_eq!(sprite_count(&images), 0);
    }

    #[test]
    fn leaves_out_sprites_when_the_front_picture_table_runs_past_the_species_the_game_has() {
        let mut planted = Builder::new().build();
        planted.rom[planted.front + ENTRY * SPECIES + 6..][..2].copy_from_slice(&(SPECIES as u16).to_le_bytes());

        let (images, status) = stills(&planted.rom);

        assert_eq!(status, Status::Partial);
        assert_eq!(sprite_count(&images), 0);
    }

    #[test]
    fn looks_past_a_table_that_only_starts_like_the_national_dex() {
        let (_, status) = stills(&Builder::new().with_decoy_dex().build().rom);

        assert_eq!(status, Status::Done);
    }

    #[test]
    fn supports_no_rom_whose_only_tables_are_broken() {
        let mut planted = Builder::new().without_icons().with_items(0).build();
        planted.rom[planted.front + ENTRY * 25..][..4].copy_from_slice(&0x0A00_0000u32.to_le_bytes());

        let extracted = extract_rom(&planted.rom);

        assert_eq!(extracted.game.map(|game| game.platform), Some(Platform::Gba));
        assert_eq!((extracted.images, extracted.status), (Vec::new(), Status::Unsupported));
    }

    #[test]
    fn supports_no_rom_without_a_national_dex_table() {
        let (images, status) = stills(&Builder::new().without_tables().build().rom);

        assert_eq!((images, status), (Vec::new(), Status::Unsupported));
    }

    #[test]
    fn finds_tables_of_a_rom_hack_with_more_species_than_its_base_game() {
        let (images, status) = stills(&Builder::hack().build().rom);

        assert_eq!(status, Status::Done);
        let last = HACK_SPECIES - 1;
        let national = hack_national(last);
        assert_eq!(found(&images, &format!("sprite-{national}-0")).pixels[0], (last % 15 + 1) as u8);
        assert_eq!(found(&images, &format!("sprite-{national}-0-shiny")).palette, colors(&palette(last, true)));
        assert_eq!(
            found(&images, &format!("icon-{national}-0")).palette,
            colors(&palette(1000 + last % ICON_PALETTES, false))
        );
    }

    #[test]
    fn keys_a_hack_form_and_a_species_with_no_national_number_by_their_index() {
        let (images, _) = stills(&Builder::hack().build().rom);

        assert_eq!(found(&images, &format!("sprite-index-{HACK_FORM}")).pixels[0], (HACK_FORM % 15 + 1) as u8);
        assert_eq!(found(&images, "sprite-19-0").pixels[0], (19 % 15 + 1) as u8);
        found(&images, &format!("sprite-index-{HACK_ONLY}-shiny"));
        found(&images, &format!("icon-index-{HACK_ONLY}"));
        assert!(images.iter().all(|image| !matches!(image.key, Key::Sprite { form: 1, species: 19, .. })));
    }

    #[test]
    fn keys_unown_letters_of_a_rom_hack_as_forms() {
        let (images, _) = stills(&Builder::hack().build().rom);

        assert_eq!(found(&images, "sprite-201-1").pixels[0], (UNOWN_LETTERS.start % 15 + 1) as u8);
        assert_eq!(found(&images, "sprite-201-1-shiny").palette, colors(&palette(UNOWN_LETTERS.start, true)));
    }

    #[test]
    fn leaves_out_the_unused_slots_of_a_rom_hack() {
        let (images, _) = stills(&Builder::hack().build().rom);

        assert!(images.iter().all(|image| !matches!(image.key, Key::IndexSprite { index: 252..=276, .. })));
    }

    #[test]
    fn supports_no_rom_hack_whose_national_dex_runs_past_the_last_species() {
        let mut planted = Builder::hack().build();
        planted.rom[planted.dex + 2 * (HACK_SPECIES - 2)..][..2]
            .copy_from_slice(&(MOST_NATIONAL as u16 + 1).to_le_bytes());

        let (images, status) = stills(&planted.rom);

        assert_eq!((images.len(), status), (0, Status::Unsupported));
    }

    pub(super) fn item_ids(images: &[Image]) -> Vec<u16> {
        images
            .iter()
            .filter_map(|image| match image.key {
                Key::Item(id) => Some(id),
                _ => None,
            })
            .collect()
    }

    #[test]
    fn decodes_item_icons_keyed_by_the_games_own_item_index() {
        let (images, status) = stills(&Builder::new().build().rom);

        assert_eq!(status, Status::Done);
        let potion = found(&images, "item-13");
        assert_eq!((potion.width, potion.height), (24, 24));
        assert_eq!(potion.pixels, tiles(&item_icon(13), 24));
        assert_eq!(potion.palette, colors(&palette(2013, false)));
    }

    #[test]
    fn leaves_out_item_zero_and_the_return_arrow_that_ends_the_table() {
        for (builder, items) in [(Builder::new(), FIRERED_ITEMS), (Builder::emerald(), EMERALD_ITEMS)] {
            let (images, _) = stills(&builder.build().rom);

            assert_eq!(item_ids(&images), (1..items as u16).collect::<Vec<_>>());
        }
    }

    fn without(ids: impl Iterator<Item = u16>, left_out: usize) -> Vec<u16> {
        ids.filter(|&id| id as usize != left_out).collect()
    }

    #[test]
    fn finds_the_item_icon_table_through_firereds_lookup_past_a_table_shaped_like_it() {
        let (images, status) = stills(&Builder::new().with_items(400).with_decoy_items(FIRERED_ITEMS).build().rom);

        assert_eq!(status, Status::Done);
        assert_eq!(found(&images, "item-13").pixels, tiles(&item_icon(13), 24));
        assert_eq!(item_ids(&images), without(1..=400, FIRERED_ITEMS));
    }

    #[test]
    fn finds_firereds_lookup_when_a_hack_takes_out_its_clamp() {
        let (images, _) = stills(&Builder::new().with_clamp(NOP).build().rom);

        found(&images, "item-13");
    }

    #[test]
    fn keys_a_rom_hacks_item_icons_by_the_index_its_save_stores() {
        let (images, status) = stills(&Builder::hack().with_items(HACK_ITEMS).with_clamp(NOP).build().rom);

        assert_eq!(status, Status::Done);
        assert_eq!(item_ids(&images), without(1..=HACK_ITEMS as u16, FIRERED_ITEMS));
        assert_eq!(found(&images, &format!("item-{HACK_ITEMS}")).palette, colors(&palette(2000 + HACK_ITEMS, false)));
    }

    #[test]
    fn ends_a_looked_up_item_icon_table_at_the_first_entry_without_two_pointers() {
        let mut planted = Builder::new().build();
        planted.rom[planted.items + ENTRY * 13..][..4].copy_from_slice(&0x0A00_0000u32.to_le_bytes());

        let (images, _) = stills(&planted.rom);

        assert_eq!(item_ids(&images), (1..13).collect::<Vec<_>>());
    }

    #[test]
    fn leaves_out_the_item_icons_of_a_rom_hack_without_firereds_lookup() {
        let (images, status) = stills(&Builder::hack().without_lookup().build().rom);

        assert_eq!(status, Status::Done);
        assert_eq!(item_ids(&images), []);
    }

    #[test]
    fn refuses_an_item_icon_table_with_another_games_item_count() {
        let (images, status) = stills(&Builder::new().with_items(EMERALD_ITEMS).without_lookup().build().rom);

        assert_eq!(status, Status::Partial);
        assert_eq!(item_ids(&images), []);
    }

    #[test]
    fn leaves_out_item_icons_when_a_palette_is_too_big() {
        let mut planted = Builder::new().build();
        let pointer = u32::from_le_bytes(planted.rom[planted.items + ENTRY * 13 + 4..][..4].try_into().unwrap());
        planted.rom[(pointer - ROM_START) as usize + 1] = 0x40;

        let (images, status) = stills(&planted.rom);

        assert_eq!(status, Status::Partial);
        assert_eq!(item_ids(&images), []);
        found(&images, "sprite-1-0");
    }

    #[test]
    fn leaves_out_item_icons_when_an_icon_pointer_is_broken() {
        let mut planted = Builder::emerald().build();
        planted.rom[planted.items + ENTRY * 13..][..4].copy_from_slice(&0x0A00_0000u32.to_le_bytes());

        let (images, status) = stills(&planted.rom);

        assert_eq!(status, Status::Partial);
        assert_eq!(item_ids(&images), []);
    }

    #[test]
    fn decodes_ruby_and_sapphire_fully_without_item_icons() {
        let (images, status) = stills(&Builder::ruby().build().rom);

        assert_eq!(status, Status::Done);
        assert_eq!(item_ids(&images), []);
    }

    #[test]
    fn decodes_gen_3_art_only_from_gen_3_games() {
        let mut rom = Builder::new().build().rom;
        assert_eq!(extract_rom(&rom).status, Status::Done);

        rom[0xAC..0xB0].copy_from_slice(b"AGBE");
        sign(&mut rom);

        assert_eq!(extract_rom(&rom).status, Status::Unsupported);
    }

    pub(super) fn script_rom(commands: &[u32]) -> Vec<u8> {
        commands.iter().flat_map(|c| c.to_le_bytes()).collect()
    }

    #[test]
    fn reads_an_animation_script_up_to_its_end() {
        let rom = script_rom(&[step(1, 30), step(0, 63), END, step(1, 4)]);

        assert_eq!(script(&Rom(&rom), 0), Some(vec![(1, 30), (0, 63)]));
    }

    #[test]
    fn refuses_a_script_that_is_more_than_frames_and_durations() {
        for commands in [
            vec![step(1, 0), END],
            vec![step(1, 10), LOOP, END],
            vec![step(1, 10) | 1 << 22, END],
            vec![END],
            vec![step(1, 10); MOST_STEPS],
        ] {
            assert_eq!(script(&Rom(&script_rom(&commands)), 0), None, "{commands:x?}");
        }
    }

    #[test]
    fn holds_the_still_frame_for_two_seconds_after_the_script() {
        let pictures = [picture(1, 0), picture(1, 1)].concat();
        let key = Key::AnimatedSprite { species: 1, form: 0, shiny: false, female: false };

        let animation = animation(key, &pictures, &palette(1, false), &vec![(1, 30), (0, 10)]).unwrap();

        assert_eq!(animation.frames.iter().map(|frame| frame.delay).collect::<Vec<_>>(), [30, 10, 120]);
        assert_eq!(animation.frames[0].pixels, tiles(&picture(1, 1), 64));
        assert_eq!(animation.frames[2].pixels, tiles(&picture(1, 0), 64));
        assert_eq!((animation.width, animation.height), (64, 64));
        assert_eq!(animation.palette, colors(&palette(1, false)));
    }

    #[test]
    fn refuses_a_script_that_shows_a_frame_the_picture_lacks() {
        let pictures = [picture(1, 0), picture(1, 1)].concat();
        let key = Key::AnimatedSprite { species: 1, form: 0, shiny: false, female: false };

        assert_eq!(animation(key, &pictures, &palette(1, false), &vec![(2, 30)]), None);
        assert_eq!(animation(key, &pictures[..PICTURE], &palette(1, false), &vec![(1, 30)]), None);
    }

    fn animations(rom: &[u8]) -> Vec<AnimatedSprite> {
        extract(rom).1
    }

    pub(super) fn played(animations: &[AnimatedSprite], key: &str) -> AnimatedSprite {
        animations.iter().find(|a| a.key.to_string() == key).unwrap_or_else(|| panic!("no {key}")).clone()
    }

    #[test]
    fn animates_emeralds_front_sprites_from_their_scripts() {
        let animations = animations(&Builder::emerald().build().rom);

        let pikachu = played(&animations, "anim-25-0");
        let shiny = played(&animations, "anim-25-0-shiny");
        let wait = (PIKACHU % 20 + 1) as u16;
        assert_eq!(pikachu.frames.iter().map(|frame| frame.delay).collect::<Vec<_>>(), [wait, 5, wait, 1, HOLD]);
        assert_eq!(pikachu.frames[0].pixels, tiles(&picture(PIKACHU, 1), 64));
        assert_eq!(pikachu.frames[1].pixels, tiles(&picture(PIKACHU, 0), 64));
        assert_eq!(pikachu.palette, colors(&palette(PIKACHU, false)));
        assert_eq!(shiny.frames, pikachu.frames);
        assert_eq!(shiny.palette, colors(&palette(PIKACHU, true)));
        played(&animations, "anim-201-1");
    }

    #[test]
    fn leaves_still_the_species_whose_scripts_do_not_check_out() {
        let (images, animations, status) = extract(&Builder::emerald().build().rom);

        assert_eq!(status, Status::Done);
        for s in [STILL, OUT_OF_RANGE, LOOPS, CASTFORM, DEOXYS] {
            let national = national(s) as u16;
            let animated =
                |a: &AnimatedSprite| matches!(a.key, Key::AnimatedSprite { species, .. } if species == national);
            assert!(!animations.iter().any(animated), "{s}");
            found(&images, &format!("sprite-{national}-0"));
        }
        played(&animations, "anim-1-0");
    }

    #[test]
    fn animates_no_game_but_emerald() {
        assert_eq!(animations(&Builder::new().with_animations().build().rom), []);
        assert_eq!(animations(&Builder::ruby().with_animations().build().rom), []);
    }

    #[test]
    fn keeps_emeralds_still_sprites_when_its_scripts_are_missing() {
        let (images, animations, status) = extract(&Builder { animations: false, ..Builder::emerald() }.build().rom);

        assert_eq!(status, Status::Done);
        assert_eq!(animations, []);
        found(&images, "sprite-25-0");
    }
}
