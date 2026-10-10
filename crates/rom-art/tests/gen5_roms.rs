mod common;

use common::{animation_hash, find_rom, find_save, rgba_hash};
use rom_art::{extract_each, AnimatedSprite, Extracted, Key, Status};

const SAMPLES: [Key; 10] = [
    Key::Sprite { species: 1, form: 0, shiny: false, female: false },
    Key::Sprite { species: 1, form: 0, shiny: true, female: false },
    Key::Sprite { species: 25, form: 0, shiny: false, female: true },
    Key::Sprite { species: 487, form: 1, shiny: false, female: false },
    Key::Sprite { species: 493, form: 9, shiny: false, female: false },
    Key::Egg,
    Key::MenuIcon { species: 1, form: 0, female: false },
    Key::MenuIcon { species: 592, form: 0, female: true },
    Key::EggIcon,
    Key::Item(1),
];

const BAG: usize = 0x18400;
// Each pocket's offset in the bag and its number of slots, each slot an item id and a count.
const POCKETS: [(usize, usize); 5] = [(0x000, 310), (0x4D8, 83), (0x624, 109), (0x7D8, 48), (0x898, 64)];

fn bag_items(save: &[u8]) -> Vec<u16> {
    POCKETS
        .iter()
        .flat_map(|&(at, slots)| (0..slots).map(move |k| BAG + at + 4 * k))
        .map(|at| u16::from_le_bytes([save[at], save[at + 1]]))
        .filter(|&id| id != 0)
        .collect()
}

fn check_bag(title: &str, extracted: &Extracted, save: &str) {
    let Some(save) = find_save(save) else {
        eprintln!("skipped: needs a {title} save named {save} in data/saves/");
        return;
    };
    let items = bag_items(&save);
    assert!(!items.is_empty(), "{title}: the bag holds no items");
    for id in items {
        assert!(extracted.images.iter().any(|image| image.key == Key::Item(id)), "{title}: no icon for item {id}");
    }
}

const fn animated(species: u16, form: u8, shiny: bool, female: bool) -> Key {
    Key::AnimatedSprite { species, form, shiny, female }
}

const ANIMATED: [Key; 4] = [
    animated(1, 0, false, false),
    animated(1, 0, true, false),
    animated(25, 0, false, true),
    animated(487, 1, false, false),
];

// The same in every game, though Black 2 and White 2 redrew the female Pikachu's still front.
const ANIMATION_HASHES: [&str; 4] = [
    "00d135db011e3455dd0c4075a6ba027583a1315d18bbf9bafdd64fa1e2cce575",
    "86ff88f979071dc22b5660ec3e01dcf3ebdaf26badfbc916d41d30ceed30f147",
    "40b9aef14caddf3a5e0c6fa3363fe6ee48914cb6c7910a0941498931ca5008f2",
    "400c56c58803b2bfa6f874ca85cd3f7f438c92caaeb531a90a7c2cfde289c841",
];

const SIZE: usize = 96;

fn touches_an_edge(animation: &AnimatedSprite) -> bool {
    let edge = |at: usize| matches!((at % SIZE, at / SIZE), (0 | 95, _) | (_, 0 | 95));
    animation.frames.iter().any(|frame| frame.pixels.iter().enumerate().any(|(at, &pixel)| pixel != 0 && edge(at)))
}

// Keeps only the sample animations' hashes and the plain animations that reach the frame's edge, as all of them
// together take most of a gigabyte.
fn decode(rom: &[u8]) -> (Extracted, Vec<(Key, String)>, Vec<Key>) {
    let (mut hashes, mut clipped) = (Vec::new(), Vec::new());
    let extracted = extract_each(rom, |animation| {
        if ANIMATED.contains(&animation.key) {
            hashes.push((animation.key, animation_hash(&animation)));
        }
        let plain = matches!(animation.key, Key::AnimatedSprite { shiny: false, .. });
        if plain && touches_an_edge(&animation) {
            clipped.push(animation.key);
        }
    });
    (extracted, hashes, clipped)
}

fn check(title: &str, code: &str, revision: u8, save: &str, golden: Option<[&str; 10]>) {
    let Some(rom) = find_rom(code, revision) else {
        eprintln!("skipped: needs {title} ({code}, revision {revision}) in data/roms/");
        return;
    };
    let (extracted, animation_hashes, clipped) = decode(&rom);
    assert_eq!(extracted.status, Status::Done, "{title}");
    let hashes = ANIMATED.map(|key| {
        let found = animation_hashes.iter().find(|(animated, _)| *animated == key);
        found.unwrap_or_else(|| panic!("{title}: no {key}")).1.clone()
    });
    assert_eq!(hashes, ANIMATION_HASHES, "{title}");
    let clipped: Vec<String> = clipped.iter().map(Key::to_string).collect();
    eprintln!("{title}: {} animations reach the frame's edge: {}", clipped.len(), clipped.join(" "));
    let hashes = SAMPLES.map(|key| {
        let image =
            extracted.images.iter().find(|image| image.key == key).unwrap_or_else(|| panic!("{title}: no {key}"));
        rgba_hash(image)
    });
    match golden {
        Some(golden) => assert_eq!(hashes, golden, "{title}"),
        None => eprintln!("{title} decodes, with no golden hashes to compare yet. Commit these: {hashes:#?}"),
    }
    check_bag(title, &extracted, save);
}

#[test]
fn decodes_black() {
    check(
        "Black",
        "IRBO",
        0,
        "black.sav",
        Some([
            "71a3d91baaa72bcb9571175528787fae787f70f8a984722f1c077e9a37a04077",
            "2e99c14e6ca90bfad3d128a94903f14caa11f48c61a8b4c1ae9de98b18304edc",
            "bb475aa90a54077b20ff7ba1d9eb6a92548961a3df852ec5fa3a056cf6884bc2",
            "1d668f5991c169eb46dd6b764f6448a8a90df20a91ad364dd59921fda949773b",
            "ae2b4ea915cb3bcd237fddbac4e2d5ad7e2c41b75093fd2de3411d8b66e8df1d",
            "3d84eb16cbcfd75403ad1e79e8d4ca0eebd9cb22d96de649229a0df134e26dfb",
            "c72415cf875133b30d6e155dde995eda73ef62edac31102d53a056ba6a11ed12",
            "399297293be5a0fe389ce5cb879b7333a850f97db6cf41067bca4f8fd028e787",
            "e26636ad696a762348f005f04ab26380418a1c6106f33a18b1488a89038ae28f",
            "75180754bfeb7ef7b953c76eaac54eb4a004e381e5add1fbc643c7d24e726995",
        ]),
    );
}

#[test]
fn decodes_white() {
    check(
        "White",
        "IRAO",
        0,
        "white.sav",
        Some([
            "71a3d91baaa72bcb9571175528787fae787f70f8a984722f1c077e9a37a04077",
            "2e99c14e6ca90bfad3d128a94903f14caa11f48c61a8b4c1ae9de98b18304edc",
            "bb475aa90a54077b20ff7ba1d9eb6a92548961a3df852ec5fa3a056cf6884bc2",
            "1d668f5991c169eb46dd6b764f6448a8a90df20a91ad364dd59921fda949773b",
            "ae2b4ea915cb3bcd237fddbac4e2d5ad7e2c41b75093fd2de3411d8b66e8df1d",
            "3d84eb16cbcfd75403ad1e79e8d4ca0eebd9cb22d96de649229a0df134e26dfb",
            "c72415cf875133b30d6e155dde995eda73ef62edac31102d53a056ba6a11ed12",
            "399297293be5a0fe389ce5cb879b7333a850f97db6cf41067bca4f8fd028e787",
            "e26636ad696a762348f005f04ab26380418a1c6106f33a18b1488a89038ae28f",
            "75180754bfeb7ef7b953c76eaac54eb4a004e381e5add1fbc643c7d24e726995",
        ]),
    );
}

#[test]
fn decodes_black_2() {
    check(
        "Black 2",
        "IREO",
        0,
        "black2.sav",
        Some([
            "71a3d91baaa72bcb9571175528787fae787f70f8a984722f1c077e9a37a04077",
            "2e99c14e6ca90bfad3d128a94903f14caa11f48c61a8b4c1ae9de98b18304edc",
            "8059734fe6e5e3a0ce8ced5d5809e5781413505a28565a5a0d306b87722dba7c",
            "1d668f5991c169eb46dd6b764f6448a8a90df20a91ad364dd59921fda949773b",
            "ae2b4ea915cb3bcd237fddbac4e2d5ad7e2c41b75093fd2de3411d8b66e8df1d",
            "3d84eb16cbcfd75403ad1e79e8d4ca0eebd9cb22d96de649229a0df134e26dfb",
            "c72415cf875133b30d6e155dde995eda73ef62edac31102d53a056ba6a11ed12",
            "399297293be5a0fe389ce5cb879b7333a850f97db6cf41067bca4f8fd028e787",
            "2f683cf9a4d2a00aa06532c3436432ebcc99faed205cfe47bca2435d3566a7c6",
            "75180754bfeb7ef7b953c76eaac54eb4a004e381e5add1fbc643c7d24e726995",
        ]),
    );
}

#[test]
fn decodes_white_2() {
    check(
        "White 2",
        "IRDO",
        0,
        "white2.sav",
        Some([
            "71a3d91baaa72bcb9571175528787fae787f70f8a984722f1c077e9a37a04077",
            "2e99c14e6ca90bfad3d128a94903f14caa11f48c61a8b4c1ae9de98b18304edc",
            "8059734fe6e5e3a0ce8ced5d5809e5781413505a28565a5a0d306b87722dba7c",
            "1d668f5991c169eb46dd6b764f6448a8a90df20a91ad364dd59921fda949773b",
            "ae2b4ea915cb3bcd237fddbac4e2d5ad7e2c41b75093fd2de3411d8b66e8df1d",
            "3d84eb16cbcfd75403ad1e79e8d4ca0eebd9cb22d96de649229a0df134e26dfb",
            "c72415cf875133b30d6e155dde995eda73ef62edac31102d53a056ba6a11ed12",
            "399297293be5a0fe389ce5cb879b7333a850f97db6cf41067bca4f8fd028e787",
            "2f683cf9a4d2a00aa06532c3436432ebcc99faed205cfe47bca2435d3566a7c6",
            "75180754bfeb7ef7b953c76eaac54eb4a004e381e5add1fbc643c7d24e726995",
        ]),
    );
}
