mod common;

use common::{animation_hash, find_hack, find_rom, find_save, rgba_hash};
use rom_art::{extract, Extracted, Key, Status};

const SAMPLES: [Key; 6] = [
    Key::Sprite { species: 1, form: 0, shiny: false, female: false },
    Key::Sprite { species: 25, form: 0, shiny: false, female: false },
    Key::Sprite { species: 25, form: 0, shiny: true, female: false },
    Key::Sprite { species: 201, form: 1, shiny: false, female: false },
    Key::Egg,
    Key::MenuIcon { species: 25, form: 0, female: false },
];

fn compare<const N: usize>(title: &str, extracted: &Extracted, keys: [Key; N], golden: Option<[&str; N]>) {
    let hashes = keys.map(|key| {
        let image =
            extracted.images.iter().find(|image| image.key == key).unwrap_or_else(|| panic!("{title}: no {key}"));
        rgba_hash(image)
    });
    match golden {
        Some(golden) => assert_eq!(hashes, golden, "{title}"),
        None => eprintln!("{title} decodes, with no golden hashes to compare yet. Commit these: {hashes:#?}"),
    }
}

fn check(title: &str, code: &str, revision: u8, golden: Option<[&str; 6]>) {
    let Some(rom) = find_rom(code, revision) else {
        eprintln!("skipped: needs {title} ({code}, revision {revision}) in data/roms/ or data/test-folder/");
        return;
    };
    let extracted = extract(&rom);
    assert_eq!(extracted.status, Status::Done);
    compare(title, &extracted, SAMPLES, golden);
}

#[test]
fn decodes_firered() {
    check(
        "FireRed",
        "BPRE",
        1,
        Some([
            "517a83ac5eb4641ff165cd573b729ccdb6cb87a7045c5b9ad50ad4c0d9bbbf83",
            "6dd848bbfc9f282b9f1b8aecb04fdf0f1a9435cf830d7815e66f6af21f38aaac",
            "260ff19349145238d26e30ef8a815608f77592c1486d6c81852126d9ed060cc9",
            "f14a787cb61f4ab243c723a054424b36c70cfe7f48a517f60c239ca4f190b015",
            "1bbed86605400179bca49c35d23005e45d9c7388750b1661bad61e39d5ab98f7",
            "2b57ac5d3e49c563cb9b1f92a4f2e1bbbcc7d5c5b8a01a8473001f050e9631a1",
        ]),
    );
}

#[test]
fn decodes_emerald() {
    check(
        "Emerald",
        "BPEE",
        0,
        Some([
            "e8d03b802745d43c08baa11587cc437c25b29a59a9c702f3a617795d0eeaf5bf",
            "6dd848bbfc9f282b9f1b8aecb04fdf0f1a9435cf830d7815e66f6af21f38aaac",
            "2c34843c2dc4b6b7467d01ff973bfeacaaa1a8e9e33f255219a43a1404f59b91",
            "f14a787cb61f4ab243c723a054424b36c70cfe7f48a517f60c239ca4f190b015",
            "1bbed86605400179bca49c35d23005e45d9c7388750b1661bad61e39d5ab98f7",
            "2b57ac5d3e49c563cb9b1f92a4f2e1bbbcc7d5c5b8a01a8473001f050e9631a1",
        ]),
    );
}

const ANIMATED: [Key; 3] = [
    Key::AnimatedSprite { species: 1, form: 0, shiny: false, female: false },
    Key::AnimatedSprite { species: 1, form: 0, shiny: true, female: false },
    // Pikachu shows its second frame twice.
    Key::AnimatedSprite { species: 25, form: 0, shiny: false, female: false },
];

fn animation_hashes<const N: usize>(title: &str, extracted: &Extracted, keys: [Key; N]) -> [String; N] {
    keys.map(|key| {
        let animation = extracted
            .animations
            .iter()
            .find(|animation| animation.key == key)
            .unwrap_or_else(|| panic!("{title}: no {key}"));
        animation_hash(animation)
    })
}

#[test]
fn animates_emerald() {
    let Some(rom) = find_rom("BPEE", 0) else {
        eprintln!("skipped: needs Emerald (BPEE, revision 0) in data/roms/ or data/test-folder/");
        return;
    };
    let extracted = extract(&rom);
    assert_eq!(
        animation_hashes("Emerald", &extracted, ANIMATED),
        [
            "f4288d2352068cbc99a900b9117c73d6094638e25121ee3f10b24f4f2cbe0cc0",
            "6f522dac7df3305e03311d412c1b9db172ab5839151da3039acf8aaef002346e",
            "f44fe3c0e1bac00a5dce7c14357811249226c2e243e792a0445e69b60b4ad493",
        ]
    );
}

#[test]
fn animates_no_firered_sprite() {
    let Some(rom) = find_rom("BPRE", 1) else {
        eprintln!("skipped: needs FireRed (BPRE, revision 1) in data/roms/ or data/test-folder/");
        return;
    };
    assert_eq!(extract(&rom).animations, []);
}

const ITEMS: [Key; 3] = [Key::Item(4), Key::Item(13), Key::Item(139)];

struct StoredItems {
    save: &'static str,
    pockets: &'static [(usize, usize)],
}

const FIRERED_STORED: StoredItems = StoredItems {
    save: "firered.sav",
    pockets: &[(0x298, 30), (0x310, 42), (0x3B8, 30), (0x430, 13), (0x464, 58), (0x54C, 43)],
};
const EMERALD_STORED: StoredItems = StoredItems {
    save: "emerald.sav",
    pockets: &[(0x498, 50), (0x560, 30), (0x5D8, 30), (0x650, 16), (0x690, 64), (0x790, 46)],
};

const SECTION: usize = 0x1000;
const SLOT: usize = 14 * SECTION;

fn u16_at(bytes: &[u8], at: usize) -> u16 {
    u16::from_le_bytes([bytes[at], bytes[at + 1]])
}

fn u32_at(bytes: &[u8], at: usize) -> u32 {
    u32::from_le_bytes(bytes[at..at + 4].try_into().unwrap())
}

// Reads the item ids in the PC and every bag pocket from the newer of the save's two slots.
fn stored_items(save: &[u8], stored: &StoredItems) -> Vec<u16> {
    let slot = (0..2).map(|n| &save[n * SLOT..(n + 1) * SLOT]).max_by_key(|slot| u32_at(slot, 0xFFC)).unwrap();
    let section = slot.chunks(SECTION).find(|section| u16_at(section, 0xFF4) == 1).unwrap();
    stored.pockets
        .iter()
        .flat_map(|&(at, slots)| (0..slots).map(move |k| u16_at(section, at + 4 * k)))
        .filter(|&id| id != 0)
        .collect()
}

fn check_items(title: &str, code: &str, revision: u8, golden: Option<[&str; 3]>, stored: StoredItems) {
    let Some(rom) = find_rom(code, revision) else {
        eprintln!("skipped: needs {title} ({code}, revision {revision}) in data/roms/ or data/test-folder/");
        return;
    };
    let extracted = extract(&rom);
    compare(title, &extracted, ITEMS, golden);
    let Some(save) = find_save(stored.save) else {
        eprintln!("skipped: needs a {title} save named {} in data/saves/", stored.save);
        return;
    };
    let items = stored_items(&save, &stored);
    assert!(!items.is_empty(), "{title}: the save stores no items");
    for id in items {
        assert!(extracted.images.iter().any(|image| image.key == Key::Item(id)), "{title}: no icon for item {id}");
    }
}

#[test]
fn decodes_firered_item_icons() {
    check_items(
        "FireRed",
        "BPRE",
        1,
        Some([
            "4c9d19e2308ff4e30f781b7d7174b9b5b18a728061b025f9985cfa5d898045e8",
            "db87ae6b02576e7df2778f7bf546cd771a3b348de31db4b63cb7281bac9d979f",
            "744e1308c7449939b719c86585c7db0c279d694fe991aa0d6b3aca5245acf48c",
        ]),
        FIRERED_STORED,
    );
}

#[test]
fn decodes_emerald_item_icons() {
    check_items(
        "Emerald",
        "BPEE",
        0,
        Some([
            "4c9d19e2308ff4e30f781b7d7174b9b5b18a728061b025f9985cfa5d898045e8",
            "db87ae6b02576e7df2778f7bf546cd771a3b348de31db4b63cb7281bac9d979f",
            "744e1308c7449939b719c86585c7db0c279d694fe991aa0d6b3aca5245acf48c",
        ]),
        EMERALD_STORED,
    );
}

#[test]
fn decodes_leafgreen() {
    check("LeafGreen", "BPGE", 1, None);
}

#[test]
fn decodes_ruby() {
    check(
        "Ruby",
        "AXVE",
        1,
        Some([
            "e8d03b802745d43c08baa11587cc437c25b29a59a9c702f3a617795d0eeaf5bf",
            "6dd848bbfc9f282b9f1b8aecb04fdf0f1a9435cf830d7815e66f6af21f38aaac",
            "2c34843c2dc4b6b7467d01ff973bfeacaaa1a8e9e33f255219a43a1404f59b91",
            "f14a787cb61f4ab243c723a054424b36c70cfe7f48a517f60c239ca4f190b015",
            "1bbed86605400179bca49c35d23005e45d9c7388750b1661bad61e39d5ab98f7",
            "2b57ac5d3e49c563cb9b1f92a4f2e1bbbcc7d5c5b8a01a8473001f050e9631a1",
        ]),
    );
}

#[test]
fn decodes_sapphire() {
    check(
        "Sapphire",
        "AXPE",
        2,
        Some([
            "e8d03b802745d43c08baa11587cc437c25b29a59a9c702f3a617795d0eeaf5bf",
            "6dd848bbfc9f282b9f1b8aecb04fdf0f1a9435cf830d7815e66f6af21f38aaac",
            "2c34843c2dc4b6b7467d01ff973bfeacaaa1a8e9e33f255219a43a1404f59b91",
            "f14a787cb61f4ab243c723a054424b36c70cfe7f48a517f60c239ca4f190b015",
            "1bbed86605400179bca49c35d23005e45d9c7388750b1661bad61e39d5ab98f7",
            "2b57ac5d3e49c563cb9b1f92a4f2e1bbbcc7d5c5b8a01a8473001f050e9631a1",
        ]),
    );
}

fn check_hack(hack: &str, code: &str, samples: [Key; 4], golden: [&str; 4]) {
    let Some(rom) = find_hack(code, hack) else {
        eprintln!("skipped: needs {hack} ({code} with {hack} in its text) in data/roms/ or data/test-folder/");
        return;
    };
    let extracted = extract(&rom);
    assert!(matches!(extracted.status, Status::Done | Status::Partial), "{hack}: {:?}", extracted.status);
    let hashes = samples.map(|key| {
        let image =
            extracted.images.iter().find(|image| image.key == key).unwrap_or_else(|| panic!("{hack}: no {key}"));
        rgba_hash(image)
    });
    assert_eq!(hashes, golden, "{hack}");
}

#[test]
fn decodes_unbound() {
    check_hack(
        "Unbound",
        "BPRE",
        [
            Key::Sprite { species: 25, form: 0, shiny: false, female: false },
            Key::MenuIcon { species: 25, form: 0, female: false },
            // Alolan Rattata and Shadow Warrior.
            Key::IndexSprite { index: 1020, shiny: false },
            Key::IndexSprite { index: 706, shiny: false },
        ],
        [
            "c034091d2bd59288f7c86bc457f90cf717640e8c2f13976aa2fe308aec7d51d3",
            "78ea1111b58e72844d37f1f60407b71e0c0b1657ab91c03c72189e06dd7e4cf7",
            "eb2b188c2e812e07d671799daa712284db8fa069869f407be9e4607cb480ede4",
            "e6d2eb4d8484b829b1080f15535508c30a11870b683eac83d4d1747bc6921bc5",
        ],
    );
}

#[test]
fn decodes_unbound_item_icons() {
    check_hack(
        "Unbound",
        "BPRE",
        // Iron Plate's palette has the wrong LZ77 type byte, and 707 lies past FireRed's last item.
        [Key::Item(4), Key::Item(13), Key::Item(503), Key::Item(707)],
        [
            "4c9d19e2308ff4e30f781b7d7174b9b5b18a728061b025f9985cfa5d898045e8",
            "db87ae6b02576e7df2778f7bf546cd771a3b348de31db4b63cb7281bac9d979f",
            "8603de7603788bf5e26a28002b0a971a6a71479b7c2bc5efba07993599c9c42c",
            "d1655a549bdbf068926d730100cf5c4c3f13405354da7543fa48a34a539e0fa7",
        ],
    );
}

#[test]
fn decodes_emerald_imperium() {
    check_hack(
        "Imperium",
        "BPEE",
        [
            Key::Sprite { species: 25, form: 0, shiny: false, female: false },
            Key::MenuIcon { species: 25, form: 0, female: false },
            Key::Sprite { species: 19, form: 1, shiny: false, female: false },
            Key::Sprite { species: 52, form: 2, shiny: true, female: false },
        ],
        [
            "730619ef32bfe1ce2a5d13571d966e1365ff3e007230f7e77e35fb49f5f14c17",
            "78ea1111b58e72844d37f1f60407b71e0c0b1657ab91c03c72189e06dd7e4cf7",
            "312290970cf383505f4c474d6b5499ebf835cf64e93dc7984a238ad153e0190b",
            "b25a042ad60f93d53f9d1d9532562a8ba91f6270fb1e99ad2322bd7beb8d8aa1",
        ],
    );
}

#[test]
fn animates_emerald_imperium() {
    let Some(rom) = find_hack("BPEE", "Imperium") else {
        eprintln!("skipped: needs Imperium (BPEE with Imperium in its text) in data/roms/ or data/test-folder/");
        return;
    };
    let pikachu = Key::AnimatedSprite { species: 25, form: 0, shiny: false, female: false };
    assert_eq!(
        animation_hashes("Imperium", &extract(&rom), [pikachu]),
        ["66b592fd637753155cbb7bf3c69999c34069ce8e8e828835ca094222e36e95bc"]
    );
}

#[test]
fn decodes_emerald_imperium_item_icons() {
    let Some(rom) = find_hack("BPEE", "Imperium") else {
        eprintln!("skipped: needs Imperium (BPEE with Imperium in its text) in data/roms/ or data/test-folder/");
        return;
    };
    let extracted = extract(&rom);
    assert!(extracted.images.iter().all(|image| image.key != Key::Item(582)), "Imperium: icon for a TM");
    // Item 933's palette is shorter than 16 colours.
    compare(
        "Imperium",
        &extracted,
        [Key::Item(1), Key::Item(13), Key::Item(30), Key::Item(933)],
        Some([
            "4c9d19e2308ff4e30f781b7d7174b9b5b18a728061b025f9985cfa5d898045e8",
            "2409b7d0b6b8779c094c2cabdc42244cf44f1e3fb77fe463edf1548a7514e20c",
            "70c9304d769cb0eae0e837498bd4e951db987f5d0cebebf59b881bd2ee4d63c4",
            "037ce302f92ae522750ae2c0c8277701e27416a6d3852f0bc7e829f3eb2bdf6a",
        ]),
    );
}
