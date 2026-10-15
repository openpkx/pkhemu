use crate::games_folder::GamesFolder;
use crate::rom;
use serde::Serialize;
use sha2::{Digest, Sha256};
use std::hash::{DefaultHasher, Hash, Hasher};
use std::ops::Range;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Runtime;

pub(crate) mod n64;
pub(crate) mod three_ds;

const CHECK_EVERY: u64 = 30;
const CLOCK_BYTES: usize = 48;
const SHORT_CLOCK_BYTES: usize = 44;
const DAY: u64 = 24 * 60 * 60;
const DSV_FOOTER_BYTES: usize = 0x7A;
const DSV_MARKER: &[u8] = b"|-DESMUME SAVE-|";

#[derive(Serialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SaveFile {
    pub bytes: Vec<u8>,
    pub modified: i64,
    pub sha256: String,
}

#[derive(Clone, Debug, PartialEq)]
pub struct Slot(Kind);

#[derive(Clone, Debug, PartialEq)]
enum Kind {
    File { path: String, footer: Option<Vec<u8>> },
    N64 { rom: String },
}

impl Slot {
    pub fn new(path: String, mut file: Vec<u8>) -> (Slot, Vec<u8>) {
        let footer = has_dsv_footer(&file).then(|| file.split_off(file.len() - DSV_FOOTER_BYTES));
        (Slot(Kind::File { path, footer }), file)
    }

    fn n64(rom: &str) -> Slot {
        Slot(Kind::N64 { rom: rom.into() })
    }

    pub fn beside(&self, rom: &str) -> Slot {
        match &self.0 {
            Kind::File { footer, .. } if self.extension() != "srm" => {
                Slot(Kind::File { path: beside(rom, self.extension()), footer: footer.clone() })
            }
            _ => Slot::n64(rom),
        }
    }

    /// An N64 save's single file is the core's whole save memory, laid out as RetroArch's `.srm`.
    pub fn extension(&self) -> &'static str {
        match &self.0 {
            Kind::File { path, .. } if is_dsv(path) => "dsv",
            Kind::File { path, .. } if has_extension(path, "srm") => "srm",
            Kind::File { .. } => "sav",
            Kind::N64 { .. } => "srm",
        }
    }

    pub fn file(&self, save: &[u8]) -> Vec<u8> {
        match &self.0 {
            Kind::File { footer, .. } => [save, footer.as_deref().unwrap_or_default()].concat(),
            Kind::N64 { .. } => save.to_vec(),
        }
    }

    pub fn files(&self, save: &[u8]) -> Vec<(String, Vec<u8>)> {
        match &self.0 {
            Kind::File { path, .. } => vec![(path.clone(), self.file(save))],
            Kind::N64 { rom } => n64::split(save)
                .filter(|(extension, region)| n64::written(extension, region))
                .map(|(extension, region)| (beside(rom, extension), region.to_vec()))
                .collect(),
        }
    }

    pub async fn write<R: Runtime>(&self, folder: &GamesFolder<'_, R>, save: &[u8]) -> Result<(), String> {
        match &self.0 {
            Kind::File { path, .. } => folder.write(path, &self.file(save)).await.map_err(|e| format!("{path}: {e}")),
            Kind::N64 { rom } => {
                for (extension, region) in n64::split(save) {
                    let path = beside(rom, extension);
                    let exists = folder.has_file(&path).await;
                    if !exists && !n64::written(extension, region) {
                        continue;
                    }
                    // A short file, like a 0x200-byte .eep or a one-pak .mpk, stays until the game writes past its end.
                    let unchanged =
                        |file: Vec<u8>| region.starts_with(&file) && !n64::written(extension, &region[file.len()..]);
                    if exists && folder.read(&path).await.is_ok_and(unchanged) {
                        continue;
                    }
                    folder.write(&path, region).await.map_err(|e| format!("{path}: {e}"))?;
                }
                Ok(())
            }
        }
    }

    async fn modified<R: Runtime>(&self, folder: &GamesFolder<'_, R>) -> Result<SystemTime, String> {
        match &self.0 {
            Kind::File { path, .. } => modified(folder, path).await,
            Kind::N64 { rom } => {
                let mut newest = None;
                for path in paths(rom) {
                    if folder.has_file(&path).await {
                        newest = newest.max(Some(modified(folder, &path).await?));
                    }
                }
                newest.ok_or_else(|| format!("{rom} has no save"))
            }
        }
    }
}

fn has_extension(path: &str, extension: &str) -> bool {
    Path::new(path).extension().is_some_and(|e| e.eq_ignore_ascii_case(extension))
}

fn is_dsv(path: &str) -> bool {
    has_extension(path, "dsv")
}

fn has_dsv_footer(file: &[u8]) -> bool {
    file.len() >= DSV_FOOTER_BYTES && file.ends_with(DSV_MARKER)
}

fn beside(rom: &str, extension: &str) -> String {
    Path::new(rom).with_extension(extension).to_string_lossy().into_owned()
}

fn extension(path: &str) -> String {
    Path::new(path).extension().unwrap_or_default().to_string_lossy().into_owned()
}

pub fn paths(rom: &str) -> Vec<String> {
    match rom::is_n64(rom) {
        true => n64::EXTENSIONS.iter().map(|extension| beside(rom, extension)).collect(),
        false => vec![rom::save_path(rom), rom::dsv_path(rom)],
    }
}

async fn path<R: Runtime>(folder: &GamesFolder<'_, R>, rom: &str) -> Result<String, String> {
    let (sav, dsv) = (rom::save_path(rom), rom::dsv_path(rom));
    if !folder.has_file(&dsv).await {
        return Ok(sav);
    }
    if !folder.has_file(&sav).await {
        return Ok(dsv);
    }
    Ok(if modified(folder, &dsv).await? > modified(folder, &sav).await? { dsv } else { sav })
}

async fn modified<R: Runtime>(folder: &GamesFolder<'_, R>, path: &str) -> Result<SystemTime, String> {
    folder.modified(path).await.map_err(|e| format!("{path}: {e}"))
}

pub async fn open<R: Runtime>(folder: &GamesFolder<'_, R>, rom: &str) -> Result<(Slot, Option<Vec<u8>>), String> {
    if rom::is_n64(rom) {
        return open_n64(folder, rom).await;
    }
    let path = path(folder, rom).await?;
    match folder.read(&path).await {
        Ok(file) => {
            let (slot, save) = Slot::new(path, file);
            Ok((slot, Some(save)))
        }
        Err(_) if !folder.has_file(&path).await => Ok((Slot(Kind::File { path, footer: None }), None)),
        Err(e) => Err(format!("{path}: {e}")),
    }
}

async fn open_n64<R: Runtime>(folder: &GamesFolder<'_, R>, rom: &str) -> Result<(Slot, Option<Vec<u8>>), String> {
    let mut files = Vec::new();
    for path in paths(rom) {
        if folder.has_file(&path).await {
            let file = folder.read(&path).await.map_err(|e| format!("{path}: {e}"))?;
            files.push((path, file));
        }
    }
    if let Some((slot, save)) = from_files(rom, files) {
        return Ok((slot, Some(save)));
    }
    let slot = Slot::n64(rom);
    let save = match folder.read(&beside(rom, "srm")).await {
        Ok(save) if save.len() == n64::SIZE && !slot.files(&save).is_empty() => save,
        _ => return Ok((slot, None)),
    };
    slot.write(folder, &save).await?;
    Ok((slot, Some(save)))
}

pub fn imported(rom: &str, name: &str, file: Vec<u8>) -> Result<(Slot, Vec<u8>), String> {
    if rom::is_n64(rom) {
        return match file.len() == n64::SIZE {
            true => Ok((Slot::n64(rom), file)),
            false => Err(format!("{name} isn't a Nintendo 64 save")),
        };
    }
    let path = if is_dsv(name) || has_dsv_footer(&file) { rom::dsv_path(rom) } else { rom::save_path(rom) };
    Ok(Slot::new(path, file))
}

pub fn from_files(rom: &str, files: Vec<(String, Vec<u8>)>) -> Option<(Slot, Vec<u8>)> {
    if !rom::is_n64(rom) {
        let (path, file) = files.into_iter().next()?;
        return Some(Slot::new(path, file));
    }
    if files.is_empty() {
        return None;
    }
    let files: Vec<(String, Vec<u8>)> = files.into_iter().map(|(path, file)| (extension(&path), file)).collect();
    Some((Slot::n64(rom), n64::join(files.iter().map(|(extension, file)| (extension.as_str(), file.as_slice())))))
}

pub fn editable(save: &[u8]) -> Range<usize> {
    if save.len() == n64::SIZE {
        n64::editable(save)
    } else {
        0..save.len()
    }
}

pub async fn read_file<R: Runtime>(folder: &GamesFolder<'_, R>, rom: &str) -> Result<Option<SaveFile>, String> {
    let (slot, Some(save)) = open(folder, rom).await? else { return Ok(None) };
    let bytes = save[editable(&save)].to_vec();
    let modified = slot.modified(folder).await?.duration_since(UNIX_EPOCH).unwrap_or_default().as_millis() as i64;
    let sha256 = sha256(&bytes);
    Ok(Some(SaveFile { bytes, modified, sha256 }))
}

#[derive(Serialize, Debug, PartialEq)]
pub struct Exported {
    pub extension: String,
    pub bytes: Vec<u8>,
}

pub async fn exported<R: Runtime>(folder: &GamesFolder<'_, R>, rom: &str) -> Result<Vec<Exported>, String> {
    let (_, Some(save)) = open(folder, rom).await? else { return Ok(Vec::new()) };
    if !rom::is_n64(rom) {
        return Ok(vec![Exported { extension: "sav".into(), bytes: save }]);
    }
    let mut files = Vec::new();
    for path in paths(rom) {
        if folder.has_file(&path).await {
            let bytes = folder.read(&path).await.map_err(|e| format!("{path}: {e}"))?;
            files.push(Exported { extension: extension(&path), bytes });
        }
    }
    Ok(files)
}

pub fn sha256(bytes: &[u8]) -> String {
    Sha256::digest(bytes).iter().map(|byte| format!("{byte:02x}")).collect()
}

pub fn fill(save_ram: &mut [u8], rtc: &mut [u8], file: &[u8]) {
    if save_ram.len() == n64::SIZE {
        return n64::fill(save_ram, file);
    }
    let (ram, clock) = file.split_at(file.len().min(save_ram.len()));
    save_ram[..ram.len()].copy_from_slice(ram);
    if clock.len() == rtc.len() {
        rtc.copy_from_slice(clock);
    } else if clock.len() == SHORT_CLOCK_BYTES && rtc.len() > SHORT_CLOCK_BYTES {
        // The core's clock buffer starts as 0xFF, which would become the top half of the 64-bit timestamp.
        rtc[..SHORT_CLOCK_BYTES].copy_from_slice(clock);
        rtc[SHORT_CLOCK_BYTES..].fill(0);
    } else if clock.is_empty() && rtc.len() == CLOCK_BYTES {
        // mGBA reads its 0xFF clock buffer as a day counter that overflowed, which the game shows as a clock never set.
        let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs();
        rtc.copy_from_slice(&mgba_clock(0, now));
    }
}

// mGBA's MBC3 clock: seconds, minutes, hours, days and the day high register, a latched copy of them, then the Unix time.
fn mgba_clock(elapsed: u64, now: u64) -> Vec<u8> {
    let days = elapsed / DAY;
    let high = (days >> 8 & 1) | if days > 0x1FF { 0x80 } else { 0 };
    let registers = [elapsed % 60, elapsed / 60 % 60, elapsed / 3600 % 24, days & 0xFF, high]
        .map(|register| (register as u32).to_le_bytes())
        .concat();
    [registers.as_slice(), &registers, &now.to_le_bytes()].concat()
}

fn is_game_boy(rom: &str) -> bool {
    matches!(rom.split('/').next(), Some("gb" | "gbc"))
}

pub fn without_clock<'a>(rom: &str, save: &'a [u8]) -> &'a [u8] {
    let ram = save.len().checked_next_power_of_two().map_or(save.len(), |size| size / 2);
    match is_game_boy(rom) && [CLOCK_BYTES, SHORT_CLOCK_BYTES].contains(&(save.len() - ram)) {
        true => &save[..ram],
        false => save,
    }
}

pub fn with_clock(rom: &str, mut save: Vec<u8>, rtc: &[u8], now: u64) -> Vec<u8> {
    if !is_game_boy(rom) || !save.len().is_power_of_two() {
        return save;
    }
    let base = match rtc.len() {
        CLOCK_BYTES => {
            save.extend_from_slice(rtc);
            return save;
        }
        // Gambatte's, which Delta keeps: the big-endian Unix time the clock counts from.
        4 => u32::from_be_bytes(rtc.try_into().unwrap()) as u64,
        // gambatte-libretro's: the same time as a little-endian u64.
        8 => u64::from_le_bytes(rtc.try_into().unwrap()),
        _ => return save,
    };
    save.extend(mgba_clock(now.saturating_sub(base), now));
    save
}

#[derive(Clone)]
pub struct Watch {
    frames: u64,
    hash: Option<u64>,
    since_write: Option<u64>,
}

impl Watch {
    pub fn new() -> Watch {
        Watch { frames: 0, hash: None, since_write: Some(0) }
    }

    // A resume state can hold play the game never saved, so until it saves the time since is unknown.
    pub fn resumed() -> Watch {
        Watch { frames: 0, hash: None, since_write: None }
    }

    // The core loads the save on the first frame, so that frame sets what counts as unchanged.
    pub fn after_frame<'a>(&mut self, memory: impl FnOnce() -> [&'a [u8]; 2]) -> Option<Vec<u8>> {
        self.frames += 1;
        if let Some(since_write) = &mut self.since_write {
            *since_write += 1;
        }
        if self.due() {
            self.check(memory())
        } else {
            None
        }
    }

    pub fn due(&self) -> bool {
        self.frames == 1 || self.frames.is_multiple_of(CHECK_EVERY)
    }

    pub fn frames_since_write(&self) -> u64 {
        self.since_write.unwrap_or(u64::MAX)
    }

    pub fn check(&mut self, memory: [&[u8]; 2]) -> Option<Vec<u8>> {
        let hash = hash(memory);
        match self.hash.replace(hash) {
            Some(previous) if previous != hash => {
                self.since_write = Some(0);
                Some(memory.concat())
            }
            _ => None,
        }
    }

    pub fn flush(&mut self, memory: [&[u8]; 2]) -> Vec<u8> {
        self.load(memory, Some(0))
    }

    pub fn load(&mut self, memory: [&[u8]; 2], frames_since_write: Option<u64>) -> Vec<u8> {
        self.hash = Some(hash(memory));
        self.since_write = frames_since_write;
        memory.concat()
    }
}

fn hash(memory: [&[u8]; 2]) -> u64 {
    let mut hasher = DefaultHasher::new();
    memory.hash(&mut hasher);
    hasher.finish()
}

#[cfg(test)]
pub(crate) mod tests {
    use super::*;
    use crate::test_games::pattern;
    use tauri::async_runtime::block_on;

    fn temp_folder(name: &str) -> GamesFolder<'static, tauri::Wry> {
        let root = std::env::temp_dir().join(format!("pkh-emu-save-{name}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        std::fs::create_dir_all(&root).unwrap();
        GamesFolder::at(root)
    }

    #[test]
    fn reads_the_save_next_to_the_rom_with_its_time_and_hash() {
        let folder = temp_folder("read");
        block_on(folder.write("gba/Emerald.sav", b"abc")).unwrap();
        let written = crate::index::now();

        let save = block_on(read_file(&folder, "gba/Emerald.gba")).unwrap().unwrap();

        assert_eq!(save.bytes, b"abc");
        assert_eq!(save.sha256, "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
        assert!((written - save.modified).abs() < 2_000);
    }

    fn footer() -> Vec<u8> {
        [vec![7; 0x7A - 16], b"|-DESMUME SAVE-|".to_vec()].concat()
    }

    fn age(folder: &GamesFolder<'static, tauri::Wry>, path: &str, seconds: u64) {
        let root = folder.root();
        let file = std::fs::File::options().write(true).open(root.join(path)).unwrap();
        file.set_modified(SystemTime::now() - std::time::Duration::from_secs(seconds)).unwrap();
    }

    #[test]
    fn reads_a_dsv_without_its_footer() {
        let folder = temp_folder("dsv");
        block_on(folder.write("nds/HeartGold.dsv", &[b"save".as_slice(), &footer()].concat())).unwrap();

        let save = block_on(read_file(&folder, "nds/HeartGold.nds")).unwrap().unwrap();

        assert_eq!(save.bytes, b"save");
        assert_eq!(save.sha256, sha256(b"save"));
    }

    #[test]
    fn writes_a_dsv_back_with_the_same_footer() {
        let folder = temp_folder("dsv-round-trip");
        let save: Vec<u8> = (0..=255).collect();
        block_on(folder.write("nds/HeartGold.dsv", &[save.as_slice(), &footer()].concat())).unwrap();

        let (slot, read) = block_on(open(&folder, "nds/HeartGold.nds")).unwrap();
        let edited: Vec<u8> = read.unwrap().iter().map(|byte| byte ^ 0xFF).collect();
        block_on(slot.write(&folder, &edited)).unwrap();

        assert_eq!(block_on(folder.read("nds/HeartGold.dsv")).unwrap(), [edited, footer()].concat());
        assert!(!block_on(folder.has_file("nds/HeartGold.sav")));
    }

    #[test]
    fn treats_a_dsv_without_the_footer_marker_as_raw() {
        let folder = temp_folder("dsv-raw");
        let file = vec![7; 0x100];
        block_on(folder.write("nds/HeartGold.dsv", &file)).unwrap();

        let (slot, read) = block_on(open(&folder, "nds/HeartGold.nds")).unwrap();
        block_on(slot.write(&folder, b"edited")).unwrap();

        assert_eq!(read.unwrap(), file);
        assert_eq!(block_on(folder.read("nds/HeartGold.dsv")).unwrap(), b"edited");
    }

    #[test]
    fn uses_the_newer_of_a_sav_and_a_dsv() {
        let folder = temp_folder("newer");
        block_on(folder.write("nds/HeartGold.sav", b"sav")).unwrap();
        block_on(folder.write("nds/HeartGold.dsv", &[b"dsv".as_slice(), &footer()].concat())).unwrap();

        age(&folder, "nds/HeartGold.sav", 60);
        let (slot, save) = block_on(open(&folder, "nds/HeartGold.nds")).unwrap();
        assert_eq!((slot.extension(), save.unwrap()), ("dsv", b"dsv".to_vec()));

        age(&folder, "nds/HeartGold.dsv", 120);
        let (slot, save) = block_on(open(&folder, "nds/HeartGold.nds")).unwrap();
        assert_eq!((slot.extension(), save.unwrap()), ("sav", b"sav".to_vec()));
    }

    #[test]
    fn gives_a_game_without_a_save_a_sav() {
        let folder = temp_folder("new");

        let (slot, save) = block_on(open(&folder, "nds/HeartGold.nds")).unwrap();
        block_on(slot.write(&folder, b"first")).unwrap();

        assert_eq!(save, None);
        assert_eq!(block_on(folder.read("nds/HeartGold.sav")).unwrap(), b"first");
    }

    #[test]
    fn reads_nothing_when_the_game_has_no_save() {
        let folder = temp_folder("none");

        assert_eq!(block_on(read_file(&folder, "gba/Emerald.gba")), Ok(None));
    }

    #[test]
    fn fills_save_ram_and_clock_from_one_block() {
        let file: Vec<u8> = (0..0x8030).map(|i| i as u8).collect();
        let mut save_ram = vec![0xFF; 0x8000];
        let mut rtc = vec![0xFF; 48];

        fill(&mut save_ram, &mut rtc, &file);

        assert_eq!(save_ram, file[..0x8000]);
        assert_eq!(rtc, file[0x8000..]);
    }

    #[test]
    fn turns_a_gambatte_base_time_into_an_mgba_clock() {
        let now = 1_800_000_000;
        let base = ((now - (3 * DAY + 5 * 3600 + 7 * 60 + 9)) as u32).to_be_bytes();

        let file = with_clock("gbc/Crystal.gbc", vec![0; 0x8000], &base, now);

        let registers: Vec<u8> = [9u32, 7, 5, 3, 0].iter().flat_map(|register| register.to_le_bytes()).collect();
        assert_eq!(file[0x8000..], [registers.as_slice(), &registers, &now.to_le_bytes()].concat());
    }

    #[test]
    fn reads_gambatte_libretros_little_endian_64_bit_base_time() {
        let now = 1_800_000_000;
        let base = (now - (3 * DAY + 5 * 3600 + 7 * 60 + 9)).to_le_bytes();

        let file = with_clock("gbc/Crystal.gbc", vec![0; 0x8000], &base, now);

        let registers: Vec<u8> = [9u32, 7, 5, 3, 0].iter().flat_map(|register| register.to_le_bytes()).collect();
        assert_eq!(file[0x8000..], [registers.as_slice(), &registers, &now.to_le_bytes()].concat());
    }

    #[test]
    fn puts_day_256_in_the_high_register_and_sets_the_carry_past_day_511() {
        let day = |elapsed_days: u64| {
            let clock = mgba_clock(elapsed_days * DAY, 0);
            (clock[12], clock[16])
        };

        assert_eq!(day(255), (255, 0));
        assert_eq!(day(300), (44, 1));
        assert_eq!(day(600), (88, 0x80));
    }

    #[test]
    fn adds_a_clock_only_to_a_game_boy_save_without_one() {
        let rtc = 1_799_000_000u32.to_be_bytes();
        let mgba = vec![5; CLOCK_BYTES];

        assert_eq!(with_clock("gba/Emerald.gba", vec![0; 0x20000], &rtc, 1_800_000_000).len(), 0x20000);
        assert_eq!(with_clock("gbc/Crystal.gbc", vec![0; 0x8000 + 48], &rtc, 1_800_000_000).len(), 0x8000 + 48);
        assert_eq!(with_clock("gbc/Crystal.gbc", vec![0; 0x8000], &[0; 12], 1_800_000_000).len(), 0x8000);
        assert_eq!(with_clock("gb/Red.gb", vec![0; 0x8000], &mgba, 1_800_000_000)[0x8000..], mgba);
    }

    #[test]
    fn zeroes_the_top_of_the_timestamp_for_a_44_byte_clock() {
        let file: Vec<u8> = (0..0x802C).map(|i| i as u8).collect();
        let mut save_ram = vec![0xFF; 0x8000];
        let mut rtc = vec![0xFF; 48];

        fill(&mut save_ram, &mut rtc, &file);

        assert_eq!(save_ram, file[..0x8000]);
        assert_eq!(rtc[..44], file[0x8000..]);
        assert_eq!(rtc[44..], [0, 0, 0, 0]);
    }

    #[test]
    fn starts_the_clock_at_day_0_now_for_a_save_without_one() {
        let file = vec![7; 0x8000];
        let mut save_ram = vec![0xFF; 0x8000];
        let mut rtc = vec![0xFF; 48];

        fill(&mut save_ram, &mut rtc, &file);

        let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();
        let timestamp = u64::from_le_bytes(rtc[40..].try_into().unwrap());
        assert_eq!(save_ram, file);
        assert_eq!(rtc[..40], [0; 40]);
        assert!(now.abs_diff(timestamp) < 5);
    }

    #[test]
    fn shows_day_0_to_a_game_whose_save_has_no_clock() {
        use crate::test_games::{clock_rom, days_on_the_clock, lock_core};
        let _lock = lock_core();
        let mut core = crate::retro::Core::load(clock_rom(), &std::env::temp_dir()).unwrap();
        let [save_ram, rtc] = core.save_memory();

        fill(save_ram, rtc, &vec![0; 0x8000]);
        for _ in 0..10 {
            core.run_frame();
        }

        assert_eq!(days_on_the_clock(&mut core), 0);
    }

    #[test]
    fn adds_no_clock_to_a_game_without_one() {
        let file = vec![7; 0x8000];
        let mut save_ram = vec![0xFF; 0x8000];
        let mut rtc = vec![];

        fill(&mut save_ram, &mut rtc, &file);

        assert_eq!(save_ram, file);
        assert!(rtc.is_empty());
    }

    const STADIUM: &str = "n64/Stadium.z64";

    pub fn stadium_memory() -> Vec<u8> {
        let mut memory = n64::tests::fresh_memory(9);
        memory[0x28800..].copy_from_slice(&pattern(0x20000, 1));
        memory
    }

    fn files_in(folder: &GamesFolder<'static, tauri::Wry>, dir: &str) -> Vec<String> {
        let mut names: Vec<_> = block_on(folder.read_dir(dir)).unwrap().into_iter().map(|entry| entry.name).collect();
        names.sort();
        names
    }

    #[test]
    fn writes_a_file_only_for_each_region_the_game_wrote() {
        let folder = temp_folder("n64-written");
        let (slot, save) = block_on(open(&folder, STADIUM)).unwrap();
        assert_eq!(save, None);

        block_on(slot.write(&folder, &stadium_memory())).unwrap();

        assert_eq!(files_in(&folder, "n64"), ["Stadium.fla"]);
        assert_eq!(block_on(folder.read("n64/Stadium.fla")).unwrap(), pattern(0x20000, 1));
    }

    #[test]
    fn writes_a_region_back_to_its_file_after_the_game_erases_it() {
        let folder = temp_folder("n64-erased");
        block_on(folder.write("n64/Stadium.sra", &pattern(0x8000, 2))).unwrap();
        let (slot, _) = block_on(open(&folder, STADIUM)).unwrap();

        block_on(slot.write(&folder, &n64::tests::fresh_memory(9))).unwrap();

        assert_eq!(files_in(&folder, "n64"), ["Stadium.sra"]);
        assert_eq!(block_on(folder.read("n64/Stadium.sra")).unwrap(), vec![0xFF; 0x8000]);
    }

    #[test]
    fn leaves_a_file_alone_when_its_region_is_unchanged() {
        let folder = temp_folder("n64-unchanged");
        let (slot, _) = block_on(open(&folder, STADIUM)).unwrap();
        block_on(slot.write(&folder, &stadium_memory())).unwrap();
        age(&folder, "n64/Stadium.fla", 60);
        let before = block_on(folder.modified("n64/Stadium.fla")).unwrap();

        block_on(slot.write(&folder, &stadium_memory())).unwrap();

        assert_eq!(block_on(folder.modified("n64/Stadium.fla")).unwrap(), before);
    }

    #[test]
    fn opens_the_files_of_an_n64_game_as_one_save() {
        let folder = temp_folder("n64-open");
        block_on(folder.write("n64/Stadium.fla", &pattern(0x20000, 1))).unwrap();
        block_on(folder.write("n64/Stadium.mpk", &pattern(0x20000, 2))).unwrap();

        let (_, save) = block_on(open(&folder, "n64/Stadium.zip")).unwrap();

        assert_eq!(save, Some(n64::join([("fla", pattern(0x20000, 1).as_slice()), ("mpk", &pattern(0x20000, 2))])));
    }

    #[test]
    fn reads_an_n64_games_flash_ram_for_the_editor() {
        let folder = temp_folder("n64-read-fla");
        block_on(folder.write("n64/Stadium.fla", &pattern(0x20000, 1))).unwrap();
        block_on(folder.write("n64/Stadium.mpk", &pattern(0x20000, 2))).unwrap();

        let save = block_on(read_file(&folder, "n64/Stadium.zip")).unwrap().unwrap();

        assert_eq!(save.bytes, pattern(0x20000, 1));
        assert_eq!(save.sha256, sha256(&save.bytes));
    }

    #[test]
    fn reads_an_n64_games_sram_when_it_has_no_flash_ram() {
        let folder = temp_folder("n64-read-sra");
        block_on(folder.write("n64/Stadium.sra", &pattern(0x8000, 1))).unwrap();

        let save = block_on(read_file(&folder, "n64/Stadium.zip")).unwrap().unwrap();

        assert_eq!(save.bytes, pattern(0x8000, 1));
    }

    #[test]
    fn exports_each_file_of_an_n64_save() {
        let folder = temp_folder("n64-export");
        block_on(folder.write("n64/Stadium.fla", &pattern(0x20000, 1))).unwrap();
        block_on(folder.write("n64/Stadium.eep", &pattern(0x200, 2))).unwrap();

        let exported = block_on(exported(&folder, STADIUM)).unwrap();

        assert_eq!(
            exported,
            [
                Exported { extension: "eep".into(), bytes: pattern(0x200, 2) },
                Exported { extension: "fla".into(), bytes: pattern(0x20000, 1) },
            ]
        );
    }

    #[test]
    fn exports_a_save_as_a_sav_without_its_footer() {
        let folder = temp_folder("export");
        block_on(folder.write("nds/HeartGold.dsv", &[b"save".as_slice(), &footer()].concat())).unwrap();

        let exported = block_on(exported(&folder, "nds/HeartGold.nds")).unwrap();

        assert_eq!(exported, [Exported { extension: "sav".into(), bytes: b"save".to_vec() }]);
        assert_eq!(block_on(super::exported(&temp_folder("export-none"), "gba/Emerald.gba")), Ok(Vec::new()));
    }

    #[test]
    fn loads_a_short_eep_into_the_start_of_the_eeprom() {
        let folder = temp_folder("n64-eep");
        block_on(folder.write("n64/Stadium.eep", &pattern(0x200, 3))).unwrap();
        let mut save_ram = n64::tests::fresh_memory(9);

        let (_, save) = block_on(open(&folder, STADIUM)).unwrap();
        fill(&mut save_ram, &mut [], &save.unwrap());

        let mut expected = n64::tests::fresh_memory(9);
        expected[..0x200].copy_from_slice(&pattern(0x200, 3));
        assert_eq!(save_ram, expected);
    }

    #[test]
    fn leaves_short_files_alone_while_the_game_writes_another_region() {
        let folder = temp_folder("n64-short");
        block_on(folder.write("n64/Stadium.eep", &pattern(0x200, 3))).unwrap();
        block_on(folder.write("n64/Stadium.mpk", &pattern(0x8000, 4))).unwrap();
        let (slot, save) = block_on(open(&folder, STADIUM)).unwrap();
        let mut save_ram = n64::tests::fresh_memory(9);
        fill(&mut save_ram, &mut [], &save.unwrap());
        save_ram[0x28800..].copy_from_slice(&pattern(0x20000, 1));

        block_on(slot.write(&folder, &save_ram)).unwrap();

        assert_eq!(block_on(folder.read("n64/Stadium.eep")).unwrap(), pattern(0x200, 3));
        assert_eq!(block_on(folder.read("n64/Stadium.mpk")).unwrap(), pattern(0x8000, 4));
        assert_eq!(block_on(folder.read("n64/Stadium.fla")).unwrap(), pattern(0x20000, 1));
    }

    #[test]
    fn writes_a_whole_eep() {
        let folder = temp_folder("n64-eep-write");
        block_on(folder.write("n64/Stadium.eep", &pattern(0x200, 3))).unwrap();
        let (slot, save) = block_on(open(&folder, STADIUM)).unwrap();
        let mut save = save.unwrap();
        save[0x7FF] = 0;

        block_on(slot.write(&folder, &save)).unwrap();

        assert_eq!(block_on(folder.read("n64/Stadium.eep")).unwrap(), save[..0x800]);
    }

    fn srm() -> Vec<u8> {
        let mut srm = stadium_memory();
        srm[..0x200].copy_from_slice(&pattern(0x200, 3));
        srm
    }

    #[test]
    fn splits_a_retroarch_srm_into_the_files_it_holds() {
        let folder = temp_folder("n64-srm");
        block_on(folder.write("n64/Stadium.srm", &srm())).unwrap();

        let (_, save) = block_on(open(&folder, STADIUM)).unwrap();

        assert_eq!(save.unwrap(), srm());
        assert_eq!(files_in(&folder, "n64"), ["Stadium.eep", "Stadium.fla", "Stadium.srm"]);
        assert_eq!(block_on(folder.read("n64/Stadium.eep")).unwrap(), srm()[..0x800]);
        assert_eq!(block_on(folder.read("n64/Stadium.fla")).unwrap(), pattern(0x20000, 1));
    }

    #[test]
    fn takes_an_existing_file_over_an_srm() {
        let folder = temp_folder("n64-srm-fla");
        block_on(folder.write("n64/Stadium.srm", &srm())).unwrap();
        block_on(folder.write("n64/Stadium.fla", &pattern(0x20000, 5))).unwrap();

        let (_, save) = block_on(open(&folder, STADIUM)).unwrap();

        assert_eq!(save.unwrap(), n64::join([("fla", pattern(0x20000, 5).as_slice())]));
        assert_eq!(files_in(&folder, "n64"), ["Stadium.fla", "Stadium.srm"]);
    }

    #[test]
    fn ignores_an_srm_of_another_size() {
        let folder = temp_folder("n64-srm-size");
        block_on(folder.write("n64/Stadium.srm", &srm()[..0x8000])).unwrap();

        assert_eq!(block_on(open(&folder, STADIUM)).unwrap().1, None);
        assert_eq!(files_in(&folder, "n64"), ["Stadium.srm"]);
    }

    fn run(watch: &mut Watch, frames: u32, save_ram: &[u8], rtc: &[u8]) -> Vec<Vec<u8>> {
        (0..frames).filter_map(|_| watch.after_frame(|| [save_ram, rtc])).collect()
    }

    #[test]
    fn writes_save_ram_and_clock_when_the_game_saves() {
        let mut watch = Watch::new();
        let mut save_ram = vec![0xFF; 8];
        let rtc = vec![1; 4];
        assert!(run(&mut watch, 100, &save_ram, &rtc).is_empty());

        save_ram[3] = 7;

        assert_eq!(run(&mut watch, 30, &save_ram, &rtc), [[0xFF, 0xFF, 0xFF, 7, 0xFF, 0xFF, 0xFF, 0xFF, 1, 1, 1, 1]]);
        assert!(run(&mut watch, 100, &save_ram, &rtc).is_empty());
    }

    #[test]
    fn writes_a_change_on_quit_without_waiting_for_the_next_check() {
        let mut watch = Watch::new();
        let mut save_ram = vec![0xFF; 4];
        run(&mut watch, 31, &save_ram, &[]);

        save_ram[0] = 1;

        assert!(run(&mut watch, 1, &save_ram, &[]).is_empty());
        assert_eq!(watch.check([&save_ram, &[]]), Some(vec![1, 0xFF, 0xFF, 0xFF]));
    }

    #[test]
    fn writes_nothing_on_quit_when_nothing_changed() {
        let mut watch = Watch::new();
        let save_ram = vec![0xFF; 4];
        run(&mut watch, 45, &save_ram, &[]);

        assert_eq!(watch.check([&save_ram, &[]]), None);
    }

    #[test]
    fn counts_frames_played_since_the_game_last_saved() {
        let mut watch = Watch::new();
        let mut save_ram = vec![0xFF; 4];
        run(&mut watch, 60, &save_ram, &[]);
        assert_eq!(watch.frames_since_write(), 60);

        save_ram[0] = 1;
        run(&mut watch, 30, &save_ram, &[]);
        run(&mut watch, 45, &save_ram, &[]);

        assert_eq!(watch.frames_since_write(), 45);
    }

    #[test]
    fn counts_a_resumed_game_as_long_unsaved_until_it_saves() {
        let mut watch = Watch::resumed();
        let mut save_ram = vec![0xFF; 4];
        run(&mut watch, 5, &save_ram, &[]);
        assert!(watch.frames_since_write() > 60 * 60);

        save_ram[0] = 1;
        run(&mut watch, 25, &save_ram, &[]);
        run(&mut watch, 45, &save_ram, &[]);

        assert_eq!(watch.frames_since_write(), 45);
    }

    #[test]
    fn takes_loaded_memory_as_unchanged_and_its_play_since_save() {
        let mut watch = Watch::new();
        let save_ram = vec![0xFF; 4];
        run(&mut watch, 45, &save_ram, &[]);
        let loaded = vec![1; 4];

        assert_eq!(watch.load([&loaded[..], &[]], Some(600)), loaded);

        assert!(run(&mut watch, 60, &loaded, &[]).is_empty());
        assert_eq!(watch.frames_since_write(), 660);
    }

    #[test]
    fn counts_a_resumed_game_from_a_flush() {
        let mut watch = Watch::resumed();
        let save_ram = vec![0xFF; 4];
        run(&mut watch, 5, &save_ram, &[]);

        watch.flush([&save_ram[..], &[]]);
        run(&mut watch, 10, &save_ram, &[]);

        assert_eq!(watch.frames_since_write(), 10);
    }
}
