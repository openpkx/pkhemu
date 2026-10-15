mod common;

use common::{find_3ds, find_save, rgba_hash, Counted};
use rom_art::{extract_each_from, fingerprint, Key, Platform, Status};

const fn icon(species: u16, form: u8, female: bool) -> Key {
    Key::MenuIcon { species, form, female }
}

const SAMPLES: [Key; 9] = [
    icon(1, 0, false),
    icon(6, 1, false),
    icon(25, 0, false),
    icon(521, 0, true),
    icon(666, 19, false),
    icon(678, 1, false),
    Key::EggIcon,
    Key::Item(1),
    Key::Item(347),
];

// PKHeX's Gen 6 form counts for the species with more than one form in X and Y.
#[rustfmt::skip]
const FORMS: [(u16, u8); 51] = [
    (3, 2), (6, 3), (9, 2), (65, 2), (94, 2), (115, 2), (127, 2), (130, 2), (142, 2), (150, 3),
    (181, 2), (201, 28), (212, 2), (214, 2), (229, 2), (248, 2), (257, 2), (282, 2), (303, 2), (306, 2),
    (308, 2), (310, 2), (351, 4), (354, 2), (359, 2), (380, 2), (381, 2), (386, 4), (412, 3), (413, 3),
    (421, 2), (422, 2), (423, 2), (445, 2), (448, 2), (460, 2), (479, 6), (487, 2), (492, 2), (493, 18),
    (550, 2), (555, 2), (585, 4), (586, 4), (641, 2), (642, 2), (645, 2), (646, 3), (647, 2), (648, 2),
    (649, 5),
];
const KALOS_FORMS: [(u16, u8); 10] =
    [(666, 20), (669, 5), (670, 6), (671, 5), (676, 10), (678, 2), (681, 2), (710, 4), (711, 4), (716, 2)];
const FEMALE_ICONS: [u16; 4] = [521, 592, 593, 668];

// Each pocket's offset in the save and its number of slots, each slot an item id and a count.
const POCKETS: [(usize, usize); 5] = [(0x400, 400), (0xA40, 96), (0xBC0, 106), (0xD68, 64), (0xE68, 72)];

fn bag_items(save: &[u8]) -> Vec<u16> {
    POCKETS
        .iter()
        .flat_map(|&(at, slots)| (0..slots).map(move |k| at + 4 * k))
        .map(|at| u16::from_le_bytes([save[at], save[at + 1]]))
        .filter(|&id| id != 0)
        .collect()
}

fn check(title: &str, title_id: &str, save: &str, golden: Option<[&str; 9]>) {
    let Some(rom) = find_3ds(title_id) else {
        eprintln!("skipped: needs a decrypted {title} dump (title ID {title_id}) in data/roms/3ds/");
        return;
    };
    let mut counted = Counted { rom, read: 0 };
    let extracted = extract_each_from(&mut counted, |_| ()).unwrap();
    assert_eq!(extracted.game.as_ref().map(|game| game.platform), Some(Platform::ThreeDs), "{title}");
    assert_eq!(extracted.status, Status::Done, "{title}");
    assert!(counted.read < 4 << 20, "{title}: read {} bytes", counted.read);
    let has = |key: Key| extracted.images.iter().any(|image| image.key == key);
    for species in 1..=721 {
        assert!(has(icon(species, 0, false)), "{title}: no icon for species {species}");
    }
    for (species, forms) in FORMS.into_iter().chain(KALOS_FORMS) {
        for form in 1..forms {
            assert!(has(icon(species, form, false)), "{title}: no icon for species {species} form {form}");
        }
        assert!(!has(icon(species, forms, false)), "{title}: species {species} has more than {forms} forms");
    }
    let females: Vec<u16> = extracted
        .images
        .iter()
        .filter_map(|image| match image.key {
            Key::MenuIcon { species, female: true, .. } => Some(species),
            _ => None,
        })
        .collect();
    assert_eq!(females, FEMALE_ICONS, "{title}");
    for image in &extracted.images {
        let size = match image.key {
            Key::Item(_) => (30, 30),
            _ => (40, 30),
        };
        assert_eq!((image.width, image.height), size, "{title}: {}", image.key);
    }
    let hashes = SAMPLES.map(|key| {
        let image =
            extracted.images.iter().find(|image| image.key == key).unwrap_or_else(|| panic!("{title}: no {key}"));
        rgba_hash(image)
    });
    match golden {
        Some(golden) => assert_eq!(hashes, golden, "{title}"),
        None => eprintln!("{title} decodes, with no golden hashes to compare yet. Commit these: {hashes:#?}"),
    }
    let Some(save) = find_save(save) else {
        eprintln!("skipped: needs a {title} save named {save} in data/saves/");
        return;
    };
    let items = bag_items(&save);
    assert!(!items.is_empty(), "{title}: the bag holds no items");
    for id in items {
        assert!(has(Key::Item(id)), "{title}: no icon for item {id}");
    }
}

#[test]
fn decodes_x() {
    check(
        "Pokémon X",
        "0004000000055D00",
        "3ds/x-catnapfart123-main",
        Some([
            "013bd538ced8e3d5003677684d4315a22b3af80cc09e684b1269621932a5c6a3",
            "025591c71afb009fea1322308a7d98f484e618eb61544728671f0369c6583224",
            "240b7324d37d6f6158cbaaa3aa421721bb1adb8eba13c6326ab820e8d7058943",
            "c58ebe61ff6064b100bc579bb61ff072aea9b31776055ed1cb01f66d8c42440e",
            "acd04504b51b959535a883a2a895158dcaa1a643fe1212df9f64bf9f13e9eec6",
            "91526282be36683c1a1bf055e4c6b7988a24c72c6a500d674d8bf27dbc991613",
            "8a2720b601cdee695191a89d68be10433e3238ade51000e8228db80433b6ae21",
            "83ec60d23f611e1b2dbe9a23fa41312fd40038d904a8a4f73acdf1c376cf289f",
            "c18d33fef309d0e1a680d29a4a5b7a2e9f54fb287a31d6c57d2db82032cb9cf1",
        ]),
    );
}

#[test]
fn fingerprints_x_without_reading_the_whole_dump() {
    let Some(rom) = find_3ds("0004000000055D00") else {
        eprintln!("skipped: needs a decrypted Pokémon X dump (title ID 0004000000055D00) in data/roms/3ds/");
        return;
    };
    let mut counted = Counted { rom, read: 0 };

    assert!(fingerprint(&mut counted, &mut std::io::sink()).unwrap());

    assert!(counted.read < 4 << 20, "read {} bytes", counted.read);
}

#[test]
fn decodes_y() {
    check("Pokémon Y", "0004000000055E00", "3ds/y-main", None);
}

const fn sprite(species: u16, form: u8, shiny: bool, female: bool) -> Key {
    Key::Sprite { species, form, shiny, female }
}

const ORAS_SAMPLES: [Key; 12] = [
    icon(1, 0, false),
    icon(25, 6, false),
    icon(382, 1, false),
    icon(668, 0, true),
    Key::EggIcon,
    Key::Item(1),
    Key::Item(775),
    sprite(1, 0, false, false),
    sprite(3, 0, true, true),
    sprite(6, 2, false, false),
    sprite(25, 1, false, false),
    sprite(721, 0, true, false),
];

// PKHeX's Omega Ruby and Alpha Sapphire form counts for the species with more than one form.
#[rustfmt::skip]
const ORAS_FORMS: [(u16, u8); 85] = [
    (3, 2), (6, 3), (9, 2), (15, 2), (18, 2), (25, 7), (65, 2), (80, 2), (94, 2), (115, 2),
    (127, 2), (130, 2), (142, 2), (150, 3), (181, 2), (201, 28), (208, 2), (212, 2), (214, 2), (229, 2),
    (248, 2), (254, 2), (257, 2), (260, 2), (282, 2), (302, 2), (303, 2), (306, 2), (308, 2), (310, 2),
    (319, 2), (323, 2), (334, 2), (351, 4), (354, 2), (359, 2), (362, 2), (373, 2), (376, 2), (380, 2),
    (381, 2), (382, 2), (383, 2), (384, 2), (386, 4), (412, 3), (413, 3), (421, 2), (422, 2), (423, 2),
    (428, 2), (445, 2), (448, 2), (460, 2), (475, 2), (479, 6), (487, 2), (492, 2), (493, 18), (531, 2),
    (550, 2), (555, 2), (585, 4), (586, 4), (641, 2), (642, 2), (645, 2), (646, 3), (647, 2), (648, 2),
    (649, 5), (664, 20), (665, 20), (666, 20), (669, 5), (670, 6), (671, 5), (676, 10), (678, 2), (681, 2),
    (710, 4), (711, 4), (716, 2), (719, 2), (720, 2),
];
const FEMALE_SPRITES: [u16; 6] = [3, 25, 521, 592, 593, 668];
const FEMALE_SPRITE_COUNT: usize = 97;
const ONE_LOOK: [u16; 3] = [29, 32, 669];

fn check_oras(title: &str, title_id: &str, golden: Option<[&str; 12]>) {
    let Some(rom) = find_3ds(title_id) else {
        eprintln!("skipped: needs a decrypted {title} dump (title ID {title_id}) in data/roms/3ds/");
        return;
    };
    let mut counted = Counted { rom, read: 0 };
    let extracted = extract_each_from(&mut counted, |_| ()).unwrap();
    assert_eq!(extracted.game.as_ref().map(|game| game.platform), Some(Platform::ThreeDs), "{title}");
    assert_eq!(extracted.status, Status::Done, "{title}");
    assert!(counted.read < 16 << 20, "{title}: read {} bytes", counted.read);
    let has = |key: Key| extracted.images.iter().any(|image| image.key == key);
    let forms = |species: u16| ORAS_FORMS.iter().find(|&&(s, _)| s == species).map_or(1, |&(_, forms)| forms);
    for species in 1..=721 {
        for form in 0..forms(species) {
            assert!(has(icon(species, form, false)), "{title}: no icon for species {species} form {form}");
            for shiny in [false, true] {
                let key = sprite(species, form, shiny, false);
                assert!(has(key), "{title}: no {key}");
            }
        }
        assert!(!has(icon(species, forms(species), false)), "{title}: species {species} has too many forms");
        assert!(!has(sprite(species, forms(species), false, false)), "{title}: species {species} has too many forms");
    }
    let females: Vec<u16> = extracted
        .images
        .iter()
        .filter_map(|image| match image.key {
            Key::MenuIcon { species, female: true, .. } => Some(species),
            _ => None,
        })
        .collect();
    assert_eq!(females, FEMALE_ICONS, "{title}");
    for species in FEMALE_SPRITES {
        assert!(has(sprite(species, 0, true, true)), "{title}: no female sprite for species {species}");
    }
    let female_sprites = extracted
        .images
        .iter()
        .filter(|image| matches!(image.key, Key::Sprite { female: true, shiny: false, .. }))
        .count();
    assert_eq!(female_sprites, FEMALE_SPRITE_COUNT, "{title}");
    for species in ONE_LOOK {
        assert!(!has(sprite(species, 0, false, true)), "{title}: species {species} has a female sprite");
    }
    assert!(has(Key::EggIcon), "{title}");
    assert!(!has(icon(722, 0, false)) && !has(Key::Item(776)), "{title}");
    for image in &extracted.images {
        let size = match image.key {
            Key::Item(_) => (30, 30),
            Key::Sprite { .. } => (120, 120),
            _ => (40, 30),
        };
        assert_eq!((image.width, image.height), size, "{title}: {}", image.key);
    }
    let hashes = ORAS_SAMPLES.map(|key| {
        let image =
            extracted.images.iter().find(|image| image.key == key).unwrap_or_else(|| panic!("{title}: no {key}"));
        rgba_hash(image)
    });
    match golden {
        Some(golden) => assert_eq!(hashes, golden, "{title}"),
        None => eprintln!("{title} decodes, with no golden hashes to compare yet. Commit these: {hashes:#?}"),
    }
}

#[test]
fn decodes_omega_ruby() {
    check_oras(
        "Pokémon Omega Ruby",
        "000400000011C400",
        Some([
            "013bd538ced8e3d5003677684d4315a22b3af80cc09e684b1269621932a5c6a3",
            "89627809d20008a3e74b502eda0bcbf5b0f97dca43fa15f5fb5beede87c9ecd4",
            "65eee88b2f17c224e14937f605c2cf3709ea987eff55c7770cc0815b258fc50e",
            "c85f8a9ccf9252f0a5080624f3aea194030a9f532b0972858108b484619c4a3a",
            "8a2720b601cdee695191a89d68be10433e3238ade51000e8228db80433b6ae21",
            "83ec60d23f611e1b2dbe9a23fa41312fd40038d904a8a4f73acdf1c376cf289f",
            "c8f1e78de9867b834ee1bd812e789ac0451e6ac473ae4f97e067f9cfc7412dc9",
            "a13361ff814261795340d034d11b07b5cfe83bcb74bae5f973bece17f1e7163a",
            "94bb1e0fde267d5527b1220785dd59f511fff5688a2173fe71d9063c8e97a871",
            "8cb06cbccd8e00240480707392ff9e63818f840cb85adc2ff31d54537d09aa0a",
            "d89a29ddc8279dd9d91f97802da85e6c036f7d6079d082e853061cdd6398fe9c",
            "9e429efa7e1b8d4c01e7a6e9937ae24c1008e1e52cb22d714b370d06ae32df91",
        ]),
    );
}

#[test]
fn decodes_alpha_sapphire() {
    check_oras("Pokémon Alpha Sapphire", "000400000011C500", None);
}
