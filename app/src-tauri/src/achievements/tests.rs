use super::*;
use crate::retro::Core;
use crate::sync::fake_http::{Reply, Request as Asked, Server};
use crate::test_games::{counting_rom, gba_counting_rom, lock_core};
use serde_json::json;
use std::collections::HashMap;
use std::sync::atomic::AtomicBool;
use std::time::{Duration, Instant};
use tauri::async_runtime::block_on;

#[derive(Clone, Default)]
pub struct FakeVault(Arc<Mutex<HashMap<String, String>>>);

impl FakeVault {
    pub fn token(&self, user: &str) -> Option<String> {
        self.0.lock().unwrap().get(user).cloned()
    }
}

impl Vault for FakeVault {
    fn load(&self, user: &str) -> Option<String> {
        self.token(user)
    }

    fn save(&self, user: &str, token: &str) -> Result<(), String> {
        self.0.lock().unwrap().insert(user.into(), token.into());
        Ok(())
    }

    fn forget(&self, user: &str) -> Result<(), String> {
        self.0.lock().unwrap().remove(user);
        Ok(())
    }
}

/// What RetroAchievements was asked: each request's form and user agent.
#[derive(Clone, Default)]
pub struct Asks(Arc<Mutex<Vec<(Vec<(String, String)>, String)>>>);

impl Asks {
    pub fn of(&self, request: &str) -> Vec<HashMap<String, String>> {
        let asks = self.0.lock().unwrap();
        let forms = asks.iter().map(|(form, _)| form.iter().cloned().collect::<HashMap<_, _>>());
        forms.filter(|form| form.get("r").map(String::as_str) == Some(request)).collect()
    }

    pub fn user_agents(&self) -> Vec<String> {
        self.0.lock().unwrap().iter().map(|(_, agent)| agent.clone()).collect()
    }

    pub fn count(&self) -> usize {
        self.0.lock().unwrap().len()
    }

    pub fn wait_for(&self, request: &str) -> HashMap<String, String> {
        self.wait_for_another(request, 0)
    }

    pub fn wait_for_another(&self, request: &str, seen: usize) -> HashMap<String, String> {
        let until = Instant::now() + Duration::from_secs(5);
        loop {
            if let Some(form) = self.of(request).into_iter().nth(seen) {
                return form;
            }
            assert!(Instant::now() < until, "RetroAchievements was never asked {request}");
            std::thread::sleep(Duration::from_millis(10));
        }
    }
}

pub const FRAMES_TO_UNLOCK: u32 = 10;

pub const BADGE: &[u8] = b"\x89PNG badge";

const AVATAR_UPDATED: u64 = 1_700_000_000;

pub struct FakeRetroAchievements {
    pub server: Server,
    pub asks: Asks,
    pub badges: Arc<Mutex<Vec<String>>>,
    pub offline: Arc<AtomicBool>,
    /// The achievements the player has on RetroAchievements, and whether in hardcore.
    pub earned: Arc<Mutex<Vec<(u32, bool)>>>,
    /// Whether RetroAchievements knows no game by the hash it's asked about.
    pub unknown: Arc<AtomicBool>,
}

#[derive(Clone, Default)]
pub struct Events(Arc<Mutex<Vec<Event>>>);

impl Events {
    pub fn all(&self) -> Vec<Event> {
        self.0.lock().unwrap().clone()
    }

    pub fn unlocks(&self) -> Vec<Unlocked> {
        let unlocks = self.all().into_iter().filter_map(|event| match event {
            Event::Unlocked(unlocked) => Some(unlocked),
            _ => None,
        });
        unlocks.collect()
    }

    pub fn play_until(&self, core: &mut Core, session: &mut Session, raised: impl Fn(&Event) -> bool) -> Event {
        let until = Instant::now() + Duration::from_secs(5);
        loop {
            if let Some(event) = self.all().into_iter().find(&raised) {
                return event;
            }
            assert!(Instant::now() < until, "never raised: {:?}", self.all());
            play(core, session, 1);
            std::thread::sleep(Duration::from_millis(5));
        }
    }
}

pub fn ten_frames() -> Unlocked {
    Unlocked {
        id: 101,
        title: "Ten frames".into(),
        description: "Play ten frames".into(),
        points: 5,
        badge: "00001".into(),
    }
}

// One achievement, which unlocks once it has been checked on ten frames.
fn ten_frames_definition() -> serde_json::Value {
    json!({
        "ID": 101, "Title": "Ten frames", "Description": "Play ten frames", "Flags": 3, "Points": 5,
        "MemAddr": format!("0=0.{FRAMES_TO_UNLOCK}."), "Author": "Tester", "BadgeName": "00001", "Created": 1, "Modified": 1,
        "Rarity": 62.5, "RarityHardcore": 20.0
    })
}

fn answer(
    form: &HashMap<String, String>,
    host: &str,
    set: &[serde_json::Value],
    leaderboards: &[serde_json::Value],
    earned: &[(u32, bool)],
    unknown: bool,
) -> Reply {
    let field = |name: &str| form.get(name).map(String::as_str);
    match field("r") {
        Some("achievementsets") if unknown => {
            Reply::json(404, json!({"Success": false, "Error": "Unknown game", "Code": "not_found", "Status": 404}))
        }
        Some("login2") if field("p") == Some("secret") || field("t") == Some("token") => Reply::json(
            200,
            json!({
                "Success": true, "User": "Player", "Token": "token", "Score": 1240, "SoftcoreScore": 85, "Messages": 0,
                "AvatarUrl": format!("http://{host}/UserPic/Player.png"), "AvatarUpdatedAt": AVATAR_UPDATED
            }),
        ),
        Some("login2") => Reply::json(
            401,
            json!({"Success": false, "Error": "Invalid User/Password combination. Please try again", "Code": "invalid_credentials", "Status": 401}),
        ),
        Some("achievementsets") => {
            let achievements: Vec<serde_json::Value> = set
                .iter()
                .map(|achievement| {
                    let mut achievement = achievement.clone();
                    let badge = format!("http://{host}/Badge/{}.png", achievement["BadgeName"].as_str().unwrap());
                    achievement["BadgeURL"] = badge.into();
                    achievement
                })
                .collect();
            let icon = format!("http://{host}/Images/000002.png");
            Reply::json(
                200,
                json!({
                    "Success": true, "GameId": 1, "Title": "Counting", "ConsoleId": 6, "ImageIconUrl": icon,
                    "RichPresenceGameId": 1, "RichPresencePatch": "", "Sets": [{
                        "AchievementSetId": 1, "GameId": 1, "Title": null, "Type": "core", "ImageIconUrl": icon,
                        "Achievements": achievements, "Leaderboards": leaderboards
                    }]
                }),
            )
        }
        Some("unlocks") => {
            let hardcore = field("h") == Some("1");
            let ids: Vec<u32> = earned.iter().filter(|(_, earned)| *earned || !hardcore).map(|(id, _)| *id).collect();
            Reply::json(200, json!({"Success": true, "UserUnlocks": ids, "GameID": 1, "HardcoreMode": hardcore}))
        }
        Some("startsession") => Reply::json(200, json!({"Success": true, "Unlocks": [], "HardcoreUnlocks": []})),
        Some("awardachievement") => Reply::json(
            200,
            json!({"Success": true, "Score": 5, "SoftcoreScore": 5, "AchievementID": 101, "AchievementsRemaining": 0}),
        ),
        Some("submitlbentry") => {
            let score = field("s").unwrap_or_default().parse::<i32>().unwrap_or_default();
            Reply::json(
                200,
                json!({"Success": true, "Response": {
                    "Score": score, "BestScore": score, "RankInfo": {"Rank": 1, "NumEntries": 1}, "TopEntries": []
                }}),
            )
        }
        _ => Reply::json(200, json!({"Success": true})),
    }
}

impl FakeRetroAchievements {
    pub fn start() -> FakeRetroAchievements {
        FakeRetroAchievements::with_set(vec![ten_frames_definition()])
    }

    pub fn with_set(achievements: Vec<serde_json::Value>) -> FakeRetroAchievements {
        FakeRetroAchievements::with_leaderboards(achievements, Vec::new())
    }

    pub fn with_leaderboards(
        achievements: Vec<serde_json::Value>,
        leaderboards: Vec<serde_json::Value>,
    ) -> FakeRetroAchievements {
        let badges: Arc<Mutex<Vec<String>>> = Arc::default();
        let (asks, offline) = (Asks::default(), Arc::new(AtomicBool::new(false)));
        let earned: Arc<Mutex<Vec<(u32, bool)>>> = Arc::default();
        let unknown = Arc::new(AtomicBool::new(false));
        let (asked, fetched, off) = (asks.clone(), Arc::clone(&badges), offline.clone());
        let (has, knows_none) = (earned.clone(), unknown.clone());
        let server = Server::start(move |request: Asked| {
            if off.load(Ordering::SeqCst) {
                return Reply::DropConnection;
            }
            if ["/Badge/", "/Images/", "/UserPic/"].iter().any(|path| request.path.starts_with(path)) {
                fetched.lock().unwrap().push(request.path.clone());
                return Reply::bytes(BADGE.to_vec());
            }
            let form: Vec<(String, String)> = request.form();
            let agent = request.header("user-agent").unwrap_or_default().to_string();
            let map: HashMap<String, String> = form.iter().cloned().collect();
            asked.0.lock().unwrap().push((form, agent));
            let earned = has.lock().unwrap().clone();
            answer(
                &map,
                request.header("host").unwrap_or_default(),
                &achievements,
                &leaderboards,
                &earned,
                knows_none.load(Ordering::SeqCst),
            )
        });
        FakeRetroAchievements { server, asks, badges, offline, earned, unknown }
    }

    pub fn achievements(&self, dir: &Path, vault: FakeVault) -> (Achievements, Events) {
        self.retrying_every(dir, vault, RETRY_SIGN_IN)
    }

    pub fn retrying_every(&self, dir: &Path, vault: FakeVault, every: Duration) -> (Achievements, Events) {
        let events = Events::default();
        let raised = events.clone();
        let on_event: OnEvent = Box::new(move |event| raised.0.lock().unwrap().push(event));
        (Achievements::at(Some(&self.server.url), dir, "1.2.3", Box::new(vault), on_event, every), events)
    }
}

pub fn temp_dir(name: &str) -> PathBuf {
    let dir = std::env::temp_dir().join(format!("pkh-emu-achievements-{name}-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).unwrap();
    dir
}

pub fn signed_in(fake: &FakeRetroAchievements, name: &str) -> (Achievements, Events, PathBuf) {
    let dir = temp_dir(name);
    let (achievements, unlocked) = fake.achievements(&dir, FakeVault::default());
    achievements.turn(true);
    block_on(achievements.sign_in("Player", "secret")).unwrap();
    (achievements, unlocked, dir)
}

/// Runs frames until rcheevos has the game's set, as the first frames after its answer activate it.
pub fn until_loaded(core: &mut Core, session: &mut Session) {
    let until = Instant::now() + Duration::from_secs(5);
    while !session.loaded() {
        assert!(Instant::now() < until, "the game's set never loaded");
        core.run_frame();
        session.frame(core);
        std::thread::sleep(Duration::from_millis(5));
    }
}

fn play(core: &mut Core, session: &mut Session, frames: u32) {
    for _ in 0..frames {
        core.run_frame();
        session.frame(core);
    }
}

#[test]
fn signs_in_with_a_password_and_keeps_the_token_in_the_vault() {
    let fake = FakeRetroAchievements::start();
    let vault = FakeVault::default();
    let (achievements, _) = fake.achievements(&temp_dir("sign-in"), vault.clone());
    achievements.turn(true);

    let signed = block_on(achievements.sign_in("Player", "secret"));

    assert_eq!(signed, Ok("Player".into()));
    assert_eq!(achievements.account(), Some("Player".into()));
    assert_eq!(vault.token("Player"), Some("token".into()));
    let login = fake.asks.wait_for("login2");
    assert_eq!((login["u"].as_str(), login["p"].as_str()), ("Player", "secret"));
}

#[test]
fn names_pkhemu_and_rcheevos_in_the_user_agent() {
    let fake = FakeRetroAchievements::start();
    signed_in(&fake, "user-agent");

    assert_eq!(fake.asks.user_agents(), ["pkhemu/1.2.3 rcheevos/12.5"]);
}

#[test]
fn a_wrong_password_signs_nobody_in() {
    let fake = FakeRetroAchievements::start();
    let vault = FakeVault::default();
    let (achievements, _) = fake.achievements(&temp_dir("wrong-password"), vault.clone());
    achievements.turn(true);

    let signed = block_on(achievements.sign_in("Player", "wrong"));

    assert_eq!(signed, Err("Invalid User/Password combination. Please try again".into()));
    assert_eq!(achievements.account(), None);
    assert_eq!(vault.token("Player"), None);
}

#[test]
fn signing_out_forgets_the_account_and_its_token() {
    let fake = FakeRetroAchievements::start();
    let dir = temp_dir("sign-out");
    let vault = FakeVault::default();
    let (achievements, _) = fake.achievements(&dir, vault.clone());
    achievements.turn(true);
    block_on(achievements.sign_in("Player", "secret")).unwrap();

    achievements.sign_out().unwrap();

    assert_eq!(achievements.account(), None);
    assert_eq!(vault.token("Player"), None);
    let (again, _) = fake.achievements(&dir, vault);
    assert_eq!(again.account(), None);
}

#[test]
fn signs_in_with_the_saved_token_when_turned_on() {
    let fake = FakeRetroAchievements::start();
    let dir = temp_dir("token");
    let vault = FakeVault::default();
    let (first, _) = fake.achievements(&dir, vault.clone());
    first.turn(true);
    block_on(first.sign_in("Player", "secret")).unwrap();
    drop(first);

    let (restarted, _) = fake.achievements(&dir, vault);
    restarted.turn(true);

    let login = fake.asks.wait_for_another("login2", 1);
    assert_eq!((login["u"].as_str(), login["t"].as_str()), ("Player", "token"));
    assert_eq!(restarted.account(), Some("Player".into()));
}

#[test]
fn calls_no_server_and_identifies_nothing_while_off() {
    let fake = FakeRetroAchievements::start();
    let dir = temp_dir("off");
    let vault = FakeVault::default();
    let (first, _) = fake.achievements(&dir, vault.clone());
    first.turn(true);
    block_on(first.sign_in("Player", "secret")).unwrap();
    first.turn(false);
    drop(first);
    let asked = fake.asks.count();

    let (achievements, _) = fake.achievements(&dir, vault);
    achievements.turn(false);

    assert!(achievements.identify(&counting_rom()).is_none());
    assert!(block_on(achievements.sign_in("Player", "secret")).is_err());
    assert!(achievements.0.client.get().is_none());
    std::thread::sleep(Duration::from_millis(100));
    assert_eq!(fake.asks.count(), asked);
}

#[test]
fn identifies_nothing_for_3ds_games() {
    let fake = FakeRetroAchievements::start();
    let (achievements, _, _) = signed_in(&fake, "3ds");

    let rom = Rom { name: "game.3ds".into(), bytes: vec![0; 0x4000], file: None };

    assert!(achievements.identify(&rom).is_none());
}

#[test]
fn unlocks_after_the_frames_its_conditions_need_and_sends_the_unlock() {
    let _core = lock_core();
    let fake = FakeRetroAchievements::start();
    let (achievements, unlocked, _) = signed_in(&fake, "unlock");
    let rom = counting_rom();
    let load = achievements.identify(&rom).unwrap();
    let mut core = Core::load(rom, &std::env::temp_dir()).unwrap();
    let mut session = load.start();
    until_loaded(&mut core, &mut session);

    play(&mut core, &mut session, FRAMES_TO_UNLOCK / 2);
    assert!(unlocked.unlocks().is_empty());
    play(&mut core, &mut session, FRAMES_TO_UNLOCK + 2);

    assert_eq!(unlocked.unlocks(), [ten_frames()]);
    let award = fake.asks.wait_for("awardachievement");
    assert_eq!((award["a"].as_str(), award["h"].as_str(), award["u"].as_str()), ("101", "0", "Player"));
    assert_eq!(fake.asks.wait_for("achievementsets")["m"], load_hash(&achievements));
    drop(session);
}

#[test]
fn a_hardcore_session_sends_hardcore_unlocks() {
    let _core = lock_core();
    let fake = FakeRetroAchievements::start();
    let (achievements, unlocked, _) = signed_in(&fake, "hardcore");
    let rom = counting_rom();
    let load = achievements.identify(&rom).unwrap().in_hardcore(true);
    let mut core = Core::load(rom, &std::env::temp_dir()).unwrap();
    let mut session = load.start();
    until_loaded(&mut core, &mut session);

    let completed = unlocked.play_until(&mut core, &mut session, |event| matches!(event, Event::Completed { .. }));

    assert!(matches!(completed, Event::Completed { hardcore: true, .. }));
    assert_eq!(fake.asks.wait_for("awardachievement")["h"].as_str(), "1");
    drop(session);
}

#[test]
fn leaving_hardcore_sends_the_rest_of_the_sessions_unlocks_as_softcore() {
    let _core = lock_core();
    let fake = FakeRetroAchievements::start();
    let (achievements, unlocked, _) = signed_in(&fake, "leave-hardcore");
    let rom = counting_rom();
    let load = achievements.identify(&rom).unwrap().in_hardcore(true);
    let mut core = Core::load(rom, &std::env::temp_dir()).unwrap();
    let mut session = load.start();
    until_loaded(&mut core, &mut session);

    session.leave_hardcore();
    play(&mut core, &mut session, FRAMES_TO_UNLOCK + 2);

    assert!(!session.hardcore());
    assert_eq!(unlocked.unlocks(), [ten_frames()]);
    assert_eq!(fake.asks.wait_for("awardachievement")["h"].as_str(), "0");
    drop(session);
}

#[test]
fn leaving_hardcore_before_the_set_loads_starts_it_in_softcore() {
    let _core = lock_core();
    let fake = FakeRetroAchievements::start();
    let (achievements, _, _) = signed_in(&fake, "leave-hardcore-early");
    let rom = counting_rom();
    let mut session = achievements.identify(&rom).unwrap().in_hardcore(true).start();
    let mut core = Core::load(rom, &std::env::temp_dir()).unwrap();

    session.leave_hardcore();
    until_loaded(&mut core, &mut session);
    play(&mut core, &mut session, FRAMES_TO_UNLOCK + 2);

    assert_eq!(fake.asks.wait_for("awardachievement")["h"].as_str(), "0");
    drop(session);
}

fn until_badge(achievements: &Achievements, name: &str) -> Vec<u8> {
    let until = Instant::now() + Duration::from_secs(5);
    loop {
        if let Some(badge) = achievements.badge(name) {
            return badge;
        }
        assert!(Instant::now() < until, "badge {name} was never downloaded");
        std::thread::sleep(Duration::from_millis(10));
    }
}

#[test]
fn keeps_the_sets_badges_on_disk_once_the_game_loads() {
    let _core = lock_core();
    let fake = FakeRetroAchievements::start();
    let (achievements, _, dir) = signed_in(&fake, "badges");
    assert_eq!(achievements.badge("00001"), None);
    let rom = counting_rom();
    let load = achievements.identify(&rom).unwrap();
    let mut core = Core::load(rom, &std::env::temp_dir()).unwrap();
    let mut session = load.start();
    until_loaded(&mut core, &mut session);

    assert_eq!(until_badge(&achievements, "00001"), BADGE);
    drop(session);
    drop(achievements);
    let (restarted, _) = fake.achievements(&dir, FakeVault::default());
    assert_eq!(restarted.badge("00001").as_deref(), Some(BADGE));
}

#[test]
fn downloads_a_badge_it_already_has_only_once() {
    let _core = lock_core();
    let fake = FakeRetroAchievements::start();
    let (achievements, _, _) = signed_in(&fake, "badges-once");
    for _ in 0..2 {
        let rom = counting_rom();
        let load = achievements.identify(&rom).unwrap();
        let mut core = Core::load(rom, &std::env::temp_dir()).unwrap();
        let mut session = load.start();
        until_loaded(&mut core, &mut session);
        until_badge(&achievements, "00001");
    }

    assert_eq!(*fake.badges.lock().unwrap(), ["/Badge/00001.png", "/Images/000002.png"]);
}

#[test]
fn keeps_the_games_badge_apart_from_its_achievements() {
    let _core = lock_core();
    let fake = FakeRetroAchievements::start();
    let (achievements, _, _) = signed_in(&fake, "game-badge");
    let rom = counting_rom();
    let load = achievements.identify(&rom).unwrap();
    let mut core = Core::load(rom, &std::env::temp_dir()).unwrap();
    let mut session = load.start();
    until_loaded(&mut core, &mut session);

    assert_eq!(until_badge(&achievements, "game-000002"), BADGE);
    assert_eq!(achievements.badge("000002"), None);
    drop(session);
}

fn started(fake: &FakeRetroAchievements, name: &str) -> (Achievements, Events, Core, Session) {
    started_in(fake, name, false)
}

fn started_in(fake: &FakeRetroAchievements, name: &str, hardcore: bool) -> (Achievements, Events, Core, Session) {
    let (achievements, events, _) = signed_in(fake, name);
    let rom = counting_rom();
    let load = achievements.identify(&rom).unwrap().in_hardcore(hardcore);
    let mut core = Core::load(rom, &std::env::temp_dir()).unwrap();
    let mut session = load.start();
    until_loaded(&mut core, &mut session);
    (achievements, events, core, session)
}

#[test]
fn completing_the_set_sends_the_game_its_points_and_its_badge() {
    let _core = lock_core();
    let fake = FakeRetroAchievements::start();
    let (_achievements, events, mut core, mut session) = started(&fake, "completed");

    let completed = events.play_until(&mut core, &mut session, |event| matches!(event, Event::Completed { .. }));

    let game = Event::Completed { game: "Counting".into(), points: 5, badge: "game-000002".into(), hardcore: false };
    assert_eq!(completed, game);
    assert!(matches!(events.all()[..], [Event::Unlocked(_), Event::Completed { .. }]));
}

#[test]
fn a_measured_achievement_sends_its_progress_as_it_counts() {
    let _core = lock_core();
    let fake = FakeRetroAchievements::with_set(vec![json!({
        "ID": 102, "Title": "Hundred frames", "Description": "Play a hundred frames", "Flags": 3, "Points": 10,
        "MemAddr": "M:0=0.100.", "Author": "Tester", "BadgeName": "00002", "Created": 1, "Modified": 1
    })]);
    let (_achievements, events, mut core, mut session) = started(&fake, "progress");

    events.play_until(
        &mut core,
        &mut session,
        |event| matches!(event, Event::Progress { progress, .. } if progress == "3/100"),
    );

    let progress: Vec<Event> =
        events.all().into_iter().filter(|event| matches!(event, Event::Progress { .. })).collect();
    let shown = |count: u32| Event::Progress {
        id: 102,
        title: "Hundred frames".into(),
        badge: "00002".into(),
        progress: format!("{count}/100"),
    };
    assert_eq!(progress[progress.len() - 2..], [shown(2), shown(3)]);
    drop(session);
}

#[test]
fn a_challenge_shows_while_it_is_primed_and_hides_when_it_unlocks() {
    let _core = lock_core();
    let fake = FakeRetroAchievements::with_set(vec![json!({
        "ID": 103, "Title": "Hold on", "Description": "Hold on for twenty frames", "Flags": 3, "Points": 10,
        "MemAddr": "0=0_T:0=0.20.", "Author": "Tester", "BadgeName": "00003", "Created": 1, "Modified": 1
    })]);
    let (_achievements, events, mut core, mut session) = started(&fake, "challenge");

    events.play_until(&mut core, &mut session, |event| matches!(event, Event::Unlocked(_)));

    let kinds: Vec<Event> =
        events.all().into_iter().filter(|event| !matches!(event, Event::Completed { .. })).collect();
    assert!(
        matches!(
            &kinds[..],
            [
                Event::ChallengeShown { id: 103, title, badge },
                Event::ChallengeHidden { id: 103 },
                Event::Unlocked(Unlocked { id: 103, .. }),
            ] if title == "Hold on" && badge == "00003"
        ),
        "{kinds:?}"
    );
    drop(session);
}

// Starts on the second frame, as rcheevos waits for a start to be false before it can start.
fn timed_leaderboard(frames: u32, fail: bool) -> FakeRetroAchievements {
    let (end, never) = (format!("0=0.{frames}."), "0=1".to_string());
    let (submit, cancel) = if fail { (never, end) } else { (end, never) };
    FakeRetroAchievements::with_leaderboards(
        vec![],
        vec![json!({
            "ID": 201, "Title": "Speedrun", "Description": "Finish fast", "Format": "FRAMES", "LowerIsBetter": true,
            "Mem": format!("STA:0=0.2.::CAN:{cancel}::SUB:{submit}::VAL:M:0=0"), "Hidden": false
        })],
    )
}

fn leaderboard_events(events: &Events) -> Vec<Event> {
    let shown = events.all().into_iter().filter(|event| {
        matches!(
            event,
            Event::LeaderboardStarted { .. }
                | Event::LeaderboardFailed { .. }
                | Event::LeaderboardSubmitted { .. }
                | Event::Tracker { .. }
                | Event::TrackerHidden { .. }
        )
    });
    shown.collect()
}

#[test]
fn a_hardcore_leaderboard_starts_tracks_and_submits_its_score() {
    let _core = lock_core();
    let fake = timed_leaderboard(30, false);
    let (_achievements, events, mut core, mut session) = started_in(&fake, "leaderboard", true);

    let submitted =
        events.play_until(&mut core, &mut session, |event| matches!(event, Event::LeaderboardSubmitted { .. }));

    let raised = leaderboard_events(&events);
    let Event::LeaderboardSubmitted { id: 201, title, score } = submitted else { panic!("{raised:?}") };
    assert_eq!(title, "Speedrun");
    assert!(
        matches!(&raised[..2], [Event::Tracker { id, .. }, Event::LeaderboardStarted { id: 201, title }] if *id == 1 && title == "Speedrun"),
        "{raised:?}"
    );
    let Some(Event::Tracker { value: last, .. }) =
        raised.iter().rev().find(|event| matches!(event, Event::Tracker { .. }))
    else {
        panic!("{raised:?}")
    };
    assert!(raised.iter().filter(|event| matches!(event, Event::Tracker { .. })).count() > 2, "{raised:?}");
    assert!(score.starts_with("0:00.") && score >= *last, "{score} after {last}");
    assert!(matches!(raised[raised.len() - 2..], [Event::TrackerHidden { id: 1 }, Event::LeaderboardSubmitted { .. }]));
    let entry = fake.asks.wait_for("submitlbentry");
    assert_eq!((entry["i"].as_str(), entry["u"].as_str()), ("201", "Player"));
    assert!(entry["s"].parse::<u32>().unwrap() > 0);
    drop(session);
}

#[test]
fn a_cancelled_leaderboard_fails_and_hides_its_tracker() {
    let _core = lock_core();
    let fake = timed_leaderboard(15, true);
    let (_achievements, events, mut core, mut session) = started_in(&fake, "leaderboard-failed", true);

    events.play_until(&mut core, &mut session, |event| matches!(event, Event::LeaderboardFailed { .. }));

    let raised = leaderboard_events(&events);
    assert!(
        matches!(&raised[raised.len() - 2..], [Event::TrackerHidden { id: 1 }, Event::LeaderboardFailed { id: 201, title }] if title == "Speedrun"),
        "{raised:?}"
    );
    play(&mut core, &mut session, 5);
    assert!(fake.asks.of("submitlbentry").is_empty());
    drop(session);
}

#[test]
fn leaderboards_never_start_in_softcore() {
    let _core = lock_core();
    let fake = timed_leaderboard(10, false);
    let (_achievements, events, mut core, mut session) = started_in(&fake, "leaderboard-softcore", false);

    play(&mut core, &mut session, 30);

    assert_eq!(leaderboard_events(&events), []);
    assert!(fake.asks.of("submitlbentry").is_empty());
    drop(session);
}

#[test]
fn leaving_hardcore_hides_a_running_leaderboard() {
    let _core = lock_core();
    let fake = timed_leaderboard(1000, false);
    let (_achievements, events, mut core, mut session) = started_in(&fake, "leaderboard-leave", true);
    events.play_until(&mut core, &mut session, |event| matches!(event, Event::LeaderboardStarted { .. }));

    session.leave_hardcore();
    play(&mut core, &mut session, 2);

    assert!(matches!(leaderboard_events(&events).last(), Some(Event::TrackerHidden { id: 1 })));
    drop(session);
}

#[test]
fn reads_no_badge_outside_its_folder() {
    let fake = FakeRetroAchievements::start();
    let (achievements, _, dir) = signed_in(&fake, "badge-path");
    std::fs::write(dir.join("secret.png"), b"secret").unwrap();

    assert_eq!(achievements.badge("../secret"), None);
}

fn load_hash(achievements: &Achievements) -> String {
    achievements.identify(&counting_rom()).unwrap().hash().into()
}

#[test]
fn reads_game_boy_work_ram_at_its_own_address() {
    let _core = lock_core();
    let fake = FakeRetroAchievements::start();
    let (achievements, _, _) = signed_in(&fake, "gb-memory");
    let rom = counting_rom();
    let load = achievements.identify(&rom).unwrap();
    let mut core = Core::load(rom, &std::env::temp_dir()).unwrap();
    let mut session = load.start();
    play(&mut core, &mut session, 1);

    let mut read = [0u8; 1];
    let length = unsafe { read_memory(0xC000, read.as_mut_ptr(), 1, std::ptr::null_mut()) };

    assert_eq!(length, 1);
    assert_eq!(read.to_vec(), core.read_memory(&[crate::memory::Range { address: 0xC000, length: 1 }]).unwrap());
    drop(session);
}

#[test]
fn reads_gba_internal_work_ram_where_retroachievements_puts_it() {
    let _core = lock_core();
    let fake = FakeRetroAchievements::start();
    let (achievements, _, _) = signed_in(&fake, "gba-memory");
    let rom = gba_counting_rom();
    let load = achievements.identify(&rom).unwrap();
    let mut core = Core::load(rom, &std::env::temp_dir()).unwrap();
    let mut session = load.start();
    play(&mut core, &mut session, 3);

    let mut read = [0u8; 4];
    let length = unsafe { read_memory(0, read.as_mut_ptr(), 4, std::ptr::null_mut()) };

    assert_eq!(length, 4);
    let count = core.read_memory(&[crate::memory::Range { address: 0x0300_0000, length: 4 }]).unwrap();
    assert_eq!(read.to_vec(), count);
    assert_ne!(count, [0; 4]);
    drop(session);
}

#[test]
fn an_unlock_earned_offline_sends_after_a_restart() {
    let _core = lock_core();
    let fake = FakeRetroAchievements::start();
    let dir = temp_dir("offline");
    let vault = FakeVault::default();
    let (achievements, unlocked) = fake.achievements(&dir, vault.clone());
    achievements.turn(true);
    block_on(achievements.sign_in("Player", "secret")).unwrap();
    let rom = counting_rom();
    let load = achievements.identify(&rom).unwrap();
    let mut core = Core::load(rom, &std::env::temp_dir()).unwrap();
    let mut session = load.start();
    until_loaded(&mut core, &mut session);
    fake.offline.store(true, Ordering::SeqCst);

    play(&mut core, &mut session, FRAMES_TO_UNLOCK + 2);
    assert_eq!(unlocked.unlocks(), [ten_frames()]);
    let until = Instant::now() + Duration::from_secs(5);
    while achievements.0.pending.of("Player").is_empty() {
        assert!(Instant::now() < until, "the unlock was never kept to send");
        std::thread::sleep(Duration::from_millis(10));
    }
    drop(session);
    drop(core);
    drop(achievements);
    std::thread::sleep(Duration::from_millis(1100));
    assert!(fake.asks.of("awardachievement").is_empty());

    fake.offline.store(false, Ordering::SeqCst);
    let (restarted, _) = fake.achievements(&dir, vault);
    restarted.turn(true);

    let award = fake.asks.wait_for("awardachievement");
    assert_eq!((award["a"].as_str(), award["u"].as_str(), award["t"].as_str()), ("101", "Player", "token"));
    assert!(award["o"].parse::<u32>().unwrap() >= 1);
    let until = Instant::now() + Duration::from_secs(5);
    while !restarted.0.pending.of("Player").is_empty() {
        assert!(Instant::now() < until, "the sent unlock was still kept");
        std::thread::sleep(Duration::from_millis(10));
    }
}

const RETRY: Duration = Duration::from_millis(100);

// Signed in on an earlier run, which left the token in the vault.
fn restarted(fake: &FakeRetroAchievements, name: &str, token: &str, every: Duration) -> Achievements {
    let dir = temp_dir(name);
    let vault = FakeVault::default();
    let (first, _) = fake.achievements(&dir, vault.clone());
    first.turn(true);
    block_on(first.sign_in("Player", "secret")).unwrap();
    drop(first);
    vault.save("Player", token).unwrap();
    fake.retrying_every(&dir, vault, every).0
}

fn logins_from_now_on(fake: &FakeRetroAchievements) -> usize {
    std::thread::sleep(RETRY);
    let logins = fake.asks.of("login2").len();
    std::thread::sleep(RETRY * 4);
    fake.asks.of("login2").len() - logins
}

#[test]
fn an_unlock_kept_offline_sends_once_the_network_is_back_without_a_game_starting() {
    let fake = FakeRetroAchievements::start();
    let achievements = restarted(&fake, "retry", "token", RETRY);
    let hash = "0123456789abcdef0123456789abcdef".to_string();
    let unlock = Unlock { user: "Player".into(), achievement: 101, hardcore: false, hash, unlocked_at: now() - 30 };
    achievements.0.pending.add(unlock);
    fake.offline.store(true, Ordering::SeqCst);
    achievements.turn(true);
    std::thread::sleep(RETRY * 3);
    assert!(!achievements.signed_in());

    fake.offline.store(false, Ordering::SeqCst);

    let award = fake.asks.wait_for("awardachievement");
    assert_eq!((award["a"].as_str(), award["u"].as_str(), award["t"].as_str()), ("101", "Player", "token"));
    let until = Instant::now() + Duration::from_secs(5);
    while !achievements.0.pending.of("Player").is_empty() {
        assert!(Instant::now() < until, "the sent unlock was still kept");
        std::thread::sleep(Duration::from_millis(10));
    }
}

fn turned_on_after_restart(fake: &FakeRetroAchievements, name: &str, token: &str) -> Achievements {
    let achievements = restarted(fake, name, token, RETRY);
    achievements.turn(true);
    fake.asks.wait_for_another("login2", 1);
    achievements
}

#[test]
fn signs_in_again_no_more_once_signed_in() {
    let fake = FakeRetroAchievements::start();
    let _achievements = turned_on_after_restart(&fake, "retry-signed-in", "token");

    assert_eq!(logins_from_now_on(&fake), 0);
}

#[test]
fn signs_in_again_no_more_while_off() {
    let fake = FakeRetroAchievements::start();
    let achievements = turned_on_after_restart(&fake, "retry-off", "refused");

    achievements.turn(false);

    assert_eq!(logins_from_now_on(&fake), 0);
}

#[test]
fn signs_in_again_no_more_once_signed_out() {
    let fake = FakeRetroAchievements::start();
    let achievements = turned_on_after_restart(&fake, "retry-signed-out", "refused");

    achievements.sign_out().unwrap();

    assert_eq!(logins_from_now_on(&fake), 0);
}

#[test]
fn a_refused_token_signs_in_again_no_faster_than_the_interval() {
    let fake = FakeRetroAchievements::start();
    let achievements = restarted(&fake, "retry-refused", "refused", RETRY * 2);
    achievements.turn(true);
    fake.asks.wait_for_another("login2", 1);
    let logins = fake.asks.of("login2").len();

    std::thread::sleep(RETRY * 10);

    let retries = fake.asks.of("login2").len() - logins;
    assert!((2..=6).contains(&retries), "{retries} retries in five intervals");
}

// The goldens are SHA-256s of the hashes, which RetroAchievements answers with Emerald's and HeartGold's games.
#[test]
fn identifies_retail_games_by_the_hash_retroachievements_knows() {
    let fake = FakeRetroAchievements::start();
    let (achievements, _, _) = signed_in(&fake, "retail");
    let games = [
        (
            crate::test_games::rom_by_header("Emerald", b"BPEE", 0),
            "7d0a1bfebf1b317d813cfa26fa38103ac97e1dcedecacba96d70f332969fee13",
        ),
        (
            crate::test_games::heartgold().map(|(rom, _)| rom),
            "d15b40a81d086be61d61215e01598c213ba045bb39e7d77589f6db4c304da626",
        ),
    ];
    for (rom, golden) in games {
        let Some(rom) = rom else { continue };
        let hash = achievements.identify(&rom).unwrap();
        assert_eq!(crate::save::sha256(hash.hash().as_bytes()), golden, "{}", rom.name);
    }
}

fn ten_frames_listed(earned: Option<Earned>) -> Achievement {
    Achievement {
        id: 101,
        title: "Ten frames".into(),
        description: "Play ten frames".into(),
        points: 5,
        badge: "00001".into(),
        earned,
        progress: None,
        rarity: 62.5,
    }
}

fn of_game(achievements: &Achievements) -> Option<Vec<Achievement>> {
    block_on(achievements.of_game("games/counting.gb", async { Some(counting_rom()) }))
}

#[test]
fn lists_the_running_games_set_and_what_it_unlocks() {
    let _core = lock_core();
    let fake = FakeRetroAchievements::start();
    let (achievements, _, _) = signed_in(&fake, "playing");
    assert_eq!(achievements.playing(), None);
    let rom = counting_rom();
    let load = achievements.identify(&rom).unwrap();
    let mut core = Core::load(rom, &std::env::temp_dir()).unwrap();
    let mut session = load.start();
    until_loaded(&mut core, &mut session);

    assert_eq!(achievements.playing(), Some(vec![ten_frames_listed(None)]));
    let before = now();
    play(&mut core, &mut session, FRAMES_TO_UNLOCK + 2);

    let listed = achievements.playing().unwrap();
    let earned = listed[0].earned.unwrap();
    assert!(!earned.hardcore);
    assert!(earned.at.unwrap() >= before);
    drop(session);
    assert_eq!(achievements.playing(), None);
}

#[test]
fn lists_a_game_from_retroachievements_with_the_players_unlocks() {
    let fake = FakeRetroAchievements::start();
    let (achievements, _, _) = signed_in(&fake, "of-game");

    assert_eq!(of_game(&achievements), Some(vec![ten_frames_listed(None)]));

    *fake.earned.lock().unwrap() = vec![(101, true)];
    assert_eq!(of_game(&achievements), Some(vec![ten_frames_listed(Some(Earned { at: None, hardcore: true }))]));
    let asked = fake.asks.wait_for("achievementsets");
    assert_eq!(asked["m"], load_hash(&achievements));
}

#[test]
fn lists_nothing_for_a_game_retroachievements_has_no_set_for() {
    let fake = FakeRetroAchievements::start();
    let (achievements, _, _) = signed_in(&fake, "no-set");
    fake.unknown.store(true, Ordering::SeqCst);

    assert_eq!(of_game(&achievements), None);
}

#[test]
fn lists_nothing_while_signed_out() {
    let fake = FakeRetroAchievements::start();
    let (achievements, _) = fake.achievements(&temp_dir("of-game-signed-out"), FakeVault::default());
    achievements.turn(true);

    assert_eq!(of_game(&achievements), None);
}

#[test]
fn shows_the_last_list_it_had_while_offline() {
    let fake = FakeRetroAchievements::start();
    let (achievements, _, _) = signed_in(&fake, "of-game-offline");
    *fake.earned.lock().unwrap() = vec![(101, false)];
    let online = of_game(&achievements);
    fake.offline.store(true, Ordering::SeqCst);

    assert_eq!(of_game(&achievements), online);
}

#[test]
fn hashes_each_game_once_for_its_page() {
    let fake = FakeRetroAchievements::start();
    let (achievements, _, _) = signed_in(&fake, "hash-once");
    of_game(&achievements);

    let listed = block_on(achievements.of_game("games/counting.gb", async { None }));

    assert_eq!(listed, Some(vec![ten_frames_listed(None)]));
}

fn summary(achievements: &Achievements) -> Option<Summary> {
    block_on(achievements.summary())
}

fn player_profile() -> Profile {
    Profile { avatar: format!("avatar-Player-{AVATAR_UPDATED}"), hardcore: 1240, softcore: 85 }
}

#[test]
fn summarises_the_account_with_its_points_and_avatar() {
    let fake = FakeRetroAchievements::start();
    let (achievements, _, _) = signed_in(&fake, "summary");

    let summary = summary(&achievements).unwrap();

    let expected = Summary { user: "Player".into(), profile: Some(player_profile()), recent: vec![], offline: false };
    assert_eq!(summary, expected);
    assert_eq!(achievements.badge(&player_profile().avatar), Some(BADGE.to_vec()));
}

#[test]
fn summarises_nothing_while_signed_out() {
    let fake = FakeRetroAchievements::start();
    let (achievements, _) = fake.achievements(&temp_dir("summary-signed-out"), FakeVault::default());
    achievements.turn(true);

    assert_eq!(summary(&achievements), None);
}

#[test]
fn shows_the_last_summary_it_fetched_while_offline() {
    let fake = FakeRetroAchievements::start();
    let (achievements, _, dir) = signed_in(&fake, "summary-offline");
    summary(&achievements);
    fake.offline.store(true, Ordering::SeqCst);

    let (restarted, _) = fake.achievements(&dir, FakeVault::default());
    restarted.turn(true);

    let expected = Summary { user: "Player".into(), profile: Some(player_profile()), recent: vec![], offline: true };
    assert_eq!(summary(&achievements), Some(expected.clone()));
    assert_eq!(summary(&restarted), Some(expected));
}

#[test]
fn fetches_the_points_each_time() {
    let fake = FakeRetroAchievements::start();
    let (achievements, _, _) = signed_in(&fake, "summary-fetches");
    summary(&achievements);

    summary(&achievements);

    assert_eq!(fake.asks.of("login2").len(), 3);
}

fn unlocked_at(id: u32, at: Option<u64>) -> Achievement {
    let earned = Some(Earned { at, hardcore: false });
    Achievement { id, title: format!("Achievement {id}"), earned, ..ten_frames_listed(None) }
}

#[test]
fn lists_the_last_five_unlocks_across_games_newest_first() {
    let fake = FakeRetroAchievements::start();
    let (achievements, _, _) = signed_in(&fake, "recent");
    let first = [1, 2, 3].map(|id| unlocked_at(id, Some(100 + id as u64)));
    let second = [4, 5, 6].map(|id| unlocked_at(id, Some(200 + id as u64)));
    let red = [first.to_vec(), vec![unlocked_at(7, None), ten_frames_listed(None)]].concat();
    achievements.0.keep("Player", "aaaa", "Red", &red);
    achievements.0.keep("Player", "bbbb", "Gold", &second);
    achievements.0.keep("Player", "cccc", "Gold", &[unlocked_at(6, Some(206))]);
    achievements.0.keep("Other", "dddd", "Crystal", &[unlocked_at(8, Some(999))]);

    let recent = summary(&achievements).unwrap().recent;

    let listed: Vec<(&str, u32)> = recent.iter().map(|recent| (recent.game.as_str(), recent.achievement.id)).collect();
    assert_eq!(listed, [("Gold", 6), ("Gold", 5), ("Gold", 4), ("Red", 3), ("Red", 2)]);
    assert_eq!(recent[3].achievement, first[2]);
}

#[test]
fn an_unlock_in_a_game_shows_among_recent_unlocks_with_its_game() {
    let _core = lock_core();
    let fake = FakeRetroAchievements::start();
    let (achievements, _, _) = signed_in(&fake, "recent-unlock");
    let rom = counting_rom();
    let load = achievements.identify(&rom).unwrap();
    let mut core = Core::load(rom, &std::env::temp_dir()).unwrap();
    let mut session = load.start();
    until_loaded(&mut core, &mut session);
    play(&mut core, &mut session, FRAMES_TO_UNLOCK + 2);
    let unlocked = achievements.playing().unwrap();

    let until = Instant::now() + Duration::from_secs(5);
    loop {
        let recent = summary(&achievements).unwrap().recent;
        if let Some(recent) = recent.first() {
            assert_eq!((recent.game.as_str(), &recent.achievement), ("Counting", &unlocked[0]));
            break;
        }
        assert!(Instant::now() < until, "the unlock never showed");
        std::thread::sleep(Duration::from_millis(10));
    }
}
