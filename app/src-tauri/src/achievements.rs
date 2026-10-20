mod ffi;
mod pending;
#[cfg_attr(target_os = "android", path = "achievements/android.rs")]
#[cfg_attr(target_os = "ios", path = "achievements/ios.rs")]
#[cfg_attr(desktop, path = "achievements/desktop.rs")]
mod platform;
mod server;
#[cfg(test)]
pub(crate) mod tests;

use crate::retro::Core;
use crate::rom::{Rom, System};
use ffi::*;
use pending::{Pending, Unlock};
use serde::{Deserialize, Serialize};
use server::{Answer, Request};
use std::cell::RefCell;
use std::collections::HashMap;
use std::ffi::{c_char, c_int, c_void, CStr, CString};
use std::future::Future;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Mutex, OnceLock};
use std::time::Duration;
use tauri::{AppHandle, Runtime, State};
use tokio::sync::oneshot;

pub use platform::Keychain;

pub trait Vault: Send + Sync {
    fn load(&self, user: &str) -> Option<String>;
    fn save(&self, user: &str, token: &str) -> Result<(), String>;
    fn forget(&self, user: &str) -> Result<(), String>;
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Unlocked {
    pub id: u32,
    pub title: String,
    pub description: String,
    pub points: u32,
    pub badge: String,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(tag = "kind", rename_all = "camelCase", rename_all_fields = "camelCase")]
pub enum Event {
    Unlocked(Unlocked),
    Progress { id: u32, title: String, badge: String, progress: String },
    ChallengeShown { id: u32, title: String, badge: String },
    ChallengeHidden { id: u32 },
    Completed { game: String, points: u32, badge: String, hardcore: bool },
    LeaderboardStarted { id: u32, title: String },
    LeaderboardFailed { id: u32, title: String },
    LeaderboardSubmitted { id: u32, title: String, score: String },
    Tracker { id: u32, value: String },
    TrackerHidden { id: u32 },
}

pub type OnEvent = Box<dyn Fn(Event) + Send + Sync>;

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Achievement {
    pub id: u32,
    pub title: String,
    pub description: String,
    pub points: u32,
    pub badge: String,
    pub earned: Option<Earned>,
    /// How far a measured achievement has got, as in "47/100", while its game runs.
    pub progress: Option<String>,
    /// The share of players who have it, in percent.
    pub rarity: f32,
}

#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Earned {
    /// Seconds since the epoch, when known.
    pub at: Option<u64>,
    pub hardcore: bool,
}

#[derive(Deserialize, Serialize)]
struct Kept {
    user: String,
    #[serde(default)]
    game: String,
    achievements: Vec<Achievement>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Profile {
    /// The avatar's badge name, which changes with the avatar.
    pub avatar: String,
    pub hardcore: u32,
    pub softcore: u32,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Recent {
    pub game: String,
    pub achievement: Achievement,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Summary {
    pub user: String,
    pub profile: Option<Profile>,
    pub recent: Vec<Recent>,
    /// Whether RetroAchievements couldn't be reached, so the profile is the last one fetched.
    pub offline: bool,
}

const RECENT: usize = 5;

const RETRY_SIGN_IN: Duration = Duration::from_secs(60);

#[derive(Clone)]
pub struct Achievements(Arc<Shared>);

struct Shared {
    on: AtomicBool,
    turn_ons: AtomicU64,
    signing_in: AtomicBool,
    retry_every: Duration,
    client: OnceLock<Client>,
    // rc_client frees a game it unloads while another thread may be running a frame of it.
    gate: Mutex<()>,
    http: reqwest::Client,
    host: Option<CString>,
    version: String,
    account: PathBuf,
    // Held while the account file changes, so a summary that ends after sign-out doesn't write it back.
    account_lock: Mutex<()>,
    badges: PathBuf,
    games: PathBuf,
    hashes: Mutex<HashMap<String, Option<CString>>>,
    vault: Box<dyn Vault>,
    pending: Pending,
    on_event: OnEvent,
}

struct Client {
    raw: *mut rc_client_t,
    user_agent: String,
}

unsafe impl Send for Client {}
unsafe impl Sync for Client {}

impl Drop for Client {
    fn drop(&mut self) {
        unsafe { rc_client_destroy(self.raw) }
    }
}

#[derive(Deserialize, Serialize)]
struct Account {
    user: String,
    #[serde(default)]
    profile: Option<Profile>,
}

fn now() -> u64 {
    std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map_or(0, |since| since.as_secs())
}

thread_local! {
    static MEMORY: RefCell<Option<Box<rc_libretro_memory_regions_t>>> = const { RefCell::new(None) };
    static CORE_MEMORY: RefCell<[(usize, usize); 4]> = const { RefCell::new([(0, 0); 4]) };
}

unsafe extern "C" fn read_memory(address: u32, buffer: *mut u8, bytes: u32, _: *mut rc_client_t) -> u32 {
    MEMORY.with_borrow(|regions| match regions {
        Some(regions) => rc_libretro_memory_read(&**regions, address, buffer, bytes),
        None => 0,
    })
}

unsafe extern "C" fn core_memory_info(id: u32, info: *mut rc_libretro_core_memory_info_t) {
    let (data, size) = CORE_MEMORY.with_borrow(|memory| memory.get(id as usize).copied().unwrap_or_default());
    *info = rc_libretro_core_memory_info_t { data: data as *mut u8, size };
}

unsafe fn shared(client: *const rc_client_t) -> Arc<Shared> {
    let shared = rc_client_get_userdata(client) as *const Shared;
    Arc::increment_strong_count(shared);
    Arc::from_raw(shared)
}

struct Reply {
    callback: ServerCallback,
    data: *mut c_void,
}

unsafe impl Send for Reply {}

impl Reply {
    fn send(self, answer: &Answer) {
        unsafe { (self.callback)(&answer.raw(), self.data) }
    }
}

unsafe extern "C" fn server_call(
    request: *const rc_api_request_t,
    callback: ServerCallback,
    data: *mut c_void,
    client: *mut rc_client_t,
) {
    let (shared, request, reply) = (shared(client), Request::from(&*request), Reply { callback, data });
    tauri::async_runtime::spawn(async move {
        let answer = shared.call(&request).await;
        shared.reply(reply, answer, &request);
    });
}

unsafe fn text(text: *const c_char) -> String {
    if text.is_null() {
        return String::new();
    }
    CStr::from_ptr(text).to_string_lossy().into_owned()
}

// A game's badge shares its numbering with achievements' badges, so it's kept under another name.
fn game_badge(name: String) -> String {
    if name.is_empty() {
        name
    } else {
        format!("game-{name}")
    }
}

unsafe fn completed(client: *mut rc_client_t) -> Option<Event> {
    let game = rc_client_get_game_info(client).as_ref()?;
    let mut summary: rc_client_user_game_summary_t = std::mem::zeroed();
    rc_client_get_user_game_summary(client, &mut summary);
    Some(Event::Completed {
        game: text(game.title),
        points: summary.points_core,
        badge: game_badge(text(game.badge_name)),
        hardcore: rc_client_get_hardcore_enabled(client) != 0,
    })
}

unsafe fn achievement_event(kind: u32, achievement: &rc_client_achievement_t) -> Option<Event> {
    let (id, title, badge) = (achievement.id, text(achievement.title), text(achievement.badge_name.as_ptr()));
    Some(match kind {
        RC_CLIENT_EVENT_ACHIEVEMENT_TRIGGERED => Event::Unlocked(Unlocked {
            id,
            title,
            description: text(achievement.description),
            points: achievement.points,
            badge,
        }),
        RC_CLIENT_EVENT_ACHIEVEMENT_PROGRESS_INDICATOR_SHOW | RC_CLIENT_EVENT_ACHIEVEMENT_PROGRESS_INDICATOR_UPDATE => {
            Event::Progress { id, title, badge, progress: text(achievement.measured_progress.as_ptr()) }
        }
        RC_CLIENT_EVENT_ACHIEVEMENT_CHALLENGE_INDICATOR_SHOW => Event::ChallengeShown { id, title, badge },
        RC_CLIENT_EVENT_ACHIEVEMENT_CHALLENGE_INDICATOR_HIDE => Event::ChallengeHidden { id },
        _ => return None,
    })
}

unsafe fn leaderboard_event(kind: u32, leaderboard: &rc_client_leaderboard_t) -> Option<Event> {
    let (id, title) = (leaderboard.id, text(leaderboard.title));
    Some(match kind {
        RC_CLIENT_EVENT_LEADERBOARD_STARTED => Event::LeaderboardStarted { id, title },
        RC_CLIENT_EVENT_LEADERBOARD_FAILED => Event::LeaderboardFailed { id, title },
        RC_CLIENT_EVENT_LEADERBOARD_SUBMITTED => {
            Event::LeaderboardSubmitted { id, title, score: text(leaderboard.tracker_value) }
        }
        _ => return None,
    })
}

unsafe fn tracker_event(kind: u32, tracker: &rc_client_leaderboard_tracker_t) -> Option<Event> {
    let id = tracker.id;
    Some(match kind {
        RC_CLIENT_EVENT_LEADERBOARD_TRACKER_SHOW | RC_CLIENT_EVENT_LEADERBOARD_TRACKER_UPDATE => {
            Event::Tracker { id, value: text(tracker.display.as_ptr()) }
        }
        RC_CLIENT_EVENT_LEADERBOARD_TRACKER_HIDE => Event::TrackerHidden { id },
        _ => return None,
    })
}

unsafe extern "C" fn event(event: *const rc_client_event_t, client: *mut rc_client_t) {
    let event = &*event;
    if event.kind == RC_CLIENT_EVENT_ACHIEVEMENT_TRIGGERED {
        keep_loaded(client);
    }
    let sent = match event.kind {
        RC_CLIENT_EVENT_GAME_COMPLETED => completed(client),
        kind => (event.achievement.as_ref().and_then(|achievement| achievement_event(kind, achievement)))
            .or_else(|| event.leaderboard.as_ref().and_then(|leaderboard| leaderboard_event(kind, leaderboard)))
            .or_else(|| event.leaderboard_tracker.as_ref().and_then(|tracker| tracker_event(kind, tracker))),
    };
    if let Some(sent) = sent {
        (shared(client).on_event)(sent);
    }
}

struct Badge {
    name: String,
    url: String,
}

fn add_badge(badges: &mut Vec<Badge>, name: String, url: String) {
    if !url.is_empty() && !badges.iter().any(|badge| badge.name == name) {
        badges.push(Badge { name, url });
    }
}

unsafe fn each_achievement(client: *mut rc_client_t, mut f: impl FnMut(&rc_client_achievement_t)) {
    let list = rc_client_create_achievement_list(
        client,
        RC_CLIENT_ACHIEVEMENT_CATEGORY_CORE,
        RC_CLIENT_ACHIEVEMENT_LIST_GROUPING_LOCK_STATE,
    );
    if list.is_null() {
        return;
    }
    for bucket in items((*list).buckets, (*list).num_buckets) {
        for &achievement in items(bucket.achievements, bucket.num_achievements) {
            f(&*achievement);
        }
    }
    rc_client_destroy_achievement_list(list);
}

unsafe fn badges(client: *mut rc_client_t) -> Vec<Badge> {
    let mut badges = Vec::new();
    each_achievement(client, |achievement| {
        add_badge(&mut badges, text(achievement.badge_name.as_ptr()), text(achievement.badge_url));
    });
    if let Some(game) = rc_client_get_game_info(client).as_ref() {
        let (name, url) = (game_badge(text(game.badge_name)), text(game.badge_url));
        if !name.is_empty() && !url.is_empty() {
            badges.push(Badge { name, url });
        }
    }
    badges
}

fn locked_first(mut achievements: Vec<Achievement>) -> Vec<Achievement> {
    achievements.sort_by_key(|achievement| achievement.earned.is_some());
    achievements
}

unsafe fn listed(client: *mut rc_client_t) -> Vec<Achievement> {
    let mut achievements = Vec::new();
    each_achievement(client, |achievement| {
        let earned = achievement.unlocked != 0;
        let progress = text(achievement.measured_progress.as_ptr());
        achievements.push(Achievement {
            id: achievement.id,
            title: text(achievement.title),
            description: text(achievement.description),
            points: achievement.points,
            badge: text(achievement.badge_name.as_ptr()),
            earned: earned.then(|| Earned {
                at: (achievement.unlock_time > 0).then_some(achievement.unlock_time as u64),
                hardcore: achievement.unlocked & RC_CLIENT_ACHIEVEMENT_UNLOCKED_HARDCORE != 0,
            }),
            progress: (!earned && !progress.is_empty()).then_some(progress),
            rarity: achievement.rarity,
        });
    });
    locked_first(achievements)
}

// Called with the gate held, so the list is the one rcheevos has now.
unsafe fn keep_loaded(client: *mut rc_client_t) {
    let game = rc_client_get_game_info(client);
    if game.is_null() {
        return;
    }
    let (shared, hash, title, achievements) = (shared(client), text((*game).hash), text((*game).title), listed(client));
    tauri::async_runtime::spawn(async move {
        if let Some(user) = shared.signed_in_user() {
            shared.keep(&user, &hash, &title, &achievements);
        }
    });
}

unsafe fn items<'a, T>(items: *const T, count: u32) -> &'a [T] {
    if items.is_null() {
        return &[];
    }
    std::slice::from_raw_parts(items, count as usize)
}

enum Set {
    Found { id: u32, title: String, achievements: Vec<Achievement>, badges: Vec<Badge> },
    Missing,
}

unsafe fn game_set(answer: &Answer) -> Option<Set> {
    let mut response: rc_api_fetch_game_sets_response_t = std::mem::zeroed();
    let result = rc_api_process_fetch_game_sets_server_response(&mut response, &answer.raw());
    let set = match result {
        RC_NOT_FOUND => Some(Set::Missing),
        RC_OK if response.id == 0 => Some(Set::Missing),
        RC_OK => {
            let (mut achievements, mut badges) = (Vec::new(), Vec::new());
            for set in
                items(response.sets, response.num_sets).iter().filter(|set| set.kind == RC_ACHIEVEMENT_SET_TYPE_CORE)
            {
                let definitions = items(set.achievements, set.num_achievements);
                for definition in
                    definitions.iter().filter(|definition| definition.category == RC_ACHIEVEMENT_CATEGORY_CORE)
                {
                    add_badge(&mut badges, text(definition.badge_name), text(definition.badge_url));
                    achievements.push(Achievement {
                        id: definition.id,
                        title: text(definition.title),
                        description: text(definition.description),
                        points: definition.points,
                        badge: text(definition.badge_name),
                        earned: None,
                        progress: None,
                        rarity: definition.rarity,
                    });
                }
            }
            Some(Set::Found { id: response.id, title: text(response.title), achievements, badges })
        }
        _ => None,
    };
    rc_api_destroy_fetch_game_sets_response(&mut response);
    set
}

unsafe fn unlock_ids(answer: &Answer) -> Option<Vec<u32>> {
    let mut response: rc_api_fetch_user_unlocks_response_t = std::mem::zeroed();
    let result = rc_api_process_fetch_user_unlocks_server_response(&mut response, &answer.raw());
    let ids = (result == RC_OK).then(|| items(response.achievement_ids, response.num_achievement_ids).to_vec());
    rc_api_destroy_fetch_user_unlocks_response(&mut response);
    ids
}

fn badge_file(dir: &Path, name: &str) -> Option<PathBuf> {
    let safe = !name.is_empty() && name.chars().all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-');
    safe.then(|| dir.join(format!("{name}.png")))
}

unsafe fn login_profile(answer: &Answer) -> Option<(Profile, Vec<Badge>)> {
    let mut response: rc_api_login_response_t = std::mem::zeroed();
    let result = rc_api_process_login_server_response(&mut response, &answer.raw());
    let profile = (result == RC_OK).then(|| {
        let avatar = format!("avatar-{}-{}", text(response.username), response.avatar_last_updated);
        let mut badges = Vec::new();
        add_badge(&mut badges, avatar.clone(), text(response.avatar_url));
        (Profile { avatar, hardcore: response.score, softcore: response.score_softcore }, badges)
    });
    rc_api_destroy_login_response(&mut response);
    profile
}

unsafe extern "C" fn log(message: *const c_char, _: *const rc_client_t) {
    eprintln!("retroachievements: {}", CStr::from_ptr(message).to_string_lossy());
}

type Signed = Result<(String, String), String>;

unsafe extern "C" fn signed_in(result: c_int, error: *const c_char, client: *mut rc_client_t, data: *mut c_void) {
    let reply = Box::from_raw(data as *mut oneshot::Sender<Signed>);
    let user = rc_client_get_user_info(client);
    let signed = if result == RC_OK && !user.is_null() {
        let text = |text: *const c_char| CStr::from_ptr(text).to_string_lossy().into_owned();
        Ok((text((*user).username), text((*user).token)))
    } else if error.is_null() {
        Err(format!("RetroAchievements answered {result}"))
    } else {
        Err(CStr::from_ptr(error).to_string_lossy().into_owned())
    };
    let _ = reply.send(signed);
}

// Called with the gate held, from the reply to the game's set.
unsafe extern "C" fn game_loaded(result: c_int, error: *const c_char, client: *mut rc_client_t, _: *mut c_void) {
    if result != RC_OK {
        if !error.is_null() {
            eprintln!("retroachievements: {}", CStr::from_ptr(error).to_string_lossy());
        }
        return;
    }
    keep_loaded(client);
    let (shared, badges) = (shared(client), badges(client));
    tauri::async_runtime::spawn(async move { shared.download(badges).await });
}

enum Fetched {
    Set { title: String, achievements: Vec<Achievement>, badges: Vec<Badge> },
    Missing,
    Unanswered,
}

impl Shared {
    fn held(&self) -> std::sync::MutexGuard<'_, ()> {
        self.gate.lock().unwrap_or_else(|e| e.into_inner())
    }

    // rcheevos 12.5 raises a pending mastery after it has let go of the game, and crashes. A reset raises it first.
    fn let_go(&self, unload: unsafe extern "C" fn(*mut rc_client_t)) {
        if let Some(client) = self.client.get() {
            let _held = self.held();
            unsafe {
                rc_client_reset(client.raw);
                unload(client.raw);
            }
        }
    }

    fn reply(&self, reply: Reply, mut answer: Answer, request: &Request) {
        let _held = self.held();
        let award = request.post.as_deref().is_some_and(|form| Unlock::sent_in(form, 0).is_some());
        let unloaded = self.client.get().is_some_and(|client| unsafe { rc_client_is_game_loaded(client.raw) == 0 });
        // rcheevos 12.5 marks the game mastered when none remain, without checking a game is still loaded.
        if award && unloaded {
            answer.without_remaining();
        }
        reply.send(&answer);
    }

    async fn call(&self, request: &Request) -> Answer {
        let unlock = request.post.as_deref().and_then(|form| Unlock::sent_in(form, now()));
        if let Some(unlock) = &unlock {
            self.pending.add(unlock.clone());
        }
        let user_agent = self.client.get().map_or("", |client| client.user_agent.as_str());
        let answer = server::send(&self.http, user_agent, request).await;
        if let Some(unlock) = unlock.filter(|_| answer.is_final()) {
            self.pending.remove(&unlock);
        }
        answer
    }

    async fn download(&self, badges: Vec<Badge>) {
        for Badge { name, url } in badges {
            let Some(file) = badge_file(&self.badges, &name).filter(|file| !file.exists()) else { continue };
            if let Err(e) = self.download_badge(&url, &file).await {
                eprintln!("retroachievements: badge {name}: {e}");
            }
        }
    }

    async fn download_badge(&self, url: &str, file: &Path) -> Result<(), String> {
        let user_agent = self.client.get().map_or("", |client| client.user_agent.as_str());
        let response = self.http.get(url).header("User-Agent", user_agent).send().await.map_err(|e| e.to_string())?;
        if !response.status().is_success() {
            return Err(format!("answered {}", response.status()));
        }
        let bytes = response.bytes().await.map_err(|e| e.to_string())?;
        std::fs::create_dir_all(&self.badges).map_err(|e| e.to_string())?;
        static DOWNLOADS: AtomicU64 = AtomicU64::new(0);
        let partial = file.with_extension(format!("{}.part", DOWNLOADS.fetch_add(1, Ordering::Relaxed)));
        std::fs::write(&partial, &bytes).map_err(|e| e.to_string())?;
        std::fs::rename(&partial, file).map_err(|e| e.to_string())
    }

    fn signed_in_user(&self) -> Option<String> {
        Some(self.account()?.user)
    }

    async fn send_pending(&self, user: &str, token: &str) {
        for unlock in self.pending.of(user) {
            let Some(request) = self.award(&unlock, token) else { continue };
            self.call(&request).await;
        }
    }

    fn award(&self, unlock: &Unlock, token: &str) -> Option<Request> {
        let [user, token, hash] =
            [&unlock.user, token, &unlock.hash].map(|text| CString::new(text).unwrap_or_default());
        let params = rc_api_award_achievement_request_t {
            username: user.as_ptr(),
            api_token: token.as_ptr(),
            achievement_id: unlock.achievement,
            hardcore: unlock.hardcore as u32,
            game_hash: hash.as_ptr(),
            seconds_since_unlock: now().saturating_sub(unlock.unlocked_at).max(1) as u32,
        };
        self.request(|request, host| unsafe { rc_api_init_award_achievement_request_hosted(request, &params, host) })
    }

    fn request(&self, init: impl FnOnce(*mut rc_api_request_t, *const rc_api_host_t) -> c_int) -> Option<Request> {
        let host = rc_api_host_t {
            host: self.host.as_ref().map_or(std::ptr::null(), |host| host.as_ptr()),
            media_host: std::ptr::null(),
        };
        unsafe {
            let mut request: rc_api_request_t = std::mem::zeroed();
            let built = init(&mut request, &host) == RC_OK;
            let made = built.then(|| Request::from(&request));
            rc_api_destroy_request(&mut request);
            made
        }
    }

    async fn ask(&self, request: Option<Request>) -> Option<Answer> {
        let user_agent = self.client.get().map_or("", |client| client.user_agent.as_str());
        let answer = server::send(&self.http, user_agent, &request?).await;
        answer.is_final().then_some(answer)
    }

    fn unlocks_request(&self, user: &str, token: &str, game: u32, hardcore: bool) -> Option<Request> {
        let [user, token] = [user, token].map(|text| CString::new(text).unwrap_or_default());
        let params = rc_api_fetch_user_unlocks_request_t {
            username: user.as_ptr(),
            api_token: token.as_ptr(),
            game_id: game,
            hardcore: hardcore as u32,
        };
        self.request(|request, host| unsafe { rc_api_init_fetch_user_unlocks_request_hosted(request, &params, host) })
    }

    async fn unlocked(&self, user: &str, token: &str, game: u32, hardcore: bool) -> Option<Vec<u32>> {
        let answer = self.ask(self.unlocks_request(user, token, game, hardcore)).await?;
        unsafe { unlock_ids(&answer) }
    }

    async fn fetch(&self, user: &str, token: &str, hash: &str) -> Fetched {
        let request = {
            let [user, token, hash] = [user, token, hash].map(|text| CString::new(text).unwrap_or_default());
            let params = rc_api_fetch_game_sets_request_t {
                username: user.as_ptr(),
                api_token: token.as_ptr(),
                game_id: 0,
                game_hash: hash.as_ptr(),
            };
            self.request(|request, host| unsafe { rc_api_init_fetch_game_sets_request_hosted(request, &params, host) })
        };
        let Some(answer) = self.ask(request).await else { return Fetched::Unanswered };
        let (id, title, mut achievements, badges) = match unsafe { game_set(&answer) } {
            Some(Set::Found { id, title, achievements, badges }) => (id, title, achievements, badges),
            Some(Set::Missing) => return Fetched::Missing,
            None => return Fetched::Unanswered,
        };
        if achievements.is_empty() {
            return Fetched::Missing;
        }
        let (Some(softcore), Some(hardcore)) =
            (self.unlocked(user, token, id, false).await, self.unlocked(user, token, id, true).await)
        else {
            return Fetched::Unanswered;
        };
        for achievement in &mut achievements {
            let hardcore = hardcore.contains(&achievement.id);
            if hardcore || softcore.contains(&achievement.id) {
                achievement.earned = Some(Earned { at: None, hardcore });
            }
        }
        Fetched::Set { title, achievements: locked_first(achievements), badges }
    }

    fn kept_file(&self, hash: &str) -> Option<PathBuf> {
        let safe = !hash.is_empty() && hash.chars().all(|c| c.is_ascii_alphanumeric());
        safe.then(|| self.games.join(format!("{hash}.json")))
    }

    fn keep(&self, user: &str, hash: &str, game: &str, achievements: &[Achievement]) {
        let Some(file) = self.kept_file(hash) else { return };
        let kept = Kept { user: user.into(), game: game.into(), achievements: achievements.to_vec() };
        static WRITES: AtomicU64 = AtomicU64::new(0);
        let partial = file.with_extension(format!("{}.part", WRITES.fetch_add(1, Ordering::Relaxed)));
        let written = serde_json::to_vec(&kept).map_err(|e| e.to_string()).and_then(|json| {
            std::fs::create_dir_all(&self.games).map_err(|e| e.to_string())?;
            std::fs::write(&partial, json).map_err(|e| e.to_string())?;
            std::fs::rename(&partial, &file).map_err(|e| e.to_string())
        });
        if let Err(e) = written {
            eprintln!("retroachievements: keeping {hash}: {e}");
        }
    }

    fn kept(&self, user: &str, hash: &str) -> Option<Vec<Achievement>> {
        let kept: Kept = serde_json::from_slice(&std::fs::read(self.kept_file(hash)?).ok()?).ok()?;
        (kept.user == user).then_some(kept.achievements)
    }

    // RetroAchievements has no list of a player's unlocks across games, so it's built from the lists kept here.
    fn recent(&self, user: &str) -> Vec<Recent> {
        let files = std::fs::read_dir(&self.games).into_iter().flatten().flatten().map(|entry| entry.path());
        let kept = files
            .filter(|file| file.extension().is_some_and(|extension| extension == "json"))
            .filter_map(|file| serde_json::from_slice::<Kept>(&std::fs::read(file).ok()?).ok())
            .filter(|kept| kept.user == user);
        let mut recent: Vec<Recent> = kept
            .flat_map(|Kept { game, achievements, .. }| {
                achievements.into_iter().map(move |achievement| Recent { game: game.clone(), achievement })
            })
            .filter(|recent| recent.achievement.earned.is_some_and(|earned| earned.at.is_some()))
            .collect();
        recent.sort_by_key(|recent| std::cmp::Reverse(recent.achievement.earned.and_then(|earned| earned.at)));
        let mut seen = std::collections::HashSet::new();
        recent.retain(|recent| seen.insert(recent.achievement.id));
        recent.truncate(RECENT);
        recent
    }

    fn account(&self) -> Option<Account> {
        serde_json::from_slice(&std::fs::read(&self.account).ok()?).ok()
    }

    fn held_account(&self) -> std::sync::MutexGuard<'_, ()> {
        self.account_lock.lock().unwrap_or_else(|e| e.into_inner())
    }

    fn save_account(&self, account: &Account) -> Result<(), String> {
        let json = serde_json::to_vec(account).map_err(|e| e.to_string())?;
        let partial = self.account.with_extension("part");
        std::fs::write(&partial, json).map_err(|e| e.to_string())?;
        std::fs::rename(&partial, &self.account).map_err(|e| e.to_string())
    }

    fn keep_profile(&self, user: &str, profile: &Profile) {
        let _held = self.held_account();
        let Some(account) = self.account().filter(|account| account.user == user) else { return };
        if account.profile.as_ref() == Some(profile) {
            return;
        }
        if let Err(e) = self.save_account(&Account { profile: Some(profile.clone()), ..account }) {
            eprintln!("retroachievements: keeping the profile: {e}");
        }
    }

    async fn fetch_profile(&self, user: &str) -> Option<(Profile, Vec<Badge>)> {
        let token = self.vault.load(user)?;
        let request = {
            let [user, token] = [user, &token].map(|text| CString::new(text).unwrap_or_default());
            let params = rc_api_login_request_t {
                username: user.as_ptr(),
                api_token: token.as_ptr(),
                password: std::ptr::null(),
            };
            self.request(|request, host| unsafe { rc_api_init_login_request_hosted(request, &params, host) })
        };
        let answer = self.ask(request).await?;
        unsafe { login_profile(&answer) }
    }
}

impl Achievements {
    pub fn new(dir: &Path, version: &str, vault: Box<dyn Vault>, on_event: OnEvent) -> Achievements {
        Achievements::at(None, dir, version, vault, on_event, RETRY_SIGN_IN)
    }

    fn at(
        host: Option<&str>,
        dir: &Path,
        version: &str,
        vault: Box<dyn Vault>,
        on_event: OnEvent,
        retry_every: Duration,
    ) -> Achievements {
        Achievements(Arc::new(Shared {
            on: AtomicBool::new(false),
            turn_ons: AtomicU64::new(0),
            signing_in: AtomicBool::new(false),
            retry_every,
            client: OnceLock::new(),
            gate: Mutex::new(()),
            http: crate::sync::http(),
            host: host.map(|host| CString::new(host).unwrap_or_default()),
            version: version.into(),
            account: dir.join("retroachievements.json"),
            account_lock: Mutex::new(()),
            badges: dir.join("retroachievements-badges"),
            games: dir.join("retroachievements-games"),
            hashes: Mutex::default(),
            vault,
            pending: Pending::new(dir.join("retroachievements-pending.json")),
            on_event,
        }))
    }

    fn client(&self) -> Option<*mut rc_client_t> {
        self.0.client.get().filter(|_| self.0.on.load(Ordering::Acquire)).map(|client| client.raw)
    }

    fn gated<R>(&self, f: impl FnOnce(*mut rc_client_t) -> R) -> Option<R> {
        let client = self.client()?;
        let _held = self.0.held();
        Some(f(client))
    }

    fn create(&self) -> &Client {
        self.0.client.get_or_init(|| unsafe {
            let raw = rc_client_create(read_memory, server_call);
            rc_client_set_userdata(raw, Arc::as_ptr(&self.0) as *mut c_void);
            rc_client_set_hardcore_enabled(raw, 0);
            rc_client_set_allow_background_memory_reads(raw, 0);
            rc_client_set_event_handler(raw, event);
            rc_client_enable_logging(raw, RC_CLIENT_LOG_LEVEL_WARN, log);
            if let Some(host) = &self.0.host {
                rc_client_set_host(raw, host.as_ptr());
            }
            let mut clause = [0 as c_char; 64];
            rc_client_get_user_agent_clause(raw, clause.as_mut_ptr(), clause.len());
            let clause = CStr::from_ptr(clause.as_ptr()).to_string_lossy();
            Client { raw, user_agent: format!("pkhemu/{} {clause}", self.0.version) }
        })
    }

    /// Off, it stops running and calling the server, and stays signed in for when it's back on.
    pub fn turn(&self, on: bool) {
        if !on {
            self.0.on.store(false, Ordering::Release);
            return;
        }
        self.create();
        let was_on = self.0.on.swap(true, Ordering::AcqRel);
        if !was_on {
            if let Some(signing_in) = self.sign_in_again() {
                tauri::async_runtime::spawn(signing_in);
            }
            tauri::async_runtime::spawn(self.retry_sign_in());
        }
    }

    // A launch without network fails the sign-in, and nothing else signs in again until a game starts.
    fn retry_sign_in(&self) -> impl Future<Output = ()> + Send + 'static {
        let turned = self.0.turn_ons.fetch_add(1, Ordering::AcqRel) + 1;
        let (shared, every) = (Arc::downgrade(&self.0), self.0.retry_every);
        async move {
            loop {
                tokio::time::sleep(every).await;
                let Some(achievements) = shared.upgrade().map(Achievements) else { return };
                let stale = achievements.0.turn_ons.load(Ordering::Acquire) != turned;
                let signed_out = achievements.0.signed_in_user().is_none();
                if stale || achievements.client().is_none() || signed_out || achievements.signed_in() {
                    return;
                }
                if let Some(signing_in) = achievements.sign_in_again() {
                    signing_in.await;
                }
            }
        }
    }

    fn signed_in(&self) -> bool {
        self.gated(|client| unsafe { !rc_client_get_user_info(client).is_null() }).unwrap_or(false)
    }

    // With the saved token, so sends unlocks left from earlier runs once the server answers.
    fn sign_in_again(&self) -> Option<impl std::future::Future<Output = ()> + Send + 'static> {
        if self.signed_in() || self.0.signing_in.swap(true, Ordering::AcqRel) {
            return None;
        }
        let signed = self.0.signed_in_user().and_then(|user| {
            let token = self.0.vault.load(&user)?;
            self.begin_sign_in(|client, signed_in, data| unsafe {
                let [user, token] = [&user, &token].map(|text| CString::new(text.as_str()).unwrap_or_default());
                rc_client_begin_login_with_token(client, user.as_ptr(), token.as_ptr(), signed_in, data);
            })
        });
        let Some(signed) = signed else {
            self.0.signing_in.store(false, Ordering::Release);
            return None;
        };
        let shared = self.0.clone();
        Some(async move {
            let signed = signed.await;
            shared.signing_in.store(false, Ordering::Release);
            match signed {
                Ok(Ok((user, token))) => shared.send_pending(&user, &token).await,
                Ok(Err(e)) => eprintln!("retroachievements: signing in again: {e}"),
                Err(_) => {}
            }
        })
    }

    fn begin_sign_in(
        &self,
        begin: impl FnOnce(*mut rc_client_t, Callback, *mut c_void),
    ) -> Option<oneshot::Receiver<Signed>> {
        let (reply, signed) = oneshot::channel::<Signed>();
        let data = Box::into_raw(Box::new(reply)) as *mut c_void;
        match self.gated(|client| begin(client, signed_in, data)) {
            Some(()) => Some(signed),
            None => {
                drop(unsafe { Box::from_raw(data as *mut oneshot::Sender<Signed>) });
                None
            }
        }
    }

    pub fn account(&self) -> Option<String> {
        self.0.signed_in_user()
    }

    pub fn badge(&self, name: &str) -> Option<Vec<u8>> {
        std::fs::read(badge_file(&self.0.badges, name)?).ok()
    }

    pub async fn sign_in(&self, user: &str, password: &str) -> Result<String, String> {
        let signed = self.begin_sign_in(|client, signed_in, data| unsafe {
            let [user, password] = [user, password].map(|text| CString::new(text).unwrap_or_default());
            rc_client_begin_login_with_password(client, user.as_ptr(), password.as_ptr(), signed_in, data);
        });
        let signed = signed.ok_or("RetroAchievements is off")?;
        let (user, token) = signed.await.map_err(|e| e.to_string())??;
        self.0.vault.save(&user, &token)?;
        {
            let _held = self.0.held_account();
            self.0.save_account(&Account { user: user.clone(), profile: None })?;
        }
        let shared = self.0.clone();
        let (sending, token) = (user.clone(), token);
        tauri::async_runtime::spawn(async move { shared.send_pending(&sending, &token).await });
        Ok(user)
    }

    pub fn sign_out(&self) -> Result<(), String> {
        self.0.let_go(rc_client_logout);
        let _held = self.0.held_account();
        if let Some(user) = self.0.signed_in_user() {
            self.0.vault.forget(&user)?;
        }
        match std::fs::remove_file(&self.0.account) {
            Err(e) if e.kind() != std::io::ErrorKind::NotFound => Err(e.to_string()),
            _ => Ok(()),
        }
    }

    /// The signed-in player's points and latest unlocks, or the last ones known when RetroAchievements can't answer.
    pub async fn summary(&self) -> Option<Summary> {
        self.client()?;
        let account = self.0.account()?;
        let fetched = self.0.fetch_profile(&account.user).await;
        let offline = fetched.is_none();
        let profile = match fetched {
            Some((profile, avatar)) => {
                self.0.keep_profile(&account.user, &profile);
                self.0.download(avatar).await;
                Some(profile)
            }
            None => account.profile,
        };
        Some(Summary { recent: self.0.recent(&account.user), user: account.user, profile, offline })
    }

    pub fn profile_url(&self) -> Option<String> {
        let user = self.0.signed_in_user()?;
        Some(format!("https://retroachievements.org/user/{user}"))
    }

    pub fn identify(&self, rom: &Rom) -> Option<Load> {
        self.client()?;
        self.0.signed_in_user()?;
        let (console, hash) = hash(rom)?;
        Some(Load { achievements: self.clone(), console, hash, hardcore: false })
    }

    /// The game's list while it runs, with progress, or None when no set has loaded.
    pub fn playing(&self) -> Option<Vec<Achievement>> {
        let listed = self.gated(|client| unsafe { (rc_client_is_game_loaded(client) != 0).then(|| listed(client)) });
        listed.flatten().filter(|achievements| !achievements.is_empty())
    }

    /// The game's list from RetroAchievements, or the last one seen when it can't answer. None when it has no set.
    pub async fn of_game(&self, key: &str, rom: impl Future<Output = Option<Rom>>) -> Option<Vec<Achievement>> {
        self.client()?;
        let user = self.0.signed_in_user()?;
        let known = self.0.hashes.lock().unwrap_or_else(|e| e.into_inner()).get(key).cloned();
        let hash = match known {
            Some(known) => known,
            None => {
                let rom = rom.await?;
                let hashed = hash(&rom).map(|(_, hash)| hash);
                self.0.hashes.lock().unwrap_or_else(|e| e.into_inner()).insert(key.into(), hashed.clone());
                hashed
            }
        }?;
        let hash = hash.to_str().unwrap_or_default();
        let kept = self.0.kept(&user, hash);
        let Some(token) = self.0.vault.load(&user) else { return kept };
        match self.0.fetch(&user, &token, hash).await {
            Fetched::Missing => None,
            Fetched::Unanswered => kept,
            Fetched::Set { title, mut achievements, badges } => {
                let earned_at = |id: u32| {
                    kept.iter()
                        .flatten()
                        .find(|kept| kept.id == id)
                        .and_then(|kept| kept.earned)
                        .and_then(|earned| earned.at)
                };
                for achievement in &mut achievements {
                    if let Some(earned) = &mut achievement.earned {
                        earned.at = earned_at(achievement.id);
                    }
                }
                self.0.keep(&user, hash, &title, &achievements);
                let shared = self.0.clone();
                tauri::async_runtime::spawn(async move { shared.download(badges).await });
                Some(achievements)
            }
        }
    }
}

fn hash(rom: &Rom) -> Option<(u32, CString)> {
    let console = match rom.system() {
        System::Gb if rom.bytes.get(0x143).is_some_and(|flag| flag & 0x80 != 0) => RC_CONSOLE_GAMEBOY_COLOR,
        System::Gb => RC_CONSOLE_GAMEBOY,
        System::Gba => RC_CONSOLE_GAMEBOY_ADVANCE,
        System::Ds => RC_CONSOLE_NINTENDO_DS,
        System::N64 => RC_CONSOLE_NINTENDO_64,
        System::ThreeDs | System::GameCube => return None,
    };
    let mut hash = [0 as c_char; 33];
    let hashed =
        unsafe { rc_hash_generate_from_buffer(hash.as_mut_ptr(), console, rom.bytes.as_ptr(), rom.bytes.len()) };
    if hashed == 0 {
        return None;
    }
    Some((console, unsafe { CStr::from_ptr(hash.as_ptr()) }.to_owned()))
}

pub struct Load {
    achievements: Achievements,
    console: u32,
    hash: CString,
    hardcore: bool,
}

impl Load {
    #[cfg(test)]
    pub fn hash(&self) -> &str {
        self.hash.to_str().unwrap_or_default()
    }

    pub fn in_hardcore(self, hardcore: bool) -> Load {
        Load { hardcore, ..self }
    }

    pub fn hardcore(&self) -> bool {
        self.hardcore
    }

    pub fn start(self) -> Session {
        Session { achievements: self.achievements, waiting: Some((self.console, self.hash)), hardcore: self.hardcore }
    }
}

pub struct Session {
    achievements: Achievements,
    waiting: Option<(u32, CString)>,
    hardcore: bool,
}

impl Session {
    // Mupen64Plus-Next has no RDRAM until its first frame, so the set loads after the core has run one.
    pub fn frame(&mut self, core: &mut Core) {
        match self.waiting.take() {
            Some((console, hash)) => self.begin(console, &hash, core),
            None => {
                self.achievements.gated(|client| unsafe { rc_client_do_frame(client) });
            }
        }
    }

    // On the emulation thread, which reads the core's memory for rcheevos from then on.
    fn begin(&self, console: u32, hash: &CStr, core: &mut Core) {
        let memory = [0, 1, 2, 3].map(|id| {
            let memory = core.memory_data(id);
            (memory.as_mut_ptr() as usize, memory.len())
        });
        CORE_MEMORY.set(memory);
        let mut regions = Box::new(rc_libretro_memory_regions_t::default());
        let mapped = core.libretro_memory_map(|map| unsafe {
            rc_libretro_memory_init(&mut *regions, map, core_memory_info, console)
        });
        if mapped == 0 {
            eprintln!("retroachievements: the core's memory doesn't map to console {console}");
            return;
        }
        MEMORY.set(Some(regions));
        if let Some(signing_in) = self.achievements.sign_in_again() {
            tauri::async_runtime::spawn(signing_in);
        }
        self.achievements.gated(|client| unsafe {
            rc_client_set_hardcore_enabled(client, self.hardcore as c_int);
            rc_client_begin_load_game(client, hash.as_ptr(), game_loaded, std::ptr::null_mut())
        });
    }

    pub fn hardcore(&self) -> bool {
        self.hardcore
    }

    /// Drops to softcore for the rest of the session. rcheevos can't go back to hardcore without a restart.
    pub fn leave_hardcore(&mut self) {
        if !std::mem::replace(&mut self.hardcore, false) || self.waiting.is_some() {
            return;
        }
        self.achievements.gated(|client| unsafe { rc_client_set_hardcore_enabled(client, 0) });
    }

    #[cfg(test)]
    pub fn mapped(&self) -> bool {
        MEMORY.with_borrow(Option::is_some)
    }

    pub fn idle(&self) {
        self.achievements.gated(|client| unsafe { rc_client_idle(client) });
    }

    pub fn reset(&self) {
        self.achievements.gated(|client| unsafe { rc_client_reset(client) });
    }

    #[cfg(test)]
    pub fn loaded(&self) -> bool {
        self.achievements.gated(|client| unsafe { rc_client_is_game_loaded(client) != 0 }).unwrap_or(false)
    }
}

impl Drop for Session {
    fn drop(&mut self) {
        self.achievements.0.let_go(rc_client_unload_game);
        if let Some(mut regions) = MEMORY.take() {
            unsafe { rc_libretro_memory_destroy(&mut *regions) };
        }
    }
}

pub fn for_app<R: Runtime>(app: &AppHandle<R>, dir: &Path, on_event: OnEvent) -> Achievements {
    let version = app.package_info().version.to_string();
    Achievements::new(dir, &version, Box::new(Keychain::new(dir)), on_event)
}

#[tauri::command]
pub fn retro_achievements_turn(achievements: State<'_, Achievements>, on: bool) {
    achievements.turn(on);
}

#[tauri::command]
pub fn retro_achievements_account(achievements: State<'_, Achievements>) -> Option<String> {
    achievements.account()
}

#[tauri::command]
pub async fn retro_achievements_sign_in(
    achievements: State<'_, Achievements>,
    user: String,
    password: String,
) -> Result<String, String> {
    achievements.sign_in(&user, &password).await
}

#[tauri::command]
pub async fn retro_achievements_badge(
    achievements: State<'_, Achievements>,
    name: String,
) -> Result<tauri::ipc::Response, String> {
    achievements.badge(&name).map(tauri::ipc::Response::new).ok_or_else(|| format!("badge {name} isn't downloaded"))
}

#[tauri::command]
pub fn retro_achievements_playing(achievements: State<'_, Achievements>) -> Option<Vec<Achievement>> {
    achievements.playing()
}

#[tauri::command]
pub async fn retro_achievements_game<R: Runtime>(
    app: AppHandle<R>,
    achievements: State<'_, Achievements>,
    folder: String,
    path: String,
) -> Result<Option<Vec<Achievement>>, String> {
    use crate::cheats::Platform;
    // Neither has sets here, and a GameCube disc or its zip is too big to read for nothing.
    if matches!(Platform::of_path(&path), Ok(Platform::ThreeDs | Platform::GameCube) | Err(_)) {
        return Ok(None);
    }
    let rom = async {
        let bytes = crate::games_folder::GamesFolder::open(&app, &folder).read(&path).await;
        bytes
            .and_then(|bytes| crate::rom::unpack(&path, bytes))
            .inspect_err(|e| eprintln!("retroachievements: {e}"))
            .ok()
    };
    Ok(achievements.of_game(&format!("{folder}\n{path}"), rom).await)
}

#[tauri::command]
pub fn retro_achievements_create_account<R: Runtime>(app: AppHandle<R>) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    app.opener().open_url("https://retroachievements.org/createaccount.php", None::<&str>).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn retro_achievements_summary(achievements: State<'_, Achievements>) -> Result<Option<Summary>, String> {
    Ok(achievements.summary().await)
}

#[tauri::command]
pub fn retro_achievements_open_profile<R: Runtime>(
    app: AppHandle<R>,
    achievements: State<'_, Achievements>,
) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    let url = achievements.profile_url().ok_or("Not signed in to RetroAchievements")?;
    app.opener().open_url(url, None::<&str>).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn retro_achievements_sign_out(achievements: State<'_, Achievements>) -> Result<(), String> {
    achievements.sign_out()
}
