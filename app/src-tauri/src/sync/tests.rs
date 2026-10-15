use super::fake_drive::FakeDrive;
use super::fake_dropbox::FakeDropbox;
use super::memory::Memory;
use super::provider::{Changes, Sent};
use super::*;
use crate::index::{temp_index, RomArtRow};
use crate::kept_copies::{self, StoredCopy};
use tauri::async_runtime::block_on;

struct NoEvents;

impl Events for NoEvents {
    fn game(&self, _: &str, _: &GameState) {}
    fn run(&self, _: &RunProgress) {}
}

#[derive(Clone, Debug, PartialEq)]
enum Event {
    Game(String, GameState),
    Run(RunProgress),
    BoxArt(String),
    Skins(crate::skins::Skins),
}

#[derive(Default)]
struct Recorded(Mutex<Vec<Event>>);

impl Events for Recorded {
    fn game(&self, rom: &str, state: &GameState) {
        self.0.lock().unwrap().push(Event::Game(rom.into(), state.clone()));
    }

    fn run(&self, run: &RunProgress) {
        self.0.lock().unwrap().push(Event::Run(run.clone()));
    }

    fn box_art(&self, rom: &str) {
        self.0.lock().unwrap().push(Event::BoxArt(rom.into()));
    }

    fn skins(&self, skins: &crate::skins::Skins) {
        self.0.lock().unwrap().push(Event::Skins(skins.clone()));
    }
}

impl Recorded {
    fn events(&self) -> Vec<Event> {
        self.0.lock().unwrap().clone()
    }

    fn states(&self, rom: &str) -> Vec<GameState> {
        self.events()
            .into_iter()
            .filter_map(|event| match event {
                Event::Game(path, state) if path == rom => Some(state),
                _ => None,
            })
            .collect()
    }

    fn box_art(&self) -> Vec<String> {
        let roms: BTreeSet<String> = self
            .events()
            .into_iter()
            .filter_map(|event| match event {
                Event::BoxArt(rom) => Some(rom),
                _ => None,
            })
            .collect();
        roms.into_iter().collect()
    }

    fn last_run(&self) -> Option<RunProgress> {
        self.events().into_iter().rev().find_map(|event| match event {
            Event::Run(run) => Some(run),
            _ => None,
        })
    }
}

fn no_wait(_: Duration) -> BoxFuture<'static, ()> {
    Box::pin(std::future::ready(()))
}

const EMERALD: &str = "gba/Emerald.gba";
const RUBY: &str = "gba/Ruby.gba";
const KADABRA: &str = "KADABRA-00001-00000";

fn kept(key: &str, generation: u8, game: &str) -> StoredCopy {
    StoredCopy {
        identity_key: key.into(),
        generation,
        game: game.into(),
        bytes: game.as_bytes().to_vec(),
        aliases: Vec::new(),
        ambiguous: false,
    }
}

fn skin(skin: &str, changed_at: i64) -> crate::skins::Choice {
    crate::skins::Choice { skin: skin.into(), look: "moulded".into(), changed_at }
}

fn kept_as(key: &str, alias: &str, generation: u8, game: &str) -> StoredCopy {
    StoredCopy { aliases: vec![alias.into()], ..kept(key, generation, game) }
}

struct Device {
    name: &'static str,
    root: PathBuf,
    kept: PathBuf,
    skins: PathBuf,
    cheat_bases: PathBuf,
    removed: PathBuf,
    games: GamesFolder<'static, tauri::Wry>,
    index: Arc<Index>,
    in_use: Arc<InUse>,
    sync_games: AtomicBool,
    metered: AtomicBool,
    mobile_data: AtomicBool,
    mobile_roms: AtomicBool,
}

fn device(test: &str, name: &'static str) -> Device {
    let root = std::env::temp_dir().join(format!("pkh-emu-sync-{test}-{name}-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&root);
    std::fs::create_dir_all(root.join("games")).unwrap();
    let (index, _) = temp_index(&format!("sync-{test}-{name}"));
    Device {
        name,
        games: GamesFolder::at(root.join("games")).logging_to(index.clone()),
        kept: kept_copies::dir(&root),
        skins: crate::skins::file(&root),
        cheat_bases: root.join("sync-cheats"),
        removed: root.join("removed"),
        root,
        index,
        in_use: Arc::default(),
        sync_games: AtomicBool::new(false),
        metered: AtomicBool::new(false),
        mobile_data: AtomicBool::new(true),
        mobile_roms: AtomicBool::new(false),
    }
}

trait Cloud {
    const NAME: &str;
    fn new() -> Self;
    fn provider(&self) -> &dyn Provider;
}

impl Cloud for Memory {
    const NAME: &str = "memory";

    fn new() -> Memory {
        Memory::default()
    }

    fn provider(&self) -> &dyn Provider {
        self
    }
}

impl Cloud for FakeDrive {
    const NAME: &str = "drive";

    fn new() -> FakeDrive {
        FakeDrive::new()
    }

    fn provider(&self) -> &dyn Provider {
        &self.drive
    }
}

impl Cloud for FakeDropbox {
    const NAME: &str = "dropbox";

    fn new() -> FakeDropbox {
        FakeDropbox::new()
    }

    fn provider(&self) -> &dyn Provider {
        &self.dropbox
    }
}

mod memory {
    type TestCloud = super::Memory;
    include!("suite.rs");
}

mod drive {
    type TestCloud = super::FakeDrive;
    include!("suite.rs");
}

mod dropbox {
    type TestCloud = super::FakeDropbox;
    include!("suite.rs");
}

static NOT_STOPPING: AtomicBool = AtomicBool::new(false);

impl Device {
    fn engine<'a>(&'a self, cloud: &'a impl Cloud, sleep: &'a Sleep) -> Engine<'a, tauri::Wry> {
        Engine {
            games: &self.games,
            index: &self.index,
            provider: cloud.provider(),
            conflicts: &self.root,
            cheat_bases: &self.cheat_bases,
            kept_copies: &self.kept,
            skins: &self.skins,
            removed: &self.removed,
            device: self.name,
            sleep,
            events: &NoEvents,
            in_use: &self.in_use,
            sync_games: &self.sync_games,
            metered: &self.metered,
            mobile_data: &self.mobile_data,
            mobile_roms: &self.mobile_roms,
            others_waiting: &|| false,
            stopping: &NOT_STOPPING,
            tracker: Tracker::default(),
            stopped_early: AtomicBool::new(false),
        }
    }

    fn sync(&self, cloud: &impl Cloud) -> Report {
        block_on(self.engine(cloud, &no_wait).sync_all()).unwrap()
    }

    fn sync_recorded(&self, cloud: &impl Cloud) -> (Result<Report, Error>, Recorded) {
        let events = Recorded::default();
        let report = block_on(Engine { events: &events, ..self.engine(cloud, &no_wait) }.sync_all());
        (report, events)
    }

    fn sync_ok(&self, cloud: &impl Cloud) {
        let report = self.sync(cloud);
        assert!(report.values().all(|synced| synced.error.is_none() && synced.conflicts.is_empty()), "{report:?}");
    }

    fn conflicts(&self, cloud: &impl Cloud, rom: &str) -> Vec<Conflict> {
        block_on(self.engine(cloud, &no_wait).conflicts(rom)).unwrap()
    }

    fn cloud_save(&self, cloud: &impl Cloud, rom: &str) -> Option<crate::save::SaveFile> {
        self.engine(cloud, &no_wait).cloud_save(rom).unwrap()
    }

    fn cloud_screenshot(&self, cloud: &impl Cloud, rom: &str, file: &str) -> Option<Vec<u8>> {
        self.engine(cloud, &no_wait).cloud_screenshot(rom, file).unwrap()
    }

    fn resolve(&self, cloud: &impl Cloud, rom: &str, file: &str, choice: Choice) {
        block_on(self.engine(cloud, &no_wait).resolve(rom, file, choice)).unwrap()
    }

    fn sync_games(&self, on: bool) {
        self.sync_games.store(on, Ordering::Relaxed);
    }

    fn cloud_games(&self, cloud: &impl Cloud) -> Vec<String> {
        block_on(self.engine(cloud, &no_wait).cloud_games()).unwrap()
    }

    fn cloud_rom_size(&self, cloud: &impl Cloud, rom: &str) -> Option<u64> {
        block_on(self.engine(cloud, &no_wait).cloud_rom_size(rom)).unwrap()
    }

    fn download_rom(&self, cloud: &impl Cloud, rom: &str) -> Result<(), Error> {
        block_on(self.engine(cloud, &no_wait).download_rom(rom, &|_, _| {}))
    }

    fn remove_from_device(&self, cloud: &impl Cloud, rom: &str) -> Result<(), Error> {
        block_on(self.engine(cloud, &no_wait).remove_from_device(rom))
    }

    fn delete(&self, cloud: &impl Cloud, rom: &str) {
        block_on(self.engine(cloud, &no_wait).delete(rom)).unwrap()
    }

    fn keep(&self, copy: StoredCopy) {
        kept_copies::keep(&self.kept, vec![copy]).unwrap();
    }

    fn kept_copies(&self, keys: &[&str]) -> Vec<StoredCopy> {
        kept_copies::read_all(&self.kept, &keys.iter().map(|key| key.to_string()).collect::<Vec<_>>()).unwrap()
    }

    fn choose_skin(&self, system: &str, skin: &str, at: i64) {
        crate::skins::choose(&self.skins, system, self::skin(skin, at)).unwrap();
    }

    fn skins(&self) -> crate::skins::Skins {
        crate::skins::read(&self.skins).unwrap()
    }

    fn add_cheat(&self, name: &str, at: i64) {
        self.change_cheats(|codes, platform| {
            cheats::add(codes, platform, name, "82025840 0063", at);
            Ok(())
        });
    }

    fn change_cheats(&self, change: impl FnOnce(&mut Vec<cheats::Code>, cheats::Platform) -> Result<(), String>) {
        block_on(cheats::update(&self.games, EMERALD, change)).unwrap();
    }

    fn cheats(&self) -> Vec<cheats::Code> {
        block_on(cheats::read(&self.games, EMERALD)).unwrap()
    }

    fn cheat_id(&self, name: &str) -> String {
        self.cheats().into_iter().find(|code| code.name == name).unwrap().id
    }

    fn cheat_names(&self) -> Vec<String> {
        self.cheats().into_iter().map(|code| code.name).collect()
    }

    fn write(&self, path: &str, bytes: &[u8]) {
        block_on(self.games.write(path, bytes)).unwrap();
    }

    fn read(&self, path: &str) -> Option<Vec<u8>> {
        block_on(self.games.read(path)).ok()
    }

    fn remove(&self, path: &str) {
        block_on(self.games.remove(EMERALD, path)).unwrap();
    }

    fn choose_box_art(&self, rom: &str, name: &str, bytes: &[u8]) {
        block_on(crate::box_art::choose(&self.games, rom, name, bytes)).unwrap();
    }

    fn rename(&self, from: &str, to: &str) {
        block_on(self.games.rename(from, to)).unwrap();
    }

    fn files(&self, dir: &str) -> Vec<String> {
        let mut names: Vec<_> = block_on(self.games.read_dir(dir)).unwrap_or_default().into_iter().map(|entry| entry.name).collect();
        names.sort();
        names
    }

    fn held(&self) -> Vec<(String, Vec<u8>)> {
        let mut held = Vec::new();
        let mut dirs = vec![self.removed.clone()];
        while let Some(dir) = dirs.pop() {
            for entry in std::fs::read_dir(&dir).into_iter().flatten().map(Result::unwrap) {
                match entry.file_type().unwrap().is_dir() {
                    true => dirs.push(entry.path()),
                    false => {
                        let path =
                            entry.path().strip_prefix(&self.removed).unwrap().to_string_lossy().replace('\\', "/");
                        held.push((path, std::fs::read(entry.path()).unwrap()));
                    }
                }
            }
        }
        held.sort();
        held
    }

    fn backups(&self, rom: &str) -> Vec<(String, Vec<u8>)> {
        let dir = format!("{}/backups", rom::data_dir(rom));
        self.files(&dir).into_iter().map(|name| (name.clone(), self.read(&format!("{dir}/{name}")).unwrap())).collect()
    }
}

#[test]
fn leaves_the_game_being_played_alone() {
    let (a, b, cloud) = (device("playing", "A"), device("playing", "B"), Memory::new());
    for device in [&a, &b] {
        device.write(EMERALD, b"emerald rom");
    }
    a.write("gba/Emerald.sav", b"save from A");
    a.sync_ok(&cloud);
    block_on(b.in_use.start_playing(EMERALD, None));

    let report = b.sync(&cloud);

    assert!(!report.contains_key(EMERALD));
    assert_eq!(b.read("gba/Emerald.sav"), None);
}

#[test]
fn leaves_the_cart_in_the_transfer_pak_alone_until_its_game_stops() {
    let (a, b, cloud) = (device("cart", "A"), device("cart", "B"), Memory::new());
    for device in [&a, &b] {
        device.write("gb/Red.gb", b"red rom");
    }
    a.write("gb/Red.sav", b"save from A");
    a.sync_ok(&cloud);
    b.sync_ok(&cloud);
    a.write("gb/Red.sav", b"newer save from A");
    a.sync_ok(&cloud);
    block_on(b.in_use.start_playing("n64/Stadium.z64", Some("gb/Red.gb")));

    b.sync_ok(&cloud);

    assert_eq!(b.read("gb/Red.sav").unwrap(), b"save from A");
    b.in_use.playing(None, None);
    b.sync_ok(&cloud);
    assert_eq!(b.read("gb/Red.sav").unwrap(), b"newer save from A");
}

#[test]
fn tells_the_library_when_sync_changes_box_art() {
    let (a, b, cloud) = (device("box-art-event", "A"), device("box-art-event", "B"), Memory::new());
    for device in [&a, &b] {
        device.sync_games(true);
    }
    a.write(EMERALD, b"emerald rom");
    a.write(RUBY, b"ruby rom");
    b.write(EMERALD, b"emerald rom");
    a.choose_box_art(EMERALD, "box-art.png", b"emerald png");
    a.choose_box_art(RUBY, "box-art.png", b"ruby png");
    a.sync_ok(&cloud);

    let (_, events) = b.sync_recorded(&cloud);
    assert_eq!(events.box_art(), [EMERALD, RUBY]);

    let (_, events) = b.sync_recorded(&cloud);
    assert!(events.box_art().is_empty());

    a.choose_box_art(RUBY, "box-art.none", b"");
    a.sync_ok(&cloud);
    let (_, events) = b.sync_recorded(&cloud);
    assert_eq!(events.box_art(), [RUBY]);
}

#[test]
fn waits_at_least_as_long_as_the_cloud_asks() {
    let (a, cloud) = (device("asked-wait", "A"), Memory::new());
    a.write(EMERALD, b"emerald rom");
    let waits = Arc::new(Mutex::new(Vec::new()));
    let sleep = {
        let waits = waits.clone();
        move |wait: Duration| -> BoxFuture<'static, ()> {
            waits.lock().unwrap().push(wait.as_secs());
            Box::pin(std::future::ready(()))
        }
    };
    cloud.slow_down_for(4, Duration::from_secs(5));

    block_on(a.engine(&cloud, &sleep).sync_all()).unwrap();

    assert_eq!(*waits.lock().unwrap(), [5, 5, 5, 8]);
}

#[test]
fn forgets_a_record_deleted_while_the_cloud_had_reset_its_cursor() {
    let (a, cloud) = (device("reset-cursor", "A"), FakeDropbox::new());
    a.write(EMERALD, b"emerald rom");
    a.sync_ok(&cloud);
    let id = a.index.synced_games().unwrap()[0].id.clone();

    block_on(cloud.dropbox.delete_record(&id)).unwrap();
    cloud.reset_cursors();
    block_on(a.engine(&cloud, &no_wait).refresh()).unwrap();

    assert_eq!(a.index.sync_record(&id).unwrap(), None);
}

#[test]
fn finds_the_roms_the_library_shows() {
    let a = device("scan", "A");
    let games = ["gba/Emerald.gba", "gba/Emerald/states/slot-1.state", "gba/Hacks/Radical Red.zip", "nds/Platinum.7z"];
    let more = ["gb/Red.GB", "gb/.hidden.gb", "Loose.gba", "3ds/X.3ds", "3ds/X.sav", "3ds/PKSM.3dsx"];
    for path in games.into_iter().chain(more) {
        a.write(path, b"x");
    }

    let mut roms = block_on(scan(&a.games));
    roms.sort();

    assert_eq!(
        roms,
        ["3ds/PKSM.3dsx", "3ds/X.3ds", "gb/Red.GB", "gba/Emerald.gba", "gba/Hacks/Radical Red.zip", "nds/Platinum.7z"]
    );
}

fn sha1s(files: &[(&str, &str)]) -> Sha1s {
    files.iter().map(|(path, sha1)| (path.to_string(), sha1.to_string())).collect()
}

#[test]
fn plans_each_file_from_the_device_the_last_sync_and_the_cloud() {
    let backup = "gba/Emerald/backups/2026-10-05_1412_edit.sav";
    let step = |local: &[(&str, &str)], base: &[(&str, &str)], cloud: &[(&str, &str)]| {
        plan(EMERALD, &sha1s(local), &sha1s(base), &sha1s(cloud), &Sha1s::new())
    };
    let path = |step: fn(String) -> Step| vec![step(backup.into())];

    assert_eq!(step(&[(backup, "new")], &[(backup, "old")], &[(backup, "old")]), path(Step::Upload));
    assert_eq!(step(&[(backup, "old")], &[(backup, "old")], &[(backup, "new")]), path(Step::Download));
    assert_eq!(step(&[(backup, "old")], &[(backup, "old")], &[]), path(Step::DeleteLocal));
    assert_eq!(step(&[(backup, "new")], &[(backup, "old")], &[]), path(Step::Upload));
    assert_eq!(step(&[], &[(backup, "old")], &[(backup, "new")]), path(Step::Download));
    assert_eq!(step(&[(backup, "same")], &[], &[(backup, "same")]), path(Step::Agree));
    assert_eq!(step(&[(backup, "a")], &[(backup, "old")], &[(backup, "b")]), path(Step::Newer));
    assert_eq!(step(&[("gba/Emerald.sav", "a")], &[], &[("gba/Emerald.sav", "b")]), [Step::Conflict(Unit::Save)]);
}

#[test]
fn plans_a_file_missing_here_from_what_the_app_logged_deleting() {
    let backup = "gba/Emerald/backups/2026-10-05_1412_edit.sav";
    let step = |base: &[(&str, &str)], cloud: &[(&str, &str)], deleted: &[(&str, &str)]| {
        plan(EMERALD, &Sha1s::new(), &sha1s(base), &sha1s(cloud), &sha1s(deleted))
    };
    let path = |step: fn(String) -> Step| vec![step(backup.into())];

    assert_eq!(step(&[(backup, "old")], &[(backup, "old")], &[(backup, "old")]), path(Step::DeleteCloud));
    assert_eq!(step(&[(backup, "old")], &[(backup, "old")], &[]), path(Step::Download));
    assert_eq!(step(&[(backup, "old")], &[(backup, "new")], &[(backup, "old")]), path(Step::Download));
    assert_eq!(step(&[], &[(backup, "old")], &[]), path(Step::Download));
    assert_eq!(step(&[(backup, "old")], &[], &[(backup, "old")]), path(Step::Agree));
    assert_eq!(step(&[(backup, "old")], &[], &[]), path(Step::Agree));
    let resume = "gba/Emerald/states/resume.state";
    let conflict = plan(
        EMERALD,
        &sha1s(&[("gba/Emerald.sav", "a")]),
        &sha1s(&[("gba/Emerald.sav", "old"), (resume, "old")]),
        &sha1s(&[("gba/Emerald.sav", "b"), (resume, "old")]),
        &sha1s(&[(resume, "old")]),
    );
    assert_eq!(conflict, [Step::Conflict(Unit::Save)]);
}

fn syncing_games(test: &str) -> (Device, Device, Memory) {
    let (a, b) = (device(test, "A"), device(test, "B"));
    a.sync_games(true);
    b.sync_games(true);
    a.write(EMERALD, b"emerald rom");
    (a, b, Memory::new())
}

#[test]
fn an_interrupted_rom_download_leaves_nothing_at_the_roms_path() {
    let (a, b, cloud) = syncing_games("interrupted-download");
    a.sync_ok(&cloud);
    b.sync_ok(&cloud);
    cloud.drop_download_after(4);

    assert!(b.download_rom(&cloud, EMERALD).is_err());

    assert!(b.files("gba").is_empty(), "{:?}", b.files("gba"));
    assert_eq!(b.cloud_games(&cloud), [EMERALD]);
    b.download_rom(&cloud, EMERALD).unwrap();
    assert_eq!(b.read(EMERALD).unwrap(), b"emerald rom");
}

#[test]
fn a_full_sync_removes_a_rom_download_the_app_was_killed_in() {
    let (a, b, cloud) = syncing_games("killed-download");
    a.sync_ok(&cloud);
    b.write("nds/Game.nds.incomplete", b"half a rom");

    block_on(b.engine(&cloud, &no_wait).sync(&[EMERALD.into()])).unwrap();
    assert_eq!(b.files("nds"), ["Game.nds.incomplete"]);

    b.sync_ok(&cloud);
    assert!(b.files("nds").is_empty(), "{:?}", b.files("nds"));
}

#[test]
fn roms_wait_for_a_network_that_doesnt_charge_for_data() {
    let (a, b, cloud) = syncing_games("metered");
    a.write("gba/Emerald.sav", b"save");
    a.metered.store(true, Ordering::Relaxed);

    a.sync_ok(&cloud);
    b.sync_ok(&cloud);

    assert_eq!(cloud.uploaded_bytes(), 4);
    assert!(b.cloud_games(&cloud).is_empty());
    a.metered.store(false, Ordering::Relaxed);
    a.sync_ok(&cloud);
    b.sync_ok(&cloud);
    assert_eq!(b.cloud_games(&cloud), [EMERALD]);
}

#[test]
fn a_cloud_only_games_size_comes_from_its_record() {
    let (a, b, cloud) = syncing_games("cloud-rom-size");
    a.sync_ok(&cloud);
    b.sync_ok(&cloud);

    assert_eq!(b.cloud_rom_size(&cloud, EMERALD), Some(11));
    assert_eq!(b.cloud_rom_size(&cloud, RUBY), None);
}

#[test]
fn with_include_roms_on_roms_upload_on_mobile_data() {
    let (a, b, cloud) = syncing_games("mobile-roms");
    a.metered.store(true, Ordering::Relaxed);
    a.mobile_roms.store(true, Ordering::Relaxed);

    a.sync_ok(&cloud);
    b.sync_ok(&cloud);

    assert_eq!(b.cloud_games(&cloud), [EMERALD]);
}

#[test]
fn with_sync_on_mobile_data_off_a_metered_run_moves_nothing_and_changed_games_wait() {
    let (a, cloud) = (device("mobile-data-off", "A"), Memory::new());
    a.write(EMERALD, b"emerald rom");
    a.write(RUBY, b"ruby rom");
    a.sync_ok(&cloud);
    a.write("gba/Emerald.sav", b"save");
    a.metered.store(true, Ordering::Relaxed);
    a.mobile_data.store(false, Ordering::Relaxed);
    let (uploaded, writes) = (cloud.uploaded_bytes(), cloud.record_writes());

    let (report, events) = a.sync_recorded(&cloud);

    assert_eq!(report, Err(Error::MobileData));
    assert_eq!((cloud.uploaded_bytes(), cloud.record_writes()), (uploaded, writes));
    assert_eq!(events.states(EMERALD), [GameState::Waiting { reason: Wait::MobileData }]);
    assert!(events.states(RUBY).is_empty());
    a.mobile_data.store(true, Ordering::Relaxed);
    a.sync_ok(&cloud);
    assert_eq!(cloud.uploaded_bytes(), uploaded + 4);
}

#[test]
fn with_sync_on_mobile_data_off_wifi_still_syncs() {
    let (a, cloud) = (device("mobile-data-wifi", "A"), Memory::new());
    a.write(EMERALD, b"emerald rom");
    a.write("gba/Emerald.sav", b"save");
    a.mobile_data.store(false, Ordering::Relaxed);

    a.sync_ok(&cloud);

    assert_eq!(cloud.uploaded_bytes(), 4);
}

fn unlocked(dir: &Path) -> Arc<crate::plus::Plus> {
    Arc::new(crate::plus::Plus::new(dir, crate::plus::Build::Unlocked, None, Box::new(|_| {})))
}

#[test]
fn the_mobile_data_switches_survive_a_restart() {
    let dir = std::env::temp_dir().join(format!("pkh-emu-sync-settings-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).unwrap();
    let syncer = Syncer::new(&dir, Arc::default(), unlocked(&dir));
    assert_eq!(syncer.mobile_data(), MobileData { on: true, roms: false });

    syncer.set_games(true).unwrap();
    syncer.set_mobile_data(MobileData { on: false, roms: true }).unwrap();

    let restarted = Syncer::new(&dir, Arc::default(), unlocked(&dir));
    assert!(restarted.sync_games.load(Ordering::Relaxed));
    assert_eq!(restarted.mobile_data(), MobileData { on: false, roms: true });
}

#[test]
fn signing_in_after_a_reinstall_deletes_nothing_from_the_cloud() {
    let (a, cloud) = (device("reinstall", "A"), Arc::new(Memory::new()));
    a.sync_games(true);
    a.write(EMERALD, b"emerald rom");
    a.write("gba/Emerald.sav", b"save");
    a.write("gba/Emerald/states/slot-1.state", b"slot");
    a.sync_ok(&*cloud);
    let (records, blobs) = (cloud.records(), cloud.blobs());
    let reinstalled = Device { index: a.index.clone(), ..device("reinstall", "reinstalled") };
    let syncer = Syncer::new(&reinstalled.root, Arc::default(), unlocked(&reinstalled.root));

    syncer.sign_in(&reinstalled.index, super::Cloud::Google, cloud.clone()).unwrap();
    reinstalled.sync_ok(&*cloud);
    reinstalled.download_rom(&*cloud, EMERALD).unwrap();
    reinstalled.sync_ok(&*cloud);

    assert_eq!(cloud.records(), records);
    assert_eq!(cloud.blobs(), blobs);
}

const X: &str = "3ds/X.3ds";
const X_UPDATE: &str = "3ds/X/update.cia";

fn x_update(version: u16) -> Vec<u8> {
    use crate::three_ds::tests::{cia_of, ncch};
    let id = 0x0004000E00055D00;
    cia_of(id, version, &[(0, 0, ncch(id, true, true))])
}

fn with_x(device: &Device, update: u16) {
    device.write(X, &crate::three_ds::tests::ncch(0x0004000000055D00, true, true));
    device.write(X_UPDATE, &x_update(update));
}

#[test]
fn a_games_update_goes_up_and_comes_down_with_its_rom() {
    let (a, b, cloud) = syncing_games("update");
    with_x(&a, 1040);
    a.sync_ok(&cloud);
    b.sync_ok(&cloud);

    let rom = a.read(X).unwrap();
    assert_eq!(b.cloud_rom_size(&cloud, X), Some((rom.len() + x_update(1040).len()) as u64));
    b.download_rom(&cloud, X).unwrap();
    assert_eq!(b.read(X_UPDATE), Some(x_update(1040)));

    a.write(X_UPDATE, &x_update(5232));
    a.sync_ok(&cloud);
    b.sync_ok(&cloud);
    assert_eq!(b.read(X_UPDATE), Some(x_update(5232)));
    assert!(!cloud.blobs().contains(&x_update(1040)));
    assert!(cloud.retired().is_empty());

    b.write(X_UPDATE, &x_update(1040));
    b.sync_ok(&cloud);
    assert_eq!(b.read(X_UPDATE), Some(x_update(5232)));

    a.delete(&cloud, X);
    assert!(!cloud.blobs().contains(&x_update(5232)));
}

#[test]
fn an_update_moves_only_while_sync_games_is_on_and_waits_for_wifi() {
    let (a, cloud) = (device("update-gated", "A"), Memory::new());
    with_x(&a, 5232);
    a.write("3ds/X.sav", b"save");

    a.sync_ok(&cloud);
    assert_eq!(cloud.blobs(), [b"save".to_vec()]);

    a.sync_games(true);
    a.metered.store(true, Ordering::Relaxed);
    a.sync_ok(&cloud);
    assert!(!cloud.blobs().contains(&x_update(5232)));
    assert!(a.remove_from_device(&cloud, X).is_err());

    a.metered.store(false, Ordering::Relaxed);
    a.sync_ok(&cloud);
    assert!(cloud.blobs().contains(&x_update(5232)));
    a.remove_from_device(&cloud, X).unwrap();
    assert!(a.held().iter().all(|(path, _)| !path.ends_with("update.cia")), "{:?}", a.held());
}

#[test]
fn an_update_moves_with_its_renamed_game_on_every_device() {
    let (a, b, cloud) = syncing_games("update-rename");
    with_x(&a, 5232);
    a.sync_ok(&cloud);
    b.sync_ok(&cloud);
    b.download_rom(&cloud, X).unwrap();

    a.rename(X, "3ds/Y.3ds");
    a.sync_ok(&cloud);
    b.sync_ok(&cloud);

    for device in [&a, &b] {
        assert_eq!(device.read("3ds/Y/update.cia"), Some(x_update(5232)), "{}", device.name);
        assert_eq!(device.read(X_UPDATE), None, "{}", device.name);
    }
}

#[test]
fn an_update_the_app_cant_read_holds_back_none_of_the_games_files() {
    let (a, cloud) = (device("update-unreadable", "A"), Memory::new());
    a.sync_games(true);
    a.write(X, &crate::three_ds::tests::ncch(0x0004000000055D00, true, true));
    let id = 0x0004000E00055D00;
    let encrypted = crate::three_ds::tests::cia_of(id, 5232, &[(0, 1, crate::three_ds::tests::ncch(id, true, true))]);
    a.write(X_UPDATE, &encrypted);
    a.write("3ds/X.sav", b"save");

    a.sync_ok(&cloud);

    assert!(cloud.blobs().contains(&b"save".to_vec()));
}

#[test]
fn a_replaced_save_stays_in_the_cloud_retired_but_a_replaced_rom_goes_at_once() {
    let (a, cloud) = (device("retired", "A"), Memory::new());
    a.sync_games(true);
    a.write(EMERALD, b"emerald rom");
    a.write("gba/Emerald.sav", b"save 1");
    a.sync_ok(&cloud);

    a.write(EMERALD, b"patched emerald rom");
    a.write("gba/Emerald.sav", b"save 2");
    a.sync_ok(&cloud);

    let mut blobs = cloud.blobs();
    blobs.sort();
    assert_eq!(blobs, [b"patched emerald rom".to_vec(), b"save 2".to_vec()]);
    assert_eq!(cloud.retired(), [b"save 1".to_vec()]);
}

#[test]
fn deleting_a_game_retires_its_files_and_deletes_its_rom() {
    let (a, cloud) = (device("delete-retires", "A"), Memory::new());
    a.sync_games(true);
    a.write(EMERALD, b"emerald rom");
    a.write("gba/Emerald.sav", b"save");
    a.sync_ok(&cloud);

    a.delete(&cloud, EMERALD);

    assert!(cloud.blobs().is_empty());
    assert_eq!(cloud.retired(), [b"save".to_vec()]);
}

#[test]
fn signing_in_forgets_everything_synced_before() {
    let (a, cloud) = (device("sign-in-forgets", "A"), Arc::new(Memory::new()));
    a.write(EMERALD, b"emerald rom");
    a.write("gba/Emerald.sav", b"save");
    a.sync_ok(&*cloud);
    let pending = PendingUpload { sha1: "sha1".into(), blob: "blob".into(), session: None };
    a.index.keep_sync_upload(EMERALD, "gba/Emerald.sav", &pending).unwrap();
    a.index.keep_sync_conflict(EMERALD, "gba/Emerald.sav", "cloud").unwrap();
    std::fs::create_dir_all(a.root.join("sync-conflicts")).unwrap();
    std::fs::create_dir_all(a.root.join("sync-cheats")).unwrap();
    a.index.keep_file_hash("gba/Emerald.sav", &FileHash { size: 4, mtime: 0, sha1: "sha1".into() }).unwrap();
    assert_eq!(a.index.sync_tables_with_rows().len(), 7);
    let syncer = Syncer::new(&a.root, Arc::default(), unlocked(&a.root));

    syncer.sign_in(&a.index, super::Cloud::Google, cloud).unwrap();

    assert_eq!(a.index.sync_tables_with_rows(), Vec::<&str>::new());
    assert!(!a.root.join("sync-conflicts").exists());
    assert!(!a.root.join("sync-cheats").exists());
}

#[test]
fn a_rom_upload_stops_for_a_sync_that_waits_and_resumes_later() {
    let (a, b, cloud) = syncing_games("rom-waits");
    let rom: Vec<u8> = (0..100_000u32).map(|i| (i % 251) as u8).collect();
    a.write(EMERALD, &rom);
    let others_waiting = || !cloud.records().is_empty();

    let report = block_on(Engine { others_waiting: &others_waiting, ..a.engine(&cloud, &no_wait) }.sync_all()).unwrap();

    assert!(report[EMERALD].error.is_none(), "{report:?}");
    assert!(cloud.records()[0]["rom"].get("blob").is_none());
    a.sync_ok(&cloud);
    b.sync_ok(&cloud);
    assert_eq!(b.cloud_games(&cloud), [EMERALD]);
}

#[test]
fn a_rom_upload_stopped_partway_for_a_waiting_sync_queues_another_full_sync() {
    let (a, cloud) = (device("rom-stops-partway", "A"), FakeDrive::new());
    a.sync_games(true);
    let rom: Vec<u8> = (0..super::drive::CHUNK * 2 + 1000).map(|i| (i % 251) as u8).collect();
    a.write(EMERALD, &rom);
    let others_waiting = || cloud.uploaded_bytes() >= super::drive::CHUNK;
    let engine = Engine { others_waiting: &others_waiting, ..a.engine(&cloud, &no_wait) };

    let report = block_on(engine.sync_all()).unwrap();

    assert!(report[EMERALD].error.is_none(), "{report:?}");
    assert!(engine.stopped_early.load(Ordering::Relaxed));
    assert!(cloud.records()[0]["rom"].get("blob").is_none());
}

#[test]
fn a_stopped_full_sync_pauses_its_rom_upload_partway() {
    let (a, cloud) = (device("rom-stopped-partway", "A"), FakeDrive::new());
    a.sync_games(true);
    let rom: Vec<u8> = (0..super::drive::CHUNK * 2 + 1000).map(|i| (i % 251) as u8).collect();
    a.write(EMERALD, &rom);
    let stopping = AtomicBool::new(false);
    let stops_after_a_chunk = || {
        if cloud.uploaded_bytes() >= super::drive::CHUNK {
            stopping.store(true, Ordering::Relaxed);
        }
        false
    };
    let engine = Engine { stopping: &stopping, others_waiting: &stops_after_a_chunk, ..a.engine(&cloud, &no_wait) };

    let report = block_on(engine.sync_all()).unwrap();

    assert!(report[EMERALD].error.is_none(), "{report:?}");
    assert!(!engine.stopped_early.load(Ordering::Relaxed));
    assert!(cloud.records()[0]["rom"].get("blob").is_none());
    a.sync_ok(&cloud);
    assert_eq!(cloud.uploaded_bytes(), rom.len() as u64);
    assert!(cloud.records()[0]["rom"].get("blob").is_some());
}

struct StopsOnceSynced<'a> {
    recorded: Recorded,
    stopping: &'a AtomicBool,
}

impl Events for StopsOnceSynced<'_> {
    fn game(&self, rom: &str, state: &GameState) {
        if matches!(state, GameState::Synced { .. }) {
            self.stopping.store(true, Ordering::Relaxed);
        }
        self.recorded.game(rom, state);
    }

    fn run(&self, run: &RunProgress) {
        self.recorded.run(run);
    }
}

#[test]
fn a_stopped_full_sync_leaves_the_games_it_hasnt_reached() {
    let (a, cloud) = (device("stopped-between-games", "A"), Memory::new());
    for rom in [EMERALD, RUBY] {
        a.write(rom, rom.as_bytes());
    }
    a.write("gba/Emerald.sav", b"emerald save");
    a.write("gba/Ruby.sav", b"ruby save");
    let stopping = AtomicBool::new(false);
    let events = StopsOnceSynced { recorded: Recorded::default(), stopping: &stopping };
    let engine = Engine { stopping: &stopping, events: &events, ..a.engine(&cloud, &no_wait) };

    let report = block_on(engine.sync_all()).unwrap();

    assert_eq!(report.len(), 1, "{report:?}");
    assert!(!engine.stopped_early.load(Ordering::Relaxed));
    let left = if report.contains_key(EMERALD) { RUBY } else { EMERALD };
    assert_eq!(events.recorded.states(left).last(), Some(&GameState::Waiting { reason: Wait::Stopped }));
    assert_eq!(cloud.records().len(), 1);
}

#[test]
fn a_stopped_rom_doesnt_count_as_synced() {
    let (a, _, cloud) = syncing_games("stopped-rom");
    let stopping = AtomicBool::new(false);
    let stops_once_recorded = || {
        if !cloud.records().is_empty() {
            stopping.store(true, Ordering::Relaxed);
        }
        false
    };
    let events = Recorded::default();
    let engine = Engine {
        stopping: &stopping,
        others_waiting: &stops_once_recorded,
        events: &events,
        ..a.engine(&cloud, &no_wait)
    };

    block_on(engine.sync_all()).unwrap();

    let states = events.states(EMERALD);
    assert_eq!(states.last(), Some(&GameState::Waiting { reason: Wait::Stopped }));
    assert!(!states.iter().any(|state| matches!(state, GameState::Synced { .. })), "{states:?}");
}

#[test]
fn a_rom_held_for_mobile_data_queues_no_other_full_sync() {
    let (a, _, cloud) = syncing_games("rom-held-for-mobile-data");
    a.metered.store(true, Ordering::Relaxed);
    let engine = a.engine(&cloud, &no_wait);

    block_on(engine.sync_all()).unwrap();

    assert!(!engine.stopped_early.load(Ordering::Relaxed));
}

#[test]
fn a_paused_game_sends_its_files_up_and_leaves_the_clouds_for_later() {
    let (a, b, cloud) = (device("lent", "A"), device("lent", "B"), Memory::new());
    for device in [&a, &b] {
        device.write(EMERALD, b"emerald rom");
    }
    a.write("gba/Emerald.sav", b"save from A");
    a.sync_ok(&cloud);
    b.sync_ok(&cloud);
    a.write("gba/Emerald/states/slot-1.state", b"slot from A");
    a.sync_ok(&cloud);
    block_on(b.in_use.start_playing(EMERALD, None));
    b.write("gba/Emerald.sav", b"save from B");
    b.write("gba/Emerald/states/resume.state", b"resume from B");
    b.in_use.lend();

    b.sync_ok(&cloud);

    assert_eq!(b.files("gba/Emerald/states"), ["resume.state"]);
    a.sync_ok(&cloud);
    assert_eq!(a.read("gba/Emerald.sav").unwrap(), b"save from B");
    assert_eq!(a.read("gba/Emerald/states/resume.state").unwrap(), b"resume from B");
    b.in_use.playing(None, None);
    b.sync_ok(&cloud);
    assert_eq!(b.read("gba/Emerald/states/slot-1.state").unwrap(), b"slot from A");
}

#[test]
fn a_paused_game_deleted_elsewhere_stays_here() {
    let (a, b, cloud) = (device("lent-deleted", "A"), device("lent-deleted", "B"), Memory::new());
    for device in [&a, &b] {
        device.write(EMERALD, b"emerald rom");
    }
    a.write("gba/Emerald.sav", b"save");
    a.sync_ok(&cloud);
    b.sync_ok(&cloud);
    block_on(b.in_use.start_playing(EMERALD, None));
    b.in_use.lend();

    a.delete(&cloud, EMERALD);
    b.sync_ok(&cloud);

    assert_eq!(b.read("gba/Emerald.sav").unwrap(), b"save");
}

#[test]
fn a_full_sync_stops_between_games_for_one_waiting_to_open() {
    let (a, b, cloud) = (device("stops-for-a-game", "A"), device("stops-for-a-game", "B"), Memory::new());
    for rom in [EMERALD, RUBY] {
        a.write(rom, rom.as_bytes());
    }
    a.write("gba/Emerald.sav", b"emerald save");
    a.write("gba/Ruby.sav", b"ruby save");
    let others_waiting = || !cloud.records().is_empty();
    let engine = Engine { others_waiting: &others_waiting, ..a.engine(&cloud, &no_wait) };

    let report = block_on(engine.sync_all()).unwrap();

    assert_eq!(report.len(), 1, "{report:?}");
    assert!(engine.stopped_early.load(Ordering::Relaxed));
    a.sync_ok(&cloud);
    b.write(EMERALD, EMERALD.as_bytes());
    b.write(RUBY, RUBY.as_bytes());
    b.sync_ok(&cloud);
    assert_eq!(b.read("gba/Emerald.sav").unwrap(), b"emerald save");
    assert_eq!(b.read("gba/Ruby.sav").unwrap(), b"ruby save");
}

#[test]
fn roms_wait_while_a_game_runs() {
    let (a, b, cloud) = syncing_games("roms-while-playing");
    a.write("gba/Emerald.sav", b"save");
    a.write(RUBY, b"ruby rom");
    block_on(a.in_use.start_playing(RUBY, None));

    a.sync_ok(&cloud);
    b.sync_ok(&cloud);

    assert_eq!(cloud.uploaded_bytes(), 4);
    assert!(b.cloud_games(&cloud).is_empty());
    a.in_use.playing(None, None);
    a.sync_ok(&cloud);
    b.sync_ok(&cloud);
    assert_eq!(b.cloud_games(&cloud), [EMERALD, RUBY]);
}

fn a_rom_upload_stops_when_a_game_starts_and_finishes_in_the_full_sync_after_it_quits<C: Cloud + Sync>(
    chunk: u64,
    uploaded: fn(&C) -> u64,
) {
    let test = format!("{}-rom-stops-for-a-game", C::NAME);
    let (a, b, cloud) = (device(&test, "A"), device(&test, "B"), C::new());
    a.sync_games(true);
    b.sync_games(true);
    let rom: Vec<u8> = (0..chunk * 2 + 1000).map(|i| (i % 251) as u8).collect();
    a.write(EMERALD, &rom);
    // The upload checks whether to stop before each read, so this starts a game partway through it.
    let game_starts_after_a_chunk = || {
        if uploaded(&cloud) >= chunk {
            a.in_use.playing(Some(EMERALD), None);
        }
        false
    };

    let engine = Engine { others_waiting: &game_starts_after_a_chunk, ..a.engine(&cloud, &no_wait) };

    let report = block_on(engine.sync_all()).unwrap();

    assert!(report[EMERALD].error.is_none(), "{report:?}");
    assert!(!engine.stopped_early.load(Ordering::Relaxed));
    assert_eq!(uploaded(&cloud), chunk);
    a.in_use.playing(None, None);
    let report = block_on(a.engine(&cloud, &no_wait).sync(&[EMERALD.into()])).unwrap();
    assert!(report[EMERALD].error.is_none(), "{report:?}");
    assert_eq!(uploaded(&cloud), chunk);
    a.sync_ok(&cloud);
    assert_eq!(uploaded(&cloud), rom.len() as u64);
    b.sync_ok(&cloud);
    b.download_rom(&cloud, EMERALD).unwrap();
    assert_eq!(b.read(EMERALD).unwrap(), rom);
}

#[test]
fn a_rom_upload_to_drive_stops_when_a_game_starts_and_finishes_in_the_full_sync_after_it_quits() {
    a_rom_upload_stops_when_a_game_starts_and_finishes_in_the_full_sync_after_it_quits(
        super::drive::CHUNK,
        FakeDrive::uploaded_bytes,
    );
}

#[test]
fn a_rom_upload_to_dropbox_stops_when_a_game_starts_and_finishes_in_the_full_sync_after_it_quits() {
    a_rom_upload_stops_when_a_game_starts_and_finishes_in_the_full_sync_after_it_quits(
        super::fake_dropbox::CHUNK,
        FakeDropbox::uploaded_bytes,
    );
}

#[test]
fn syncing_one_game_before_it_opens_leaves_its_rom_for_a_full_sync() {
    let (a, b, cloud) = syncing_games("one-game");

    let report = block_on(a.engine(&cloud, &no_wait).sync(&[EMERALD.into()])).unwrap();

    assert!(report[EMERALD].error.is_none(), "{report:?}");
    assert!(cloud.records()[0]["rom"].get("blob").is_none());
    a.sync_ok(&cloud);
    b.sync_ok(&cloud);
    assert_eq!(b.cloud_games(&cloud), [EMERALD]);
}

#[test]
fn a_game_deleted_elsewhere_while_played_here_goes_back_to_the_cloud_whole() {
    let (a, b, cloud) = (device("deleted-while-played", "A"), device("deleted-while-played", "B"), Memory::new());
    for device in [&a, &b] {
        device.write(EMERALD, b"emerald rom");
    }
    a.write("gba/Emerald.sav", b"save");
    a.write("gba/Emerald/backups/2026-10-05_1412_edit.sav", b"backup");
    a.sync_ok(&cloud);
    b.sync_ok(&cloud);
    block_on(b.in_use.start_playing(EMERALD, None));

    a.delete(&cloud, EMERALD);
    b.sync_ok(&cloud);
    b.in_use.playing(None, None);
    b.sync_ok(&cloud);
    a.write(EMERALD, b"emerald rom");
    a.sync_ok(&cloud);

    for device in [&a, &b] {
        assert_eq!(device.read("gba/Emerald.sav").unwrap(), b"save", "{}", device.name);
        assert_eq!(device.backups(EMERALD).len(), 1, "{}", device.name);
    }
    assert_eq!(cloud.records().len(), 1);
}

#[test]
fn a_kept_copy_seen_by_a_one_game_sync_comes_down_at_the_full_sync() {
    let (a, b, cloud) = (device("kept-one-game", "A"), device("kept-one-game", "B"), Memory::new());
    b.write(EMERALD, b"emerald rom");
    a.keep(kept(KADABRA, 5, "Black"));
    a.sync_ok(&cloud);

    block_on(b.engine(&cloud, &no_wait).sync(&[EMERALD.into()])).unwrap();
    b.sync_ok(&cloud);

    assert_eq!(b.kept_copies(&[KADABRA]), [kept(KADABRA, 5, "Black")]);
}

#[test]
fn skins_from_the_cloud_reach_the_screen() {
    let (a, b, cloud) = (device("skins-event", "A"), device("skins-event", "B"), Memory::new());
    a.choose_skin("gba", "glacier", 5);
    a.sync_ok(&cloud);
    b.choose_skin("gb", "classic-grey", 6);

    let (_, events) = b.sync_recorded(&cloud);

    let shown: Vec<_> = events.events().into_iter().filter(|event| matches!(event, Event::Skins(_))).collect();
    assert_eq!(shown, [Event::Skins(crate::skins::Skins::from([("gba".into(), skin("glacier", 5))]))]);
}

#[test]
fn skins_already_here_send_nothing_to_the_screen() {
    let (a, cloud) = (device("skins-no-event", "A"), Memory::new());
    a.choose_skin("gba", "glacier", 5);

    let (_, events) = a.sync_recorded(&cloud);

    assert!(!events.events().iter().any(|event| matches!(event, Event::Skins(_))));
}

#[test]
fn a_skins_record_this_version_cant_read_is_left_alone() {
    let (a, cloud) = (device("skins-unreadable", "A"), Memory::new());
    block_on(cloud.write_record("skins", br#"["a later version"]"#, None)).unwrap();
    a.choose_skin("gba", "glacier", 5);
    let writes = cloud.record_writes();

    a.sync_ok(&cloud);

    assert_eq!(cloud.record_writes(), writes);
    assert_eq!(a.skins(), crate::skins::Skins::from([("gba".into(), skin("glacier", 5))]));
}

#[test]
fn a_kept_copy_record_this_version_cant_read_is_left_alone() {
    let (a, cloud) = (device("kept-unreadable", "A"), Memory::new());
    block_on(cloud.write_record(&format!("kept-copy-{KADABRA}"), br#"{"from":"a later version"}"#, None)).unwrap();
    a.keep(kept(KADABRA, 4, "Platinum"));
    a.keep(kept("ABRA-00002-00000", 4, "Platinum"));
    let writes = cloud.record_writes();

    a.sync_ok(&cloud);

    assert_eq!(cloud.record_writes(), writes + 1);
    assert_eq!(a.kept_copies(&[KADABRA]), [kept(KADABRA, 4, "Platinum")]);
}

fn transferring(event: &Event) -> bool {
    matches!(event, Event::Game(_, GameState::Transferring { .. }))
}

#[test]
fn checks_every_game_before_moving_a_byte_and_plans_the_whole_transfer() {
    let (a, cloud) = (device("check-first", "A"), Memory::new());
    a.sync_games(true);
    a.write(EMERALD, b"emerald rom");
    a.write(RUBY, b"ruby rom");
    a.write("gba/Emerald.sav", b"save");
    a.write("gba/Emerald/states/slot-1.state", b"slot");

    let (report, events) = a.sync_recorded(&cloud);

    report.unwrap();
    let events = events.events();
    let first = events.iter().position(transferring).unwrap();
    let checking = |events: &[Event]| -> Vec<(usize, usize)> {
        events
            .iter()
            .filter_map(|event| match event {
                Event::Run(RunProgress::Checking { done, total }) => Some((*done, *total)),
                _ => None,
            })
            .collect()
    };
    assert_eq!(checking(&events[..first]), [(0, 2), (1, 2), (2, 2)]);
    assert!(checking(&events[first..]).is_empty());
    let planned = (b"emerald rom".len() + b"ruby rom".len() + b"save".len() + b"slot".len()) as u64;
    let runs: Vec<(u64, u64)> = events
        .iter()
        .filter_map(|event| match event {
            Event::Run(RunProgress::Transferring { done, total, .. }) => Some((*done, *total)),
            _ => None,
        })
        .collect();
    assert!(runs.iter().all(|(_, total)| *total == planned), "{runs:?}");
    assert_eq!(runs.last(), Some(&(planned, planned)));
}

fn upload_progress_rises_chunk_by_chunk<C: Cloud>(chunk: u64) {
    let test = format!("{}-rom-progress", C::NAME);
    let (a, cloud) = (device(&test, "A"), C::new());
    a.sync_games(true);
    let rom: Vec<u8> = (0..chunk * 2 + 1000).map(|i| (i % 251) as u8).collect();
    a.write(EMERALD, &rom);

    let (report, events) = a.sync_recorded(&cloud);

    report.unwrap();
    let size = rom.len() as u64;
    let progress: Vec<(u64, u64)> = events
        .states(EMERALD)
        .into_iter()
        .filter_map(|state| match state {
            GameState::Transferring { done, total, stage: Stage::UploadingRom } => Some((done, total)),
            _ => None,
        })
        .collect();
    let chunks: Vec<(u64, u64)> = (1..=size.div_ceil(chunk)).map(|sent| ((sent * chunk).min(size), size)).collect();
    assert_eq!(progress, chunks);
}

#[test]
fn rom_upload_progress_to_drive_rises_chunk_by_chunk() {
    upload_progress_rises_chunk_by_chunk::<FakeDrive>(super::drive::CHUNK);
}

#[test]
fn rom_upload_progress_to_dropbox_rises_chunk_by_chunk() {
    upload_progress_rises_chunk_by_chunk::<FakeDropbox>(super::fake_dropbox::CHUNK);
}

fn synced(state: Option<&GameState>) -> bool {
    matches!(state, Some(GameState::Synced { .. }))
}

#[test]
fn a_game_with_nothing_to_do_is_synced_without_queueing() {
    let (a, cloud) = (device("nothing-to-do", "A"), Memory::new());
    a.write(EMERALD, b"emerald rom");
    a.write("gba/Emerald.sav", b"save");
    a.sync_ok(&cloud);

    let (_, events) = a.sync_recorded(&cloud);

    let states = events.states(EMERALD);
    assert_eq!(states.len(), 1, "{states:?}");
    assert!(synced(states.first()));
}

#[test]
fn a_game_waiting_its_turn_is_queued() {
    let (a, cloud) = (device("queued", "A"), Memory::new());
    a.write(EMERALD, b"emerald rom");
    a.write(RUBY, b"ruby rom");
    a.write("gba/Emerald.sav", b"emerald save");
    a.write("gba/Ruby.sav", b"ruby save");

    let (_, events) = a.sync_recorded(&cloud);

    let events = events.events();
    let first = events.iter().position(transferring).unwrap();
    let Event::Game(moving, _) = &events[first] else { unreachable!() };
    let other = if moving == EMERALD { RUBY } else { EMERALD };
    let other_before = events[..first].iter().rev().find_map(|event| match event {
        Event::Game(rom, state) if rom == other => Some(state.clone()),
        _ => None,
    });
    assert_eq!(other_before, Some(GameState::Queued));
    for rom in [EMERALD, RUBY] {
        let states: Vec<GameState> = events
            .iter()
            .filter_map(|event| match event {
                Event::Game(path, state) if path == rom => Some(state.clone()),
                _ => None,
            })
            .collect();
        assert!(synced(states.last()), "{rom}: {states:?}");
    }
}

#[test]
fn a_game_that_hits_a_conflict_says_so() {
    let (a, b, cloud) = (device("conflict-state", "A"), device("conflict-state", "B"), Memory::new());
    for device in [&a, &b] {
        device.write(EMERALD, b"emerald rom");
    }
    a.write("gba/Emerald.sav", b"save 0");
    a.sync_ok(&cloud);
    b.sync_ok(&cloud);
    a.write("gba/Emerald.sav", b"save from A");
    b.write("gba/Emerald.sav", b"save from B");
    a.sync_ok(&cloud);

    let (_, events) = b.sync_recorded(&cloud);

    assert_eq!(events.states(EMERALD).last(), Some(&GameState::Conflict));
}

#[test]
fn a_game_whose_sync_fails_shows_the_error_until_a_later_sync_goes_through() {
    let (a, cloud) = (device("error-state", "A"), Memory::new());
    a.write(EMERALD, b"emerald rom");
    a.write("gba/Emerald.sav", b"save");
    cloud.drop_upload_after(2);

    let (_, failed) = a.sync_recorded(&cloud);
    let (_, retried) = a.sync_recorded(&cloud);

    let message = "the connection dropped".to_string();
    assert_eq!(failed.states(EMERALD).last(), Some(&GameState::Error { message }));
    assert!(synced(retried.states(EMERALD).last()));
}

#[test]
fn offline_a_game_with_a_changed_save_waits_for_a_connection() {
    let (a, cloud) = (device("offline", "A"), Memory::new());
    a.write(EMERALD, b"emerald rom");
    a.write(RUBY, b"ruby rom");
    a.sync_ok(&cloud);
    a.write("gba/Emerald.sav", b"new save");
    cloud.offline(true);

    let (report, events) = a.sync_recorded(&cloud);

    assert_eq!(report, Err(Error::Offline));
    assert_eq!(events.states(EMERALD), [GameState::Waiting { reason: Wait::Offline }]);
    assert!(events.states(RUBY).is_empty());
}

#[test]
fn offline_is_not_an_account_error() {
    let (a, cloud) = (device("offline-account", "A"), Memory::new());
    a.write(EMERALD, b"emerald rom");
    a.sync_ok(&cloud);
    a.write("gba/Emerald.sav", b"new save");
    cloud.offline(true);

    let (report, _) = a.sync_recorded(&cloud);

    assert!(report.is_err());
    assert_eq!(account_error(&report), None);
}

#[test]
fn a_full_cloud_is_an_account_error() {
    let (a, cloud) = (device("full", "A"), Memory::new());
    a.write(EMERALD, b"emerald rom");
    a.write("gba/Emerald.sav", b"save");
    cloud.full(true);

    let (report, _) = a.sync_recorded(&cloud);

    assert_eq!(account_error(&report).as_deref(), Some("Your cloud is full"));
}

#[test]
fn a_game_that_fails_alone_is_not_an_account_error() {
    let (a, cloud) = (device("one-game-fails", "A"), Memory::new());
    a.write(EMERALD, b"emerald rom");
    a.write("gba/Emerald.sav", b"save");
    cloud.drop_upload_after(2);

    let (report, _) = a.sync_recorded(&cloud);

    assert!(report.as_ref().unwrap()[EMERALD].error.is_some());
    assert_eq!(account_error(&report), None);
}

#[test]
fn a_game_whose_only_transfer_is_a_rom_held_back_is_synced_and_its_rom_waits() {
    let (a, cloud) = (device("rom-held", "A"), Memory::new());
    a.sync_games(true);
    a.metered.store(true, Ordering::Relaxed);
    a.write(EMERALD, b"emerald rom");

    let (report, events) = a.sync_recorded(&cloud);

    report.unwrap();
    assert!(synced(events.states(EMERALD).last()));
    assert_eq!(
        events.last_run(),
        Some(RunProgress::Transferring { done: 0, total: 0, waiting_roms: vec![EMERALD.into()] })
    );
}

#[test]
fn a_clean_sync_keeps_the_games_last_synced_time() {
    let (a, cloud) = (device("last-synced", "A"), Memory::new());
    a.write(EMERALD, b"emerald rom");
    let before = index::now();

    let (_, events) = a.sync_recorded(&cloud);

    let Some(GameState::Synced { last_synced }) = events.states(EMERALD).last().cloned() else { panic!() };
    assert!(last_synced >= before);
    assert_eq!(a.index.games_last_synced().unwrap(), [(EMERALD.to_string(), last_synced)]);
}

struct Slow<'a>(&'a dyn Provider);

impl Provider for Slow<'_> {
    fn account(&self) -> String {
        self.0.account()
    }

    fn changes<'a>(&'a self, cursor: Option<&'a str>) -> BoxFuture<'a, Result<Changes, Error>> {
        self.0.changes(cursor)
    }

    fn read_record<'a>(&'a self, id: &'a str) -> BoxFuture<'a, Result<Option<Versioned>, Error>> {
        self.0.read_record(id)
    }

    fn write_record<'a>(
        &'a self,
        id: &'a str,
        json: &'a [u8],
        expected: Option<&'a str>,
    ) -> BoxFuture<'a, Result<String, Error>> {
        self.0.write_record(id, json, expected)
    }

    fn delete_record<'a>(&'a self, id: &'a str) -> BoxFuture<'a, Result<(), Error>> {
        self.0.delete_record(id)
    }

    fn start_upload<'a>(&'a self, blob: &'a str, size: u64, sha1: &'a str) -> BoxFuture<'a, Result<String, Error>> {
        self.0.start_upload(blob, size, sha1)
    }

    fn uploaded<'a>(&'a self, session: &'a str) -> BoxFuture<'a, Result<Option<u64>, Error>> {
        self.0.uploaded(session)
    }

    fn upload<'a>(
        &'a self,
        session: &'a str,
        offset: u64,
        from: &'a mut (dyn Read + Send),
        sent: &'a Sent<'a>,
    ) -> BoxFuture<'a, Result<(), Error>> {
        Box::pin(async move {
            tokio::time::sleep(Duration::from_secs(60)).await;
            self.0.upload(session, offset, from, sent).await
        })
    }

    fn download<'a>(
        &'a self,
        blob: &'a str,
        to: &'a mut (dyn std::io::Write + Send),
    ) -> BoxFuture<'a, Result<(), Error>> {
        self.0.download(blob, to)
    }

    fn delete_blob<'a>(&'a self, blob: &'a str) -> BoxFuture<'a, Result<(), Error>> {
        self.0.delete_blob(blob)
    }

    fn retire_blob<'a>(&'a self, blob: &'a str) -> BoxFuture<'a, Result<(), Error>> {
        self.0.retire_blob(blob)
    }

    fn purge_retired(&self, older_than: Duration) -> BoxFuture<'_, Result<(), Error>> {
        self.0.purge_retired(older_than)
    }
}

const GAME: &str = "gb/Game.gb";

fn playing_on(a: &Device) -> crate::emu::Emu {
    let in_use = a.in_use.clone();
    let (index, _) = temp_index(&format!("sync-emu-{}", a.root.display().to_string().replace('/', "-")));
    let emu = crate::emu::Emu::start(
        std::env::temp_dir(),
        index,
        a.in_use.clone(),
        Box::new(move |path, cart| in_use.playing(path, cart)),
        Box::new(|_| {}),
    );
    emu.play_into(&a.root.join("games"));
    emu.run_frames(30);
    emu
}

fn with_the_test_game(test: &str) -> (Device, Device, Memory) {
    let (a, b, cloud) = (device(test, "A"), device(test, "B"), Memory::new());
    for device in [&a, &b] {
        device.write(GAME, &crate::test_games::boot_counting_rom().bytes);
    }
    (a, b, cloud)
}

fn has_the_game_as_it_was_left(a: &Device, b: &Device) {
    for path in ["gb/Game.sav", "gb/Game/states/resume.state"] {
        assert!(a.read(path).is_some(), "{path}");
        assert_eq!(b.read(path), a.read(path), "{path}");
    }
}

#[test]
fn a_game_paused_in_the_background_syncs_and_stays_paused() {
    let _lock = crate::test_games::lock_core();
    let (a, b, cloud) = with_the_test_game("paused-in-background");
    let emu = playing_on(&a);

    emu.pause();
    let report = block_on(a.engine(&cloud, &no_wait).sync(&[GAME.into()])).unwrap();

    assert!(report[GAME].error.is_none(), "{report:?}");
    b.sync_ok(&cloud);
    has_the_game_as_it_was_left(&a, &b);
    let memory = emu.read_memory(0xC000, 1).unwrap();
    emu.run_frames(10);
    assert_eq!(emu.read_memory(0xC000, 1).unwrap(), memory);
    emu.send(crate::emu::Command::Resume);
    emu.run_frames(10);
    assert_ne!(emu.read_memory(0xC000, 1).unwrap(), memory);
    emu.stop();
}

#[test]
fn quitting_sends_the_game_up_before_the_app_exits() {
    let _lock = crate::test_games::lock_core();
    let (a, b, cloud) = with_the_test_game("quit-sends");
    let emu = playing_on(&a);
    let engine = a.engine(&cloud, &no_wait);

    block_on(crate::platform::stop_and_sync(&emu, |game| async move { engine.sync(&[game.path]).await.unwrap() }));

    b.sync_ok(&cloud);
    has_the_game_as_it_was_left(&a, &b);
}

#[test]
fn a_slow_cloud_holds_quitting_up_for_five_seconds_at_most() {
    let _lock = crate::test_games::lock_core();
    let (a, _, cloud) = with_the_test_game("quit-slow");
    let emu = playing_on(&a);
    let slow = Slow(cloud.provider());
    let engine = Engine { provider: &slow, ..a.engine(&cloud, &no_wait) };
    let started = std::time::Instant::now();

    block_on(crate::platform::stop_and_sync(&emu, |game| async move { engine.sync(&[game.path]).await }));

    let waited = started.elapsed();
    assert!(waited >= Duration::from_secs(5) && waited < Duration::from_secs(6), "{waited:?}");
    assert!(a.read("gb/Game/states/resume.state").is_some());
}

fn removed_on(days_ago: u64) -> String {
    (chrono::Local::now().date_naive() - chrono::Days::new(days_ago)).format(removed::DATE_FORMAT).to_string()
}

fn assert_held_today(device: &Device, files: &[(&str, &[u8])]) {
    let held: Vec<(String, Vec<u8>)> =
        files.iter().map(|(path, bytes)| (format!("{}/{path}", removed_on(0)), bytes.to_vec())).collect();
    assert_eq!(device.held(), held, "{}", device.name);
}

#[test]
fn a_file_deleted_on_another_device_is_held_rather_than_deleted() {
    let (a, b, cloud) = (device("held", "A"), device("held", "B"), Memory::new());
    for device in [&a, &b] {
        device.write(EMERALD, b"emerald rom");
    }
    a.write("gba/Emerald/states/slot-1.state", b"slot");
    a.sync_ok(&cloud);
    b.sync_ok(&cloud);

    a.remove("gba/Emerald/states/slot-1.state");
    a.sync_ok(&cloud);
    b.sync_ok(&cloud);

    assert_eq!(b.read("gba/Emerald/states/slot-1.state"), None);
    assert_held_today(&b, &[("gba/Emerald/states/slot-1.state", b"slot")]);
    assert!(a.held().is_empty());
}

#[test]
fn a_path_deleted_twice_in_a_day_keeps_both_copies() {
    let (a, b, cloud) = (device("held-twice", "A"), device("held-twice", "B"), Memory::new());
    for device in [&a, &b] {
        device.write(EMERALD, b"emerald rom");
    }
    for bytes in [b"first", b"again"] {
        a.write("gba/Emerald/states/slot-1.state", bytes);
        a.sync_ok(&cloud);
        b.sync_ok(&cloud);
        a.remove("gba/Emerald/states/slot-1.state");
        a.sync_ok(&cloud);
        b.sync_ok(&cloud);
    }

    let files: &[(&str, &[u8])] =
        &[("gba/Emerald/states/slot-1 (2).state", b"again"), ("gba/Emerald/states/slot-1.state", b"first")];
    assert_held_today(&b, files);
}

#[test]
fn held_files_go_after_30_days() {
    let (a, cloud) = (device("held-expiry", "A"), Memory::new());
    a.write(EMERALD, b"emerald rom");
    for days_ago in [31, 29] {
        crate::files::write_file(&a.removed.join(removed_on(days_ago)).join("gba/Emerald.sav"), b"save").unwrap();
    }
    std::fs::create_dir_all(a.removed.join("not a date")).unwrap();

    a.sync_ok(&cloud);

    let left: Vec<String> = a.held().into_iter().map(|(path, _)| path).collect();
    assert_eq!(left, [format!("{}/gba/Emerald.sav", removed_on(29))]);
    assert!(a.removed.join("not a date").is_dir());
}

#[test]
fn a_game_deleted_on_another_device_leaves_its_files_held_but_not_its_rom() {
    let (a, b, cloud) = syncing_games("held-game");
    a.write("gba/Emerald.sav", b"save");
    a.write("gba/Emerald/backups/2026-10-05_1412_edit.sav", b"backup");
    a.sync_ok(&cloud);
    b.sync_ok(&cloud);
    b.download_rom(&cloud, EMERALD).unwrap();
    b.sync_ok(&cloud);

    a.delete(&cloud, EMERALD);
    b.sync_ok(&cloud);

    assert!(b.files("gba").is_empty(), "{:?}", b.files("gba"));
    let files: &[(&str, &[u8])] =
        &[("gba/Emerald.sav", b"save"), ("gba/Emerald/backups/2026-10-05_1412_edit.sav", b"backup")];
    assert_held_today(&b, files);
    assert!(a.held().is_empty(), "{:?}", a.held());
}

#[test]
fn removing_a_game_from_this_device_holds_its_files() {
    let (a, _, cloud) = syncing_games("held-remove");
    a.write("gba/Emerald.sav", b"save");
    a.sync_ok(&cloud);

    a.remove_from_device(&cloud, EMERALD).unwrap();

    assert!(a.files("gba").is_empty(), "{:?}", a.files("gba"));
    assert_held_today(&a, &[("gba/Emerald.sav", b"save")]);
}

const SAVE: &str = "gba/Emerald.sav";
const SLOT: &str = "gba/Emerald/states/slot-1.state";
const BACKUP: &str = "gba/Emerald/backups/2026-10-05_1412_edit.sav";

fn synced_paths(cloud: &Memory) -> Vec<String> {
    let mut paths: Vec<String> = cloud.records()[0]["files"]
        .as_array()
        .unwrap()
        .iter()
        .map(|file| file["path"].as_str().unwrap().into())
        .collect();
    paths.sort();
    paths
}

fn played_on_both(test: &str) -> (Device, Device, Memory) {
    let (a, b, cloud) = (device(test, "A"), device(test, "B"), Memory::new());
    for device in [&a, &b] {
        device.write(EMERALD, b"emerald rom");
    }
    a.write(SAVE, b"save");
    a.write(SLOT, b"slot");
    a.write(BACKUP, b"backup");
    a.sync_ok(&cloud);
    b.sync_ok(&cloud);
    (a, b, cloud)
}

#[test]
fn a_folder_emptied_behind_the_apps_back_downloads_everything_again() {
    let (_, b, cloud) = played_on_both("emptied-folder");
    std::fs::remove_file(b.games.root().join(SAVE)).unwrap();
    std::fs::remove_dir_all(b.games.root().join("gba/Emerald")).unwrap();

    b.sync_ok(&cloud);

    assert_eq!(b.read(SAVE).unwrap(), b"save");
    assert_eq!(b.read(SLOT).unwrap(), b"slot");
    assert_eq!(b.read(BACKUP).unwrap(), b"backup");
    assert_eq!(synced_paths(&cloud), [SAVE, BACKUP, SLOT]);
}

#[test]
fn a_save_missing_without_the_app_deleting_it_downloads_again() {
    let (a, _, cloud) = played_on_both("missing-save");
    std::fs::remove_file(a.games.root().join(SAVE)).unwrap();

    a.sync_ok(&cloud);

    assert_eq!(a.read(SAVE).unwrap(), b"save");
    assert_eq!(synced_paths(&cloud), [SAVE, BACKUP, SLOT]);
}

#[test]
fn a_file_deleted_here_but_changed_elsewhere_first_comes_back() {
    let (a, b, cloud) = played_on_both("deleted-but-changed");
    a.remove(SLOT);
    b.write(SLOT, b"slot from B");
    b.sync_ok(&cloud);

    a.sync_ok(&cloud);
    a.sync_ok(&cloud);

    assert_eq!(a.read(SLOT).unwrap(), b"slot from B");
    assert_eq!(synced_paths(&cloud), [SAVE, BACKUP, SLOT]);
}

#[test]
fn a_backup_pruned_on_one_device_is_deleted_from_the_cloud_and_the_other_device() {
    let (a, b, cloud) = played_on_both("pruned-backup");
    let take = |save: &[u8], at: &str| {
        let (slot, _) = block_on(save::open(&a.games, EMERALD)).unwrap();
        block_on(backups::take(&a.games, EMERALD, &slot, Reason::Start, save, at, None)).unwrap();
    };
    for minute in 0..5 {
        take(format!("start {minute}").as_bytes(), &format!("2026-10-05_120{minute}"));
    }
    a.sync_ok(&cloud);
    b.sync_ok(&cloud);
    let oldest = "gba/Emerald/backups/2026-10-05_1200_start.sav";
    assert!(b.read(oldest).is_some());

    take(b"start 5", "2026-10-05_1205");
    a.sync_ok(&cloud);
    b.sync_ok(&cloud);

    assert!(a.read(oldest).is_none());
    assert!(b.read(oldest).is_none());
    assert!(!synced_paths(&cloud).contains(&oldest.to_string()));
    assert_eq!(b.backups(EMERALD).len(), 6);
}

#[test]
fn a_deletion_follows_its_game_when_the_rom_is_renamed() {
    let (a, b, cloud) = played_on_both("deleted-then-renamed");
    a.remove(SLOT);
    a.rename(EMERALD, "gba/Emerald (Hack).gba");

    a.sync_ok(&cloud);
    b.sync_ok(&cloud);

    assert!(b.read("gba/Emerald (Hack)/states/slot-1.state").is_none());
    assert_eq!(synced_paths(&cloud), ["gba/Emerald (Hack).sav", "gba/Emerald (Hack)/backups/2026-10-05_1412_edit.sav"]);
}

#[test]
fn a_deletion_reaches_the_cloud_once() {
    let (a, _, cloud) = played_on_both("deletion-forgotten");
    a.remove(SLOT);
    a.sync_ok(&cloud);
    let id = a.index.synced_games().unwrap()[0].id.clone();

    assert!(a.index.sync_deletions(EMERALD).unwrap().is_empty());
    assert!(a.index.synced_files(&id).unwrap().iter().all(|file| file.path != SLOT));
}

#[test]
fn picking_this_devices_slot_deletes_the_screenshot_it_no_longer_has() {
    let screenshot = "gba/Emerald/states/slot-1.png";
    let (a, b, cloud) = played_on_both("conflict-pick-device");
    a.write(screenshot, b"screenshot");
    a.sync_ok(&cloud);
    b.sync_ok(&cloud);
    a.write(SLOT, b"slot from A");
    a.remove(screenshot);
    b.write(SLOT, b"slot from B");
    b.write(screenshot, b"screenshot from B");
    b.sync_ok(&cloud);
    assert_eq!(a.sync(&cloud)[EMERALD].conflicts, ["slot-1"]);

    a.resolve(&cloud, EMERALD, "slot-1", Choice::Device);
    a.sync_ok(&cloud);
    b.sync_ok(&cloud);

    for device in [&a, &b] {
        assert_eq!(device.read(SLOT).unwrap(), b"slot from A", "{}", device.name);
        assert!(device.read(screenshot).is_none(), "{}", device.name);
    }
}
