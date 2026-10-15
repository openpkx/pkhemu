use crate::gen6::{icons_and_items, status, Decoded, Layout, SCATTERBUG_AND_SPEWPA};
use crate::three_ds::{texture, Garc, Picture, Title};
use crate::{Image, Key, Status};
use std::collections::HashSet;
use std::io::{Read, Seek};

// Every region shares one title ID per game.
const SUN: &str = "0004000000164800";
const MOON: &str = "0004000000175E00";
const ULTRA_SUN: &str = "00040000001B5000";
const ULTRA_MOON: &str = "00040000001B5100";

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Build {
    SunMoon,
    UltraSunUltraMoon,
}

impl Build {
    pub fn of(code: &str) -> Option<Build> {
        match code {
            SUN | MOON => Some(Build::SunMoon),
            ULTRA_SUN | ULTRA_MOON => Some(Build::UltraSunUltraMoon),
            _ => None,
        }
    }

    const fn layout(self) -> Layout {
        match self {
            Build::SunMoon => Layout {
                species: 802,
                last_item: 920,
                icons: "a/0/6/2",
                items: "a/0/6/1",
                unlisted_forms: SCATTERBUG_AND_SPEWPA,
            },
            Build::UltraSunUltraMoon => {
                Layout { species: 807, last_item: 959, icons: "a/0/6/2", items: "a/0/6/1", unlisted_forms: &[] }
            }
        }
    }

    const fn renders(self) -> &'static str {
        match self {
            Build::SunMoon => "a/2/4/0",
            Build::UltraSunUltraMoon => "a/2/4/4",
        }
    }
}

#[derive(Clone, Copy, PartialEq, Eq, Hash)]
struct Render {
    species: u16,
    form: u8,
    gender: u8,
    shiny: bool,
}

fn digits<T: std::str::FromStr>(text: &str, len: usize) -> Option<T> {
    (text.len() == len && text.bytes().all(|b| b.is_ascii_digit())).then(|| text.parse().ok())?
}

// The dex renders name themselves, as `pokepic_025_01s_n_picfl.tga`: species, form, a gender, then n for normal or r
// for rare, the shiny. The gender is m or f where the two look different, s where they don't and n for none.
fn render(name: &str) -> Option<Render> {
    let rest = name.strip_prefix("pokepic_")?.strip_suffix("_picfl.tga")?;
    let [species, look, colour] = <[&str; 3]>::try_from(rest.split('_').collect::<Vec<_>>()).ok()?;
    let gender = *look.as_bytes().last().filter(|gender| b"mfsn".contains(gender))?;
    let shiny = match colour {
        "n" => false,
        "r" => true,
        _ => return None,
    };
    Some(Render { species: digits(species, 3)?, form: digits(&look[..look.len() - 1], 2)?, gender, shiny })
}

// The archive's first render is a placeholder no species uses.
fn renders(archive: &Garc, species: usize) -> Option<(Vec<(Render, Picture)>, bool)> {
    let mut renders = Vec::new();
    let mut missing = false;
    for index in 1..archive.len {
        let Some(texture) = archive.get(index).and_then(texture) else {
            missing = true;
            continue;
        };
        let render = render(&texture.name).filter(|render| (1..=species).contains(&(render.species as usize)))?;
        renders.push((render, texture.picture));
    }
    Some((renders, missing))
}

fn with_form(key: Key, form: u8) -> Key {
    match key {
        Key::Sprite { species, shiny, female, .. } => Key::Sprite { species, form, shiny, female },
        key => key,
    }
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
    let Some(file) = title.file(build.renders()) else {
        return unsupported;
    };
    let Some((renders, unreadable)) = Garc::open(&file).and_then(|archive| renders(&archive, forms.len())) else {
        return unsupported;
    };
    let named: HashSet<Render> = renders.iter().map(|(render, _)| *render).collect();
    if named.len() < renders.len() {
        return unsupported;
    }
    let drawn: HashSet<(u16, u8, bool)> = named.iter().map(|r| (r.species, r.form, r.shiny)).collect();
    let mut sprites: Vec<(Key, Picture)> = renders
        .into_iter()
        .map(|(render, picture)| {
            let Render { species, form, gender, shiny } = render;
            let female = gender == b'f' && named.contains(&Render { gender: b'm', ..render });
            (Key::Sprite { species, form, shiny, female }, picture)
        })
        .collect();
    let mut incomplete = drawn.iter().any(|&(species, form, shiny)| !drawn.contains(&(species, form, !shiny)));
    // A form that only changes a Pokémon's size, like a Totem, or a colour no render shows has no render of its own,
    // and the game shows the base form's.
    for (species, &count) in (1..).zip(&forms) {
        incomplete |= !drawn.contains(&(species, 0, false)) || !drawn.contains(&(species, 0, true));
        let shared: Vec<u8> = (1..count as u8).filter(|&form| !drawn.contains(&(species, form, false))).collect();
        if shared.is_empty() {
            continue;
        }
        let base: Vec<(Key, Picture)> = sprites
            .iter()
            .filter(|(key, _)| matches!(*key, Key::Sprite { species: s, form: 0, .. } if s == species))
            .cloned()
            .collect();
        for form in shared {
            sprites.extend(base.iter().map(|(key, picture)| (with_form(*key, form), picture.clone())));
        }
    }
    images.extend(sprites.into_iter().map(|(key, picture)| picture.image(key)));
    (images, status(missing || unreadable || incomplete))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::lz77;
    use crate::three_ds::build::{self, Counted};
    use std::io::Cursor;

    const BUILD: Build = Build::UltraSunUltraMoon;
    const LAYOUT: Layout = BUILD.layout();
    const ICON_COUNT: usize = 12;
    const ITEM_COUNT: usize = 21;
    const ROW: usize = 16;
    const RATICATE: usize = 20;
    const PIKACHU: u16 = 25;

    fn put(code: &mut [u8], at: usize, value: &[u8]) {
        code[at..at + value.len()].copy_from_slice(value);
    }

    // Raticate has three forms, Pyroar a female icon, and items point at icons in turn after the placeholder.
    fn code(layout: &Layout) -> Vec<u8> {
        let table_at = 0x40 + (layout.last_item + 1) * 4;
        let arrays_at = table_at + (layout.species + 1) * ROW;
        let mut code = vec![0xEE; 0x40];
        code.resize(arrays_at + 8, 0);
        put(&mut code, 0x40, &(ITEM_COUNT as u32 - 1).to_le_bytes());
        for item in 1..=layout.last_item {
            put(&mut code, 0x40 + 4 * item, &((item - 1) as u32 % (ITEM_COUNT as u32 - 1)).to_le_bytes());
        }
        for species in 1..=layout.species {
            let icon = (1 + species % 10) as u16;
            put(&mut code, table_at + species * ROW, &[icon.to_le_bytes(), icon.to_le_bytes()].concat());
        }
        let raticate = table_at + RATICATE * ROW;
        put(&mut code, raticate + 4, &(0x10_0000 + arrays_at as u32).to_le_bytes());
        put(&mut code, raticate + 12, &3u16.to_le_bytes());
        put(&mut code, arrays_at, &[1u16, 7, 8].map(u16::to_le_bytes).concat());
        put(&mut code, table_at + 668 * ROW + 2, &10u16.to_le_bytes());
        code
    }

    fn garc(entries: &[Vec<u8>]) -> Vec<u8> {
        build::garc(&entries.iter().map(Vec::as_slice).collect::<Vec<_>>())
    }

    fn flims(count: usize, width: u16, height: u16) -> Vec<u8> {
        let pixels = vec![0xFF; width as usize * height as usize * 2];
        garc(&(0..count).map(|_| lz77::stored_extended(&build::flim(width, height, 7, 4, &pixels))).collect::<Vec<_>>())
    }

    // Each render's first three alphas spell its place in the archive.
    fn texture(name: &str, number: usize) -> Vec<u8> {
        if name == "broken" {
            return name.as_bytes().to_vec();
        }
        let tile = [(number as u64).to_le_bytes(), [0; 8]].concat().repeat(4);
        lz77::stored_extended(&build::texture(name, 8, 8, 0x2B, &tile))
    }

    fn number(image: &Image) -> usize {
        (0..3).map(|y| (image.pixels[y * 8 * 4 + 3] as usize / 0x11) << (4 * y)).sum()
    }

    fn names() -> Vec<String> {
        names_up_to(LAYOUT.species)
    }

    fn names_up_to(last: usize) -> Vec<String> {
        let mut names = vec!["pokepic_000.tga".to_string()];
        for species in 1..=last {
            let looks = match species {
                25 => vec!["00f", "00m", "01s"],
                29 => vec!["00f"],
                20 => vec!["00s", "01s"],
                132 => vec!["00n"],
                _ => vec!["00s"],
            };
            for look in looks {
                names.extend(["n", "r"].map(|colour| format!("pokepic_{species:03}_{look}_{colour}_picfl.tga")));
            }
        }
        names
    }

    fn rom_with(names: &[String], junk: usize) -> Vec<u8> {
        rom_of(BUILD, ULTRA_SUN, names, junk)
    }

    fn rom_of(build: Build, title_id: &str, names: &[String], junk: usize) -> Vec<u8> {
        let layout = build.layout();
        let renders = garc(&names.iter().enumerate().map(|(k, name)| texture(name, k)).collect::<Vec<_>>());
        let (icons, items) = (flims(ICON_COUNT, 64, 32), flims(ITEM_COUNT, 32, 32));
        let filler = vec![0xA5; junk];
        let files: [(&str, &[u8]); 4] =
            [(layout.items, &items), (layout.icons, &icons), (build.renders(), &renders), ("a/2/4/5", &filler)];
        let id = u64::from_str_radix(title_id, 16).unwrap();
        build::ncsd(id, &build::ncch(id, false, &code(&layout), b"", &build::romfs(&files, 0x360, 12)), b"")
    }

    fn extracted(names: &[String]) -> (Vec<Image>, Status) {
        extract(Cursor::new(rom_with(names, 0)), Build::UltraSunUltraMoon)
    }

    fn found<'a>(images: &'a [Image], key: &str) -> &'a Image {
        images.iter().find(|image| image.key.to_string() == key).unwrap_or_else(|| panic!("no {key}"))
    }

    fn place(name: &str) -> usize {
        names().iter().position(|n| n == name).unwrap()
    }

    #[test]
    fn recognises_sun_moon_ultra_sun_and_ultra_moon_in_every_region() {
        assert_eq!(
            [SUN, MOON, ULTRA_SUN, ULTRA_MOON, "0004000000055D00", "0004000000164801", ""].map(Build::of),
            [
                Some(Build::SunMoon),
                Some(Build::SunMoon),
                Some(Build::UltraSunUltraMoon),
                Some(Build::UltraSunUltraMoon),
                None,
                None,
                None
            ]
        );
    }

    #[test]
    fn reads_a_renders_name() {
        let pikachu = Render { species: 25, form: 1, gender: b's', shiny: true };

        assert!(render("pokepic_025_01s_r_picfl.tga") == Some(pikachu));
        for name in [
            "pokepic_000.tga",
            "pokepic_025_01x_n_picfl.tga",
            "pokepic_025_01s_s_picfl.tga",
            "pokepic_25_01s_n_picfl.tga",
            "pokepic_025_1s_n_picfl.tga",
            "pokepic_025_+1s_n_picfl.tga",
            "pokepic_025_01s_n_picfl.png",
            "pokepic_025_01s_n_x_picfl.tga",
        ] {
            assert!(render(name).is_none(), "{name}");
        }
    }

    #[test]
    fn decodes_icons_items_and_each_species_normal_and_shiny_renders() {
        let (images, status) = extracted(&names());

        assert_eq!(status, Status::Done);
        let keys: Vec<String> = images.iter().map(|image| image.key.to_string()).collect();
        for key in ["icon-1-0", "icon-20-2", "icon-668-0-female", "icon-807-0", "icon-egg", "item-1", "item-959"] {
            assert!(keys.contains(&key.to_string()), "{key}");
        }
        for species in 1..=LAYOUT.species {
            for shiny in ["", "-shiny"] {
                assert!(keys.contains(&format!("sprite-{species}-0{shiny}")), "{species}{shiny}");
            }
        }
        assert_eq!((found(&images, "icon-egg").width, found(&images, "icon-egg").height), (40, 30));
        assert_eq!((found(&images, "item-1").width, found(&images, "item-1").height), (32, 32));
        let sprite = found(&images, "sprite-1-0");
        assert_eq!((sprite.width, sprite.height, sprite.pixels.len(), sprite.palette.len()), (8, 8, 256, 0));
    }

    #[test]
    fn maps_each_render_by_its_name() {
        let (images, _) = extracted(&names());

        for (key, name) in [
            ("sprite-1-0", "pokepic_001_00s_n_picfl.tga"),
            ("sprite-1-0-shiny", "pokepic_001_00s_r_picfl.tga"),
            ("sprite-25-0", "pokepic_025_00m_n_picfl.tga"),
            ("sprite-25-0-female-shiny", "pokepic_025_00f_r_picfl.tga"),
            ("sprite-25-1-shiny", "pokepic_025_01s_r_picfl.tga"),
            ("sprite-29-0", "pokepic_029_00f_n_picfl.tga"),
            ("sprite-132-0", "pokepic_132_00n_n_picfl.tga"),
            ("sprite-807-0-shiny", "pokepic_807_00s_r_picfl.tga"),
        ] {
            assert_eq!(number(found(&images, key)), place(name), "{key}");
        }
        let keys: Vec<String> = images.iter().map(|image| image.key.to_string()).collect();
        assert!(!keys.contains(&"sprite-29-0-female".to_string()));
        assert_eq!(keys.iter().filter(|key| key.starts_with(&format!("sprite-{PIKACHU}-"))).count(), 6);
    }

    #[test]
    fn gives_a_form_without_a_render_its_base_forms() {
        let (images, _) = extracted(&names());

        for (key, name) in [
            ("sprite-20-1", "pokepic_020_01s_n_picfl.tga"),
            ("sprite-20-2", "pokepic_020_00s_n_picfl.tga"),
            ("sprite-20-2-shiny", "pokepic_020_00s_r_picfl.tga"),
        ] {
            assert_eq!(number(found(&images, key)), place(name), "{key}");
        }
        assert!(!images.iter().any(|image| image.key.to_string() == "sprite-20-3"));
    }

    #[test]
    fn reads_sun_and_moons_renders_and_draws_scatterbugs_forms_as_the_base() {
        let names = names_up_to(Build::SunMoon.layout().species);
        let (images, status) = extract(Cursor::new(rom_of(Build::SunMoon, MOON, &names, 0)), Build::SunMoon);

        assert_eq!(status, Status::Done);
        let place = |name: &str| names.iter().position(|n| n == name).unwrap();
        for (key, name) in [
            ("sprite-802-0-shiny", "pokepic_802_00s_r_picfl.tga"),
            ("sprite-664-19", "pokepic_664_00s_n_picfl.tga"),
            ("sprite-665-1-shiny", "pokepic_665_00s_r_picfl.tga"),
        ] {
            assert_eq!(number(found(&images, key)), place(name), "{key}");
        }
        assert_eq!(found(&images, "icon-664-19").pixels, found(&images, "icon-664-0").pixels);
        let keys: Vec<String> = images.iter().map(|image| image.key.to_string()).collect();
        for key in ["icon-664-20", "sprite-664-20", "icon-803-0", "item-921"] {
            assert!(!keys.contains(&key.to_string()), "{key}");
        }
        assert!(keys.contains(&"item-920".to_string()));
    }

    #[test]
    fn supports_no_sun_or_moon_with_renders_past_its_last_species() {
        let names = names();

        assert_eq!(extract(Cursor::new(rom_of(Build::SunMoon, SUN, &names, 0)), Build::SunMoon).1, Status::Unsupported);
    }

    #[test]
    fn supports_no_rom_whose_renders_do_not_check_out() {
        let renamed = |at: usize, name: &str| {
            let mut names = names();
            names[at] = name.into();
            names
        };
        for names in [
            renamed(5, "pokepic_002_00s_x_picfl.tga"),
            renamed(5, "pokepic_808_00s_n_picfl.tga"),
            renamed(5, "pokepic_000_00s_n_picfl.tga"),
            renamed(5, "pokepic_001_00s_n_picfl.tga"),
        ] {
            assert_eq!(extracted(&names), (Vec::new(), Status::Unsupported));
        }
    }

    #[test]
    fn supports_no_rom_without_renders_or_their_icon_tables() {
        let ultra_sun = u64::from_str_radix(ULTRA_SUN, 16).unwrap();
        let (icons, items) = (flims(ICON_COUNT, 64, 32), flims(ITEM_COUNT, 32, 32));
        let files: [(&str, &[u8]); 2] = [(LAYOUT.items, &items), (LAYOUT.icons, &icons)];
        let rom = build::ncch(ultra_sun, false, &code(&LAYOUT), b"", &build::romfs(&files, 0x360, 12));

        assert_eq!(extract(Cursor::new(rom), Build::UltraSunUltraMoon), (Vec::new(), Status::Unsupported));
    }

    #[test]
    fn keeps_the_other_renders_when_one_does_not_decode_or_lacks_its_pair() {
        let mut names = names();
        names[3] = "broken".into();
        let without_mew: Vec<String> = names.iter().filter(|name| !name.starts_with("pokepic_151_")).cloned().collect();
        let unpaired: Vec<String> =
            self::names().into_iter().filter(|name| name != "pokepic_020_01s_r_picfl.tga").collect();

        for names in [names, without_mew, unpaired] {
            let (images, status) = extracted(&names);
            assert_eq!(status, Status::Partial);
            assert!(images.iter().any(|image| image.key.to_string() == "sprite-807-0"));
        }
    }

    #[test]
    fn reads_only_the_code_the_romfs_tables_and_the_three_archives() {
        let rom = rom_with(&names(), 1 << 20);
        let mut counted = Counted { rom: Cursor::new(&rom), read: 0 };

        assert_eq!(extract(&mut counted, Build::UltraSunUltraMoon).1, Status::Done);
        assert!(rom.len() > 1 << 20);
        assert!(counted.read < rom.len() - (1 << 20), "read {} bytes", counted.read);
    }
}
