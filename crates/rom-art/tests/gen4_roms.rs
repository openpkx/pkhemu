mod common;

use common::{animation_hash, find_rom, rgba_hash};
use rom_art::{extract, Key, Status};

const SAMPLES: [Key; 10] = [
    Key::Sprite { species: 1, form: 0, shiny: false, female: false },
    Key::Sprite { species: 1, form: 0, shiny: true, female: false },
    Key::Sprite { species: 25, form: 0, shiny: false, female: true },
    Key::Sprite { species: 201, form: 1, shiny: false, female: false },
    Key::Sprite { species: 487, form: 1, shiny: false, female: false },
    Key::Egg,
    Key::ManaphyEgg,
    Key::MenuIcon { species: 1, form: 0, female: false },
    Key::EggIcon,
    Key::Item(1),
];

// Giratina's Origin form arrived in Platinum, so Diamond and Pearl sample Shellos's East Sea form instead.
const DIAMOND_PEARL_SAMPLES: [Key; 10] = [
    Key::Sprite { species: 1, form: 0, shiny: false, female: false },
    Key::Sprite { species: 1, form: 0, shiny: true, female: false },
    Key::Sprite { species: 25, form: 0, shiny: false, female: true },
    Key::Sprite { species: 201, form: 1, shiny: false, female: false },
    Key::Sprite { species: 422, form: 1, shiny: false, female: false },
    Key::Egg,
    Key::ManaphyEgg,
    Key::MenuIcon { species: 1, form: 0, female: false },
    Key::EggIcon,
    Key::Item(1),
];

fn check(title: &str, code: &str, revision: u8, golden: Option<[&str; 10]>) {
    check_samples(title, code, revision, SAMPLES, golden);
}

fn check_samples(title: &str, code: &str, revision: u8, samples: [Key; 10], golden: Option<[&str; 10]>) {
    let Some(rom) = find_rom(code, revision) else {
        eprintln!("skipped: needs {title} ({code}, revision {revision}) in data/roms/");
        return;
    };
    let extracted = extract(&rom);
    assert_eq!(extracted.status, Status::Done);
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
fn decodes_heartgold() {
    check(
        "HeartGold",
        "IPKE",
        0,
        Some([
            "5373c4bbaba97a4024e274c6f677bbc852bca368a2de7eb3c98065efcf6813a0",
            "0a83235d672f3ec9cd3ddb7dc87e5e3dabc7802114f030f9fce960cb40c61102",
            "ecb3e6a9dd171068f33fc363e6d166c4f49ffdde6f3518e04cb5fac6a7029897",
            "2a1b90137b2610f47099e82e15bbdc3d91678afeef99463b312c29cd43429759",
            "7116f63e732b129819fa0336e18c0d8f649bcc45b6a37140c948011c1afdd234",
            "7578fe8de36be199934fe25674aab5ea6d00c7b34d950a9bc004d165155fb9c8",
            "9b0286bceb5e48f9e958fd98f05b6681dfbd55614104ef604c8297f5503d3d33",
            "c72415cf875133b30d6e155dde995eda73ef62edac31102d53a056ba6a11ed12",
            "e26636ad696a762348f005f04ab26380418a1c6106f33a18b1488a89038ae28f",
            "75180754bfeb7ef7b953c76eaac54eb4a004e381e5add1fbc643c7d24e726995",
        ]),
    );
}

#[test]
fn decodes_soulsilver() {
    check(
        "SoulSilver",
        "IPGE",
        0,
        Some([
            "5373c4bbaba97a4024e274c6f677bbc852bca368a2de7eb3c98065efcf6813a0",
            "0a83235d672f3ec9cd3ddb7dc87e5e3dabc7802114f030f9fce960cb40c61102",
            "ecb3e6a9dd171068f33fc363e6d166c4f49ffdde6f3518e04cb5fac6a7029897",
            "2a1b90137b2610f47099e82e15bbdc3d91678afeef99463b312c29cd43429759",
            "7116f63e732b129819fa0336e18c0d8f649bcc45b6a37140c948011c1afdd234",
            "7578fe8de36be199934fe25674aab5ea6d00c7b34d950a9bc004d165155fb9c8",
            "9b0286bceb5e48f9e958fd98f05b6681dfbd55614104ef604c8297f5503d3d33",
            "c72415cf875133b30d6e155dde995eda73ef62edac31102d53a056ba6a11ed12",
            "e26636ad696a762348f005f04ab26380418a1c6106f33a18b1488a89038ae28f",
            "75180754bfeb7ef7b953c76eaac54eb4a004e381e5add1fbc643c7d24e726995",
        ]),
    );
}

#[test]
fn decodes_platinum() {
    check(
        "Platinum",
        "CPUE",
        10,
        Some([
            "30b286789819ce0f6ec05de8e11e9d74bb5dbda5f79d7c82b4cb0bf37d72e767",
            "fcb8adb7e9b99046cf8cf28efabebff1ae49af0e0bd85c4a415a4f44852bfffc",
            "fd88bf321a06caa09469e3d87f94214b7f7ac7cc0bf0b29fe20d4455452a9e7c",
            "2a1b90137b2610f47099e82e15bbdc3d91678afeef99463b312c29cd43429759",
            "7116f63e732b129819fa0336e18c0d8f649bcc45b6a37140c948011c1afdd234",
            "7578fe8de36be199934fe25674aab5ea6d00c7b34d950a9bc004d165155fb9c8",
            "9b0286bceb5e48f9e958fd98f05b6681dfbd55614104ef604c8297f5503d3d33",
            "c72415cf875133b30d6e155dde995eda73ef62edac31102d53a056ba6a11ed12",
            "e26636ad696a762348f005f04ab26380418a1c6106f33a18b1488a89038ae28f",
            "75180754bfeb7ef7b953c76eaac54eb4a004e381e5add1fbc643c7d24e726995",
        ]),
    );
}

#[test]
fn decodes_diamond() {
    check_samples(
        "Diamond",
        "ADAE",
        13,
        DIAMOND_PEARL_SAMPLES,
        Some([
            "30b286789819ce0f6ec05de8e11e9d74bb5dbda5f79d7c82b4cb0bf37d72e767",
            "fcb8adb7e9b99046cf8cf28efabebff1ae49af0e0bd85c4a415a4f44852bfffc",
            "2041cf2baa2b5599f3e6d636ba1b0a9550faa891dcfb3f81461d4947d61e31bf",
            "2a1b90137b2610f47099e82e15bbdc3d91678afeef99463b312c29cd43429759",
            "ce06a349ba1fa2b99f7ebe4fe52d73bef6b64dc8379aee0a08dd08abe08dbc17",
            "7578fe8de36be199934fe25674aab5ea6d00c7b34d950a9bc004d165155fb9c8",
            "9b0286bceb5e48f9e958fd98f05b6681dfbd55614104ef604c8297f5503d3d33",
            "c72415cf875133b30d6e155dde995eda73ef62edac31102d53a056ba6a11ed12",
            "e26636ad696a762348f005f04ab26380418a1c6106f33a18b1488a89038ae28f",
            "75180754bfeb7ef7b953c76eaac54eb4a004e381e5add1fbc643c7d24e726995",
        ]),
    );
}

#[test]
fn decodes_pearl() {
    check_samples(
        "Pearl",
        "APAE",
        13,
        DIAMOND_PEARL_SAMPLES,
        Some([
            "30b286789819ce0f6ec05de8e11e9d74bb5dbda5f79d7c82b4cb0bf37d72e767",
            "fcb8adb7e9b99046cf8cf28efabebff1ae49af0e0bd85c4a415a4f44852bfffc",
            "2041cf2baa2b5599f3e6d636ba1b0a9550faa891dcfb3f81461d4947d61e31bf",
            "2a1b90137b2610f47099e82e15bbdc3d91678afeef99463b312c29cd43429759",
            "ce06a349ba1fa2b99f7ebe4fe52d73bef6b64dc8379aee0a08dd08abe08dbc17",
            "7578fe8de36be199934fe25674aab5ea6d00c7b34d950a9bc004d165155fb9c8",
            "9b0286bceb5e48f9e958fd98f05b6681dfbd55614104ef604c8297f5503d3d33",
            "c72415cf875133b30d6e155dde995eda73ef62edac31102d53a056ba6a11ed12",
            "e26636ad696a762348f005f04ab26380418a1c6106f33a18b1488a89038ae28f",
            "75180754bfeb7ef7b953c76eaac54eb4a004e381e5add1fbc643c7d24e726995",
        ]),
    );
}

const fn animated(species: u16, form: u8, shiny: bool, female: bool) -> Key {
    Key::AnimatedSprite { species, form, shiny, female }
}

// Diamond, Pearl and Platinum shift no front step, so their samples end on Charmander, whose steps loop back.
const DIAMOND_PEARL_ANIMATED: [Key; 5] = [
    animated(1, 0, false, false),
    animated(1, 0, true, false),
    animated(25, 0, false, true),
    animated(422, 1, false, false),
    animated(4, 0, false, false),
];

const PLATINUM_ANIMATED: [Key; 5] = [
    animated(1, 0, false, false),
    animated(1, 0, true, false),
    animated(25, 0, false, true),
    animated(487, 1, false, false),
    animated(4, 0, false, false),
];

// Venusaur's step shifts it left.
const HEARTGOLD_SOULSILVER_ANIMATED: [Key; 5] = [
    animated(1, 0, false, false),
    animated(1, 0, true, false),
    animated(25, 0, false, true),
    animated(487, 1, false, false),
    animated(3, 0, false, false),
];

const DIAMOND_PEARL_HASHES: [&str; 5] = [
    "847be8da05fc03c0485fbfb0ee182613d8b0ab8bbc3fc4491188f9b264abcac3",
    "19d8cf7684f22671454b5b6b4e73b6aec522d94fada01aa8aada9c36ca2cfd80",
    "e9f7db7e730a9aa23ae6769fa1ec9b0c7ff62b100bc91ea361fb88c7b0abb42b",
    "fe991f9b7d134c1aa58a22edc3e2157317c78df0572b059a311036a7092e3e01",
    "4053cbeca0b09f4f04b8a0b3f87360a2cc3eff843c897f9d61ffc1eca6e464a3",
];

const PLATINUM_HASHES: [&str; 5] = [
    "80aa8cc4ef4b3076115714c84a94c8f9ce35e42bb8bf06f52594ba8d5a7b2422",
    "c63c9f3184ff7ec22f3fea2c0129ef2eae31f47e9edc92a88a8e18620da3316b",
    "1b982c3341808f434af65971326fbcd36f52036a9df25d3cd812284c7461ff9d",
    "c11353ba631600d35deede521cf138f5cb52b062d8fae043f5f06a68d67073a6",
    "eb6403e2595f27e8dcf3dbbac81b8f460a838ab9c1b630048c58ca8bfbce5fc6",
];

const HEARTGOLD_SOULSILVER_HASHES: [&str; 5] = [
    "ade004084c272ef41f6f8ddbfe67b75371743decc8216ba671669de57b63ce5f",
    "491d8d37b0d5c246cf5c43989d712c396da43fe71fa30b036874d8322a1ac47b",
    "ba3a99e13d913eace06632aee0b8b6f3a3b42bf204bc1cfc52b3c8a9d1fe7c00",
    "c11353ba631600d35deede521cf138f5cb52b062d8fae043f5f06a68d67073a6",
    "4a4627e836708f4de3c36fc1e7c75d2f729360e875b177a64daa3307b3d579d1",
];

fn check_animations(title: &str, code: &str, revision: u8, samples: [Key; 5], golden: [&str; 5]) {
    let Some(rom) = find_rom(code, revision) else {
        eprintln!("skipped: needs {title} ({code}, revision {revision}) in data/roms/");
        return;
    };
    let extracted = extract(&rom);
    let hashes = samples.map(|key| {
        let animation = extracted
            .animations
            .iter()
            .find(|animation| animation.key == key)
            .unwrap_or_else(|| panic!("{title}: no {key}"));
        animation_hash(animation)
    });
    assert_eq!(hashes, golden, "{title}");
}

#[test]
fn animates_diamond() {
    check_animations("Diamond", "ADAE", 13, DIAMOND_PEARL_ANIMATED, DIAMOND_PEARL_HASHES);
}

#[test]
fn animates_pearl() {
    check_animations("Pearl", "APAE", 13, DIAMOND_PEARL_ANIMATED, DIAMOND_PEARL_HASHES);
}

#[test]
fn animates_platinum() {
    check_animations("Platinum", "CPUE", 10, PLATINUM_ANIMATED, PLATINUM_HASHES);
}

#[test]
fn animates_heartgold() {
    check_animations("HeartGold", "IPKE", 0, HEARTGOLD_SOULSILVER_ANIMATED, HEARTGOLD_SOULSILVER_HASHES);
}

#[test]
fn animates_soulsilver() {
    check_animations("SoulSilver", "IPGE", 0, HEARTGOLD_SOULSILVER_ANIMATED, HEARTGOLD_SOULSILVER_HASHES);
}
