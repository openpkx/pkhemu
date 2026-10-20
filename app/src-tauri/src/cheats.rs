use crate::emu::{Command, Emu};
use crate::games_folder::GamesFolder;
use crate::rom::{self, Rom, System};
use serde::{Deserialize, Serialize};
use std::path::Path;
use tauri::{AppHandle, Runtime, State};
use tokio::sync::{oneshot, Mutex};

static CHANGING: Mutex<()> = Mutex::const_new(());

#[derive(Clone, Copy, Debug, PartialEq)]
pub enum Platform {
    Gb,
    Gba,
    Ds,
    N64,
    ThreeDs,
    GameCube,
}

impl Platform {
    pub fn of_rom(rom: &Rom) -> Platform {
        match rom.system() {
            System::Gb => Platform::Gb,
            System::Gba => Platform::Gba,
            System::Ds => Platform::Ds,
            System::N64 => Platform::N64,
            System::ThreeDs => Platform::ThreeDs,
            System::GameCube => Platform::GameCube,
        }
    }

    // An archived ROM's system comes from the folder it sits in, so listing codes doesn't unpack it.
    pub fn of_path(path: &str) -> Result<Platform, String> {
        let extension = Path::new(path).extension().and_then(|e| e.to_str()).unwrap_or_default().to_ascii_lowercase();
        let system = match extension.as_str() {
            "zip" | "7z" => path.split('/').next().unwrap_or_default().to_ascii_lowercase(),
            _ => extension,
        };
        match system.as_str() {
            "gb" | "gbc" => Ok(Platform::Gb),
            "gba" => Ok(Platform::Gba),
            "nds" => Ok(Platform::Ds),
            "n64" | "z64" | "v64" => Ok(Platform::N64),
            system if rom::THREE_DS_EXTENSIONS.contains(&system) => Ok(Platform::ThreeDs),
            system if rom::GAMECUBE_EXTENSIONS.contains(&system) => Ok(Platform::GameCube),
            "gc" => Err(rom::zipped_disc(&Path::new(path).file_name().unwrap_or_default().to_string_lossy())),
            _ => Err(format!("{path} isn't a game")),
        }
    }
}

impl From<Platform> for System {
    fn from(platform: Platform) -> System {
        match platform {
            Platform::Gb => System::Gb,
            Platform::Gba => System::Gba,
            Platform::Ds => System::Ds,
            Platform::N64 => System::N64,
            Platform::ThreeDs => System::ThreeDs,
            Platform::GameCube => System::GameCube,
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Code {
    pub id: String,
    pub name: String,
    pub code: String,
    pub on: bool,
    pub modified: i64,
}

#[derive(Serialize, Deserialize, Default)]
struct File {
    codes: Vec<Code>,
}

#[derive(Serialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Listed {
    #[serde(flatten)]
    code: Code,
    problem: Option<String>,
}

fn hex(text: &str) -> bool {
    text.bytes().all(|b| b.is_ascii_hexdigit())
}

fn tokens(text: &str, separator: impl Fn(char) -> bool) -> impl Iterator<Item = &str> {
    text.split(separator).filter(|token| !token.is_empty())
}

fn line_break(c: char) -> bool {
    c.is_whitespace() || c == '+'
}

fn address_value_lines(
    text: &str,
    value_lengths: &[usize],
    wrong: impl Fn(&str) -> String,
) -> Result<Vec<String>, String> {
    let mut tokens = tokens(text, line_break);
    let mut lines = Vec::new();
    while let Some(address) = tokens.next() {
        if address.len() != 8 || !hex(address) {
            return Err(wrong(address));
        }
        let value = tokens.next().ok_or_else(|| format!("{address} needs a value after it."))?;
        if !value_lengths.contains(&value.len()) || !hex(value) {
            return Err(wrong(value));
        }
        lines.push(format!("{address} {value}"));
    }
    Ok(lines)
}

// mGBA's libretro layer cuts GBA codes into 13- or 17-character lines and drops anything else.
fn gba_lines(text: &str) -> Result<Vec<String>, String> {
    address_value_lines(text, &[4, 8], |token| match token.contains(':') {
        true => format!("{token} is a VBA code. Use a GameShark, Action Replay or CodeBreaker code."),
        false => format!("{token} isn't part of a GameShark, Action Replay or CodeBreaker code."),
    })
}

// The shapes gb/cheats.c reads: GameShark, CodeBreaker, VBA and Game Genie.
fn gb_line(token: &str) -> Option<String> {
    if !token.is_ascii() {
        return None;
    }
    let at = |i: usize| token.as_bytes()[i];
    match token.len() {
        8 if hex(token) => Some(token.into()),
        9 if hex(&token[..6]) && at(6) == b'-' && hex(&token[7..]) => Some(token.into()),
        // mGBA reads a VBA line's value from its address, so the core gets the GameShark line for the same write.
        7 if hex(&token[..4]) && at(4) == b':' && hex(&token[5..]) => {
            Some(format!("01{}{}{}", &token[5..], &token[2..4], &token[..2]))
        }
        7 if hex(&token[..3]) && at(3) == b'-' && hex(&token[4..]) => Some(token.into()),
        11 if hex(&token[..3]) && at(3) == b'-' && hex(&token[4..7]) && at(7) == b'-' && hex(&token[8..]) => {
            Some(token.into())
        }
        _ => None,
    }
}

fn gb_lines(text: &str) -> Result<Vec<String>, String> {
    tokens(text, line_break)
        .map(|token| {
            gb_line(token).ok_or_else(|| format!("{token} isn't a GameShark, Game Genie, CodeBreaker or VBA code."))
        })
        .collect()
}

// melonDS DS takes runs of 8 hex digits split by spaces, + or -, and its engine reads them two at a time.
fn ds_lines(text: &str) -> Result<Vec<String>, String> {
    let mut words = Vec::new();
    for token in tokens(text, |c| line_break(c) || c == '-') {
        if !token.len().is_multiple_of(8) || !hex(token) {
            return Err(format!("{token} isn't part of an Action Replay DS code."));
        }
        words.extend(token.as_bytes().chunks(8).map(|word| String::from_utf8_lossy(word).into_owned()));
    }
    if words.len() % 2 == 1 {
        return Err("Action Replay DS lines have two 8-digit numbers, and the last one has only one.".into());
    }
    Ok(words.chunks(2).map(|pair| pair.join(" ")).collect())
}

fn n64_lines(text: &str) -> Result<Vec<String>, String> {
    address_value_lines(text, &[4], |token| format!("{token} isn't part of a GameShark code."))
}

/// The code as the core takes it, one line after another, or why the core can't read it.
pub fn check(platform: Platform, text: &str) -> Result<String, String> {
    let text = text.to_ascii_uppercase();
    let lines = match platform {
        Platform::Gb => gb_lines(&text),
        Platform::Gba => gba_lines(&text),
        Platform::Ds => ds_lines(&text),
        Platform::N64 => n64_lines(&text),
        Platform::ThreeDs => Err("3DS games don't take cheats yet.".into()),
        Platform::GameCube => Err("GameCube games don't take cheats yet.".into()),
    }?;
    if lines.is_empty() {
        return Err("Enter a code.".into());
    }
    Ok(lines.join("+"))
}

pub fn on_codes(platform: Platform, codes: &[Code]) -> Vec<String> {
    codes.iter().filter(|code| code.on).filter_map(|code| check(platform, &code.code).ok()).collect()
}

pub fn listed(platform: Platform, codes: Vec<Code>) -> Vec<Listed> {
    codes
        .into_iter()
        .map(|code| {
            let problem = check(platform, &code.code).err();
            Listed { code: Code { on: code.on && problem.is_none(), ..code }, problem }
        })
        .collect()
}

fn name_or_default(codes: &[Code], name: &str, except: Option<&str>) -> String {
    let name = name.trim();
    if !name.is_empty() {
        return name.into();
    }
    let taken = |name: &str| codes.iter().any(|code| code.name == name && Some(code.id.as_str()) != except);
    (1..).map(|n| format!("Code {n}")).find(|name| !taken(name)).unwrap()
}

fn find<'a>(codes: &'a mut [Code], id: &str) -> Result<&'a mut Code, String> {
    codes.iter_mut().find(|code| code.id == id).ok_or_else(|| "That code is gone.".into())
}

pub fn add(codes: &mut Vec<Code>, platform: Platform, name: &str, code: &str, at: i64) {
    let name = name_or_default(codes, name, None);
    let on = check(platform, code).is_ok();
    codes.push(Code { id: uuid::Uuid::new_v4().to_string(), name, code: code.into(), on, modified: at });
}

pub fn edit(codes: &mut [Code], platform: Platform, id: &str, name: &str, text: &str, at: i64) -> Result<(), String> {
    let name = name_or_default(codes, name, Some(id));
    let code = find(codes, id)?;
    code.name = name;
    code.code = text.into();
    code.on = code.on && check(platform, text).is_ok();
    code.modified = at;
    Ok(())
}

pub fn delete(codes: &mut Vec<Code>, id: &str) -> Result<(), String> {
    find(codes, id)?;
    codes.retain(|code| code.id != id);
    Ok(())
}

pub fn toggle(codes: &mut [Code], platform: Platform, id: &str, on: bool, at: i64) -> Result<(), String> {
    let code = find(codes, id)?;
    if on {
        check(platform, &code.code)?;
    }
    code.on = on;
    code.modified = at;
    Ok(())
}

/// Order follows `device`, with codes new from the cloud at the end.
pub fn merge(device: Vec<Code>, cloud: Vec<Code>, base: &[Code]) -> Vec<Code> {
    let mut cloud: Vec<Option<Code>> = cloud.into_iter().map(Some).collect();
    let mut merged = Vec::new();
    let base_of = |id: &str| base.iter().find(|code| code.id == id);
    for mine in device {
        let base = base_of(&mine.id);
        let theirs = cloud.iter_mut().find(|code| code.as_ref().is_some_and(|code| code.id == mine.id));
        match theirs.and_then(Option::take) {
            Some(theirs) if Some(&mine) == base => merged.push(theirs),
            Some(theirs) if Some(&theirs) == base || mine.modified >= theirs.modified => merged.push(mine),
            Some(theirs) => merged.push(theirs),
            None if Some(&mine) == base => {}
            None => merged.push(mine),
        }
    }
    for theirs in cloud.into_iter().flatten() {
        if base_of(&theirs.id) != Some(&theirs) {
            merged.push(theirs);
        }
    }
    merged
}

pub fn path(rom: &str) -> String {
    format!("{}/cheats.json", rom::data_dir(rom))
}

pub fn parse(json: &[u8]) -> Result<Vec<Code>, String> {
    serde_json::from_slice::<File>(json).map(|file| file.codes).map_err(|e| e.to_string())
}

pub fn to_json(codes: Vec<Code>) -> Vec<u8> {
    serde_json::to_vec_pretty(&File { codes }).expect("codes serialize")
}

pub async fn read<R: Runtime>(folder: &GamesFolder<'_, R>, rom: &str) -> Result<Vec<Code>, String> {
    let path = path(rom);
    match folder.read(&path).await {
        Ok(file) => parse(&file).map_err(|e| format!("{path}: {e}")),
        Err(_) if !folder.has_file(&path).await => Ok(Vec::new()),
        Err(e) => Err(format!("{path}: {e}")),
    }
}

async fn write<R: Runtime>(folder: &GamesFolder<'_, R>, rom: &str, codes: Vec<Code>) -> Result<(), String> {
    let path = path(rom);
    folder.write(&path, &to_json(codes)).await.map_err(|e| format!("{path}: {e}"))
}

pub async fn update<R: Runtime>(
    folder: &GamesFolder<'_, R>,
    rom: &str,
    change: impl FnOnce(&mut Vec<Code>, Platform) -> Result<(), String>,
) -> Result<Vec<Code>, String> {
    let platform = Platform::of_path(rom)?;
    let _changing = CHANGING.lock().await;
    let mut codes = read(folder, rom).await?;
    change(&mut codes, platform)?;
    write(folder, rom, codes.clone()).await?;
    Ok(codes)
}

pub async fn apply(emu: &Emu, rom: &str, codes: Vec<Code>) -> Result<(), String> {
    let (done, applied) = oneshot::channel();
    emu.send(Command::SetCheats { path: rom.into(), codes, done });
    applied.await.map_err(|e| e.to_string())
}

async fn update_and_apply<R: Runtime>(
    app: AppHandle<R>,
    emu: State<'_, Emu>,
    folder: String,
    path: String,
    change: impl FnOnce(&mut Vec<Code>, Platform) -> Result<(), String>,
) -> Result<Vec<Listed>, String> {
    let codes = update(&GamesFolder::open(&app, &folder), &path, change).await?;
    apply(&emu, &path, codes.clone()).await?;
    Ok(listed(Platform::of_path(&path)?, codes))
}

#[tauri::command]
pub async fn list_cheats<R: Runtime>(app: AppHandle<R>, folder: String, path: String) -> Result<Vec<Listed>, String> {
    let codes = read(&GamesFolder::open(&app, &folder), &path).await?;
    Ok(listed(Platform::of_path(&path)?, codes))
}

#[tauri::command]
pub async fn add_cheat<R: Runtime>(
    app: AppHandle<R>,
    emu: State<'_, Emu>,
    folder: String,
    path: String,
    name: String,
    code: String,
) -> Result<Vec<Listed>, String> {
    update_and_apply(app, emu, folder, path, |codes, platform| {
        add(codes, platform, &name, &code, crate::index::now());
        Ok(())
    })
    .await
}

#[tauri::command]
pub async fn edit_cheat<R: Runtime>(
    app: AppHandle<R>,
    emu: State<'_, Emu>,
    folder: String,
    path: String,
    id: String,
    name: String,
    code: String,
) -> Result<Vec<Listed>, String> {
    update_and_apply(app, emu, folder, path, |codes, platform| edit(codes, platform, &id, &name, &code, crate::index::now()))
        .await
}

#[tauri::command]
pub async fn delete_cheat<R: Runtime>(
    app: AppHandle<R>,
    emu: State<'_, Emu>,
    folder: String,
    path: String,
    id: String,
) -> Result<Vec<Listed>, String> {
    update_and_apply(app, emu, folder, path, |codes, _| delete(codes, &id)).await
}

#[tauri::command]
pub async fn toggle_cheat<R: Runtime>(
    app: AppHandle<R>,
    emu: State<'_, Emu>,
    folder: String,
    path: String,
    id: String,
    on: bool,
) -> Result<Vec<Listed>, String> {
    update_and_apply(app, emu, folder, path, |codes, platform| toggle(codes, platform, &id, on, crate::index::now())).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use tauri::async_runtime::block_on;

    fn temp_folder(name: &str) -> GamesFolder<'static, tauri::Wry> {
        let root = std::env::temp_dir().join(format!("pkh-emu-cheats-{name}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        std::fs::create_dir_all(&root).unwrap();
        GamesFolder::at(root)
    }

    const EMERALD: &str = "gba/Emerald.gba";

    fn changed(
        folder: &GamesFolder<'static, tauri::Wry>,
        change: impl FnOnce(&mut Vec<Code>, Platform) -> Result<(), String>,
    ) -> Vec<Code> {
        block_on(update(folder, EMERALD, change)).unwrap()
    }

    fn stored(folder: &GamesFolder<'static, tauri::Wry>) -> Vec<Code> {
        block_on(read(folder, EMERALD)).unwrap()
    }

    #[test]
    fn a_game_without_cheats_json_has_no_codes() {
        assert_eq!(stored(&temp_folder("none")), []);
    }

    #[test]
    fn adds_edits_and_deletes_codes_in_cheats_json() {
        let folder = temp_folder("round-trip");

        let added = changed(&folder, |codes, platform| {
            add(codes, platform, " ", "82025840 0001", 1_000);
            add(codes, platform, "Walk through walls", "62025840 0001", 1_000);
            Ok(())
        });
        assert_eq!(stored(&folder), added);
        assert_eq!(added.iter().map(|code| code.name.as_str()).collect::<Vec<_>>(), ["Code 1", "Walk through walls"]);
        assert_ne!(added[0].id, added[1].id);
        assert!(block_on(folder.has_file("gba/Emerald/cheats.json")));

        let id = added[0].id.clone();
        changed(&folder, |codes, platform| edit(codes, platform, &id, "Rare candies", "82025840 0063", 2_000));
        let edited = stored(&folder);
        assert_eq!(
            (edited[0].name.as_str(), edited[0].code.as_str(), edited[0].modified),
            ("Rare candies", "82025840 0063", 2_000)
        );

        changed(&folder, |codes, _| delete(codes, &id));
        assert_eq!(stored(&folder).iter().map(|code| code.name.as_str()).collect::<Vec<_>>(), ["Walk through walls"]);
    }

    #[test]
    fn names_a_blank_code_by_the_first_free_number() {
        let mut codes = Vec::new();
        for _ in 0..3 {
            add(&mut codes, Platform::Gba, "", "82025840 0001", 0);
        }
        let first = codes[0].id.clone();
        delete(&mut codes, &first).unwrap();

        add(&mut codes, Platform::Gba, "", "82025840 0001", 0);
        let second = codes[0].id.clone();
        edit(&mut codes, Platform::Gba, &second, "", "82025840 0002", 0).unwrap();

        assert_eq!(codes.iter().map(|code| code.name.as_str()).collect::<Vec<_>>(), ["Code 2", "Code 3", "Code 1"]);
    }

    #[test]
    fn a_new_code_is_on_only_if_the_core_can_read_it() {
        let mut codes = Vec::new();

        add(&mut codes, Platform::Gba, "", "82025840 0001", 0);
        add(&mut codes, Platform::Gba, "", "02025840:01", 0);

        assert_eq!(codes.iter().map(|code| code.on).collect::<Vec<_>>(), [true, false]);
    }

    #[test]
    fn a_code_the_core_cannot_read_stays_listed_with_the_reason_and_cannot_be_turned_on() {
        let mut codes = Vec::new();
        add(&mut codes, Platform::Gba, "", "02025840:01", 0);
        let id = codes[0].id.clone();

        assert!(toggle(&mut codes, Platform::Gba, &id, true, 1).is_err());

        let listed = listed(Platform::Gba, codes);
        assert!(!listed[0].code.on);
        assert!(listed[0].problem.as_deref().is_some_and(|problem| problem.contains("VBA")));
    }

    #[test]
    fn editing_an_on_code_into_one_the_core_cannot_read_turns_it_off() {
        let mut codes = Vec::new();
        add(&mut codes, Platform::Gba, "", "82025840 0001", 0);
        let id = codes[0].id.clone();

        edit(&mut codes, Platform::Gba, &id, "", "nonsense", 1).unwrap();

        assert!(!codes[0].on);
    }

    #[test]
    fn turning_a_code_on_or_off_counts_as_an_edit() {
        let mut codes = Vec::new();
        add(&mut codes, Platform::Gba, "", "82025840 0001", 0);
        let id = codes[0].id.clone();

        toggle(&mut codes, Platform::Gba, &id, false, 5).unwrap();

        assert_eq!((codes[0].on, codes[0].modified), (false, 5));
    }

    #[test]
    fn sets_only_the_codes_that_are_on_in_list_order() {
        let mut codes = Vec::new();
        add(&mut codes, Platform::Gba, "", "82025840 0001", 0);
        add(&mut codes, Platform::Gba, "", "82025842 0002", 0);
        add(&mut codes, Platform::Gba, "", "82025844 0003", 0);
        let second = codes[1].id.clone();
        toggle(&mut codes, Platform::Gba, &second, false, 0).unwrap();

        assert_eq!(on_codes(Platform::Gba, &codes), ["82025840 0001", "82025844 0003"]);
    }

    #[test]
    fn knows_the_platform_from_the_rom_or_its_system_folder() {
        assert_eq!(Platform::of_path("gbc/Crystal.gbc"), Ok(Platform::Gb));
        assert_eq!(Platform::of_path("gba/hacks/Unbound.GBA"), Ok(Platform::Gba));
        assert_eq!(Platform::of_path("nds/HeartGold.zip"), Ok(Platform::Ds));
        assert_eq!(Platform::of_path("gba/Emerald.7z"), Ok(Platform::Gba));
        assert!(Platform::of_path("Emerald.zip").is_err());
        assert_eq!(Platform::of_path("gc/XD.rvz"), Ok(Platform::GameCube));
        assert_eq!(
            Platform::of_path("gc/Pokémon/XD.7z"),
            Err("Unzip XD.7z first. pkhemu can't play a zipped GameCube disc.".into())
        );
    }

    fn reads(platform: Platform, code: &str) -> String {
        check(platform, code).unwrap_or_else(|e| panic!("{code}: {e}"))
    }

    fn refuses(platform: Platform, code: &str) {
        assert!(check(platform, code).is_err(), "{code} passed");
    }

    #[test]
    fn reads_gba_gameshark_action_replay_and_codebreaker_lines() {
        assert_eq!(reads(Platform::Gba, "82025840 0001"), "82025840 0001");
        assert_eq!(reads(Platform::Gba, "1a2b3c4d 5e6f7a8b"), "1A2B3C4D 5E6F7A8B");
        assert_eq!(
            reads(Platform::Gba, " 82025840 0001\r\n1A2B3C4D 5E6F7A8B+82025842   0002\n"),
            "82025840 0001+1A2B3C4D 5E6F7A8B+82025842 0002"
        );
    }

    #[test]
    fn refuses_gba_lines_mgba_drops() {
        refuses(Platform::Gba, "02025840:01");
        refuses(Platform::Gba, "02025840:0001");
        refuses(Platform::Gba, "82025840");
        refuses(Platform::Gba, "82025840 001");
        refuses(Platform::Gba, "8202584 00001");
        refuses(Platform::Gba, "82025840 0001 1A2B3C4D");
        refuses(Platform::Gba, "ZZ025840 0001");
        refuses(Platform::Gba, " \n+");
    }

    #[test]
    fn says_a_vba_code_is_a_vba_code() {
        assert!(check(Platform::Gba, "02025840:01").unwrap_err().contains("VBA"));
    }

    #[test]
    fn reads_game_boy_gameshark_codebreaker_and_game_genie_codes() {
        assert_eq!(reads(Platform::Gb, "01ff34d2"), "01FF34D2");
        assert_eq!(reads(Platform::Gb, "00D2C1-63"), "00D2C1-63");
        assert_eq!(reads(Platform::Gb, "00A-17B"), "00A-17B");
        assert_eq!(reads(Platform::Gb, "00A-17B-C49"), "00A-17B-C49");
        assert_eq!(reads(Platform::Gb, "01FF34D2\n00A-17B-C49 + 01FF35D2"), "01FF34D2+00A-17B-C49+01FF35D2");
    }

    #[test]
    fn sends_a_game_boy_vba_code_as_the_gameshark_code_for_the_same_write() {
        assert_eq!(reads(Platform::Gb, "D234:FF"), "01FF34D2");
    }

    #[test]
    fn refuses_game_boy_lines_mgba_cannot_read() {
        refuses(Platform::Gb, "01FF34D");
        refuses(Platform::Gb, "01FF34D2A");
        refuses(Platform::Gb, "00A-17B-C4");
        refuses(Platform::Gb, "00A17BC49");
        refuses(Platform::Gb, "0GA-17B");
        refuses(Platform::Gb, "01FF34D2 ZZ");
        refuses(Platform::Gb, "ééééééé");
        refuses(Platform::Gb, "");
    }

    #[test]
    fn reads_action_replay_ds_codes() {
        assert_eq!(reads(Platform::Ds, "94000130 fcff0000\n"), "94000130 FCFF0000");
        assert_eq!(
            reads(Platform::Ds, "94000130 FCFF0000+021C4D28-0000FFFF\n\nD2000000 00000000"),
            "94000130 FCFF0000+021C4D28 0000FFFF+D2000000 00000000"
        );
        assert_eq!(reads(Platform::Ds, "94000130FCFF0000"), "94000130 FCFF0000");
    }

    #[test]
    fn refuses_ds_codes_melonds_ds_cannot_read() {
        refuses(Platform::Ds, "94000130");
        refuses(Platform::Ds, "94000130 FCFF000");
        refuses(Platform::Ds, "94000130 FCFF0000 D2000000");
        refuses(Platform::Ds, "02025840:01");
        refuses(Platform::Ds, "9400013X FCFF0000");
        refuses(Platform::Ds, "");
    }

    #[test]
    fn reads_n64_gameshark_codes() {
        assert_eq!(reads(Platform::N64, "8103A2C4 0063"), "8103A2C4 0063");
        assert_eq!(reads(Platform::N64, "8103a2c4 0063\r\n8103A2C6 00ff\n"), "8103A2C4 0063+8103A2C6 00FF");
    }

    #[test]
    fn refuses_n64_lines_that_arent_gameshark_lines() {
        refuses(Platform::N64, "803A2C4 0063");
        refuses(Platform::N64, "8103A2C4 63");
        refuses(Platform::N64, "8103A2C4 00000063");
        refuses(Platform::N64, "8103A2C4");
        refuses(Platform::N64, "8103A2C4 0063 8103A2C6");
        refuses(Platform::N64, "8103A2CZ 0063");
        refuses(Platform::N64, "");
    }

    #[test]
    fn knows_an_n64_game_from_its_rom_or_folder() {
        assert_eq!(Platform::of_path("n64/Stadium.z64"), Ok(Platform::N64));
        assert_eq!(Platform::of_path("n64/Stadium 2.V64"), Ok(Platform::N64));
        assert_eq!(Platform::of_path("n64/Stadium.zip"), Ok(Platform::N64));
        assert_eq!(Platform::of_rom(&Rom { name: "Stadium.n64".into(), bytes: Vec::new(), file: None }), Platform::N64);
    }

    #[test]
    fn knows_a_3ds_game_from_its_file() {
        assert_eq!(Platform::of_path("3ds/PKSM.3dsx"), Ok(Platform::ThreeDs));
        assert_eq!(Platform::of_path("3ds/X.3DS"), Ok(Platform::ThreeDs));
        assert_eq!(Platform::of_path("3ds/X.cxi"), Ok(Platform::ThreeDs));
    }

    #[test]
    fn knows_a_gamecube_disc_from_its_file() {
        assert_eq!(Platform::of_path("gc/Colosseum.iso"), Ok(Platform::GameCube));
        assert_eq!(Platform::of_path("gc/XD.RVZ"), Ok(Platform::GameCube));
        assert!(check(Platform::GameCube, "0000 0000").is_err());
    }
}
