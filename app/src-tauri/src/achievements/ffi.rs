#![allow(non_camel_case_types)]

use std::ffi::{c_char, c_int, c_void};

pub const RC_OK: c_int = 0;
pub const RC_NOT_FOUND: c_int = -39;
pub const RC_CLIENT_EVENT_ACHIEVEMENT_TRIGGERED: u32 = 1;
pub const RC_CLIENT_EVENT_LEADERBOARD_STARTED: u32 = 2;
pub const RC_CLIENT_EVENT_LEADERBOARD_FAILED: u32 = 3;
pub const RC_CLIENT_EVENT_LEADERBOARD_SUBMITTED: u32 = 4;
pub const RC_CLIENT_EVENT_ACHIEVEMENT_CHALLENGE_INDICATOR_SHOW: u32 = 5;
pub const RC_CLIENT_EVENT_ACHIEVEMENT_CHALLENGE_INDICATOR_HIDE: u32 = 6;
pub const RC_CLIENT_EVENT_ACHIEVEMENT_PROGRESS_INDICATOR_SHOW: u32 = 7;
pub const RC_CLIENT_EVENT_ACHIEVEMENT_PROGRESS_INDICATOR_UPDATE: u32 = 9;
pub const RC_CLIENT_EVENT_LEADERBOARD_TRACKER_SHOW: u32 = 10;
pub const RC_CLIENT_EVENT_LEADERBOARD_TRACKER_HIDE: u32 = 11;
pub const RC_CLIENT_EVENT_LEADERBOARD_TRACKER_UPDATE: u32 = 12;
pub const RC_CLIENT_EVENT_GAME_COMPLETED: u32 = 15;
pub const RC_CLIENT_LOG_LEVEL_WARN: c_int = 2;
pub const RC_CLIENT_ACHIEVEMENT_CATEGORY_CORE: c_int = 1;
pub const RC_CLIENT_ACHIEVEMENT_LIST_GROUPING_LOCK_STATE: c_int = 0;
pub const RC_API_SERVER_RESPONSE_RETRYABLE_CLIENT_ERROR: c_int = -2;
pub const RC_CLIENT_ACHIEVEMENT_UNLOCKED_HARDCORE: u8 = 2;
pub const RC_ACHIEVEMENT_CATEGORY_CORE: u32 = 3;
pub const RC_ACHIEVEMENT_SET_TYPE_CORE: u8 = 0;

pub const RC_CONSOLE_NINTENDO_64: u32 = 2;
pub const RC_CONSOLE_GAMEBOY: u32 = 4;
pub const RC_CONSOLE_GAMEBOY_ADVANCE: u32 = 5;
pub const RC_CONSOLE_GAMEBOY_COLOR: u32 = 6;
pub const RC_CONSOLE_NINTENDO_DS: u32 = 18;

#[repr(C)]
pub struct rc_client_t {
    _private: [u8; 0],
}

#[repr(C)]
pub struct rc_buffer_chunk_t {
    write: *mut u8,
    end: *mut u8,
    start: *mut u8,
    next: *mut rc_buffer_chunk_t,
}

#[repr(C)]
pub struct rc_api_request_t {
    pub url: *const c_char,
    pub post_data: *const c_char,
    pub content_type: *const c_char,
    chunk: rc_buffer_chunk_t,
    data: [u8; 256],
}

#[repr(C)]
pub struct rc_api_response_t {
    pub succeeded: c_int,
    pub error_message: *const c_char,
    pub error_code: *const c_char,
    chunk: rc_buffer_chunk_t,
    data: [u8; 256],
}

#[repr(C)]
pub struct rc_api_host_t {
    pub host: *const c_char,
    pub media_host: *const c_char,
}

#[repr(C)]
pub struct rc_api_award_achievement_request_t {
    pub username: *const c_char,
    pub api_token: *const c_char,
    pub achievement_id: u32,
    pub hardcore: u32,
    pub game_hash: *const c_char,
    pub seconds_since_unlock: u32,
}

#[repr(C)]
pub struct rc_api_server_response_t {
    pub body: *const c_char,
    pub body_length: usize,
    pub http_status_code: c_int,
}

#[repr(C)]
pub struct rc_client_user_t {
    pub display_name: *const c_char,
    pub username: *const c_char,
    pub token: *const c_char,
}

#[repr(C)]
pub struct rc_client_achievement_t {
    pub title: *const c_char,
    pub description: *const c_char,
    pub badge_name: [c_char; 8],
    pub measured_progress: [c_char; 24],
    measured_percent: f32,
    pub id: u32,
    pub points: u32,
    pub unlock_time: libc::time_t,
    state: u8,
    category: u8,
    bucket: u8,
    pub unlocked: u8,
    pub rarity: f32,
    rarity_hardcore: f32,
    kind: u8,
    pub badge_url: *const c_char,
    badge_locked_url: *const c_char,
}

#[repr(C)]
pub struct rc_client_game_t {
    id: u32,
    console_id: u32,
    pub title: *const c_char,
    pub hash: *const c_char,
    pub badge_name: *const c_char,
    pub badge_url: *const c_char,
}

#[repr(C)]
pub struct rc_client_user_game_summary_t {
    num_core_achievements: u32,
    num_unofficial_achievements: u32,
    num_unlocked_achievements: u32,
    num_unsupported_achievements: u32,
    pub points_core: u32,
    points_unlocked: u32,
    beaten_time: libc::time_t,
    completed_time: libc::time_t,
}

#[repr(C)]
pub struct rc_client_achievement_bucket_t {
    pub achievements: *const *const rc_client_achievement_t,
    pub num_achievements: u32,
    label: *const c_char,
    subset_id: u32,
    bucket_type: u8,
}

#[repr(C)]
pub struct rc_client_achievement_list_t {
    pub buckets: *const rc_client_achievement_bucket_t,
    pub num_buckets: u32,
}

#[repr(C)]
pub struct rc_api_fetch_game_sets_request_t {
    pub username: *const c_char,
    pub api_token: *const c_char,
    pub game_id: u32,
    pub game_hash: *const c_char,
}

#[repr(C)]
pub struct rc_api_achievement_definition_t {
    pub id: u32,
    pub points: u32,
    pub category: u32,
    pub title: *const c_char,
    pub description: *const c_char,
    definition: *const c_char,
    author: *const c_char,
    pub badge_name: *const c_char,
    created: libc::time_t,
    updated: libc::time_t,
    kind: u32,
    pub rarity: f32,
    rarity_hardcore: f32,
    pub badge_url: *const c_char,
    badge_locked_url: *const c_char,
}

#[repr(C)]
pub struct rc_api_achievement_set_definition_t {
    id: u32,
    game_id: u32,
    title: *const c_char,
    image_name: *const c_char,
    image_url: *const c_char,
    pub achievements: *const rc_api_achievement_definition_t,
    pub num_achievements: u32,
    leaderboards: *const c_void,
    num_leaderboards: u32,
    pub kind: u8,
}

#[repr(C)]
pub struct rc_api_fetch_game_sets_response_t {
    pub id: u32,
    console_id: u32,
    pub title: *const c_char,
    image_name: *const c_char,
    image_url: *const c_char,
    rich_presence_script: *const c_char,
    session_game_id: u32,
    pub sets: *const rc_api_achievement_set_definition_t,
    pub num_sets: u32,
    pub response: rc_api_response_t,
}

#[repr(C)]
pub struct rc_api_login_request_t {
    pub username: *const c_char,
    pub api_token: *const c_char,
    pub password: *const c_char,
}

#[repr(C)]
pub struct rc_api_login_response_t {
    pub username: *const c_char,
    api_token: *const c_char,
    pub score: u32,
    pub score_softcore: u32,
    num_unread_messages: u32,
    display_name: *const c_char,
    pub avatar_url: *const c_char,
    pub avatar_last_updated: libc::time_t,
    pub response: rc_api_response_t,
}

#[repr(C)]
pub struct rc_api_fetch_user_unlocks_request_t {
    pub username: *const c_char,
    pub api_token: *const c_char,
    pub game_id: u32,
    pub hardcore: u32,
}

#[repr(C)]
pub struct rc_api_fetch_user_unlocks_response_t {
    pub achievement_ids: *const u32,
    pub num_achievement_ids: u32,
    pub response: rc_api_response_t,
}

#[repr(C)]
pub struct rc_client_leaderboard_t {
    pub title: *const c_char,
    description: *const c_char,
    pub tracker_value: *const c_char,
    pub id: u32,
    state: u8,
    format: u8,
    lower_is_better: u8,
}

#[repr(C)]
pub struct rc_client_leaderboard_tracker_t {
    pub display: [c_char; 24],
    pub id: u32,
}

#[repr(C)]
pub struct rc_client_event_t {
    pub kind: u32,
    pub achievement: *mut rc_client_achievement_t,
    pub leaderboard: *mut rc_client_leaderboard_t,
    pub leaderboard_tracker: *mut rc_client_leaderboard_tracker_t,
}

pub const RC_LIBRETRO_MAX_MEMORY_REGIONS: usize = 32;

#[repr(C)]
pub struct rc_libretro_memory_regions_t {
    data: [*mut u8; RC_LIBRETRO_MAX_MEMORY_REGIONS],
    size: [usize; RC_LIBRETRO_MAX_MEMORY_REGIONS],
    total_size: usize,
    count: u32,
}

impl Default for rc_libretro_memory_regions_t {
    fn default() -> Self {
        rc_libretro_memory_regions_t {
            data: [std::ptr::null_mut(); RC_LIBRETRO_MAX_MEMORY_REGIONS],
            size: [0; RC_LIBRETRO_MAX_MEMORY_REGIONS],
            total_size: 0,
            count: 0,
        }
    }
}

#[repr(C)]
pub struct rc_libretro_core_memory_info_t {
    pub data: *mut u8,
    pub size: usize,
}

pub type ReadMemory = unsafe extern "C" fn(u32, *mut u8, u32, *mut rc_client_t) -> u32;
pub type ServerCallback = unsafe extern "C" fn(*const rc_api_server_response_t, *mut c_void);
pub type ServerCall = unsafe extern "C" fn(*const rc_api_request_t, ServerCallback, *mut c_void, *mut rc_client_t);
pub type Callback = unsafe extern "C" fn(c_int, *const c_char, *mut rc_client_t, *mut c_void);
pub type Message = unsafe extern "C" fn(*const c_char, *const rc_client_t);
pub type EventHandler = unsafe extern "C" fn(*const rc_client_event_t, *mut rc_client_t);
pub type CoreMemoryInfo = unsafe extern "C" fn(u32, *mut rc_libretro_core_memory_info_t);

extern "C" {
    pub fn rc_client_create(read_memory: ReadMemory, server_call: ServerCall) -> *mut rc_client_t;
    pub fn rc_client_destroy(client: *mut rc_client_t);
    pub fn rc_client_set_hardcore_enabled(client: *mut rc_client_t, enabled: c_int);
    pub fn rc_client_get_hardcore_enabled(client: *const rc_client_t) -> c_int;
    pub fn rc_client_set_userdata(client: *mut rc_client_t, userdata: *mut c_void);
    pub fn rc_client_get_userdata(client: *const rc_client_t) -> *mut c_void;
    pub fn rc_client_set_host(client: *mut rc_client_t, hostname: *const c_char);
    pub fn rc_client_get_user_agent_clause(client: *mut rc_client_t, buffer: *mut c_char, size: usize) -> usize;
    pub fn rc_client_enable_logging(client: *mut rc_client_t, level: c_int, callback: Message);
    pub fn rc_client_set_event_handler(client: *mut rc_client_t, handler: EventHandler);
    pub fn rc_client_set_allow_background_memory_reads(client: *mut rc_client_t, allowed: c_int);
    pub fn rc_client_begin_login_with_password(
        client: *mut rc_client_t,
        username: *const c_char,
        password: *const c_char,
        callback: Callback,
        userdata: *mut c_void,
    ) -> *mut c_void;
    pub fn rc_client_begin_login_with_token(
        client: *mut rc_client_t,
        username: *const c_char,
        token: *const c_char,
        callback: Callback,
        userdata: *mut c_void,
    ) -> *mut c_void;
    pub fn rc_client_logout(client: *mut rc_client_t);
    pub fn rc_client_get_user_info(client: *const rc_client_t) -> *const rc_client_user_t;
    pub fn rc_client_begin_load_game(
        client: *mut rc_client_t,
        hash: *const c_char,
        callback: Callback,
        userdata: *mut c_void,
    ) -> *mut c_void;
    pub fn rc_client_is_game_loaded(client: *const rc_client_t) -> c_int;
    pub fn rc_client_get_game_info(client: *const rc_client_t) -> *const rc_client_game_t;
    pub fn rc_client_get_user_game_summary(client: *const rc_client_t, summary: *mut rc_client_user_game_summary_t);
    pub fn rc_client_unload_game(client: *mut rc_client_t);
    pub fn rc_client_do_frame(client: *mut rc_client_t);
    pub fn rc_client_idle(client: *mut rc_client_t);
    pub fn rc_client_reset(client: *mut rc_client_t);
    pub fn rc_client_create_achievement_list(
        client: *mut rc_client_t,
        category: c_int,
        grouping: c_int,
    ) -> *mut rc_client_achievement_list_t;
    pub fn rc_client_destroy_achievement_list(list: *mut rc_client_achievement_list_t);

    pub fn rc_hash_generate_from_buffer(hash: *mut c_char, console_id: u32, buffer: *const u8, size: usize) -> c_int;

    pub fn rc_libretro_memory_init(
        regions: *mut rc_libretro_memory_regions_t,
        mmap: *const c_void,
        get_core_memory_info: CoreMemoryInfo,
        console_id: u32,
    ) -> c_int;
    pub fn rc_libretro_memory_destroy(regions: *mut rc_libretro_memory_regions_t);
    pub fn rc_libretro_memory_read(
        regions: *const rc_libretro_memory_regions_t,
        address: u32,
        buffer: *mut u8,
        num_bytes: u32,
    ) -> u32;

    pub fn rc_api_init_award_achievement_request_hosted(
        request: *mut rc_api_request_t,
        params: *const rc_api_award_achievement_request_t,
        host: *const rc_api_host_t,
    ) -> c_int;
    pub fn rc_api_destroy_request(request: *mut rc_api_request_t);
    pub fn rc_api_init_fetch_game_sets_request_hosted(
        request: *mut rc_api_request_t,
        params: *const rc_api_fetch_game_sets_request_t,
        host: *const rc_api_host_t,
    ) -> c_int;
    pub fn rc_api_process_fetch_game_sets_server_response(
        response: *mut rc_api_fetch_game_sets_response_t,
        server_response: *const rc_api_server_response_t,
    ) -> c_int;
    pub fn rc_api_destroy_fetch_game_sets_response(response: *mut rc_api_fetch_game_sets_response_t);
    pub fn rc_api_init_login_request_hosted(
        request: *mut rc_api_request_t,
        params: *const rc_api_login_request_t,
        host: *const rc_api_host_t,
    ) -> c_int;
    pub fn rc_api_process_login_server_response(
        response: *mut rc_api_login_response_t,
        server_response: *const rc_api_server_response_t,
    ) -> c_int;
    pub fn rc_api_destroy_login_response(response: *mut rc_api_login_response_t);
    pub fn rc_api_init_fetch_user_unlocks_request_hosted(
        request: *mut rc_api_request_t,
        params: *const rc_api_fetch_user_unlocks_request_t,
        host: *const rc_api_host_t,
    ) -> c_int;
    pub fn rc_api_process_fetch_user_unlocks_server_response(
        response: *mut rc_api_fetch_user_unlocks_response_t,
        server_response: *const rc_api_server_response_t,
    ) -> c_int;
    pub fn rc_api_destroy_fetch_user_unlocks_response(response: *mut rc_api_fetch_user_unlocks_response_t);
}
