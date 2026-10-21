#![allow(dead_code)]

mod dolphin;
#[cfg_attr(target_os = "android", path = "retro/android.rs")]
#[cfg_attr(target_os = "ios", path = "retro/ios.rs")]
#[cfg_attr(desktop, path = "retro/desktop.rs")]
mod platform;
mod vfs;

use crate::gl;
use crate::memory::{self, Range, Region};
use crate::rom::{Rom, System};
use crate::screen::{Picture, Texture};
use crate::transfer_pak;
use crate::vulkan;
use platform::{
    azahar_renderer, core_path, exec_mem_alloc, exec_mem_free, release_exec_mem, supports, vulkan_library,
    DOLPHIN_ASYNC_SHADERS, DOLPHIN_CONTEXT, DOLPHIN_SYS, JIT, N64_CPU, SCREEN_DRAWS_VULKAN, UBERSHADER_FALLBACK,
    VULKAN_SETTINGS,
};
pub use platform::{enable_jit_url, jit_on};
#[cfg(sideload)]
pub use platform::{jit_helper, turn_on_jit_with_helper, JitHelper};
use std::cell::{Cell, RefCell};
use std::ffi::{c_char, c_uint, c_void, CStr, CString};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, AtomicU16, AtomicU32, AtomicU64, Ordering};
use std::sync::{Mutex, OnceLock};

pub const MEMORY_SAVE_RAM: c_uint = 0;
pub const MEMORY_RTC: c_uint = 1;
pub const MEMORY_SYSTEM_RAM: c_uint = 2;

const ENV_GET_CAN_DUPE: c_uint = 3;
const ENV_SET_MESSAGE: c_uint = 6;
const ENV_GET_SYSTEM_DIRECTORY: c_uint = 9;
const ENV_SET_PIXEL_FORMAT: c_uint = 10;
const ENV_SET_HW_RENDER: c_uint = 14;
const ENV_GET_VARIABLE: c_uint = 15;
const ENV_SET_VARIABLES: c_uint = 16;
const ENV_GET_VARIABLE_UPDATE: c_uint = 17;
const ENV_GET_LOG_INTERFACE: c_uint = 27;
const ENV_GET_SAVE_DIRECTORY: c_uint = 31;
const ENV_SET_SYSTEM_AV_INFO: c_uint = 32;
const ENV_SET_MEMORY_MAPS: c_uint = 36 | 0x10000;
const ENV_SET_GEOMETRY: c_uint = 37;
const ENV_GET_INPUT_BITMASKS: c_uint = 51 | 0x10000;
const ENV_GET_CORE_OPTIONS_VERSION: c_uint = 52;
const ENV_SET_CORE_OPTIONS: c_uint = 53;
const ENV_SET_CORE_OPTIONS_INTL: c_uint = 54;
const ENV_SET_CORE_OPTIONS_DISPLAY: c_uint = 55;
const ENV_SET_CORE_OPTIONS_V2: c_uint = 67;
const ENV_GET_MESSAGE_INTERFACE_VERSION: c_uint = 59;
const ENV_SET_MESSAGE_EXT: c_uint = 60;
const ENV_SET_CORE_OPTIONS_V2_INTL: c_uint = 68;
const ENV_GET_VFS_INTERFACE: c_uint = 45 | 0x10000;
const ENV_GET_HW_RENDER_INTERFACE: c_uint = 41 | 0x10000;
const ENV_SET_HW_RENDER_CONTEXT_NEGOTIATION_INTERFACE: c_uint = 43 | 0x10000;
const ENV_GET_JIT_CAPABLE: c_uint = 74;
const ENV_GET_PREFERRED_HW_RENDER: c_uint = 56;
const ENV_EXEC_MEM_ALLOC: c_uint = 83;
const ENV_EXEC_MEM_FREE: c_uint = 84;
const LOG_ERROR: c_uint = 3;
const MESSAGE_TARGET_LOG: c_uint = 2;
const MESSAGE_TYPE_NOTIFICATION_ALT: c_uint = 1;
const HW_CONTEXT_OPENGL_CORE: c_uint = 3;
const HW_CONTEXT_OPENGLES3: c_uint = 4;
const HW_CONTEXT_VULKAN: c_uint = 6;
const HW_FRAME_BUFFER_VALID: *const c_void = usize::MAX as *const c_void;
const PIXEL_FORMAT_RGB565: c_uint = 2;
const PIXEL_FORMAT_XRGB8888: c_uint = 1;
const DEVICE_JOYPAD: c_uint = 1;
const DEVICE_ID_JOYPAD_MASK: c_uint = 256;
const DEVICE_ANALOG: c_uint = 5;
const DEVICE_INDEX_ANALOG_BUTTON: c_uint = 2;
const DEVICE_ID_JOYPAD_L2: c_uint = 12;
const DEVICE_ID_JOYPAD_R2: c_uint = 13;
const DEVICE_POINTER: c_uint = 6;
const DEVICE_ID_POINTER_X: c_uint = 0;
const DEVICE_ID_POINTER_Y: c_uint = 1;
const DEVICE_ID_POINTER_PRESSED: c_uint = 2;
const GAME_TYPE_TRANSFERPAK: c_uint = 2;
const EXEC_MEM_MODE_UNAVAILABLE: c_uint = 0;
const EXEC_MEM_MODE_WX_TOGGLE: c_uint = 3;
const EXEC_MEM_MODE_DUAL_MAP: c_uint = 4;

#[repr(C)]
struct ExecMemAlloc {
    version: c_uint,
    size: usize,
    mode: c_uint,
    rx: *mut c_void,
    rw: *mut c_void,
}

#[derive(Debug, PartialEq)]
struct ExecMem {
    mode: c_uint,
    rx: *mut c_void,
    rw: *mut c_void,
}

impl ExecMem {
    fn probe(mode: c_uint) -> ExecMem {
        ExecMem { mode, rx: std::ptr::null_mut(), rw: std::ptr::null_mut() }
    }
}

#[repr(C)]
struct GameInfo {
    path: *const c_char,
    data: *const c_void,
    size: usize,
    meta: *const c_char,
}

#[repr(C)]
#[derive(Clone, Copy)]
struct MemoryDescriptor {
    flags: u64,
    ptr: *mut c_void,
    offset: usize,
    start: usize,
    select: usize,
    disconnect: usize,
    len: usize,
    addrspace: *const c_char,
}

#[repr(C)]
struct MemoryMap {
    descriptors: *const MemoryDescriptor,
    num_descriptors: c_uint,
}

#[repr(C)]
struct RetroMessage {
    msg: *const c_char,
    frames: c_uint,
}

#[repr(C)]
struct MessageExt {
    msg: *const c_char,
    duration: c_uint,
    priority: c_uint,
    level: c_uint,
    target: c_uint,
    kind: c_uint,
    progress: i8,
}

#[repr(C)]
struct LogCallback {
    log: unsafe extern "C" fn(c_uint, *const c_char),
}

#[repr(C)]
struct HwRenderCallback {
    context_type: c_uint,
    context_reset: Option<unsafe extern "C" fn()>,
    get_current_framebuffer: Option<unsafe extern "C" fn() -> usize>,
    get_proc_address: Option<unsafe extern "C" fn(*const c_char) -> *const c_void>,
    depth: bool,
    stencil: bool,
    bottom_left_origin: bool,
    version_major: c_uint,
    version_minor: c_uint,
    cache_context: bool,
    context_destroy: Option<unsafe extern "C" fn()>,
    debug_context: bool,
}

enum Renderer {
    Gl(gl::Renderer),
    Vulkan(vulkan::Renderer),
}

impl Renderer {
    fn resize(&mut self, width: u32, height: u32) -> Result<(), String> {
        match self {
            Renderer::Gl(renderer) => renderer.resize(width, height),
            // The core sizes its own images, and only needs the device by now.
            Renderer::Vulkan(renderer) => renderer.interface().map(|_| ()),
        }
    }

    fn read(&mut self, width: u32, height: u32, bottom_left: bool, out: &mut Vec<u16>) -> Result<(u32, u32), String> {
        match self {
            Renderer::Gl(renderer) => Ok(renderer.read(width, height, bottom_left, out)),
            Renderer::Vulkan(renderer) => renderer.read(width, height, out),
        }
    }

    fn sleep(&self) {
        match self {
            Renderer::Gl(renderer) => renderer.finish(),
            Renderer::Vulkan(renderer) => renderer.sleep(),
        }
    }

    fn wake(&self) {
        if let Renderer::Vulkan(renderer) = self {
            renderer.wake();
        }
    }

    fn make_current(&self) {
        if let Renderer::Gl(renderer) = self {
            renderer.make_current();
        }
    }
}

struct HwRender {
    renderer: Renderer,
    reset: Option<unsafe extern "C" fn()>,
    destroy: Option<unsafe extern "C" fn()>,
    bottom_left: bool,
}

pub const UNSUPPORTED_DEVICE: &str = "unsupported-device";

#[derive(serde::Serialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Message {
    pub text: String,
    pub duration_ms: u32,
}

#[repr(C)]
struct OptionDefinitionV2 {
    key: *const c_char,
    descriptions: [*const c_char; 5],
    values: [[*const c_char; 2]; 128],
    default_value: *const c_char,
}

#[repr(C)]
struct OptionsV2 {
    categories: *const c_void,
    definitions: *const OptionDefinitionV2,
}

#[repr(C)]
struct OptionsV2Intl {
    us: *const OptionsV2,
    local: *const OptionsV2,
}

#[repr(C)]
struct Variable {
    key: *const c_char,
    value: *const c_char,
}

const JIT_OPTION: &CStr = if JIT { c"enabled" } else { c"disabled" };

// Keys carry the core's prefix, so one table serves every core.
const OPTIONS: [(&CStr, &CStr); 33] = [
    (c"mgba_sgb_borders", c"OFF"),
    (c"melonds_console_mode", c"ds"),
    (c"melonds_sysfile_mode", c"builtin"),
    (c"melonds_render_mode", c"software"),
    (c"melonds_jit_enable", JIT_OPTION),
    (c"melonds_number_of_screen_layouts", c"1"),
    (c"melonds_screen_layout1", c"top-bottom"),
    (c"melonds_screen_gap", c"0"),
    (c"melonds_show_cursor", c"disabled"),
    (c"melonds_touch_mode", c"touch"),
    (c"melonds_start_time_mode", c"sync"),
    // Kaeru WFC. The core only applies its own default DNS when the frontend answers this key.
    (c"melonds_firmware_wfc_dns", c"178.62.43.212"),
    (c"mupen64plus-rdp-plugin", c"gliden64"),
    (c"mupen64plus-cpucore", N64_CPU),
    (c"mupen64plus-43screensize", c"640x480"),
    // The app applies its own dead zones, which differ between the touch stick and a pad's.
    (c"mupen64plus-astick-deadzone", c"0"),
    (c"citra_is_new_3ds", c"Old 3DS"),
    // Azahar asks for executable memory itself, and runs without its JITs when it gets none.
    (c"citra_use_cpu_jit", c"enabled"),
    (c"citra_use_shader_jit", c"enabled"),
    (c"citra_use_fastinterp", c"enabled"),
    (c"citra_cpu_clock_percentage", c"100"),
    (c"citra_resolution_factor", c"1"),
    (c"citra_texture_filter", c"none"),
    (c"citra_use_hw_shader", c"enabled"),
    (c"citra_use_disk_shader_cache", c"enabled"),
    (c"citra_audio_emulation", c"hle"),
    (c"citra_layout_option", c"default"),
    (c"citra_use_virtual_sd", c"enabled"),
    // Puts the core's Azahar folder in the save directory, which is the app's own.
    (c"citra_use_libretro_save_path", c"LibRetro Default"),
    // Old 3DS has no C-stick, and the right stick would otherwise move a touch cursor.
    (c"citra_analog_function", c"c_stick"),
    // Dolphin otherwise draws notices such as patches it applied into the frame.
    (c"dolphin_osd_enabled", c"disabled"),
    // Dolphin uses the app's file system only on Android by default, and the memory card goes through it.
    (c"dolphin_libretro_vfs_enabled", c"enabled"),
    (c"dolphin_widescreen_hack", c"disabled"),
];

#[repr(C)]
struct RawCoreInfo {
    library_name: *const c_char,
    library_version: *const c_char,
    valid_extensions: *const c_char,
    need_fullpath: bool,
    block_extract: bool,
}

#[derive(serde::Serialize, Clone, Debug, PartialEq)]
pub struct CoreInfo {
    pub name: String,
    pub version: String,
}

impl CoreInfo {
    // States from before cores were recorded don't say, so they're taken as this core's.
    pub fn wrote(&self, core: Option<&str>, version: Option<&str>) -> bool {
        core.is_none_or(|core| core == self.name) && version.is_none_or(|version| version == self.version)
    }
}

#[repr(C)]
#[derive(Default, Debug, Clone, Copy)]
pub struct GameGeometry {
    pub base_width: c_uint,
    pub base_height: c_uint,
    pub max_width: c_uint,
    pub max_height: c_uint,
    pub aspect_ratio: f32,
}

#[repr(C)]
#[derive(Default, Debug, Clone, Copy)]
pub struct SystemTiming {
    pub fps: f64,
    pub sample_rate: f64,
}

#[repr(C)]
#[derive(Default, Debug, Clone, Copy)]
pub struct AvInfo {
    pub geometry: GameGeometry,
    pub timing: SystemTiming,
}

type EnvFn = unsafe extern "C" fn(c_uint, *mut c_void) -> bool;
type VideoFn = unsafe extern "C" fn(*const c_void, c_uint, c_uint, usize);
type AudioSampleFn = unsafe extern "C" fn(i16, i16);
type AudioBatchFn = unsafe extern "C" fn(*const i16, usize) -> usize;
type InputPollFn = unsafe extern "C" fn();
type InputStateFn = unsafe extern "C" fn(c_uint, c_uint, c_uint, c_uint) -> i16;

macro_rules! libretro_api {
    ($($name:ident($($arg:ty),*) $(-> $ret:ty)?;)*) => {
        // Every libretro core exports the same symbols, so only mGBA is linked in and the rest load at runtime.
        #[derive(Clone, Copy)]
        struct Api {
            $($name: unsafe extern "C" fn($($arg),*) $(-> $ret)?,)*
        }

        mod mgba {
            use super::*;
            extern "C" {
                $(pub fn $name($(_: $arg),*) $(-> $ret)?;)*
            }
        }

        impl Api {
            const MGBA: Api = Api { $($name: mgba::$name,)* };

            unsafe fn open(library: &libloading::Library) -> Result<Api, libloading::Error> {
                Ok(Api { $($name: *library.get(stringify!($name))?,)* })
            }
        }
    };
}

libretro_api! {
    retro_set_environment(EnvFn);
    retro_set_video_refresh(VideoFn);
    retro_set_audio_sample(AudioSampleFn);
    retro_set_audio_sample_batch(AudioBatchFn);
    retro_set_input_poll(InputPollFn);
    retro_set_input_state(InputStateFn);
    retro_init();
    retro_deinit();
    retro_get_system_info(*mut RawCoreInfo);
    retro_get_system_av_info(*mut AvInfo);
    retro_load_game(*const GameInfo) -> bool;
    retro_load_game_special(c_uint, *const GameInfo, usize) -> bool;
    retro_unload_game();
    retro_run();
    retro_reset();
    retro_serialize_size() -> usize;
    retro_serialize(*mut c_void, usize) -> bool;
    retro_unserialize(*const c_void, usize) -> bool;
    retro_get_memory_data(c_uint) -> *mut c_void;
    retro_get_memory_size(c_uint) -> usize;
    retro_cheat_reset();
    retro_cheat_set(c_uint, bool, *const c_char);
    retro_set_controller_port_device(c_uint, c_uint);
}

type Library = OnceLock<Result<(libloading::Library, Api), String>>;

// The library stays loaded once opened, since unloading a C++ core with threads of its own isn't safe.
fn open_core(library: &'static Library, name: &str, games: &str) -> Result<Api, String> {
    let loaded = library.get_or_init(|| unsafe {
        let path = core_path(name).ok_or_else(|| format!("{games} games can't be played on this device yet"))?;
        let library = libloading::Library::new(path).map_err(|e| e.to_string())?;
        let api = Api::open(&library).map_err(|e| e.to_string())?;
        Ok((library, api))
    });
    loaded.as_ref().map(|(_, api)| *api).map_err(Clone::clone)
}

fn melonds_ds() -> Result<Api, String> {
    static LIBRARY: Library = OnceLock::new();
    open_core(&LIBRARY, "melondsds_libretro", "DS")
}

fn mupen64plus_next() -> Result<Api, String> {
    static LIBRARY: Library = OnceLock::new();
    open_core(&LIBRARY, "mupen64plus_next_libretro", "N64")
}

fn azahar() -> Result<Api, String> {
    static LIBRARY: Library = OnceLock::new();
    open_core(&LIBRARY, "azahar_libretro", "3DS")
}

fn dolphin() -> Result<Api, String> {
    static LIBRARY: Library = OnceLock::new();
    open_core(&LIBRARY, "dolphin_libretro", "GameCube")
}

fn api(system: System) -> Result<Api, String> {
    match system {
        System::Gb | System::Gba => Ok(Api::MGBA),
        System::Ds => melonds_ds(),
        System::N64 => mupen64plus_next(),
        System::ThreeDs => azahar(),
        System::GameCube => dolphin(),
    }
}

#[derive(Default)]
pub struct Frame {
    pub width: u32,
    pub height: u32,
    pub pixels: Vec<u16>,
    pub fresh: bool,
    // A frame left in the core's texture or image, so the pixels are an older frame's until read back.
    pub in_texture: bool,
}

#[derive(Default)]
struct Mix {
    blend: bool,
    frames: u32,
    width: u32,
    height: u32,
    previous: Vec<u16>,
    latest: Vec<u16>,
    out: Frame,
}

impl Mix {
    fn add(&mut self, frame: &Frame) {
        if frame.pixels.is_empty() {
            return;
        }
        if (self.width, self.height) != (frame.width, frame.height) {
            (self.width, self.height) = (frame.width, frame.height);
            self.frames = 0;
        }
        if !self.blend {
            return;
        }
        std::mem::swap(&mut self.previous, &mut self.latest);
        self.latest.clone_from(&frame.pixels);
        self.frames += 1;
    }

    fn take_mixed(&mut self) -> Option<&Frame> {
        let blend = std::mem::take(&mut self.blend);
        let frames = std::mem::take(&mut self.frames);
        if !blend || frames < 2 {
            return None;
        }
        (self.out.width, self.out.height) = (self.width, self.height);
        let out = &mut self.out.pixels;
        out.clear();
        out.extend(self.previous.iter().zip(&self.latest).map(|(&a, &b)| {
            let ([ar, ag, ab], [br, bg, bb]) = (channels(a), channels(b));
            pixel([ar + br, ag + bg, ab + bb], |sum| (sum + 1) / 2)
        }));
        Some(&self.out)
    }
}

fn channels(pixel: u16) -> [u32; 3] {
    let pixel = pixel as u32;
    [pixel >> 11, (pixel >> 5) & 0x3F, pixel & 0x1F]
}

fn pixel([r, g, b]: [u32; 3], average: impl Fn(u32) -> u32) -> u16 {
    ((average(r) << 11) | (average(g) << 5) | average(b)) as u16
}

thread_local! {
    static FRAME: RefCell<Frame> =
        const { RefCell::new(Frame { width: 0, height: 0, pixels: Vec::new(), fresh: false, in_texture: false }) };
    static READ_BACK: Cell<bool> = const { Cell::new(true) };
    static MIX: RefCell<Mix> = RefCell::new(Mix::default());
    static AV: Cell<AvInfo> = Cell::new(AvInfo::default());
    static MEMORY_MAP: RefCell<Vec<Region>> = const { RefCell::new(Vec::new()) };
    // rcheevos maps memory itself, from the map as the core sent it.
    static MEMORY_DESCRIPTORS: RefCell<Vec<MemoryDescriptor>> = const { RefCell::new(Vec::new()) };
    static DS_CLOCK_OFFSET: RefCell<[CString; 2]> = RefCell::new([c"0".into(), c"0".into()]);
    static OPTION_DEFAULTS: RefCell<Vec<(CString, CString)>> = const { RefCell::new(Vec::new()) };
    static HW: RefCell<Option<HwRender>> = const { RefCell::new(None) };
    static HW_REFUSED: Cell<bool> = const { Cell::new(false) };
    static DREW: Cell<bool> = const { Cell::new(false) };
    static TRANSFER_PAK: Cell<bool> = const { Cell::new(false) };
    // Only Azahar gets a save directory and the app's file access, so the other cores keep working as they did.
    static AZAHAR: Cell<bool> = const { Cell::new(false) };
    static CORE_FLOAT_MODE: Cell<Option<u64>> = const { Cell::new(None) };
}

static HW_FRAMEBUFFER: AtomicU32 = AtomicU32::new(0);

static INPUT: AtomicU16 = AtomicU16::new(0);
// Left X, left Y, right X and right Y, 16 bits each from the low end, so the core never reads half an update.
static ANALOG: AtomicU64 = AtomicU64::new(0);
// L2 in the low 16 bits and R2 in the high 16.
static TRIGGERS: AtomicU32 = AtomicU32::new(0);
// Pressed in bit 32, y in bits 16 to 31 and x in the low 16, so the core never reads half an update.
static POINTER: AtomicU64 = AtomicU64::new(0);
// Input arrives whenever it changes, so a tap can go down and up between two frames. The next frame still sees it.
static UNSEEN_PRESSES: AtomicU16 = AtomicU16::new(0);
static UNSEEN_TOUCH: AtomicU64 = AtomicU64::new(0);
static PIXEL_FORMAT: AtomicU32 = AtomicU32::new(PIXEL_FORMAT_RGB565);
static LOADED: AtomicBool = AtomicBool::new(false);
static ASYNC_SHADERS: AtomicBool = AtomicBool::new(false);
static RESOLUTION: AtomicU32 = AtomicU32::new(1);
static SYSTEM_DIR: OnceLock<CString> = OnceLock::new();
// Dolphin asks for its directories, options and files from its own threads too, so it can't be a thread-local.
static DOLPHIN: AtomicBool = AtomicBool::new(false);
static DOLPHIN_SAVE_DIR: OnceLock<CString> = OnceLock::new();
static MESSAGES: Mutex<Vec<Message>> = Mutex::new(Vec::new());
// Dolphin's CPU thread sends samples itself in dual-core mode.
static AUDIO: Mutex<Vec<i16>> = Mutex::new(Vec::new());

unsafe fn keep_for_player(text: *const c_char, duration_ms: c_uint) {
    if !text.is_null() {
        let text = CStr::from_ptr(text).to_string_lossy().into_owned();
        MESSAGES.lock().unwrap_or_else(|e| e.into_inner()).push(Message { text, duration_ms });
    }
}

pub fn take_messages() -> Vec<Message> {
    std::mem::take(&mut *MESSAGES.lock().unwrap_or_else(|e| e.into_inner()))
}

pub fn three_ds_renderer() -> &'static str {
    azahar_renderer().to_str().unwrap()
}

pub fn set_async_shaders(on: bool) {
    ASYNC_SHADERS.store(on, Ordering::Relaxed);
}

pub fn set_resolution(scale: u32) {
    RESOLUTION.store(scale.clamp(1, 3), Ordering::Relaxed);
}

pub fn set_ds_clock_offset(seconds: i64) {
    let [days, hours] = [seconds / (24 * 60 * 60), seconds / (60 * 60) % 24].map(|n| CString::new(n.to_string()).unwrap());
    DS_CLOCK_OFFSET.set([days, hours]);
}

unsafe extern "C" fn current_framebuffer() -> usize {
    HW_FRAMEBUFFER.load(Ordering::Relaxed) as usize
}

fn start_hw_render(hw: &mut HwRenderCallback) -> Result<(), String> {
    let (reset, destroy) = (hw.context_reset, hw.context_destroy);
    let vulkan = hw.context_type == HW_CONTEXT_VULKAN;
    if DOLPHIN.load(Ordering::Relaxed) && (hw.context_type != DOLPHIN_CONTEXT || vulkan && !vulkan_1_1()) {
        return Err(format!("GameCube games need Vulkan 1.1, and the core asked for context type {}", hw.context_type));
    }
    if vulkan {
        let library = vulkan_library().ok_or("the core asked for Vulkan, which this device can't give it")?;
        HW.take();
        let renderer = Renderer::Vulkan(vulkan::Renderer::new(&library, VULKAN_SETTINGS)?);
        HW.set(Some(HwRender { renderer, reset, destroy, bottom_left: false }));
        return Ok(());
    }
    if !supports(hw) {
        let (kind, major, minor) = (hw.context_type, hw.version_major, hw.version_minor);
        return Err(format!("the core asked for GL context type {kind}, version {major}.{minor}"));
    }
    // Dropping a context clears the current one, so the old one has to go before the new one is made.
    HW.take();
    let renderer = gl::Renderer::new(hw.depth, hw.stencil)?;
    // A device's context can be older than the core needs, as GLES 3.1 is for Azahar.
    let (major, minor) = renderer.version();
    if (major, minor) < (hw.version_major, hw.version_minor) {
        let (wanted_major, wanted_minor) = (hw.version_major, hw.version_minor);
        return Err(format!("the core asked for GL {wanted_major}.{wanted_minor}, but the device has {major}.{minor}"));
    }
    HW_FRAMEBUFFER.store(renderer.framebuffer(), Ordering::Relaxed);
    hw.get_current_framebuffer = Some(current_framebuffer);
    hw.get_proc_address = Some(gl::proc_address);
    let bottom_left = hw.bottom_left_origin;
    HW.set(Some(HwRender { renderer: Renderer::Gl(renderer), reset, destroy, bottom_left }));
    Ok(())
}

fn vulkan_1_1() -> bool {
    static VULKAN_1_1: OnceLock<bool> = OnceLock::new();
    *VULKAN_1_1.get_or_init(|| {
        vulkan_library().is_some_and(|library| {
            vulkan::version(&library)
                .inspect_err(|e| eprintln!("Vulkan: {e}"))
                .is_ok_and(|version| version >= ash::vk::API_VERSION_1_1)
        })
    })
}

fn resize_hw_render(geometry: GameGeometry) -> bool {
    HW.with_borrow_mut(|hw| match hw {
        Some(hw) => hw.renderer.resize(geometry.base_width, geometry.base_height),
        None => Ok(()),
    })
    .inspect_err(|e| eprintln!("hardware rendering: {e}"))
    .is_ok()
}

fn hw_callback(pick: impl FnOnce(&HwRender) -> Option<unsafe extern "C" fn()>) -> Option<unsafe extern "C" fn()> {
    HW.with_borrow(|hw| hw.as_ref().and_then(pick))
}

pub fn sleep() {
    HW.with_borrow(|hw| {
        if let Some(hw) = hw {
            hw.renderer.sleep();
        }
    });
    gl::sleep();
    vulkan::sleep();
}

pub fn wake() {
    gl::wake();
    vulkan::wake();
    HW.with_borrow(|hw| {
        if let Some(hw) = hw {
            hw.renderer.wake();
        }
    });
}

fn stop_hw_render() {
    HW.take();
    HW_FRAMEBUFFER.store(0, Ordering::Relaxed);
}

pub fn set_input(mask: u16) {
    let before = INPUT.swap(mask, Ordering::Relaxed);
    UNSEEN_PRESSES.fetch_or(mask & !before, Ordering::Relaxed);
}

pub fn set_analog(analog: [i16; 4]) {
    ANALOG.store(analog.iter().rev().fold(0, |packed, &axis| packed << 16 | axis as u16 as u64), Ordering::Relaxed);
}

pub fn set_triggers([l2, r2]: [i16; 2]) {
    TRIGGERS.store((r2 as u16 as u32) << 16 | l2 as u16 as u32, Ordering::Relaxed);
}

pub fn release_input() {
    set_input(0);
    set_analog([0; 4]);
    set_triggers([0; 2]);
    set_pointer(None);
    UNSEEN_PRESSES.store(0, Ordering::Relaxed);
    UNSEEN_TOUCH.store(0, Ordering::Relaxed);
}

pub fn set_pointer(pointer: Option<[i16; 2]>) {
    let packed = pointer.map_or(0, |[x, y]| 1 << 32 | (y as u16 as u64) << 16 | x as u16 as u64);
    if POINTER.swap(packed, Ordering::Relaxed) == 0 && packed != 0 {
        let _ = UNSEEN_TOUCH.compare_exchange(0, packed, Ordering::Relaxed, Ordering::Relaxed);
    }
}

fn unseen_input() -> (u16, u64) {
    (UNSEEN_PRESSES.load(Ordering::Relaxed), UNSEEN_TOUCH.load(Ordering::Relaxed))
}

fn frame_saw((presses, touch): (u16, u64)) {
    UNSEEN_PRESSES.fetch_and(!presses, Ordering::Relaxed);
    let _ = UNSEEN_TOUCH.compare_exchange(touch, 0, Ordering::Relaxed, Ordering::Relaxed);
}

// The callback is variadic in C, which stable Rust can't define. Taking only the level and the format
// reads both from the right registers, but leaves the format unfilled.
// Dolphin turns its popups into log lines and carries on, so a crashed game would log the same line forever.
unsafe extern "C" fn log(level: c_uint, format: *const c_char) {
    const BUDGET: u64 = 4 << 20;
    static LOGGED: AtomicU64 = AtomicU64::new(0);
    if level < LOG_ERROR || format.is_null() {
        return;
    }
    let text = CStr::from_ptr(format).to_string_lossy();
    let before = LOGGED.fetch_add(text.len() as u64, Ordering::Relaxed);
    if before < BUDGET {
        eprint!("{text}");
    } else if before < BUDGET + text.len() as u64 {
        eprintln!("core log: over {} MB, dropping the rest", BUDGET >> 20);
    }
}

// Mupen64Plus-Next leaves an option it isn't told at 0, not at its default, so the defaults are answered for it.
unsafe fn keep_defaults(options: *const OptionsV2) {
    if options.is_null() || (*options).definitions.is_null() {
        return;
    }
    let mut defaults = Vec::new();
    let mut definition = (*options).definitions;
    while !(*definition).key.is_null() {
        let (key, value) = ((*definition).key, (*definition).default_value);
        if !value.is_null() {
            defaults.push((CStr::from_ptr(key).to_owned(), CStr::from_ptr(value).to_owned()));
        }
        definition = definition.add(1);
    }
    OPTION_DEFAULTS.set(defaults);
}

unsafe extern "C" fn environment(cmd: c_uint, data: *mut c_void) -> bool {
    match cmd {
        ENV_SET_PIXEL_FORMAT => {
            let format = *(data as *const c_uint);
            let supported = matches!(format, PIXEL_FORMAT_RGB565 | PIXEL_FORMAT_XRGB8888);
            if supported {
                PIXEL_FORMAT.store(format, Ordering::Relaxed);
            }
            supported
        }
        ENV_GET_CAN_DUPE => {
            *(data as *mut bool) = true;
            true
        }
        ENV_GET_INPUT_BITMASKS => true,
        // Mupen64Plus-Next logs without checking it got a logger.
        ENV_GET_LOG_INTERFACE => {
            (*(data as *mut LogCallback)).log = log;
            true
        }
        ENV_GET_CORE_OPTIONS_VERSION => {
            *(data as *mut c_uint) = 2;
            true
        }
        ENV_SET_CORE_OPTIONS_V2 => {
            keep_defaults(data as *const OptionsV2);
            true
        }
        ENV_SET_CORE_OPTIONS_V2_INTL => {
            if !data.is_null() {
                keep_defaults((*(data as *const OptionsV2Intl)).us);
            }
            true
        }
        ENV_SET_VARIABLES | ENV_SET_CORE_OPTIONS | ENV_SET_CORE_OPTIONS_INTL | ENV_SET_CORE_OPTIONS_DISPLAY => true,
        ENV_GET_VARIABLE_UPDATE => {
            *(data as *mut bool) = false;
            true
        }
        ENV_GET_VARIABLE => {
            let variable = &mut *(data as *mut Variable);
            let key = CStr::from_ptr(variable.key);
            let value = match OPTIONS.iter().find(|(k, _)| *k == key) {
                Some((_, value)) => Some(value.as_ptr()),
                None => DS_CLOCK_OFFSET.with_borrow(|[days, hours]| match key.to_bytes() {
                    b"melonds_start_time_relative_day_offset" => Some(days.as_ptr()),
                    b"melonds_start_time_relative_hour_offset" => Some(hours.as_ptr()),
                    _ => None,
                }),
            }
            .or_else(|| (key == c"mupen64plus-pak1" && TRANSFER_PAK.get()).then_some(c"transfer".as_ptr()))
            .or_else(|| (key == c"citra_graphics_api").then(|| azahar_renderer().as_ptr()))
            .or_else(|| {
                (key == c"citra_async_shader_compilation")
                    .then(|| if ASYNC_SHADERS.load(Ordering::Relaxed) { c"enabled" } else { c"disabled" }.as_ptr())
            })
            .or_else(|| {
                (key == c"citra_ubershader_fallback").then(|| {
                    if UBERSHADER_FALLBACK && ASYNC_SHADERS.load(Ordering::Relaxed) { c"enabled" } else { c"disabled" }
                        .as_ptr()
                })
            })
            .or_else(|| {
                (key == c"dolphin_shader_compilation_mode")
                    .then(|| if ASYNC_SHADERS.load(Ordering::Relaxed) { DOLPHIN_ASYNC_SHADERS } else { c"0" }.as_ptr())
            })
            .or_else(|| {
                (key == c"dolphin_efb_scale")
                    .then(|| [c"1", c"2", c"3"][RESOLUTION.load(Ordering::Relaxed) as usize - 1].as_ptr())
            })
            .or_else(|| {
                OPTION_DEFAULTS.with_borrow(|defaults| {
                    defaults.iter().find(|(k, _)| k.as_c_str() == key).map(|(_, value)| value.as_ptr())
                })
            });
            match value {
                Some(value) => {
                    variable.value = value;
                    true
                }
                None => false,
            }
        }
        ENV_SET_HW_RENDER => match start_hw_render(&mut *(data as *mut HwRenderCallback)) {
            Ok(()) => true,
            Err(e) => {
                eprintln!("hardware rendering: {e}");
                HW_REFUSED.set(true);
                false
            }
        },
        ENV_SET_HW_RENDER_CONTEXT_NEGOTIATION_INTERFACE => HW.with_borrow_mut(|hw| match hw {
            Some(HwRender { renderer: Renderer::Vulkan(renderer), .. }) => {
                renderer.negotiate(data as *const vulkan::Negotiation)
            }
            _ => false,
        }),
        ENV_GET_HW_RENDER_INTERFACE => HW.with_borrow_mut(|hw| match hw {
            Some(HwRender { renderer: Renderer::Vulkan(renderer), .. }) => match renderer.interface() {
                Ok(interface) => {
                    *(data as *mut *const vulkan::Interface) = interface;
                    true
                }
                Err(e) => {
                    eprintln!("hardware rendering: {e}");
                    false
                }
            },
            _ => false,
        }),
        ENV_SET_GEOMETRY => {
            let geometry = *(data as *const GameGeometry);
            AV.set(AvInfo { geometry, ..AV.get() });
            resize_hw_render(geometry)
        }
        ENV_SET_SYSTEM_AV_INFO => {
            let av = *(data as *const AvInfo);
            AV.set(av);
            resize_hw_render(av.geometry)
        }
        ENV_SET_MEMORY_MAPS => {
            let map = &*(data as *const MemoryMap);
            let descriptors = if map.descriptors.is_null() {
                &[]
            } else {
                std::slice::from_raw_parts(map.descriptors, map.num_descriptors as usize)
            };
            let regions = descriptors
                .iter()
                .map(|d| Region {
                    start: d.start,
                    select: d.select,
                    disconnect: d.disconnect,
                    len: d.len,
                    ptr: if d.ptr.is_null() {
                        std::ptr::null()
                    } else {
                        (d.ptr as *const u8).wrapping_add(d.offset)
                    },
                })
                .collect();
            MEMORY_MAP.set(regions);
            MEMORY_DESCRIPTORS.set(descriptors.to_vec());
            true
        }
        ENV_GET_MESSAGE_INTERFACE_VERSION => {
            *(data as *mut c_uint) = 1;
            true
        }
        ENV_SET_MESSAGE => {
            let message = &*(data as *const RetroMessage);
            keep_for_player(message.msg, message.frames.saturating_mul(1000) / 60);
            true
        }
        ENV_SET_MESSAGE_EXT => {
            let message = &*(data as *const MessageExt);
            // Status and progress lines are for frontends that keep them on screen, like a shader compile count.
            if message.target != MESSAGE_TARGET_LOG && message.kind <= MESSAGE_TYPE_NOTIFICATION_ALT {
                keep_for_player(message.msg, message.duration);
            }
            true
        }
        ENV_GET_JIT_CAPABLE => {
            *(data as *mut bool) = jit_on();
            true
        }
        ENV_EXEC_MEM_ALLOC => {
            let alloc = &mut *(data as *mut ExecMemAlloc);
            match exec_mem_alloc(alloc.size) {
                Some(memory) => {
                    (alloc.mode, alloc.rx, alloc.rw) = (memory.mode, memory.rx, memory.rw);
                    true
                }
                None => false,
            }
        }
        ENV_EXEC_MEM_FREE => exec_mem_free(*(data as *const *mut c_void)),
        ENV_GET_PREFERRED_HW_RENDER if DOLPHIN.load(Ordering::Relaxed) => {
            *(data as *mut c_uint) = DOLPHIN_CONTEXT;
            true
        }
        ENV_GET_SAVE_DIRECTORY if DOLPHIN.load(Ordering::Relaxed) => match DOLPHIN_SAVE_DIR.get() {
            Some(dir) => {
                *(data as *mut *const c_char) = dir.as_ptr();
                true
            }
            None => false,
        },
        ENV_GET_SAVE_DIRECTORY if !AZAHAR.get() => false,
        ENV_GET_VFS_INTERFACE if DOLPHIN.load(Ordering::Relaxed) => {
            vfs::answer_up_to(data as *mut vfs::InterfaceInfo, vfs::DIRECTORY_VERSION)
        }
        ENV_GET_VFS_INTERFACE => AZAHAR.get() && vfs::answer(data as *mut vfs::InterfaceInfo),
        ENV_GET_SYSTEM_DIRECTORY | ENV_GET_SAVE_DIRECTORY => match SYSTEM_DIR.get() {
            Some(dir) => {
                *(data as *mut *const c_char) = dir.as_ptr();
                true
            }
            None => false,
        },
        _ => false,
    }
}

fn xrgb8888_to_rgb565(pixel: u32) -> u16 {
    (((pixel >> 8) & 0xF800) | ((pixel >> 5) & 0x07E0) | ((pixel >> 3) & 0x001F)) as u16
}

unsafe extern "C" fn video_refresh(data: *const c_void, width: c_uint, height: c_uint, pitch: usize) {
    if data.is_null() {
        FRAME.with_borrow(|frame| MIX.with_borrow_mut(|mix| mix.add(frame)));
        return;
    }
    FRAME.with_borrow_mut(|frame| {
        if data == HW_FRAME_BUFFER_VALID {
            let blending = MIX.with_borrow(|mix| mix.blend);
            let kept = if READ_BACK.get() || blending {
                read_hw_frame(frame, width, height)
            } else {
                keep_hw_frame(frame, width, height)
            };
            if !kept {
                return;
            }
        } else {
            copy_frame(frame, data, width, height, pitch);
        }
        frame.fresh = true;
        DREW.set(true);
        MIX.with_borrow_mut(|mix| mix.add(frame));
    });
}

unsafe fn copy_frame(frame: &mut Frame, data: *const c_void, width: c_uint, height: c_uint, pitch: usize) {
    let xrgb8888 = PIXEL_FORMAT.load(Ordering::Relaxed) == PIXEL_FORMAT_XRGB8888;
    let (w, h) = (width as usize, height as usize);
    frame.width = width;
    frame.height = height;
    frame.in_texture = false;
    frame.pixels.resize(w * h, 0);
    let src = data as *const u8;
    for y in 0..h {
        let out = &mut frame.pixels[y * w..(y + 1) * w];
        if xrgb8888 {
            let row = std::slice::from_raw_parts(src.add(y * pitch) as *const u32, w);
            for (out, &pixel) in out.iter_mut().zip(row) {
                *out = xrgb8888_to_rgb565(pixel);
            }
        } else {
            out.copy_from_slice(std::slice::from_raw_parts(src.add(y * pitch) as *const u16, w));
        }
    }
}

fn read_hw_frame(frame: &mut Frame, width: c_uint, height: c_uint) -> bool {
    HW.with_borrow_mut(|hw| {
        let Some(hw) = hw else { return false };
        match hw.renderer.read(width, height, hw.bottom_left, &mut frame.pixels) {
            Ok(size) => (frame.width, frame.height) = size,
            Err(e) => {
                eprintln!("hardware rendering: {e}");
                return false;
            }
        }
        frame.in_texture = false;
        true
    })
}

fn keep_hw_frame(frame: &mut Frame, width: c_uint, height: c_uint) -> bool {
    let kept = HW.with_borrow(|hw| {
        hw.as_ref().map(|hw| match &hw.renderer {
            Renderer::Gl(renderer) => {
                let (texture_width, texture_height) = renderer.size();
                Some((width.min(texture_width), height.min(texture_height)))
            }
            Renderer::Vulkan(_) => SCREEN_DRAWS_VULKAN.then_some((width, height)),
        })
    });
    match kept {
        None => false,
        Some(None) => read_hw_frame(frame, width, height),
        Some(Some(size)) => {
            (frame.width, frame.height) = size;
            frame.in_texture = true;
            true
        }
    }
}

fn forget_hw_image() {
    let forgot = HW.with_borrow(|hw| match hw.as_ref().map(|hw| &hw.renderer) {
        Some(Renderer::Vulkan(renderer)) => {
            renderer.forget();
            true
        }
        _ => false,
    });
    if forgot {
        FRAME.with_borrow_mut(|frame| {
            frame.fresh = false;
            frame.in_texture = false;
        });
    }
}

fn read_back(frame: &mut Frame) {
    if frame.in_texture {
        read_hw_frame(frame, frame.width, frame.height);
    }
}

fn hw_picture(frame: &Frame) -> Option<Picture<'static>> {
    HW.with_borrow(|hw| {
        let hw = hw.as_ref()?;
        match &hw.renderer {
            Renderer::Gl(renderer) => {
                let (texture_width, texture_height) = renderer.size();
                Some(Picture::Texture(Texture {
                    id: renderer.texture(),
                    width: frame.width,
                    height: frame.height,
                    texture_width,
                    texture_height,
                    bottom_left: hw.bottom_left,
                }))
            }
            Renderer::Vulkan(renderer) => renderer.frame(frame.width, frame.height).map(Picture::Image),
        }
    })
}

#[cfg(test)]
pub fn vulkan_frame() -> Option<vulkan::Frame> {
    HW.with_borrow(|hw| match &hw.as_ref()?.renderer {
        Renderer::Vulkan(renderer) => renderer.frame(0, 0),
        Renderer::Gl(_) => None,
    })
}

fn start_blend(blend: bool) {
    MIX.with_borrow_mut(|mix| {
        mix.blend = blend;
        mix.frames = 0;
    });
}

fn take_frame<R>(f: impl FnOnce(&Frame) -> R) -> Option<R> {
    fresh_frame(|mixed, frame| {
        read_back(frame);
        f(mixed.unwrap_or(frame))
    })
}

fn take_picture<R>(f: impl FnOnce(Picture) -> R) -> Option<R> {
    fresh_frame(|mixed, frame| match hw_picture(frame).filter(|_| frame.in_texture) {
        Some(picture) => f(picture),
        None => {
            read_back(frame);
            let shown = mixed.unwrap_or(frame);
            f(Picture::Pixels { width: shown.width, height: shown.height, pixels: &shown.pixels })
        }
    })
}

fn fresh_frame<R>(f: impl FnOnce(Option<&Frame>, &mut Frame) -> R) -> Option<R> {
    MIX.with_borrow_mut(|mix| {
        FRAME.with_borrow_mut(|frame| {
            let mixed = mix.take_mixed();
            if !frame.fresh {
                return None;
            }
            frame.fresh = false;
            Some(f(mixed, frame))
        })
    })
}

unsafe extern "C" fn audio_sample(left: i16, right: i16) {
    AUDIO.lock().unwrap_or_else(|e| e.into_inner()).extend_from_slice(&[left, right]);
}

unsafe extern "C" fn audio_sample_batch(data: *const i16, frames: usize) -> usize {
    let samples = std::slice::from_raw_parts(data, frames * 2);
    AUDIO.lock().unwrap_or_else(|e| e.into_inner()).extend_from_slice(samples);
    frames
}

unsafe extern "C" fn input_poll() {}

unsafe extern "C" fn input_state(port: c_uint, device: c_uint, index: c_uint, id: c_uint) -> i16 {
    if port != 0 {
        return 0;
    }
    match device {
        DEVICE_JOYPAD => {
            let mask = INPUT.load(Ordering::Relaxed) | UNSEEN_PRESSES.load(Ordering::Relaxed);
            if id == DEVICE_ID_JOYPAD_MASK {
                mask as i16
            } else {
                ((mask >> id) & 1) as i16
            }
        }
        DEVICE_ANALOG if index < 2 && id < 2 => {
            (ANALOG.load(Ordering::Relaxed) >> (16 * (index * 2 + id))) as u16 as i16
        }
        DEVICE_ANALOG
            if index == DEVICE_INDEX_ANALOG_BUTTON && matches!(id, DEVICE_ID_JOYPAD_L2 | DEVICE_ID_JOYPAD_R2) =>
        {
            (TRIGGERS.load(Ordering::Relaxed) >> (16 * (id - DEVICE_ID_JOYPAD_L2))) as u16 as i16
        }
        DEVICE_POINTER if index == 0 => {
            let pointer = match POINTER.load(Ordering::Relaxed) {
                0 => UNSEEN_TOUCH.load(Ordering::Relaxed),
                held => held,
            };
            match id {
                DEVICE_ID_POINTER_X => pointer as u16 as i16,
                DEVICE_ID_POINTER_Y => (pointer >> 16) as u16 as i16,
                DEVICE_ID_POINTER_PRESSED => (pointer >> 32) as i16,
                _ => 0,
            }
        }
        _ => 0,
    }
}

#[cfg(target_arch = "aarch64")]
fn float_mode() -> u64 {
    let fpcr: u64;
    unsafe { std::arch::asm!("mrs {}, fpcr", out(reg) fpcr) };
    fpcr
}

#[cfg(target_arch = "aarch64")]
fn set_float_mode(fpcr: u64) {
    unsafe { std::arch::asm!("msr fpcr, {}", in(reg) fpcr) };
}

#[cfg(not(target_arch = "aarch64"))]
fn float_mode() -> u64 {
    0
}

#[cfg(not(target_arch = "aarch64"))]
fn set_float_mode(_: u64) {}

// Mupen64Plus-Next sets the host's rounding mode to the game's and leaves it set, which breaks Rust's
// float maths on this thread, so the core keeps its own mode from call to call.
// The screen draws with its own context between frames, so the core's goes back before each call.
fn in_core<R>(f: impl FnOnce() -> R) -> R {
    HW.with_borrow(|hw| hw.as_ref().map(|hw| hw.renderer.make_current()));
    let app = float_mode();
    if let Some(core) = CORE_FLOAT_MODE.get() {
        set_float_mode(core);
    }
    let result = f();
    CORE_FLOAT_MODE.set(Some(float_mode()));
    set_float_mode(app);
    result
}

pub struct Core {
    api: Api,
    system: System,
    system_ram_base: usize,
    ran_a_frame: bool,
    loaded: bool,
    name: String,
    system_dir: PathBuf,
    file: Option<crate::rom::RomFile>,
    // Frames land in thread-locals, so the core stays on the thread that loaded it.
    _not_send: std::marker::PhantomData<*const ()>,
}

impl Core {
    pub fn info(&self) -> CoreInfo {
        system_info(self.api)
    }

    pub fn load(rom: Rom, system_dir: &Path) -> Result<Core, String> {
        Core::start(rom, system_dir, None)
    }

    /// Loads an N64 game through the core's Transfer Pak subsystem, which reads all three files from their paths.
    pub fn load_transfer_pak(rom: Rom, system_dir: &Path, files: &transfer_pak::Files) -> Result<Core, String> {
        Core::start(rom, system_dir, Some(files))
    }

    fn start(rom: Rom, system_dir: &Path, transfer_pak: Option<&transfer_pak::Files>) -> Result<Core, String> {
        let system = rom.system();
        let api = api(system)?;
        let azahar_dir = azahar_dir(system_dir);
        if system == System::ThreeDs {
            forget_console_keys(&azahar_dir)?;
        }
        if system == System::GameCube {
            let dir = dolphin_dir(system_dir);
            dolphin::install_sys(&dir, DOLPHIN_SYS)?;
            dolphin::use_card(&dir, &dolphin_card(system_dir))?;
            if let Some(file) = &rom.file {
                dolphin::use_small_cards(&dir, &file.open)?;
            }
            DOLPHIN_SAVE_DIR.get_or_init(|| CString::new(dir.to_string_lossy().as_bytes()).unwrap());
        }
        if LOADED.swap(true, Ordering::AcqRel) {
            return Err("a game is already loaded".into());
        }
        let path = rom.file.as_ref().map_or(rom.name.clone(), |file| game_path(system, &file.path, &rom.name));
        // Android's storage refuses the core a SAF file's /proc entry, so the app reads it for the core.
        if let Some(Err(e)) = rom.file.as_ref().map(|file| vfs::serve_game(&path, &file.open)) {
            LOADED.store(false, Ordering::Release);
            return Err(e);
        }
        vfs::serve_card((system == System::GameCube).then(|| dolphin_card(system_dir)));
        FRAME.with_borrow_mut(|frame| {
            frame.width = 0;
            frame.height = 0;
            frame.pixels.clear();
            frame.fresh = false;
            frame.in_texture = false;
        });
        READ_BACK.set(true);
        start_blend(false);
        release_input();
        PIXEL_FORMAT.store(PIXEL_FORMAT_RGB565, Ordering::Relaxed);
        AUDIO.lock().unwrap_or_else(|e| e.into_inner()).clear();
        MEMORY_MAP.with_borrow_mut(Vec::clear);
        MEMORY_DESCRIPTORS.with_borrow_mut(Vec::clear);
        HW_REFUSED.set(false);
        DREW.set(false);
        CORE_FLOAT_MODE.set(None);
        TRANSFER_PAK.set(transfer_pak.is_some());
        AZAHAR.set(system == System::ThreeDs);
        DOLPHIN.store(system == System::GameCube, Ordering::Relaxed);
        vulkan::CORE_WANTS_SURFACE.store(system == System::GameCube, Ordering::Relaxed);
        let system_ram_base = if system == System::Gb { 0xC000 } else { 0x0200_0000 };
        let path = CString::new(path).unwrap_or_default();
        let (data, size) = match rom.file {
            Some(_) => (std::ptr::null(), 0),
            None => (rom.bytes.as_ptr() as *const c_void, rom.bytes.len()),
        };
        in_core(|| unsafe {
            init(api);
            let info = GameInfo { path: path.as_ptr(), data, size, meta: std::ptr::null() };
            let mut loaded = match transfer_pak {
                None => (api.retro_load_game)(&info),
                Some(files) => {
                    let paths = [&files.save, &files.gb_rom, &files.n64_rom]
                        .map(|path| CString::new(path.to_string_lossy().as_bytes()).unwrap_or_default());
                    let game = |path: &CString| GameInfo {
                        path: path.as_ptr(),
                        data: std::ptr::null(),
                        size: 0,
                        meta: std::ptr::null(),
                    };
                    // The core writes the N64 ROM it read into the last entry, so the entries are the app's to change.
                    let mut games = paths.each_ref().map(game);
                    (api.retro_load_game_special)(GAME_TYPE_TRANSFERPAK, games.as_mut_ptr(), games.len())
                }
            };
            // Refused Vulkan, Dolphin loads anyway and draws nothing.
            if loaded && system == System::GameCube && HW_REFUSED.get() {
                (api.retro_unload_game)();
                loaded = false;
            }
            if !loaded {
                (api.retro_deinit)();
                release_exec_mem();
                vfs::stop_serving_game();
                stop_hw_render();
                LOADED.store(false, Ordering::Release);
                return Err(if HW_REFUSED.get() { UNSUPPORTED_DEVICE } else { "the core refused the ROM" }.into());
            }
            // Dolphin leaves every port unplugged until it's told what's in one.
            if system == System::GameCube {
                (api.retro_set_controller_port_device)(0, DEVICE_JOYPAD);
            }
            let mut av = AvInfo::default();
            (api.retro_get_system_av_info)(&mut av);
            AV.set(av);
            let core = Core {
                api,
                system,
                system_ram_base,
                ran_a_frame: false,
                loaded: true,
                name: rom.name,
                system_dir: system_dir.to_path_buf(),
                file: rom.file,
                _not_send: std::marker::PhantomData,
            };
            let resized = resize_hw_render(av.geometry);
            // Even on a device that can't play, the reset connects Mupen64Plus-Next's plugins for its last frame.
            // Azahar's Vulkan reset would use the device it didn't get.
            let reset = hw_callback(|hw| hw.reset.filter(|_| resized || matches!(hw.renderer, Renderer::Gl(_))));
            if let Some(reset) = reset {
                reset();
            }
            if !resized {
                return Err(UNSUPPORTED_DEVICE.into());
            }
            Ok(core)
        })
    }

    pub fn av(&self) -> AvInfo {
        AV.get()
    }

    pub fn run_frame(&mut self) {
        let unseen = unseen_input();
        in_core(|| unsafe { (self.api.retro_run)() });
        frame_saw(unseen);
        self.ran_a_frame = true;
    }

    /// Unloads a game read from its path and boots it again, running `between` while no core is loaded. Dolphin writes
    /// its memory card as it unloads and reads it only as it boots. A core that fails to boot stays unloaded.
    pub fn reboot<T>(&mut self, between: impl FnOnce() -> T) -> Result<T, String> {
        let rom = Rom { name: self.name.clone(), bytes: Vec::new(), file: self.file.take() };
        let (system_dir, read_back) = (self.system_dir.clone(), READ_BACK.get());
        self.unload();
        let done = between();
        *self = Core::start(rom, &system_dir, None).map_err(|e| format!("the game couldn't boot again: {e}"))?;
        READ_BACK.set(read_back);
        Ok(done)
    }

    pub fn is_loaded(&self) -> bool {
        self.loaded
    }

    fn unload(&mut self) {
        // Mupen64Plus-Next starts its emulator on the first frame. Unloaded before that, it starts it while unloading
        // instead, with no GL context, and leaves the ROM open, so the next N64 game fails to load.
        if self.system == System::N64 && !self.ran_a_frame {
            self.run_frame();
        }
        in_core(|| unsafe {
            if let Some(destroy) = hw_callback(|hw| hw.destroy) {
                destroy();
            }
            (self.api.retro_unload_game)();
            (self.api.retro_deinit)();
        });
        release_exec_mem();
        vfs::stop_serving_game();
        stop_hw_render();
        MEMORY_MAP.with_borrow_mut(Vec::clear);
        MEMORY_DESCRIPTORS.with_borrow_mut(Vec::clear);
        LOADED.store(false, Ordering::Release);
        self.loaded = false;
    }

    pub fn reset(&mut self) {
        in_core(|| unsafe { (self.api.retro_reset)() });
        forget_hw_image();
    }

    pub fn set_cheats(&mut self, codes: &[String]) {
        in_core(|| unsafe {
            (self.api.retro_cheat_reset)();
            for (index, code) in codes.iter().enumerate() {
                let code = CString::new(code.as_str()).unwrap_or_default();
                (self.api.retro_cheat_set)(index as c_uint, true, code.as_ptr());
            }
        })
    }

    pub fn save_ram(&mut self) -> &mut [u8] {
        unsafe { self.memory(MEMORY_SAVE_RAM) }
    }

    pub fn save_memory(&mut self) -> [&mut [u8]; 2] {
        unsafe { [self.memory(MEMORY_SAVE_RAM), self.memory(MEMORY_RTC)] }
    }

    pub fn serialize(&mut self) -> Option<Vec<u8>> {
        self.boot_dolphin();
        in_core(|| unsafe {
            let mut state = vec![0u8; (self.api.retro_serialize_size)()];
            (self.api.retro_serialize)(state.as_mut_ptr() as *mut c_void, state.len()).then_some(state)
        })
    }

    // Mupen64Plus-Next refuses states until its first frame has run.
    pub fn unserialize(&mut self, state: &[u8]) -> bool {
        self.boot_dolphin();
        let api = self.api;
        let load = || in_core(|| unsafe { (api.retro_unserialize)(state.as_ptr() as *const c_void, state.len()) });
        let mut loaded = load();
        if !loaded && !self.ran_a_frame {
            self.run_frame();
            loaded = load();
        }
        forget_hw_image();
        DREW.set(false);
        loaded
    }

    pub fn drew_since_load(&self) -> bool {
        DREW.get()
    }

    // Dolphin boots on its first frame and crashes on a state saved or loaded before it.
    fn boot_dolphin(&mut self) {
        if self.system == System::GameCube && !self.ran_a_frame {
            self.run_frame();
        }
    }

    pub fn blend(&mut self, blend: bool) {
        start_blend(blend);
    }

    pub fn take_frame<R>(&mut self, f: impl FnOnce(&Frame) -> R) -> Option<R> {
        take_frame(f)
    }

    // A GL frame comes as the core's texture unless it has to be read back.
    pub fn take_picture<R>(&mut self, f: impl FnOnce(Picture) -> R) -> Option<R> {
        take_picture(f)
    }

    pub fn read_back(&mut self, read: bool) {
        READ_BACK.set(read);
    }

    pub fn last_frame<R>(&self, f: impl FnOnce(&Frame) -> R) -> Option<R> {
        FRAME.with_borrow_mut(|frame| {
            read_back(frame);
            (!frame.pixels.is_empty()).then(|| f(frame))
        })
    }

    pub fn drain_audio(&mut self, out: &mut Vec<i16>) {
        let mut audio = AUDIO.lock().unwrap_or_else(|e| e.into_inner());
        out.extend_from_slice(&audio);
        audio.clear();
    }

    // A core that maps none of its memory still reaches main RAM through system RAM.
    pub fn read_memory(&mut self, ranges: &[Range]) -> Result<Vec<u8>, String> {
        let system_ram = unsafe { self.memory(MEMORY_SYSTEM_RAM) };
        let fallback = Region::flat(self.system_ram_base, system_ram);
        MEMORY_MAP.with_borrow(|map| {
            let regions: Vec<Region> = map.iter().copied().chain([fallback]).collect();
            unsafe { memory::read(&regions, ranges) }
        })
    }

    pub fn memory_data(&mut self, id: c_uint) -> &mut [u8] {
        unsafe { self.memory(id) }
    }

    pub fn libretro_memory_map<R>(&self, f: impl FnOnce(*const c_void) -> R) -> R {
        MEMORY_DESCRIPTORS.with_borrow(|descriptors| {
            let map = MemoryMap { descriptors: descriptors.as_ptr(), num_descriptors: descriptors.len() as c_uint };
            f(if descriptors.is_empty() { std::ptr::null() } else { &map as *const MemoryMap as *const c_void })
        })
    }

    #[cfg(test)]
    pub fn write_memory(&mut self, address: u32, bytes: &[u8]) {
        let ptr = MEMORY_MAP
            .with_borrow(|map| map.iter().find_map(|region| region.locate(address as usize, bytes.len())))
            .filter(|ptr| !ptr.is_null())
            .expect("the address isn't in the core's memory map");
        unsafe { std::ptr::copy_nonoverlapping(bytes.as_ptr(), ptr as *mut u8, bytes.len()) };
    }

    unsafe fn memory<'a>(&self, id: c_uint) -> &'a mut [u8] {
        let data = (self.api.retro_get_memory_data)(id) as *mut u8;
        let size = (self.api.retro_get_memory_size)(id);
        if data.is_null() || size == 0 {
            return &mut [];
        }
        std::slice::from_raw_parts_mut(data, size)
    }
}

impl Drop for Core {
    fn drop(&mut self) {
        if self.loaded {
            self.unload();
        }
    }
}

// Dolphin picks a disc's reader by its extension, so a SAF file's /proc entry gets a name only the VFS can open.
fn game_path(system: System, path: &str, name: &str) -> String {
    let extension = |path: &str| Path::new(path).extension().map(|e| e.to_ascii_lowercase());
    match extension(name) {
        Some(wanted) if system == System::GameCube && extension(path).as_ref() != Some(&wanted) => {
            format!("{path}/disc.{}", wanted.to_string_lossy())
        }
        _ => path.to_owned(),
    }
}

// A core may keep the pointer, so the first directory stays.
fn system_dir(dir: &Path) -> &'static CString {
    SYSTEM_DIR.get_or_init(|| CString::new(dir.to_string_lossy().as_bytes()).unwrap())
}

pub fn azahar_dir(dir: &Path) -> PathBuf {
    Path::new(&*system_dir(dir).to_string_lossy()).join("Azahar")
}

fn dolphin_dir(dir: &Path) -> PathBuf {
    Path::new(&*system_dir(dir).to_string_lossy()).join("dolphin-emu")
}

pub fn dolphin_card(dir: &Path) -> PathBuf {
    dolphin_dir(dir).join("User/GC/card.raw")
}

// Azahar reads console keys from here, and the app plays without them. It makes only the last folder of its own.
fn forget_console_keys(azahar_dir: &Path) -> Result<(), String> {
    let system_dir = azahar_dir.parent().unwrap_or(azahar_dir);
    std::fs::create_dir_all(system_dir).map_err(|e| format!("{}: {e}", system_dir.display()))?;
    let keys = azahar_dir.join("sysdata/aes_keys.txt");
    match std::fs::remove_file(&keys) {
        Err(e) if e.kind() != std::io::ErrorKind::NotFound => Err(format!("{}: {e}", keys.display())),
        _ => Ok(()),
    }
}

unsafe fn init(api: Api) {
    (api.retro_set_environment)(environment);
    (api.retro_set_video_refresh)(video_refresh);
    (api.retro_set_audio_sample)(audio_sample);
    (api.retro_set_audio_sample_batch)(audio_sample_batch);
    (api.retro_set_input_poll)(input_poll);
    (api.retro_set_input_state)(input_state);
    (api.retro_init)();
}

pub fn core_info() -> CoreInfo {
    system_info(Api::MGBA)
}

pub fn core_info_for(system: System) -> Result<CoreInfo, String> {
    Ok(system_info(api(system)?))
}

pub fn needs_path(system: System) -> Result<bool, String> {
    Ok(raw_info(api(system)?).need_fullpath)
}

fn raw_info(api: Api) -> RawCoreInfo {
    let mut raw = RawCoreInfo {
        library_name: std::ptr::null(),
        library_version: std::ptr::null(),
        valid_extensions: std::ptr::null(),
        need_fullpath: false,
        block_extract: false,
    };
    unsafe { (api.retro_get_system_info)(&mut raw) };
    raw
}

fn system_info(api: Api) -> CoreInfo {
    let raw = raw_info(api);
    let text = |ptr: *const c_char| {
        if ptr.is_null() {
            String::new()
        } else {
            unsafe { CStr::from_ptr(ptr) }.to_string_lossy().into_owned()
        }
    };
    CoreInfo {
        name: text(raw.library_name),
        version: text(raw.library_version),
    }
}

#[cfg(test)]
pub fn transfer_pak_option() -> Option<String> {
    let mut variable = Variable { key: c"mupen64plus-pak1".as_ptr(), value: std::ptr::null() };
    let found = unsafe { environment(ENV_GET_VARIABLE, &mut variable as *mut Variable as *mut c_void) };
    found.then(|| unsafe { CStr::from_ptr(variable.value) }.to_string_lossy().into_owned())
}

#[cfg(test)]
pub fn send_message(text: &CStr, duration: c_uint, target: c_uint, kind: c_uint) -> bool {
    let mut message = MessageExt { msg: text.as_ptr(), duration, priority: 1, level: 2, target, kind, progress: -1 };
    unsafe { environment(ENV_SET_MESSAGE_EXT, &mut message as *mut MessageExt as *mut c_void) }
}

#[cfg(test)]
mod tests {
    use super::*;

    const A: u16 = 1 << 8;

    fn pressed(id: c_uint) -> bool {
        unsafe { input_state(0, DEVICE_JOYPAD, 0, id) != 0 }
    }

    fn touched() -> bool {
        unsafe { input_state(0, DEVICE_POINTER, 0, DEVICE_ID_POINTER_PRESSED) != 0 }
    }

    fn a_frame() {
        let unseen = unseen_input();
        frame_saw(unseen);
    }

    #[test]
    fn a_press_let_go_before_any_frame_still_reaches_the_next_one() {
        let _lock = crate::test_games::lock_core();
        release_input();

        set_input(A);
        set_input(0);

        assert!(pressed(8));
        a_frame();
        assert!(!pressed(8));
    }

    #[test]
    fn a_held_button_stays_pressed_across_frames() {
        let _lock = crate::test_games::lock_core();
        release_input();

        set_input(A);
        a_frame();
        a_frame();

        assert!(pressed(8));
        release_input();
    }

    #[test]
    fn a_touch_lifted_before_any_frame_still_reaches_the_next_one() {
        let _lock = crate::test_games::lock_core();
        release_input();

        set_pointer(Some([10, 20]));
        set_pointer(None);

        assert!(touched());
        assert_eq!(unsafe { input_state(0, DEVICE_POINTER, 0, DEVICE_ID_POINTER_X) }, 10);
        a_frame();
        assert!(!touched());
    }

    #[test]
    fn a_press_during_a_frame_waits_for_the_next() {
        let _lock = crate::test_games::lock_core();
        release_input();
        let unseen = unseen_input();

        set_input(A);
        set_input(0);
        frame_saw(unseen);

        assert!(pressed(8));
        release_input();
    }

    #[test]
    fn reports_the_linked_mgba_version() {
        let info = core_info();
        assert_eq!(info.name, "mGBA");
        assert_eq!(info.version, "0.10.5");
    }

    #[test]
    #[cfg(target_arch = "aarch64")]
    fn reports_the_loaded_mupen64plus_next_core() {
        let info = core_info_for(System::N64).unwrap();
        assert_eq!(info.name, "Mupen64Plus-Next");
    }

    #[test]
    #[cfg(target_arch = "aarch64")]
    fn reads_3ds_games_from_their_path() {
        assert_eq!(needs_path(System::ThreeDs), Ok(true));
        assert_eq!(needs_path(System::Gba), Ok(false));
        assert_eq!(core_info_for(System::ThreeDs).unwrap().name, "Azahar");
    }

    // Azahar refuses a state from another revision, so the version a state records has to change with every revision.
    #[test]
    #[cfg(target_arch = "aarch64")]
    fn names_the_revision_of_azahar_in_its_version() {
        let source = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../vendor/azahar");
        let described = std::process::Command::new("git").arg("-C").arg(source).args(["describe", "--tags"]).output();
        let described = described.unwrap();
        assert!(described.status.success(), "{}", String::from_utf8_lossy(&described.stderr));
        let described = String::from_utf8(described.stdout).unwrap();

        assert_eq!(core_info_for(System::ThreeDs).unwrap().version, described.trim());
    }

    // A Dolphin state can crash another build, so the version a state records has to change with every commit.
    #[test]
    #[cfg(target_arch = "aarch64")]
    fn names_the_commit_of_dolphin_in_its_version() {
        let source = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../vendor/dolphin");
        let head = std::process::Command::new("git").arg("-C").arg(source).args(["rev-parse", "HEAD"]).output();
        let head = head.unwrap();
        assert!(head.status.success(), "{}", String::from_utf8_lossy(&head.stderr));
        let head = String::from_utf8(head.stdout).unwrap();

        let version = core_info_for(System::GameCube).unwrap().version;

        assert!(version.ends_with(&format!("+{}", &head[..10])), "{version} doesn't name {head}");
    }

    // A 3DSX with no data that sleeps forever, so the core boots it with nothing from a console.
    fn sleeping_3dsx(name: &str) -> Rom {
        let code: Vec<u8> =
            [0xE3A00101u32, 0xE3A01000, 0xEF00000A, 0xEAFFFFFB].iter().flat_map(|i| i.to_le_bytes()).collect();
        let mut file = b"3DSX".to_vec();
        for half in [0x2Cu16, 8] {
            file.extend_from_slice(&half.to_le_bytes());
        }
        // Format version, flags, code size, then empty rodata, data, bss, icon and RomFS.
        for word in [0, 0, code.len() as u32, 0, 0, 0, 0, 0, 0] {
            file.extend_from_slice(&word.to_le_bytes());
        }
        file.extend_from_slice(&[0; 8 * 3]);
        file.extend_from_slice(&code);
        let path = std::env::temp_dir().join(name);
        std::fs::write(&path, file).unwrap();
        let open = std::fs::File::open(&path).unwrap();
        Rom::at(name, crate::rom::RomFile::new(open, path.to_string_lossy().into_owned()))
    }

    #[test]
    #[cfg(target_arch = "aarch64")]
    fn boots_a_3dsx_from_its_path_with_both_screens() {
        let _lock = crate::test_games::lock_core();
        let dir = std::env::temp_dir();
        let keys = dir.join("Azahar/sysdata/aes_keys.txt");
        std::fs::create_dir_all(keys.parent().unwrap()).unwrap();
        std::fs::write(&keys, "slot0x25KeyX=00").unwrap();

        for _ in 0..2 {
            let mut core = Core::load(sleeping_3dsx("sleeping.3dsx"), &dir).unwrap();
            let mut size = None;
            for _ in 0..30 {
                core.run_frame();
                core.take_frame(|frame| size = Some((frame.width, frame.height)));
            }

            assert_eq!(size, Some((400, 480)));
            assert!(!keys.exists());
            assert!(dir.join("Azahar/sdmc").is_dir());
        }
        plays_a_gba_game();
    }

    #[test]
    #[cfg(target_arch = "aarch64")]
    fn pksm_boots_and_answers_a() {
        let _lock = crate::test_games::lock_core();
        let Some(rom) = crate::test_games::homebrew_3dsx("PKSM") else { return };
        // Without its extra data on the SD card, PKSM stops on a prompt that A answers.
        let _ = std::fs::remove_dir_all(std::env::temp_dir().join("Azahar/sdmc"));
        let mut core = Core::load(rom, &std::env::temp_dir()).unwrap();
        let mut play = |frames, press: u16| {
            for frame in 0..frames {
                set_input(if frame < 10 { press } else { 0 });
                core.run_frame();
            }
            core.last_frame(|frame| ((frame.width, frame.height), frame.pixels.clone())).unwrap()
        };

        let (size, asking) = play(600, 0);
        let (_, still_asking) = play(60, 0);
        let (_, answered) = play(300, A);

        assert_eq!(size, (400, 480));
        assert!(asking.iter().any(|&pixel| pixel != asking[0]), "the prompt is one colour");
        assert_eq!(still_asking, asking);
        assert_ne!(answered, asking);
    }

    #[test]
    #[cfg(target_arch = "aarch64")]
    fn pokemon_x_continues_a_save_into_the_overworld_with_pictures_and_sound() {
        let _lock = crate::test_games::lock_core();
        let Some(rom) = crate::test_games::cartridge_3ds("Pokémon X", 0x0004000000055D00) else { return };
        let Some(save) = crate::test_games::save_of_size("a Pokémon X or Y main", 0x65600) else { return };
        let dir = std::env::temp_dir();
        let console = dir.join("Azahar/sdmc/Nintendo 3DS").join("0".repeat(32)).join("0".repeat(32));
        let _ = std::fs::remove_dir_all(console.join("title/00040000/00055d00"));
        let mut core = Core::load(rom, &dir).unwrap();
        let mut play = |core: &mut Core, frames, press: u16| {
            let (mut audio, mut loudest) = (Vec::new(), 0);
            for frame in 0..frames {
                set_input(if frame < 6 { press } else { 0 });
                core.run_frame();
                core.drain_audio(&mut audio);
                loudest = audio.drain(..).map(i16::unsigned_abs).max().unwrap_or(0).max(loudest);
            }
            let pixels = core.last_frame(|frame| frame.pixels.clone()).unwrap_or_default();
            (loudest, pixels)
        };

        // The game formats its save before asking for a language, and loads a save put in its place after a reset.
        play(&mut core, 300, 0);
        std::fs::write(console.join("title/00040000/00055d00/data/00000001/main"), save).unwrap();
        core.reset();
        for _ in 0..3 {
            play(&mut core, 120, A);
        }
        play(&mut core, 300, 0);
        play(&mut core, 600, A);
        let (loudest, walking) = play(&mut core, 600, 0);
        let (_, later) = play(&mut core, 120, 0);

        assert!(loudest > 1000, "the overworld was silent");
        let colours = walking.iter().collect::<std::collections::HashSet<_>>().len();
        assert!(colours > 2000, "the overworld drew {colours} colours");
        assert_ne!(walking, later);
    }

    fn distinct(pixels: &[u16]) -> usize {
        pixels.iter().collect::<std::collections::HashSet<_>>().len()
    }

    #[test]
    #[cfg(target_arch = "aarch64")]
    fn boots_a_gamecube_homebrew_disc_that_answers_the_pad() {
        let _lock = crate::test_games::lock_core();
        let Some(rom) = crate::test_games::snes9x_gx_disc() else { return };
        let dir = std::env::temp_dir();
        let mut core = Core::load(rom, &dir).unwrap();
        let mut play = |frames, press: u16| {
            for frame in 0..frames {
                set_input(if frame < 10 { press } else { 0 });
                core.run_frame();
            }
            core.last_frame(|frame| ((frame.width, frame.height), frame.pixels.clone())).unwrap_or_default()
        };

        let (size, menu) = play(300, 0);
        let (_, still) = play(30, 0);
        let (_, moved) = play(40, 1 << 5);

        assert_eq!(size, (640, 528));
        assert!(distinct(&menu) > 100, "the menu drew {} colours", distinct(&menu));
        assert_eq!(still, menu);
        assert_ne!(moved, menu);
        assert!(dir.join("dolphin-emu/Sys/GameSettings").is_dir());
        assert!(dir.join("dolphin-emu/User").is_dir());
    }

    #[test]
    #[cfg(target_arch = "aarch64")]
    fn reboots_a_gamecube_disc_from_the_start_or_stays_unloaded() {
        let _lock = crate::test_games::lock_core();
        let Some(rom) = crate::test_games::snes9x_gx_disc() else { return };
        let mut core = Core::load(rom, &std::env::temp_dir()).unwrap();
        core.read_back(false);
        for _ in 0..300 {
            core.run_frame();
        }

        assert_eq!(core.reboot(|| LOADED.load(Ordering::Acquire)), Ok(false));

        assert!(core.is_loaded() && !core.ran_a_frame);
        assert!(!READ_BACK.get());
        core.read_back(true);
        for _ in 0..300 {
            core.run_frame();
        }
        assert!(core.last_frame(|frame| distinct(&frame.pixels)).is_some_and(|colours| colours > 100));

        assert!(core.reboot(|| LOADED.store(true, Ordering::Release)).is_err());
        LOADED.store(false, Ordering::Release);
        assert!(!core.is_loaded());
    }

    #[test]
    #[cfg(target_arch = "aarch64")]
    fn the_shader_setting_changes_dolphins_mode_on_the_next_boot() {
        let _lock = crate::test_games::lock_core();
        let dir = std::env::temp_dir();
        let shaders = dir.join("dolphin-emu/User/Cache/Shaders");
        let ubershaders = |async_shaders| {
            let rom = crate::test_games::snes9x_gx_disc()?;
            let uber = |entry: &std::fs::DirEntry| entry.file_name().to_string_lossy().contains("-uber-");
            let cached = || std::fs::read_dir(&shaders).into_iter().flatten().flatten().filter(uber);
            cached().for_each(|entry| std::fs::remove_file(entry.path()).unwrap());
            set_async_shaders(async_shaders);
            let mut core = Core::load(rom, &dir).unwrap();
            for _ in 0..300 {
                core.run_frame();
            }
            drop(core);
            set_async_shaders(false);
            Some(cached().map(|entry| entry.metadata().unwrap().len()).sum::<u64>())
        };

        let Some(without) = ubershaders(false) else { return };
        let with = ubershaders(true).unwrap();

        assert!(std::fs::read_dir(&shaders).unwrap().count() > 0);
        assert_eq!(with > without, DOLPHIN_ASYNC_SHADERS == c"2", "{with} bytes of ubershaders against {without}");
    }

    #[test]
    #[cfg(target_arch = "aarch64")]
    fn the_resolution_setting_scales_dolphins_frames_on_the_next_boot() {
        let _lock = crate::test_games::lock_core();
        let size = |scale| {
            let rom = crate::test_games::snes9x_gx_disc()?;
            set_resolution(scale);
            let mut core = Core::load(rom, &std::env::temp_dir()).unwrap();
            for _ in 0..300 {
                core.run_frame();
            }
            let size = core.last_frame(|frame| (frame.width, frame.height, frame.pixels.len()));
            drop(core);
            set_resolution(1);
            size
        };

        let Some(native) = size(1) else { return };

        assert_eq!(native, (640, 528, 640 * 528));
        assert_eq!(size(2), Some((1280, 1056, 1280 * 1056)));
        assert_eq!(size(3), Some((1920, 1584, 1920 * 1584)));
    }

    #[test]
    #[cfg(target_arch = "aarch64")]
    fn every_gamecube_button_reaches_the_pad() {
        let _lock = crate::test_games::lock_core();
        let rom = crate::test_games::gamecube_pad_reader_disc();
        let mut core = Core::load(rom, &std::env::temp_dir()).unwrap();
        let mut read = |press: u16, analog: [i16; 4], triggers: [i16; 2]| {
            set_input(press);
            set_analog(analog);
            set_triggers(triggers);
            for _ in 0..6 {
                core.run_frame();
            }
            release_input();
            let ram = core.memory_data(MEMORY_SYSTEM_RAM);
            let word = |at: usize| u32::from_be_bytes(ram[at..at + 4].try_into().unwrap());
            let at = crate::test_games::PAD_READING;
            (word(at), word(at + 4))
        };
        // The RetroPad bits input.ts's gcButtons sends from touch, pads and the keyboard, and the pad's own bits for them.
        let buttons = [
            ("A", 8, 0x0100),
            ("B", 0, 0x0200),
            ("X", 9, 0x0400),
            ("Y", 1, 0x0800),
            ("Start", 3, 0x1000),
            ("Up", 4, 0x0008),
            ("Down", 5, 0x0004),
            ("Left", 6, 0x0001),
            ("Right", 7, 0x0002),
            ("Z", 11, 0x0010),
            ("L", 12, 0x0040),
            ("R", 13, 0x0020),
        ];

        let (resting, _) = read(0, [0; 4], [0; 2]);
        assert_eq!(resting >> 16 & 0x1F7F, 0, "a button is down at rest: {resting:08x}");
        for (name, bit, pad) in buttons {
            let (hi, _) = read(1 << bit, [0; 4], [0; 2]);
            assert_eq!(hi >> 16 & 0x1F7F, pad, "{name} reached the pad as {:04x}", hi >> 16);
        }
        // The pad starts in mode 3, where the low word holds R, L, the C-stick's Y and its X, a byte each.
        let (_, lo) = read(1 << 12, [0; 4], [0; 2]);
        assert_eq!(lo >> 8 & 0xFF, 0xFF, "L wasn't a full press: {lo:08x}");
        let (_, lo) = read(1 << 13, [0; 4], [0; 2]);
        assert_eq!(lo & 0xFF, 0xFF, "R wasn't a full press: {lo:08x}");
        let (hi, lo) = read(1 << 12 | 1 << 13, [0; 4], [0x4000, 0x2000]);
        assert_eq!(hi >> 16 & 0x0060, 0, "a half-pulled trigger clicked: {hi:08x}");
        assert!((0x60..0xA0).contains(&(lo >> 8 & 0xFF)), "L reached the pad as {lo:08x}");
        assert!((0x20..0x60).contains(&(lo & 0xFF)), "R reached the pad as {lo:08x}");
        let (hi, lo) = read(1 << 12, [0; 4], [0x7FFF, 0]);
        assert_eq!((hi >> 16 & 0x0040, lo >> 8 & 0xFF), (0x0040, 0xFF), "L pulled all the way: {hi:08x} {lo:08x}");
        let stick_x = |hi: u32| hi >> 8 & 0xFF;
        let c_stick_x = |lo: u32| lo >> 28;
        let (hi, lo) = read(0, [0; 4], [0; 2]);
        assert!((0x70..0x90).contains(&stick_x(hi)) && (0x7..0x9).contains(&c_stick_x(lo)), "{hi:08x} {lo:08x}");
        let (hi, _) = read(0, [0x7FFF, 0, 0, 0], [0; 2]);
        assert!(stick_x(hi) > 0xC0, "the stick reached the pad as {hi:08x}");
        let (_, lo) = read(0, [0, 0, 0x7FFF, 0], [0; 2]);
        assert!(c_stick_x(lo) > 0xC, "the C-stick reached the pad as {lo:08x}");
    }

    #[test]
    #[cfg(target_arch = "aarch64")]
    fn boots_a_gamecube_disc_in_each_format_dolphin_reads_by_blocks() {
        use crate::game_cube::tests::{ciso_of, gcz_of};
        let _lock = crate::test_games::lock_core();
        let iso = crate::test_games::gamecube_pad_reader_iso();

        for (extension, disc) in [("ciso", ciso_of(&iso, 0x8000)), ("gcz", gcz_of(&iso, 0x4000))] {
            let rom = crate::test_games::gamecube_disc_at(&format!("pkh-emu-gamecube-pad-reader.{extension}"), &disc);
            let mut core = Core::load(rom, &std::env::temp_dir()).unwrap();
            let pad = crate::test_games::buttons_after_pressing_a(&mut core);
            assert_eq!(pad, 0x0100, "{extension}: A reached the pad as {pad:04x}");
        }
    }

    #[test]
    #[cfg(target_arch = "aarch64")]
    fn colosseum_boots_to_its_60_hz_prompt_and_answers_the_pad() {
        let _lock = crate::test_games::lock_core();
        // Only the European release asks for 60 Hz.
        let Some(rom) = crate::test_games::gamecube_disc("Pokémon Colosseum", "GC6P01", 0) else { return };
        let mut core = Core::load(rom, &std::env::temp_dir()).unwrap();
        let mut play = |frames, press: u16| {
            for frame in 0..frames {
                set_input(if frame < 10 { press } else { 0 });
                core.run_frame();
            }
            core.last_frame(|frame| frame.pixels.clone()).unwrap_or_default()
        };

        let asking = play(500, 0);
        let still_asking = play(30, 0);
        let moved = play(30, 1 << 6);

        assert!(distinct(&asking) > 50, "Colosseum drew {} colours", distinct(&asking));
        assert_eq!(still_asking, asking);
        assert_ne!(moved, asking);
    }

    #[test]
    #[cfg(target_arch = "aarch64")]
    fn colosseum_plays_sound() {
        let _lock = crate::test_games::lock_core();
        let Some(rom) = crate::test_games::gamecube_disc("Pokémon Colosseum", "GC6P01", 0) else { return };
        let mut core = Core::load(rom, &std::env::temp_dir()).unwrap();
        let (mut audio, mut loudest) = (Vec::new(), 0);

        for frame in 0..1500 {
            set_input(if frame >= 500 && frame % 60 < 10 { A } else { 0 });
            core.run_frame();
            core.drain_audio(&mut audio);
            loudest = audio.drain(..).map(i16::unsigned_abs).max().unwrap_or(0).max(loudest);
        }

        assert!(loudest > 1000, "Colosseum was silent");
    }

    #[test]
    #[cfg(target_arch = "aarch64")]
    fn mupen64plus_next_starts_with_its_ini_in_the_system_directory() {
        let _lock = crate::test_games::lock_core();
        let ini = std::env::temp_dir().join("Mupen64plus/mupen64plus.ini");
        let _ = std::fs::remove_file(&ini);
        let broken = Rom { name: "broken.z64".into(), bytes: vec![0; 0x1000], file: None };

        let error = Core::load(broken, &std::env::temp_dir()).err();

        assert!(ini.is_file());
        assert_eq!(error.as_deref(), Some("the core refused the ROM"));
        assert!(HW.with_borrow(Option::is_none));
    }

    pub(super) fn option(key: &CStr) -> Option<String> {
        let mut variable = Variable {
            key: key.as_ptr(),
            value: std::ptr::null(),
        };
        let found = unsafe { environment(ENV_GET_VARIABLE, &mut variable as *mut Variable as *mut c_void) };
        found.then(|| unsafe { CStr::from_ptr(variable.value) }.to_string_lossy().into_owned())
    }

    #[test]
    fn turns_super_game_boy_borders_off() {
        assert_eq!(option(c"mgba_sgb_borders").as_deref(), Some("OFF"));
    }

    #[test]
    fn leaves_other_options_at_the_core_default() {
        assert_eq!(option(c"mgba_use_bios"), None);
    }

    #[test]
    fn sets_up_melonds_ds_for_one_stacked_ds_screen() {
        assert_eq!(option(c"melonds_console_mode").as_deref(), Some("ds"));
        assert_eq!(option(c"melonds_number_of_screen_layouts").as_deref(), Some("1"));
        assert_eq!(option(c"melonds_screen_layout1").as_deref(), Some("top-bottom"));
        assert_eq!(option(c"melonds_screen_gap").as_deref(), Some("0"));
    }

    #[test]
    fn points_ds_wifi_at_kaeru_wfc() {
        assert_eq!(option(c"melonds_firmware_wfc_dns").as_deref(), Some("178.62.43.212"));
    }

    #[test]
    fn renders_n64_games_with_gliden64_at_640x480() {
        assert_eq!(option(c"mupen64plus-rdp-plugin").as_deref(), Some("gliden64"));
        assert_eq!(option(c"mupen64plus-43screensize").as_deref(), Some("640x480"));
    }

    #[test]
    fn leaves_the_n64_stick_dead_zone_to_the_app() {
        assert_eq!(option(c"mupen64plus-astick-deadzone").as_deref(), Some("0"));
    }

    #[test]
    fn sets_up_azahar_as_an_old_3ds_at_native_resolution() {
        assert_eq!(option(c"citra_is_new_3ds").as_deref(), Some("Old 3DS"));
        assert_eq!(option(c"citra_resolution_factor").as_deref(), Some("1"));
        assert_eq!(option(c"citra_use_hw_shader").as_deref(), Some("enabled"));
        assert_eq!(option(c"citra_use_disk_shader_cache").as_deref(), Some("enabled"));
        assert_eq!(option(c"citra_audio_emulation").as_deref(), Some("hle"));
    }

    #[test]
    fn compiles_azahar_shaders_in_the_background_only_when_asked() {
        let _lock = crate::test_games::lock_core();
        assert_eq!(option(c"citra_async_shader_compilation").as_deref(), Some("disabled"));

        set_async_shaders(true);
        assert_eq!(option(c"citra_async_shader_compilation").as_deref(), Some("enabled"));
        set_async_shaders(false);
        assert_eq!(option(c"citra_async_shader_compilation").as_deref(), Some("disabled"));
    }

    #[test]
    fn compiles_gamecube_shaders_synchronously_unless_asked() {
        let _lock = crate::test_games::lock_core();
        assert_eq!(option(c"dolphin_shader_compilation_mode").as_deref(), Some("0"));

        set_async_shaders(true);
        let with_async = option(c"dolphin_shader_compilation_mode");
        set_async_shaders(false);

        assert_eq!(with_async.as_deref(), DOLPHIN_ASYNC_SHADERS.to_str().ok());
    }

    #[test]
    fn renders_gamecube_games_at_the_chosen_resolution_in_4_3() {
        let _lock = crate::test_games::lock_core();
        assert_eq!(option(c"dolphin_efb_scale").as_deref(), Some("1"));

        let chosen = [2, 3, 0, 4].map(|scale| {
            set_resolution(scale);
            option(c"dolphin_efb_scale")
        });
        set_resolution(1);

        assert_eq!(chosen.each_ref().map(Option::as_deref), [Some("2"), Some("3"), Some("1"), Some("3")]);
        assert_eq!(option(c"dolphin_widescreen_hack").as_deref(), Some("disabled"));
    }

    #[test]
    fn runs_azahar_at_full_clock_with_the_fast_interpreter_and_no_texture_filter() {
        assert_eq!(option(c"citra_use_fastinterp").as_deref(), Some("enabled"));
        assert_eq!(option(c"citra_cpu_clock_percentage").as_deref(), Some("100"));
        assert_eq!(option(c"citra_texture_filter").as_deref(), Some("none"));
    }

    #[test]
    fn tells_cores_whether_they_can_jit() {
        let mut capable = !JIT;
        assert!(unsafe { environment(ENV_GET_JIT_CAPABLE, &mut capable as *mut bool as *mut c_void) });

        assert_eq!(capable, JIT);
    }

    #[test]
    fn leaves_azahars_jits_on_for_it_to_turn_off_without_executable_memory() {
        assert_eq!(option(c"citra_use_cpu_jit").as_deref(), Some("enabled"));
        assert_eq!(option(c"citra_use_shader_jit").as_deref(), Some("enabled"));
    }

    #[test]
    #[ignore = "flaky in a full cargo test run, #685"]
    fn gives_only_azahar_the_system_directory_for_saves_too() {
        let _lock = crate::test_games::lock_core();
        let dir = |cmd| {
            let mut dir: *const c_char = std::ptr::null();
            let answered = unsafe { environment(cmd, &mut dir as *mut *const c_char as *mut c_void) };
            answered.then_some(dir)
        };

        AZAHAR.set(true);
        assert_eq!(dir(ENV_GET_SAVE_DIRECTORY), dir(ENV_GET_SYSTEM_DIRECTORY));
        AZAHAR.set(false);
        assert_eq!(dir(ENV_GET_SAVE_DIRECTORY), None);
    }

    fn as_dolphin<R>(f: impl FnOnce() -> R) -> R {
        let _lock = crate::test_games::lock_core();
        DOLPHIN.store(true, Ordering::Relaxed);
        let result = f();
        DOLPHIN.store(false, Ordering::Relaxed);
        result
    }

    fn preferred() -> Option<c_uint> {
        let mut context = 0;
        unsafe { environment(ENV_GET_PREFERRED_HW_RENDER, &mut context as *mut c_uint as *mut c_void) }
            .then_some(context)
    }

    pub(super) fn preferred_by_dolphin() -> Option<c_uint> {
        as_dolphin(preferred)
    }

    #[test]
    fn asks_dolphin_for_its_context_and_refuses_it_anything_else() {
        let other = match DOLPHIN_CONTEXT {
            HW_CONTEXT_VULKAN => platform::OWN_CONTEXT,
            _ => (HW_CONTEXT_VULKAN, 1 << 22 | 1 << 12, 0),
        };

        let refused = as_dolphin(|| hw_render(other).0);

        assert_eq!(preferred_by_dolphin(), Some(DOLPHIN_CONTEXT));
        assert!(!refused);
        assert_eq!(preferred(), None);
    }

    #[test]
    fn gives_dolphin_a_save_directory_of_its_own() {
        let dir = |cmd| {
            let mut dir: *const c_char = std::ptr::null();
            let answered = unsafe { environment(cmd, &mut dir as *mut *const c_char as *mut c_void) };
            answered.then(|| unsafe { CStr::from_ptr(dir) }.to_string_lossy().into_owned())
        };
        DOLPHIN_SAVE_DIR
            .get_or_init(|| CString::new(dolphin_dir(&std::env::temp_dir()).to_string_lossy().as_bytes()).unwrap());

        let (save, system) = as_dolphin(|| (dir(ENV_GET_SAVE_DIRECTORY), dir(ENV_GET_SYSTEM_DIRECTORY)));

        let system = PathBuf::from(system.unwrap());
        assert_eq!(save.map(PathBuf::from), Some(system.join("dolphin-emu")));
    }

    #[test]
    fn serves_dolphin_files_through_version_4_of_the_vfs() {
        #[repr(C)]
        struct Info {
            version: u32,
            interface: *const c_void,
        }
        let ask = || {
            let mut info = Info { version: 4, interface: std::ptr::null() };
            unsafe {
                environment(ENV_GET_VFS_INTERFACE, &mut info as *mut Info as *mut c_void) && !info.interface.is_null()
            }
        };

        assert!(as_dolphin(ask));
        assert!(!ask());
    }

    #[test]
    fn names_a_gamecube_disc_by_its_extension_where_the_path_has_none() {
        assert_eq!(game_path(System::GameCube, "/proc/self/fd/9", "Colosseum.RVZ"), "/proc/self/fd/9/disc.rvz");
        assert_eq!(game_path(System::GameCube, "/games/gc/Colosseum.rvz", "Colosseum.rvz"), "/games/gc/Colosseum.rvz");
        assert_eq!(game_path(System::ThreeDs, "/proc/self/fd/9", "X.3ds"), "/proc/self/fd/9");
    }

    #[test]
    fn turns_dolphins_on_screen_messages_off() {
        assert_eq!(option(c"dolphin_osd_enabled").as_deref(), Some("disabled"));
    }

    #[test]
    fn has_dolphin_open_files_through_the_app_on_every_platform() {
        assert_eq!(option(c"dolphin_libretro_vfs_enabled").as_deref(), Some("enabled"));
    }

    #[test]
    fn removes_console_keys_from_azahars_folder() {
        let dir = std::env::temp_dir().join("pkh-emu-console-keys");
        let keys = dir.join("Azahar/sysdata/aes_keys.txt");
        std::fs::create_dir_all(keys.parent().unwrap()).unwrap();
        std::fs::write(&keys, "slot0x25KeyX=00").unwrap();

        assert_eq!(forget_console_keys(&dir.join("Azahar")), Ok(()));
        assert!(!keys.exists());
        assert_eq!(forget_console_keys(&dir.join("Azahar")), Ok(()));
    }

    #[test]
    fn puts_the_transfer_pak_in_port_1_only_for_a_game_loaded_with_one() {
        TRANSFER_PAK.set(true);
        assert_eq!(transfer_pak_option().as_deref(), Some("transfer"));
        TRANSFER_PAK.set(false);
        assert_eq!(transfer_pak_option(), None);
    }

    #[test]
    fn starts_ds_games_on_the_device_clock() {
        assert_eq!(option(c"melonds_start_time_mode").as_deref(), Some("sync"));
    }

    #[test]
    fn sets_ds_games_ahead_by_the_sessions_clock_offset() {
        set_ds_clock_offset((37 * 24 + 5) * 60 * 60);
        assert_eq!(option(c"melonds_start_time_relative_day_offset").as_deref(), Some("37"));
        assert_eq!(option(c"melonds_start_time_relative_hour_offset").as_deref(), Some("5"));
    }

    #[test]
    fn keeps_ds_games_on_real_time_with_no_offset() {
        set_ds_clock_offset(0);
        assert_eq!(option(c"melonds_start_time_relative_day_offset").as_deref(), Some("0"));
        assert_eq!(option(c"melonds_start_time_relative_hour_offset").as_deref(), Some("0"));
    }

    #[test]
    fn announces_core_options_v2_and_takes_the_definitions() {
        let mut version: c_uint = 0;
        assert!(unsafe { environment(ENV_GET_CORE_OPTIONS_VERSION, &mut version as *mut c_uint as *mut c_void) });
        assert_eq!(version, 2);
        assert!(unsafe { environment(ENV_SET_CORE_OPTIONS_V2, std::ptr::null_mut()) });
    }

    #[test]
    fn answers_the_cores_default_for_an_option_the_app_does_not_set() {
        let definition = |key: &CStr, default: &CStr| OptionDefinitionV2 {
            key: key.as_ptr(),
            descriptions: [std::ptr::null(); 5],
            values: [[std::ptr::null(); 2]; 128],
            default_value: default.as_ptr(),
        };
        let none = OptionDefinitionV2 { key: std::ptr::null(), ..definition(c"", c"") };
        let definitions = [
            definition(c"mupen64plus-MaxTxCacheSize", c"8000"),
            definition(c"mupen64plus-rdp-plugin", c"angrylion"),
            none,
        ];
        let mut options = OptionsV2 { categories: std::ptr::null(), definitions: definitions.as_ptr() };
        let mut intl = OptionsV2Intl { us: &mut options, local: std::ptr::null() };

        assert!(unsafe { environment(ENV_SET_CORE_OPTIONS_V2_INTL, &mut intl as *mut OptionsV2Intl as *mut c_void) });

        assert_eq!(option(c"mupen64plus-MaxTxCacheSize").as_deref(), Some("8000"));
        assert_eq!(option(c"mupen64plus-rdp-plugin").as_deref(), Some("gliden64"));
        assert_eq!(option(c"mupen64plus-unknown"), None);
    }

    fn set_pixel_format(format: c_uint) -> bool {
        let mut format = format;
        unsafe { environment(ENV_SET_PIXEL_FORMAT, &mut format as *mut c_uint as *mut c_void) }
    }

    #[test]
    fn takes_rgb565_and_xrgb8888_frames_only() {
        let _lock = crate::test_games::lock_core();

        assert!(set_pixel_format(PIXEL_FORMAT_XRGB8888));
        assert!(set_pixel_format(PIXEL_FORMAT_RGB565));
        assert!(!set_pixel_format(0));
        assert_eq!(PIXEL_FORMAT.load(Ordering::Relaxed), PIXEL_FORMAT_RGB565);
    }

    #[test]
    fn converts_xrgb8888_frames_to_rgb565() {
        let _lock = crate::test_games::lock_core();
        set_pixel_format(PIXEL_FORMAT_XRGB8888);
        // Two rows of two pixels, each row padded to three.
        let rows: [u32; 6] = [0x00FF0000, 0x0000FF00, 0xDEADBEEF, 0x000000FF, 0xFFFFFFFF, 0xDEADBEEF];

        unsafe { video_refresh(rows.as_ptr() as *const c_void, 2, 2, 12) };
        set_pixel_format(PIXEL_FORMAT_RGB565);

        FRAME.with_borrow(|frame| {
            assert_eq!((frame.width, frame.height), (2, 2));
            assert_eq!(frame.pixels, [0xF800, 0x07E0, 0x001F, 0xFFFF]);
        });
    }

    pub(super) const RED: u16 = 0xF800;
    const GREEN: u16 = 0x07E0;
    pub(super) const BLUE: u16 = 0x001F;

    fn blended(blend: bool, frames: &[Option<[u16; 2]>]) -> Vec<u16> {
        set_pixel_format(PIXEL_FORMAT_RGB565);
        unsafe { video_refresh([0u16; 2].as_ptr() as *const c_void, 2, 1, 4) };
        take_frame(|_| ());
        start_blend(blend);
        for frame in frames {
            let data = frame.as_ref().map_or(std::ptr::null(), |pixels| pixels.as_ptr() as *const c_void);
            unsafe { video_refresh(data, 2, 1, 4) };
        }
        take_frame(|frame| frame.pixels.clone()).unwrap()
    }

    #[test]
    fn sends_the_last_frame_with_blending_off() {
        let _lock = crate::test_games::lock_core();

        assert_eq!(blended(false, &[Some([RED, GREEN]), Some([BLUE, RED])]), [BLUE, RED]);
    }

    #[test]
    fn averages_the_last_two_frames_per_channel() {
        let _lock = crate::test_games::lock_core();

        let pixels = blended(true, &[Some([GREEN, GREEN]), Some([RED, 0]), Some([BLUE, 0xFFFF])]);

        assert_eq!(pixels, [(16 << 11) | 16, (16 << 11) | (32 << 5) | 16]);
    }

    #[test]
    fn counts_a_repeated_frame_as_the_previous_frame_again() {
        let _lock = crate::test_games::lock_core();

        assert_eq!(blended(true, &[Some([RED, 0]), Some([BLUE, 0]), None]), [BLUE, 0]);
    }

    #[test]
    fn sends_a_single_frame_as_it_is() {
        let _lock = crate::test_games::lock_core();

        assert_eq!(blended(true, &[Some([RED, BLUE])]), [RED, BLUE]);
    }

    #[test]
    fn blends_only_the_frame_it_was_asked_for() {
        let _lock = crate::test_games::lock_core();
        blended(true, &[Some([RED, 0]), Some([0, 0])]);

        for pixels in [[RED, 0], [BLUE, 0]] {
            unsafe { video_refresh(pixels.as_ptr() as *const c_void, 2, 1, 4) };
        }

        assert_eq!(take_frame(|frame| frame.pixels.clone()).unwrap(), [BLUE, 0]);
    }

    #[test]
    fn screenshots_an_xrgb8888_frame_in_its_own_colours() {
        let _lock = crate::test_games::lock_core();
        set_pixel_format(PIXEL_FORMAT_XRGB8888);
        let pixels: [u32; 3] = [0x00FF0000, 0x0000FF00, 0x000000FF];

        unsafe { video_refresh(pixels.as_ptr() as *const c_void, 3, 1, 12) };
        set_pixel_format(PIXEL_FORMAT_RGB565);
        let png = FRAME.with_borrow(|frame| crate::resume::screenshot(frame).unwrap());

        let mut reader = png::Decoder::new(std::io::Cursor::new(png)).read_info().unwrap();
        let mut rgb = vec![0; reader.output_buffer_size().unwrap()];
        reader.next_frame(&mut rgb).unwrap();
        assert_eq!(rgb, [255, 0, 0, 0, 255, 0, 0, 0, 255]);
    }

    #[test]
    fn keeps_the_geometry_and_timing_the_core_sends() {
        let mut av = AvInfo {
            geometry: GameGeometry { base_width: 256, base_height: 384, ..Default::default() },
            timing: SystemTiming { fps: 59.83, sample_rate: 32768.0 },
        };
        unsafe { environment(ENV_SET_SYSTEM_AV_INFO, &mut av as *mut AvInfo as *mut c_void) };
        let mut geometry = GameGeometry { base_width: 512, base_height: 192, ..Default::default() };

        unsafe { environment(ENV_SET_GEOMETRY, &mut geometry as *mut GameGeometry as *mut c_void) };

        let av = AV.get();
        assert_eq!((av.geometry.base_width, av.geometry.base_height), (512, 192));
        assert_eq!((av.timing.fps, av.timing.sample_rate), (59.83, 32768.0));
    }

    pub(super) fn hw_render(
        (context_type, version_major, version_minor): (c_uint, c_uint, c_uint),
    ) -> (bool, HwRenderCallback) {
        let mut hw = HwRenderCallback {
            context_type,
            context_reset: None,
            get_current_framebuffer: None,
            get_proc_address: None,
            depth: true,
            stencil: false,
            bottom_left_origin: true,
            version_major,
            version_minor,
            cache_context: true,
            context_destroy: None,
            debug_context: false,
        };
        let accepted = unsafe { environment(ENV_SET_HW_RENDER, &mut hw as *mut HwRenderCallback as *mut c_void) };
        (accepted, hw)
    }

    fn set_geometry(width: c_uint, height: c_uint) -> bool {
        let mut geometry = GameGeometry { base_width: width, base_height: height, ..Default::default() };
        unsafe { environment(ENV_SET_GEOMETRY, &mut geometry as *mut GameGeometry as *mut c_void) }
    }

    fn hw_size() -> Option<(u32, u32)> {
        HW.with_borrow(|hw| match hw.as_ref().map(|hw| &hw.renderer) {
            Some(Renderer::Gl(renderer)) => Some(renderer.size()),
            _ => None,
        })
    }

    #[test]
    fn refuses_gl_contexts_other_than_its_own() {
        let _lock = crate::test_games::lock_core();
        for context in [(2, 2, 0), (HW_CONTEXT_OPENGL_CORE, 4, 6)] {
            assert!(!hw_render(context).0, "{context:?}");
            assert!(HW.with_borrow(Option::is_none));
        }
    }

    #[test]
    #[ignore = "flaky in a full cargo test run, #685"]
    fn gives_the_core_a_framebuffer_and_gl_functions() {
        let _lock = crate::test_games::lock_core();

        let (accepted, hw) = hw_render(platform::OWN_CONTEXT);

        assert!(accepted);
        assert_ne!(unsafe { hw.get_current_framebuffer.unwrap()() }, 0);
        assert!(!unsafe { hw.get_proc_address.unwrap()(c"glReadPixels".as_ptr()) }.is_null());
        stop_hw_render();
    }

    #[test]
    #[ignore = "flaky in a full cargo test run, #685"]
    fn resizes_the_framebuffer_with_the_cores_geometry() {
        let _lock = crate::test_games::lock_core();
        hw_render(platform::OWN_CONTEXT);

        assert!(set_geometry(320, 240));
        assert_eq!(hw_size(), Some((320, 240)));

        let mut av =
            AvInfo { geometry: GameGeometry { base_width: 640, base_height: 480, ..Default::default() }, ..AV.get() };
        assert!(unsafe { environment(ENV_SET_SYSTEM_AV_INFO, &mut av as *mut AvInfo as *mut c_void) });
        assert_eq!(hw_size(), Some((640, 480)));
        stop_hw_render();
    }

    unsafe fn gl_function<T>(name: &CStr) -> T {
        let address = gl::proc_address(name.as_ptr());
        assert!(!address.is_null(), "{name:?}");
        std::mem::transmute_copy(&address)
    }

    // Red on the bottom row and blue on the top, as GL counts rows.
    fn draw_two_rows(hw: &HwRenderCallback) {
        set_geometry(2, 2);
        unsafe {
            let bind: unsafe extern "C" fn(u32, u32) = gl_function(c"glBindFramebuffer");
            let enable: unsafe extern "C" fn(u32) = gl_function(c"glEnable");
            let disable: unsafe extern "C" fn(u32) = gl_function(c"glDisable");
            let scissor: unsafe extern "C" fn(i32, i32, i32, i32) = gl_function(c"glScissor");
            let clear_color: unsafe extern "C" fn(f32, f32, f32, f32) = gl_function(c"glClearColor");
            let clear: unsafe extern "C" fn(u32) = gl_function(c"glClear");
            let (scissor_test, color_buffer) = (0x0C11, 0x4000);
            bind(0x8D40, hw.get_current_framebuffer.unwrap()() as u32);
            enable(scissor_test);
            for (row, [r, g, b]) in [(0, [1.0, 0.0, 0.0]), (1, [0.0, 0.0, 1.0])] {
                scissor(0, row, 2, 1);
                clear_color(r, g, b, 1.0);
                clear(color_buffer);
            }
            disable(scissor_test);
        }
    }

    #[test]
    fn reads_gl_frames_top_row_first() {
        let _lock = crate::test_games::lock_core();
        let (_, hw) = hw_render(platform::OWN_CONTEXT);
        draw_two_rows(&hw);

        unsafe { video_refresh(HW_FRAME_BUFFER_VALID, 2, 2, 0) };

        FRAME.with_borrow(|frame| {
            assert_eq!((frame.width, frame.height), (2, 2));
            assert_eq!(frame.pixels, [BLUE, BLUE, RED, RED]);
        });
        stop_hw_render();
    }

    fn leaving_gl_frames_in_the_texture() -> HwRenderCallback {
        let (_, hw) = hw_render(platform::OWN_CONTEXT);
        FRAME.with_borrow_mut(|frame| *frame = Frame::default());
        start_blend(false);
        READ_BACK.set(false);
        draw_two_rows(&hw);
        hw
    }

    fn done_with_gl() {
        READ_BACK.set(true);
        stop_hw_render();
    }

    #[test]
    #[cfg(debug_assertions)]
    fn fails_when_the_cores_context_is_made_current_asleep() {
        let _lock = crate::test_games::lock_core();
        hw_render(platform::OWN_CONTEXT);
        sleep();

        let made_current = std::panic::catch_unwind(|| in_core(|| ()));

        wake();
        stop_hw_render();
        assert!(made_current.is_err());
    }

    #[test]
    #[ignore = "flaky in a full cargo test run, #685"]
    fn hands_over_the_cores_texture_when_not_reading_gl_frames_back() {
        let _lock = crate::test_games::lock_core();
        leaving_gl_frames_in_the_texture();

        unsafe { video_refresh(HW_FRAME_BUFFER_VALID, 2, 2, 0) };
        let picture = take_picture(|picture| match picture {
            Picture::Texture(texture) => Some((texture.width, texture.height, texture.bottom_left)),
            _ => None,
        });

        assert_eq!(picture, Some(Some((2, 2, true))));
        assert!(FRAME.with_borrow(|frame| frame.pixels.is_empty()));
        done_with_gl();
    }

    #[test]
    fn reads_back_a_gl_frame_left_in_the_texture_when_asked_for_its_pixels() {
        let _lock = crate::test_games::lock_core();
        leaving_gl_frames_in_the_texture();

        unsafe { video_refresh(HW_FRAME_BUFFER_VALID, 2, 2, 0) };

        assert_eq!(take_frame(|frame| frame.pixels.clone()), Some(vec![BLUE, BLUE, RED, RED]));
        done_with_gl();
    }

    #[test]
    fn reads_gl_frames_back_to_blend_them() {
        let _lock = crate::test_games::lock_core();
        leaving_gl_frames_in_the_texture();
        start_blend(true);

        unsafe { video_refresh(HW_FRAME_BUFFER_VALID, 2, 2, 0) };

        assert_eq!(FRAME.with_borrow(|frame| frame.pixels.clone()), [BLUE, BLUE, RED, RED]);
        start_blend(false);
        done_with_gl();
    }

    fn colours(frame: &Frame) -> usize {
        frame.pixels.iter().collect::<std::collections::HashSet<_>>().len()
    }

    const MARK: u64 = 0x1234_5678_9abc;

    // AAPCS64 has a callee keep d8 to d15.
    #[cfg(target_arch = "aarch64")]
    fn run_frame_keeping_registers(core: &mut Core) -> bool {
        let mut after = [0u64; 8];
        unsafe {
            std::arch::asm!(
                "fmov d8, {m}", "fmov d9, {m}", "fmov d10, {m}", "fmov d11, {m}",
                "fmov d12, {m}", "fmov d13, {m}", "fmov d14, {m}", "fmov d15, {m}",
                m = in(reg) MARK,
                out("v8") _, out("v9") _, out("v10") _, out("v11") _, out("v12") _, out("v13") _, out("v14") _, out("v15") _,
            );
        }
        core.run_frame();
        unsafe {
            std::arch::asm!(
                "stp d8, d9, [{p}]", "stp d10, d11, [{p}, #16]", "stp d12, d13, [{p}, #32]", "stp d14, d15, [{p}, #48]",
                p = in(reg) after.as_mut_ptr(),
            );
        }
        after == [MARK; 8]
    }

    #[cfg(target_arch = "aarch64")]
    fn plays_through_gl(rom: Rom) -> Core {
        let mut core = Core::load(rom, &std::env::temp_dir()).unwrap();
        let mut seen = None;
        let mut clobbered = 0;
        for _ in 0..300 {
            if !run_frame_keeping_registers(&mut core) {
                clobbered += 1;
            }
            core.take_frame(|frame| seen = Some(((frame.width, frame.height), colours(frame))));
        }

        let (size, colours) = seen.expect("no frames");
        assert_eq!(size, (640, 480));
        assert!(colours > 1, "the frame is one colour");
        assert_eq!(clobbered, 0, "frames that came back with d8 to d15 changed");
        let rounding = float_mode() >> 22 & 0b11;
        assert_eq!(rounding, 0, "the core left its rounding mode on the app's thread");
        core
    }

    #[test]
    #[cfg(target_arch = "aarch64")]
    fn plays_stadium_through_gl() {
        let _lock = crate::test_games::lock_core();
        let Some(rom) = crate::test_games::stadium() else { return };

        plays_through_gl(rom);
    }

    #[test]
    #[cfg(target_arch = "aarch64")]
    fn plays_stadium_2_through_gl() {
        let _lock = crate::test_games::lock_core();
        let Some(rom) = crate::test_games::stadium_2() else { return };

        plays_through_gl(rom);
    }

    #[cfg(target_arch = "aarch64")]
    fn plays_a_gba_game() {
        let mut core = Core::load(crate::test_games::gba_rom(), &std::env::temp_dir()).unwrap();
        let mut size = None;
        for _ in 0..10 {
            core.run_frame();
            core.take_frame(|frame| size = Some((frame.width, frame.height)));
        }
        assert_eq!(size, Some((240, 160)));
    }

    #[test]
    #[cfg(target_arch = "aarch64")]
    fn plays_stadium_then_stadium_2_then_a_gba_game() {
        let _lock = crate::test_games::lock_core();
        let (Some(stadium), Some(stadium_2)) = (crate::test_games::stadium(), crate::test_games::stadium_2()) else {
            return;
        };

        drop(plays_through_gl(stadium));
        drop(plays_through_gl(stadium_2));
        plays_a_gba_game();
    }

    #[test]
    #[cfg(target_arch = "aarch64")]
    fn plays_stadium_twice_in_a_row() {
        let _lock = crate::test_games::lock_core();
        let (Some(first), Some(again)) = (crate::test_games::stadium(), crate::test_games::stadium()) else { return };

        drop(plays_through_gl(first));
        drop(plays_through_gl(again));
        plays_a_gba_game();
    }

    #[test]
    #[cfg(target_arch = "aarch64")]
    fn plays_stadium_after_leaving_it_before_its_first_frame() {
        let _lock = crate::test_games::lock_core();
        let (Some(first), Some(again)) = (crate::test_games::stadium(), crate::test_games::stadium()) else { return };

        drop(Core::load(first, &std::env::temp_dir()).unwrap());
        drop(plays_through_gl(again));
        plays_a_gba_game();
    }

    #[test]
    #[cfg(target_arch = "aarch64")]
    fn plays_stadium_and_a_gba_game_after_an_n64_rom_the_core_refuses() {
        let _lock = crate::test_games::lock_core();
        let Some(rom) = crate::test_games::stadium() else { return };
        let broken = Rom { name: "broken.z64".into(), bytes: vec![0; 0x1000], file: None };

        assert_eq!(Core::load(broken, &std::env::temp_dir()).err().as_deref(), Some("the core refused the ROM"));
        drop(plays_through_gl(rom));
        plays_a_gba_game();
    }

    #[test]
    #[cfg(target_arch = "aarch64")]
    fn keeps_running_stadium_from_a_save_state() {
        let _lock = crate::test_games::lock_core();
        let Some(rom) = crate::test_games::stadium() else { return };
        let mut core = plays_through_gl(rom);
        let state = core.serialize().unwrap();
        for _ in 0..120 {
            core.run_frame();
        }

        assert!(core.unserialize(&state));
        let mut frames = Vec::new();
        for _ in 0..120 {
            core.run_frame();
            core.take_frame(|frame| frames.push(((frame.width, frame.height), colours(frame))));
        }

        assert!(frames.len() > 30, "{} frames", frames.len());
        assert!(frames.iter().all(|&(size, _)| size == (640, 480)));
        assert!(frames.last().unwrap().1 > 1, "the frame is one colour");
    }

    #[test]
    #[cfg(target_arch = "aarch64")]
    fn keeps_stadiums_state_the_same_size_from_frame_to_frame() {
        let _lock = crate::test_games::lock_core();
        let Some(rom) = crate::test_games::stadium() else { return };
        let mut core = plays_through_gl(rom);
        let mut sizes = std::collections::HashSet::new();
        for _ in 0..10 {
            for _ in 0..30 {
                core.run_frame();
            }
            sizes.insert(core.serialize().unwrap().len());
        }

        assert_eq!(sizes.len(), 1, "{sizes:?}");
    }

    #[test]
    #[cfg(target_arch = "aarch64")]
    fn a_gameshark_code_writes_stadiums_memory() {
        let _lock = crate::test_games::lock_core();
        let Some(rom) = crate::test_games::stadium() else { return };
        let mut core = plays_through_gl(rom);
        let code = crate::cheats::check(crate::cheats::Platform::N64, "80300000 00AB\n80300001 00CD").unwrap();

        core.set_cheats(&[code]);
        for _ in 0..2 {
            core.run_frame();
        }

        // RDRAM is kept as native-endian 32-bit words, so N64 bytes 0x300000 and 0x300001 sit at 3 and 2.
        assert_eq!(read(&mut core, 0x0230_0002, 2).unwrap(), [0xCD, 0xAB]);
    }

    #[test]
    fn draws_game_boy_and_gba_frames_without_gl() {
        let _lock = crate::test_games::lock_core();
        let ds = crate::test_games::heartgold().map(|(rom, _)| (rom, (256, 384)));
        let games = [(crate::test_games::counting_rom(), (160, 144)), (crate::test_games::gba_rom(), (240, 160))];

        for (rom, expected) in games.into_iter().chain(ds) {
            let mut core = Core::load(rom, &std::env::temp_dir()).unwrap();
            let mut size = None;
            for _ in 0..10 {
                core.run_frame();
                core.take_frame(|frame| size = Some((frame.width, frame.height)));
            }

            assert_eq!(size, Some(expected));
            assert!(HW.with_borrow(Option::is_none));
            assert_eq!(HW_FRAMEBUFFER.load(Ordering::Relaxed), 0);
        }
    }

    #[test]
    fn reports_held_buttons_to_the_core() {
        let _lock = crate::test_games::lock_core();
        set_input((1 << 8) | (1 << 4));

        let state = |port, device, id| unsafe { input_state(port, device, 0, id) };
        assert_eq!(state(0, DEVICE_JOYPAD, 8), 1);
        assert_eq!(state(0, DEVICE_JOYPAD, 0), 0);
        assert_eq!(state(0, DEVICE_JOYPAD, DEVICE_ID_JOYPAD_MASK), (1 << 8) | (1 << 4));
        assert_eq!(state(1, DEVICE_JOYPAD, 8), 0);
        set_input(0);
    }

    #[test]
    fn reports_both_sticks_to_the_core() {
        let state = |port, index, id| unsafe { input_state(port, DEVICE_ANALOG, index, id) };
        set_analog([-0x8000, 0x7fff, 1, -1]);

        assert_eq!([state(0, 0, 0), state(0, 0, 1), state(0, 1, 0), state(0, 1, 1)], [-0x8000, 0x7fff, 1, -1]);
        assert_eq!(state(0, 2, 0), 0);
        assert_eq!(state(1, 0, 0), 0);
        set_analog([0; 4]);
    }

    #[test]
    fn reports_how_far_each_trigger_is_pulled_to_the_core() {
        let _lock = crate::test_games::lock_core();
        release_input();
        let state = |port, index, id| unsafe { input_state(port, DEVICE_ANALOG, index, id) };
        set_input(1 << 12);
        set_triggers([0x4000, 0x7fff]);

        assert_eq!([state(0, 2, 12), state(0, 2, 13)], [0x4000, 0x7fff]);
        assert_eq!(state(0, 2, 8), 0);
        assert_eq!(state(1, 2, 12), 0);
        assert_eq!(unsafe { input_state(0, DEVICE_JOYPAD, 0, DEVICE_ID_JOYPAD_MASK) }, 1 << 12);
        release_input();
    }

    #[test]
    fn reports_the_touch_screen_pointer_to_the_core() {
        let _lock = crate::test_games::lock_core();
        release_input();
        let state = |port, device, index, id| unsafe { input_state(port, device, index, id) };
        set_pointer(Some([-100, 200]));

        assert_eq!(state(0, DEVICE_POINTER, 0, DEVICE_ID_POINTER_X), -100);
        assert_eq!(state(0, DEVICE_POINTER, 0, DEVICE_ID_POINTER_Y), 200);
        assert_eq!(state(0, DEVICE_POINTER, 0, DEVICE_ID_POINTER_PRESSED), 1);
        assert_eq!(state(1, DEVICE_POINTER, 0, DEVICE_ID_POINTER_PRESSED), 0);
        assert_eq!(state(0, DEVICE_POINTER, 1, DEVICE_ID_POINTER_PRESSED), 0);

        a_frame();
        set_pointer(None);
        assert_eq!(state(0, DEVICE_POINTER, 0, DEVICE_ID_POINTER_PRESSED), 0);
    }

    #[test]
    fn announces_the_extended_message_interface() {
        let mut version: c_uint = 0;
        assert!(unsafe { environment(ENV_GET_MESSAGE_INTERFACE_VERSION, &mut version as *mut c_uint as *mut c_void) });
        assert_eq!(version, 1);
    }

    #[test]
    fn keeps_the_cores_messages_for_the_player() {
        let _lock = crate::test_games::lock_core();
        take_messages();

        assert!(send_message(c"Cheat #0 isn't valid", 3000, 0, 0));
        assert!(send_message(c"to the log", 3000, MESSAGE_TARGET_LOG, 0));
        assert!(send_message(c"Compiling shaders (1/4)", 1000, 1, 3));

        assert_eq!(take_messages(), [Message { text: "Cheat #0 isn't valid".into(), duration_ms: 3000 }]);
        assert_eq!(take_messages(), []);
    }

    #[test]
    fn keeps_the_cores_plain_messages_for_the_player() {
        let _lock = crate::test_games::lock_core();
        take_messages();

        let mut message = RetroMessage { msg: c"Out of JIT memory".as_ptr(), frames: 600 };
        assert!(unsafe { environment(ENV_SET_MESSAGE, &mut message as *mut RetroMessage as *mut c_void) });

        assert_eq!(take_messages(), [Message { text: "Out of JIT memory".into(), duration_ms: 10_000 }]);
    }

    fn cheat_writes_a_byte(rom: Rom, file: &[u8], platform: crate::cheats::Platform, code: &str, address: u32) {
        let mut core = played(rom, file);
        let before = read(&mut core, address, 1).unwrap()[0];
        let code = crate::cheats::check(platform, code).unwrap();

        core.set_cheats(&[code]);
        for _ in 0..2 {
            core.run_frame();
        }
        assert_eq!(read(&mut core, address, 1).unwrap(), [0xAB]);

        core.set_cheats(&[]);
        core.write_memory(address, &[before]);
        for _ in 0..2 {
            core.run_frame();
        }
        assert_eq!(read(&mut core, address, 1).unwrap(), [before]);
    }

    #[test]
    fn a_codebreaker_code_writes_firereds_memory_until_turned_off() {
        let _lock = crate::test_games::lock_core();
        let Some((rom, file)) = crate::test_games::firered() else { return };

        cheat_writes_a_byte(rom, &file, crate::cheats::Platform::Gba, "3203F000 00AB", 0x0203_F000);
    }

    #[test]
    fn an_action_replay_code_writes_heartgolds_memory_until_turned_off() {
        let _lock = crate::test_games::lock_core();
        let Some((rom, file)) = crate::test_games::heartgold() else { return };

        cheat_writes_a_byte(rom, &file, crate::cheats::Platform::Ds, "22300000 000000AB", 0x0230_0000);
    }

    #[test]
    fn a_game_genie_code_patches_the_rom_until_turned_off() {
        let _lock = crate::test_games::lock_core();
        let mut core = Core::load(crate::test_games::rom_byte_copying_rom(), &std::env::temp_dir()).unwrap();
        let code = crate::cheats::check(crate::cheats::Platform::Gb, "AB1-34F").unwrap();

        for (codes, byte) in [(vec![code.clone()], 0xAB), (vec![], 0x00), (vec![code], 0xAB)] {
            core.set_cheats(&codes);
            for _ in 0..2 {
                core.run_frame();
            }
            assert_eq!(read(&mut core, 0xC000, 1).unwrap(), [byte]);
        }
    }

    #[test]
    fn a_codebreaker_hook_stops_when_turned_off() {
        let _lock = crate::test_games::lock_core();
        let mut core = Core::load(crate::test_games::gba_counting_rom(), &std::env::temp_dir()).unwrap();
        let code = crate::cheats::check(crate::cheats::Platform::Gba, "100000CE 0001\n33000010 00AB").unwrap();

        core.set_cheats(&[code]);
        for _ in 0..2 {
            core.run_frame();
        }
        assert_eq!(read(&mut core, 0x0300_0010, 1).unwrap(), [0xAB]);

        core.set_cheats(&[]);
        core.write_memory(0x0300_0010, &[0]);
        let count = read(&mut core, 0x0300_0000, 4).unwrap();
        for _ in 0..2 {
            core.run_frame();
        }
        assert_eq!(read(&mut core, 0x0300_0010, 1).unwrap(), [0]);
        assert_ne!(read(&mut core, 0x0300_0000, 4).unwrap(), count);
    }

    #[test]
    fn takes_touch_from_the_pointer_only() {
        assert_eq!(option(c"melonds_touch_mode").as_deref(), Some("touch"));
    }

    fn read(core: &mut Core, address: u32, length: u32) -> Result<Vec<u8>, String> {
        core.read_memory(&[Range { address, length }])
    }

    #[test]
    fn reads_work_ram_through_the_cores_memory_map() {
        let _lock = crate::test_games::lock_core();
        let mut core = Core::load(crate::test_games::counting_rom(), &std::env::temp_dir()).unwrap();
        core.run_frame();
        let before = read(&mut core, 0xC000, 1).unwrap();

        core.run_frame();

        assert_ne!(read(&mut core, 0xC000, 1).unwrap(), before);
    }

    #[test]
    fn tells_whether_the_core_drew_since_it_started_or_loaded_a_state() {
        let _lock = crate::test_games::lock_core();
        let mut core = Core::load(crate::test_games::counting_rom(), &std::env::temp_dir()).unwrap();
        assert!(!core.drew_since_load());

        core.run_frame();
        assert!(core.drew_since_load());

        let state = core.serialize().unwrap();
        assert!(core.unserialize(&state));
        assert!(!core.drew_since_load());

        core.run_frame();
        assert!(core.drew_since_load());
    }

    #[test]
    fn fails_to_read_an_address_the_core_does_not_map() {
        let _lock = crate::test_games::lock_core();
        let mut core = Core::load(crate::test_games::counting_rom(), &std::env::temp_dir()).unwrap();

        assert!(read(&mut core, 0x0200_0000, 4).is_err());
    }

    #[test]
    fn reads_through_the_regions_the_core_maps() {
        let ram = [1u8, 2, 3, 4, 5, 6];
        let descriptor = |ptr: *const u8, offset, start| MemoryDescriptor {
            flags: 0,
            ptr: ptr as *mut c_void,
            offset,
            start,
            select: 0,
            disconnect: 0,
            len: 4,
            addrspace: std::ptr::null(),
        };
        let descriptors = [descriptor(ram.as_ptr(), 2, 0x100), descriptor(std::ptr::null(), 4, 0x200)];
        let mut map = MemoryMap { descriptors: descriptors.as_ptr(), num_descriptors: 2 };

        assert!(unsafe { environment(ENV_SET_MEMORY_MAPS, &mut map as *mut MemoryMap as *mut c_void) });

        let regions = MEMORY_MAP.with_borrow(Vec::clone);
        let read = |address| unsafe { memory::read(&regions, &[Range { address, length: 4 }]) };
        assert_eq!(read(0x100), Ok(vec![3, 4, 5, 6]));
        assert!(read(0x200).is_err());
    }

    fn roms_in(dir: &Path) -> Vec<std::path::PathBuf> {
        let mut roms = Vec::new();
        for entry in std::fs::read_dir(dir).unwrap() {
            let path = entry.unwrap().path();
            if path.is_dir() {
                roms.extend(roms_in(&path));
            } else if matches!(
                path.extension().and_then(|e| e.to_str()),
                Some("gb" | "gbc" | "gba" | "nds" | "zip" | "7z")
            ) {
                roms.push(path);
            }
        }
        roms
    }

    #[test]
    #[ignore = "needs PKH_EMU_TEST_ROMS, a folder of .gb, .gbc, .gba, .nds, .zip or .7z games"]
    fn runs_real_games() {
        let _lock = crate::test_games::lock_core();
        let dir = std::env::var("PKH_EMU_TEST_ROMS").expect("PKH_EMU_TEST_ROMS");
        let roms = roms_in(Path::new(&dir));
        assert!(!roms.is_empty(), "no games in {dir}");

        for rom in roms {
            let rom_file = crate::rom::unpack(&rom.to_string_lossy(), std::fs::read(&rom).unwrap()).unwrap();
            let is_ds = rom_file.is_ds();
            let mut core = Core::load(rom_file, &std::env::temp_dir()).unwrap();
            let is_gba = core.av().geometry.max_width == 240;
            let mut size = (0, 0);
            let mut audio = Vec::new();
            for _ in 0..600 {
                core.run_frame();
                core.take_frame(|frame| size = (frame.width, frame.height));
                core.drain_audio(&mut audio);
            }

            let expected = match (is_ds, is_gba) {
                (true, _) => (256, 384),
                (_, true) => (240, 160),
                _ => (160, 144),
            };
            assert_eq!(size, expected, "{}", rom.display());
            assert!(audio.len() > 600 * 500, "{}: {} samples", rom.display(), audio.len());
            assert!(audio.iter().any(|&s| s.unsigned_abs() > 1000), "{} is silent", rom.display());
        }
    }

    #[test]
    fn plays_heartgold_on_its_save() {
        let _lock = crate::test_games::lock_core();
        let Some((rom, file)) = crate::test_games::heartgold() else { return };
        let mut core = Core::load(rom, &std::env::temp_dir()).unwrap();
        let [save_ram, rtc] = core.save_memory();
        crate::save::fill(save_ram, rtc, &file);
        let mut size = (0, 0);
        let mut audio = Vec::new();

        for _ in 0..600 {
            core.run_frame();
            core.take_frame(|frame| size = (frame.width, frame.height));
            core.drain_audio(&mut audio);
        }

        assert_eq!(size, (256, 384));
        assert_eq!(file.len(), 512 * 1024);
        assert_eq!(core.save_ram(), file);
        assert!(audio.len() > 600 * 500, "{} samples", audio.len());
    }

    fn played(rom: Rom, file: &[u8]) -> Core {
        let mut core = Core::load(rom, &std::env::temp_dir()).unwrap();
        let [save_ram, rtc] = core.save_memory();
        crate::save::fill(save_ram, rtc, file);
        for _ in 0..600 {
            core.run_frame();
        }
        core
    }

    #[test]
    fn reads_gba_ewram_and_iwram() {
        let _lock = crate::test_games::lock_core();
        let Some((rom, file)) = crate::test_games::firered() else { return };
        let mut core = played(rom, &file);

        let ewram = read(&mut core, 0x0200_0000, 0x4_0000).unwrap();
        let iwram = read(&mut core, 0x0300_0000, 0x8000).unwrap();

        assert!(ewram.iter().any(|&b| b != 0));
        assert!(iwram.iter().any(|&b| b != 0));
        assert!(read(&mut core, 0x0204_0000, 1).is_err());
        assert!(read(&mut core, 0x0300_8000, 1).is_err());
    }

    #[test]
    fn reads_ds_main_ram() {
        let _lock = crate::test_games::lock_core();
        let Some((rom, file)) = crate::test_games::heartgold() else { return };
        let mut core = played(rom, &file);

        let main_ram = read(&mut core, 0x0200_0000, 0x40_0000).unwrap();

        assert!(main_ram.iter().any(|&b| b != 0));
        assert_eq!(read(&mut core, 0x0240_0000, 0x40_0000).unwrap(), main_ram);
        assert!(read(&mut core, 0x0300_0000, 1).is_err());
    }

    #[test]
    fn a_touch_on_the_bottom_screen_skips_heartgolds_intro() {
        let _lock = crate::test_games::lock_core();
        let Some((rom, file)) = crate::test_games::heartgold() else { return };
        let mut core = Core::load(rom, &std::env::temp_dir()).unwrap();
        let [save_ram, rtc] = core.save_memory();
        crate::save::fill(save_ram, rtc, &file);
        for _ in 0..2400 {
            core.run_frame();
        }
        let intro = core.serialize().unwrap();
        let mut play = |touch| {
            core.unserialize(&intro);
            for frame in 0..600 {
                set_pointer(if (30..40).contains(&frame) { touch } else { None });
                core.run_frame();
            }
            core.last_frame(|frame| frame.pixels.clone()).unwrap()
        };

        let idle = play(None);
        let touched = play(Some([0, 0x4000]));

        assert_ne!(idle, touched);
    }
}
