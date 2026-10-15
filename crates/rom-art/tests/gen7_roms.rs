mod common;

use common::{find_3ds, rgba_hash, Counted};
use rom_art::{extract_each_from, Key, Platform, Status};

const fn icon(species: u16, form: u8, female: bool) -> Key {
    Key::MenuIcon { species, form, female }
}

const fn sprite(species: u16, form: u8, shiny: bool, female: bool) -> Key {
    Key::Sprite { species, form, shiny, female }
}

const ULTRA_SAMPLES: [Key; 12] = [
    icon(1, 0, false),
    icon(25, 7, false),
    icon(668, 0, true),
    icon(800, 3, false),
    Key::EggIcon,
    Key::Item(1),
    Key::Item(959),
    sprite(1, 0, false, false),
    sprite(25, 0, true, true),
    sprite(26, 1, false, false),
    sprite(800, 3, true, false),
    sprite(807, 0, false, false),
];

const SUN_SAMPLES: [Key; 12] = [
    icon(1, 0, false),
    icon(25, 6, false),
    icon(664, 5, false),
    icon(801, 1, false),
    Key::EggIcon,
    Key::Item(1),
    Key::Item(920),
    sprite(1, 0, false, false),
    sprite(25, 0, true, true),
    sprite(26, 1, false, false),
    sprite(664, 5, true, false),
    sprite(802, 0, false, false),
];

// Each game's form counts, as PKHeX gives them, for the species with more than one form.
#[rustfmt::skip]
const SUN_FORMS: [(u16, u8); 117] = [
    (3, 2), (6, 3), (9, 2), (15, 2), (18, 2), (19, 2), (20, 3), (25, 7), (26, 2), (27, 2),
    (28, 2), (37, 2), (38, 2), (50, 2), (51, 2), (52, 2), (53, 2), (65, 2), (74, 2), (75, 2),
    (76, 2), (80, 2), (88, 2), (89, 2), (94, 2), (103, 2), (105, 2), (115, 2), (127, 2), (130, 2),
    (142, 2), (150, 3), (181, 2), (201, 28), (208, 2), (212, 2), (214, 2), (229, 2), (248, 2), (254, 2),
    (257, 2), (260, 2), (282, 2), (302, 2), (303, 2), (306, 2), (308, 2), (310, 2), (319, 2), (323, 2),
    (334, 2), (351, 4), (354, 2), (359, 2), (362, 2), (373, 2), (376, 2), (380, 2), (381, 2), (382, 2),
    (383, 2), (384, 2), (386, 4), (412, 3), (413, 3), (421, 2), (422, 2), (423, 2), (428, 2), (445, 2),
    (448, 2), (460, 2), (475, 2), (479, 6), (487, 2), (492, 2), (493, 18), (531, 2), (550, 2), (555, 2),
    (585, 4), (586, 4), (641, 2), (642, 2), (645, 2), (646, 3), (647, 2), (648, 2), (649, 5), (658, 3),
    (664, 20), (665, 20), (666, 20), (669, 5), (670, 6), (671, 5), (676, 10), (678, 2), (681, 2), (710, 4),
    (711, 4), (716, 2), (718, 5), (719, 2), (720, 2), (735, 2), (738, 2), (741, 4), (745, 2), (746, 2),
    (754, 2), (758, 2), (773, 18), (774, 14), (778, 4), (784, 2), (801, 2),
];

#[rustfmt::skip]
const ULTRA_FORMS: [(u16, u8); 123] = [
    (3, 2), (6, 3), (9, 2), (15, 2), (18, 2), (19, 2), (20, 3), (25, 8), (26, 2), (27, 2),
    (28, 2), (37, 2), (38, 2), (50, 2), (51, 2), (52, 2), (53, 2), (65, 2), (74, 2), (75, 2),
    (76, 2), (80, 2), (88, 2), (89, 2), (94, 2), (103, 2), (105, 3), (115, 2), (127, 2), (130, 2),
    (142, 2), (150, 3), (181, 2), (201, 28), (208, 2), (212, 2), (214, 2), (229, 2), (248, 2), (254, 2),
    (257, 2), (260, 2), (282, 2), (302, 2), (303, 2), (306, 2), (308, 2), (310, 2), (319, 2), (323, 2),
    (334, 2), (351, 4), (354, 2), (359, 2), (362, 2), (373, 2), (376, 2), (380, 2), (381, 2), (382, 2),
    (383, 2), (384, 2), (386, 4), (412, 3), (413, 3), (414, 3), (421, 2), (422, 2), (423, 2), (428, 2),
    (445, 2), (448, 2), (460, 2), (475, 2), (479, 6), (487, 2), (492, 2), (493, 18), (531, 2), (550, 2),
    (555, 2), (585, 4), (586, 4), (641, 2), (642, 2), (645, 2), (646, 3), (647, 2), (648, 2), (649, 5),
    (658, 3), (664, 20), (665, 20), (666, 20), (669, 5), (670, 6), (671, 5), (676, 10), (678, 2), (681, 2),
    (710, 4), (711, 4), (716, 2), (718, 5), (719, 2), (720, 2), (735, 2), (738, 2), (741, 4), (743, 2),
    (744, 2), (745, 3), (746, 2), (752, 2), (754, 2), (758, 2), (773, 18), (774, 14), (777, 2), (778, 4),
    (784, 2), (800, 4), (801, 2),
];
const FEMALE_ICONS: [u16; 4] = [521, 592, 593, 668];
const FEMALE_SPRITES: [u16; 4] = [3, 25, 521, 668];
const ONE_LOOK: [u16; 3] = [29, 32, 669];

struct Dump {
    title: &'static str,
    title_id: &'static str,
    species: u16,
    forms: &'static [(u16, u8)],
    samples: [Key; 12],
}

const SUN: Dump =
    Dump { title: "Pokémon Sun", title_id: "0004000000164800", species: 802, forms: &SUN_FORMS, samples: SUN_SAMPLES };
const MOON: Dump = Dump { title: "Pokémon Moon", title_id: "0004000000175E00", ..SUN };
const ULTRA_SUN: Dump = Dump {
    title: "Pokémon Ultra Sun",
    title_id: "00040000001B5000",
    species: 807,
    forms: &ULTRA_FORMS,
    samples: ULTRA_SAMPLES,
};
const ULTRA_MOON: Dump = Dump { title: "Pokémon Ultra Moon", title_id: "00040000001B5100", ..ULTRA_SUN };

fn check(dump: Dump, golden: Option<[&str; 12]>) {
    let Dump { title, title_id, species: last, forms, samples } = dump;
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
    let forms = |species: u16| forms.iter().find(|&&(s, _)| s == species).map_or(1, |&(_, forms)| forms);
    for species in 1..=last {
        for form in 0..forms(species) {
            assert!(has(icon(species, form, false)), "{title}: no icon for species {species} form {form}");
            for shiny in [false, true] {
                let key = sprite(species, form, shiny, false);
                assert!(has(key), "{title}: no {key}");
            }
        }
        assert!(!has(icon(species, forms(species), false)), "{title}: species {species} has too many forms");
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
    for species in ONE_LOOK {
        assert!(!has(sprite(species, 0, false, true)), "{title}: species {species} has a female sprite");
    }
    assert!(has(Key::EggIcon), "{title}");
    for image in &extracted.images {
        let size = match image.key {
            Key::Item(_) => (32, 32),
            Key::Sprite { .. } => (128, 128),
            _ => (40, 30),
        };
        assert_eq!((image.width, image.height), size, "{title}: {}", image.key);
    }
    assert!(!has(icon(last + 1, 0, false)), "{title}: has species past {last}");
    let hashes = samples.map(|key| {
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
fn decodes_sun() {
    check(
        SUN,
        Some([
            "401a55fea73a345c0dfd419749ecbc6be2509ae746b30f6058d91d48ff9ad7e7",
            "be4c10b6942d6f803e130c0b839990cb5e15e3414e74373c5e612bdf4d13f507",
            "17a64775cf29da866bf0e2670b663ce56c47b2fc724145d9d1f0faa92140492b",
            "26bc4697fe8e3dab687c36799a8eb6f0ae26d9492d8dc406406bb608f7d538cc",
            "08aac1e84b01872ac914a66cca5266950e4fdd7d49ed3e5064d611068ab93dde",
            "5644d8aacfe84ca2d373fb99f9dcf074b65db5b3d68513285b8bd10361459336",
            "77806e98f5ebe981d78fb93eb749d979a1a725b5cbe6dcbec35cbcee130a8a4b",
            "5a0596f27471d98424437d4926231adc9e247b4dc62368bca592e47654f66944",
            "dbab524bad96b3d50def98a9260d79e039fb1697778d580ec1c66857a7e2dc82",
            "4a9af550d9f6f7f51b0db5f8876773a00e86ceb0f0837a922116f77c98a06d38",
            "f476a9d259a6da79c4d9145e61bd272922049725c207bbea22b1342e2082e04f",
            "639aef2c3dafd3ee10309652758248698946e4e81c8fb88569b92c145c159dc5",
        ]),
    );
}

#[test]
fn decodes_moon() {
    check(MOON, None);
}

#[test]
fn decodes_ultra_sun() {
    check(
        ULTRA_SUN,
        Some([
            "7a2fad1b2dfd77b1a4dedd3a6df414f92075f77bf89834d6b7fd0ea0e13478a6",
            "c9d5b5eb03d1c5ef329e832e66686c16103efe5334af226d20ac525d918a14dd",
            "cf2582db06e1f45740dd60bb7315f58e780b2de33565b25be7270643bc1c5bb4",
            "4a9bc5ece4d7b796ba2be8cab74c505e9a796fbd49c312ce53d8749f2b32b577",
            "08aac1e84b01872ac914a66cca5266950e4fdd7d49ed3e5064d611068ab93dde",
            "81901b19f602924cd00d8a067ee6d0b1f1826b409becfa408b94d90533efbfa2",
            "e212120be7ff5f0e24aea1b34f6ef2906ca88205f008a0b3c5b0068cb631b1a4",
            "5a0596f27471d98424437d4926231adc9e247b4dc62368bca592e47654f66944",
            "dbab524bad96b3d50def98a9260d79e039fb1697778d580ec1c66857a7e2dc82",
            "4a9af550d9f6f7f51b0db5f8876773a00e86ceb0f0837a922116f77c98a06d38",
            "3e32f1806c568c5293bc30b43856b073b2d3ff4d65850e73aaead653d109549c",
            "c8dd3c6c8347e01148f303fed9ce13259d7bdd68fa2df0d0cc38476d1ed40a93",
        ]),
    );
}

#[test]
fn decodes_ultra_moon() {
    check(ULTRA_MOON, None);
}
