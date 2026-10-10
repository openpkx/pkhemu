mod common;

use common::{animation_hash, find_game_boy_rom, rgba_hash};
use rom_art::{extract, Key, Status};

const fn sprite(species: u16, form: u8, shiny: bool) -> Key {
    Key::Sprite { species, form, shiny, female: false }
}

const GEN_1: [Key; 4] = [
    sprite(1, 0, false),
    sprite(25, 0, false),
    sprite(151, 0, false),
    Key::MenuIcon { species: 25, form: 0, female: false },
];

const GEN_2: [Key; 7] = [
    sprite(1, 0, false),
    sprite(25, 0, false),
    sprite(151, 0, false),
    sprite(25, 0, true),
    sprite(201, 1, false),
    Key::Egg,
    Key::MenuIcon { species: 25, form: 0, female: false },
];

fn check<const N: usize>(title: &str, header: &str, checksum: u16, samples: [Key; N], golden: [&str; N]) {
    let Some(rom) = find_game_boy_rom(header, checksum) else {
        eprintln!(
            "skipped: needs {title} ({header}, global checksum {checksum:04X}) in data/roms/ or data/test-folder/"
        );
        return;
    };
    let extracted = extract(&rom);
    assert_eq!(extracted.status, Status::Done, "{title}");
    assert!(!extracted.images.iter().any(|image| matches!(image.key, Key::Item(_))), "{title} has item icons");
    let hashes = samples.map(|key| {
        let image =
            extracted.images.iter().find(|image| image.key == key).unwrap_or_else(|| panic!("{title}: no {key}"));
        rgba_hash(image)
    });
    assert_eq!(hashes, golden, "{title}");
}

#[test]
fn decodes_red() {
    check(
        "Red",
        "POKEMON RED",
        0x91E6,
        GEN_1,
        [
            "a382c1d41e094dc151641e99ec6f688446f56114d17fd8f9b5238f0abab128a3",
            "27a2f4b08a2012651aea780a877faf5658b5b8f3a5098ddfb22c72eb9a53a34d",
            "0eed28be8b35ff8041910bf946fe6ede29ba27a4db0214211413f7a770540cc9",
            "eb23610b32f19571afcd72b06b32868ea9f3b028337dd1652c619139b0bdd35e",
        ],
    );
}

#[test]
fn decodes_blue() {
    check(
        "Blue",
        "POKEMON BLUE",
        0x9D0A,
        GEN_1,
        [
            "a382c1d41e094dc151641e99ec6f688446f56114d17fd8f9b5238f0abab128a3",
            "27a2f4b08a2012651aea780a877faf5658b5b8f3a5098ddfb22c72eb9a53a34d",
            "0eed28be8b35ff8041910bf946fe6ede29ba27a4db0214211413f7a770540cc9",
            "eb23610b32f19571afcd72b06b32868ea9f3b028337dd1652c619139b0bdd35e",
        ],
    );
}

#[test]
fn decodes_yellow() {
    check(
        "Yellow",
        "POKEMON YELLOW",
        0x047C,
        GEN_1,
        [
            "4085ec010d56dcff8a44503e20c14460ed54a1af2ab7a414076c2836d2f0addc",
            "3df27970e45670362127b33401922f9848286efe14a4eeb3bb96384f09b57a9b",
            "9d739dbb8de2eb6e95bcb7606fd98898c8a9a9279c024f0776f329ca073cbcd0",
            "0fbf6f2448a6478f4a9644c8e008c6be966d6a7f411fc30e6bab7235a70cc060",
        ],
    );
}

#[test]
fn decodes_gold() {
    check(
        "Gold",
        "POKEMON_GLDAAUE",
        0x682D,
        GEN_2,
        [
            "9e5d4395ff31f37245ab0e51f94ff5f8efb10d7504030ffb3afba400ad85ca12",
            "757a1bd6f6bce03bd56e699822153f32b47fb00ea6eb7a52c0d52788ad0ef3bc",
            "425cff9d84db17856236e45f25fa9fe19856fb3f9e593e14ff0eedb27a8d6c9c",
            "fd81d9b818ae51f680c0b0527d62fbdccf9d7e789dbd7ad0d7a69a59a13653ad",
            "5f1d399db6d02d88b82b1eae6992cf8cbcf4a065fd68784f1ed9a415df89ae50",
            "0d9565bdca77b0dfaafc603f9fbe2c7522e7bda855d50b3ce41d6b92699197b4",
            "9b3f9e8e4bee3cbcbedca3ff19a5ebbbec5172dec8ffd83157a50789d5b350c9",
        ],
    );
}

#[test]
fn decodes_silver() {
    check(
        "Silver",
        "POKEMON_SLVAAXE",
        0x0DAE,
        GEN_2,
        [
            "327f7c3468eedfb48d347f49b94d3ebf1665641327ae5b15b98867d0b5c502f3",
            "7b52cac0aeee3e9577a9f9a04bf717e52db48a506720af2038ec34cc551530d6",
            "eed4fb731047afd6d522d17107523b2b3e21237fb38ec36869869f70273e7369",
            "271127e4351eac10704ca87d6ab285a38e91a8c0c1659db550814f9ef8b6a2e6",
            "5f1d399db6d02d88b82b1eae6992cf8cbcf4a065fd68784f1ed9a415df89ae50",
            "0d9565bdca77b0dfaafc603f9fbe2c7522e7bda855d50b3ce41d6b92699197b4",
            "9b3f9e8e4bee3cbcbedca3ff19a5ebbbec5172dec8ffd83157a50789d5b350c9",
        ],
    );
}

#[test]
fn decodes_crystal() {
    check(
        "Crystal 1.1",
        "PM_CRYSTAL",
        0x18D2,
        GEN_2,
        [
            "fad137339865f91ea1255b43f5fad602aada82125d41b4d870dc5d8012df7b46",
            "9920fed52b84cd51e46198b139be1e2bbcca521939c93b2265aaa578e9667043",
            "55fd4545c1529becd290c2519a3de316053dce2dc3de6fe53f8a4791611651e9",
            "94a577cd1633c282072878adf4928e7673bad52ba6487e57e4bf95ab34b267ee",
            "864ddc5a9b98b5e7654c5ecd46961ca79fb6017794ffc9270a38616e55c43e44",
            "a01da4e1c205ef1c7946a77910316aa347a9db064d69b1299ab570cddcbf2b09",
            "9b3f9e8e4bee3cbcbedca3ff19a5ebbbec5172dec8ffd83157a50789d5b350c9",
        ],
    );
}

const fn animated(species: u16, form: u8, shiny: bool) -> Key {
    Key::AnimatedSprite { species, form, shiny, female: false }
}

const ANIMATED: [Key; 4] =
    [animated(1, 0, false), animated(1, 0, true), animated(25, 0, false), animated(201, 0, false)];

#[test]
fn animates_crystal() {
    let Some(rom) = find_game_boy_rom("PM_CRYSTAL", 0x18D2) else {
        eprintln!("skipped: needs Crystal 1.1 (PM_CRYSTAL, global checksum 18D2) in data/roms/ or data/test-folder/");
        return;
    };
    let extracted = extract(&rom);
    let hashes = ANIMATED.map(|key| {
        let animation = extracted
            .animations
            .iter()
            .find(|animation| animation.key == key)
            .unwrap_or_else(|| panic!("Crystal: no {key}"));
        animation_hash(animation)
    });
    assert_eq!(
        hashes,
        [
            "eee760615a3d0db23abf706035c2cd9c56fe2f4ab2ef731279ec5439e7939a6c",
            "2ec8175f391849fc7844b83e143ff7018c978b5509907b56d6fd1ebbd7abbd15",
            "7a94eeac5dee8de2af15aae1fccffee7ec3c1abc2e66d1a1e55bc1ca3c63b9ea",
            "590fdfb017f13cbd835e185eb26ed8902ac935d6575b38564a43683748f5746b",
        ]
    );
}

#[test]
fn animates_no_gold_sprite() {
    let Some(rom) = find_game_boy_rom("POKEMON_GLDAAUE", 0x682D) else {
        eprintln!("skipped: needs Gold (POKEMON_GLDAAUE, global checksum 682D) in data/roms/ or data/test-folder/");
        return;
    };
    assert_eq!(extract(&rom).animations, []);
}
