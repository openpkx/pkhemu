use super::super::{ExecMem, EXEC_MEM_MODE_DUAL_MAP, EXEC_MEM_MODE_UNAVAILABLE, EXEC_MEM_MODE_WX_TOGGLE};
use libc::{c_int, c_uint, c_void, pid_t, MAP_ANON, MAP_FAILED, MAP_PRIVATE, PROT_EXEC, PROT_READ, PROT_WRITE};
use objc2_foundation::{NSBundle, NSProcessInfo};
use std::arch::asm;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Mutex, MutexGuard, OnceLock};

// RetroArch's size. The debugger approves the pool once and then leaves, so cores can't get more later.
const POOL_SIZE: usize = 544 << 20;
const CS_OPS_STATUS: c_uint = 0;
const CS_DEBUGGED: u32 = 0x1000_0000;
const P_TRACED: u32 = 0x800;
const TXM_FIRMWARE: &str = "usr/standalone/firmware/FUD/Ap,TrustedExecutionMonitor.img4";
const DETACH: u64 = 0;
const PREPARE_REGION: u64 = 1;
const VM_FLAGS_ANYWHERE: c_int = 1;

extern "C" {
    static mach_task_self_: libc::mach_port_t;
    fn csops(pid: pid_t, ops: c_uint, useraddr: *mut c_void, usersize: usize) -> c_int;
    fn vm_remap(
        target_task: libc::mach_port_t,
        target_address: *mut libc::vm_address_t,
        size: libc::vm_size_t,
        mask: libc::vm_address_t,
        flags: c_int,
        src_task: libc::mach_port_t,
        src_address: libc::vm_address_t,
        copy: libc::boolean_t,
        cur_protection: *mut libc::vm_prot_t,
        max_protection: *mut libc::vm_prot_t,
        inheritance: libc::vm_inherit_t,
    ) -> libc::kern_return_t;
}

#[derive(Clone, Copy, Debug)]
struct Facts {
    ios_26: bool,
    txm: Option<bool>,
    traced: bool,
    // Stays set once a debugger has attached, even after it leaves.
    debugged: bool,
}

#[derive(Clone, Copy, Debug, PartialEq)]
enum Plan {
    Off,
    WxToggle { detach: bool },
    Pool { approve: bool, detach: bool },
}

fn plan(facts: Facts) -> Plan {
    let Facts { ios_26, txm, traced, debugged } = facts;
    if !ios_26 {
        return if debugged { Plan::WxToggle { detach: traced } } else { Plan::Off };
    }
    // Approving pages that didn't need it only costs time. Skipping it on TXM leaves the core running unapproved pages.
    if txm.unwrap_or(true) {
        if traced {
            Plan::Pool { approve: true, detach: true }
        } else {
            Plan::Off
        }
    } else if debugged {
        Plan::Pool { approve: false, detach: traced }
    } else {
        Plan::Off
    }
}

fn facts() -> Facts {
    static DEVICE: OnceLock<(bool, Option<bool>)> = OnceLock::new();
    let &(ios_26, txm) = DEVICE.get_or_init(|| {
        let ios_26 = NSProcessInfo::processInfo().operatingSystemVersion().majorVersion >= 26;
        (ios_26, txm(Path::new("/System/Volumes/Preboot"), Path::new("/private/preboot")))
    });
    Facts { ios_26, txm, traced: traced(), debugged: debugged() }
}

// Devices with a Trusted Execution Monitor keep its firmware on the preboot volume. None when the volume can't be read.
fn txm(preboot: &Path, private_preboot: &Path) -> Option<bool> {
    let boots = [
        entry_named(preboot, 36).and_then(|uuid| entry_named(&uuid.join("boot"), 96)),
        entry_named(private_preboot, 96),
    ];
    let mut checked = false;
    for boot in boots.into_iter().flatten() {
        checked = true;
        if boot.join(TXM_FIRMWARE).exists() {
            return Some(true);
        }
    }
    checked.then_some(false)
}

fn entry_named(dir: &Path, length: usize) -> Option<PathBuf> {
    let entries = std::fs::read_dir(dir).ok()?;
    entries.flatten().map(|entry| entry.path()).find(|path| path.file_name().is_some_and(|name| name.len() == length))
}

pub(super) fn traced() -> bool {
    let mut mib = [libc::CTL_KERN, libc::KERN_PROC, libc::KERN_PROC_PID, unsafe { libc::getpid() }];
    // A 648-byte kinfo_proc. It starts with extern_proc, whose p_flag follows four pointers.
    let mut info = [0u64; 96];
    let mut size = std::mem::size_of_val(&info);
    let read =
        unsafe { libc::sysctl(mib.as_mut_ptr(), 4, info.as_mut_ptr().cast(), &mut size, std::ptr::null_mut(), 0) == 0 };
    read && info[4] as u32 & P_TRACED != 0
}

fn debugged() -> bool {
    let mut flags = 0u32;
    let status = unsafe { csops(libc::getpid(), CS_OPS_STATUS, (&mut flags as *mut u32).cast(), 4) };
    status == 0 && flags & CS_DEBUGGED != 0
}

static TRAPPED: AtomicBool = AtomicBool::new(false);

extern "C" fn step_over_brk(_signal: c_int, _info: *mut libc::siginfo_t, context: *mut c_void) {
    TRAPPED.store(true, Ordering::Relaxed);
    unsafe { (*(*(context as *mut libc::ucontext_t)).uc_mcontext).__ss.__pc += 4 };
}

// StikDebug's universal.js script reads a command from x16 at brk #0xf00d and steps over it. With no debugger, the brk
// raises SIGTRAP instead.
fn ask_debugger(command: u64, x0: usize, x1: usize) -> bool {
    static ASKING: Mutex<()> = Mutex::new(());
    let _asking = ASKING.lock().unwrap_or_else(|e| e.into_inner());
    unsafe {
        let mut action: libc::sigaction = std::mem::zeroed();
        action.sa_sigaction = step_over_brk as *const () as usize;
        action.sa_flags = libc::SA_SIGINFO;
        libc::sigemptyset(&mut action.sa_mask);
        let mut previous: libc::sigaction = std::mem::zeroed();
        libc::sigaction(libc::SIGTRAP, &action, &mut previous);
        TRAPPED.store(false, Ordering::Relaxed);
        asm!("brk #0xf00d", inout("x0") x0 => _, inout("x1") x1 => _, inout("x16") command => _, options(nostack));
        libc::sigaction(libc::SIGTRAP, &previous, std::ptr::null_mut());
    }
    !TRAPPED.load(Ordering::Relaxed)
}

struct Slices {
    size: usize,
    taken: Vec<(usize, usize)>,
}

impl Slices {
    fn new(size: usize) -> Slices {
        Slices { size, taken: Vec::new() }
    }

    fn take(&mut self, length: usize) -> Option<usize> {
        let mut start = 0;
        for (index, &(offset, taken)) in self.taken.iter().enumerate() {
            if offset - start >= length {
                self.taken.insert(index, (start, length));
                return Some(start);
            }
            start = offset + taken;
        }
        (start + length <= self.size).then(|| {
            self.taken.push((start, length));
            start
        })
    }

    fn free(&mut self, offset: usize) -> bool {
        let before = self.taken.len();
        self.taken.retain(|&(start, _)| start != offset);
        self.taken.len() != before
    }
}

// Mapped for good, since no debugger is left to approve another.
struct Pool {
    rx: usize,
    rw: usize,
    slices: Slices,
}

impl Pool {
    fn map(size: usize, approve: bool) -> Option<Pool> {
        let rx =
            unsafe { libc::mmap(std::ptr::null_mut(), size, PROT_READ | PROT_EXEC, MAP_ANON | MAP_PRIVATE, -1, 0) };
        if rx == MAP_FAILED {
            eprintln!("JIT: no room for a {} MB pool", size >> 20);
            return None;
        }
        let rx = rx as usize;
        let rw = if approve && !ask_debugger(PREPARE_REGION, rx, size) {
            eprintln!("JIT: the debugger didn't approve the pool");
            None
        } else {
            writable_alias(rx, size)
        };
        let Some(rw) = rw else {
            unsafe { libc::munmap(rx as *mut c_void, size) };
            return None;
        };
        Some(Pool { rx, rw, slices: Slices::new(size) })
    }

    fn take(&mut self, length: usize) -> Option<ExecMem> {
        let Some(offset) = self.slices.take(length) else {
            eprintln!("JIT: the pool has no room for {length} bytes");
            return None;
        };
        Some(ExecMem { mode: EXEC_MEM_MODE_DUAL_MAP, rx: (self.rx + offset) as _, rw: (self.rw + offset) as _ })
    }

    fn clear(&mut self) {
        self.slices.taken.clear();
    }

    fn free(&mut self, ptr: usize) -> bool {
        let size = self.slices.size;
        match [self.rx, self.rw].into_iter().find(|start| (*start..start + size).contains(&ptr)) {
            Some(start) => self.slices.free(ptr - start),
            None => false,
        }
    }
}

// TXM never lets a page be writable and executable at once, so cores write through a second mapping.
fn writable_alias(rx: usize, size: usize) -> Option<usize> {
    let task = unsafe { mach_task_self_ };
    let (mut rw, mut current, mut max) = (0, 0, 0);
    let remapped = unsafe {
        vm_remap(
            task,
            &mut rw,
            size,
            0,
            VM_FLAGS_ANYWHERE,
            task,
            rx,
            0,
            &mut current,
            &mut max,
            libc::VM_INHERIT_COPY as libc::vm_inherit_t,
        ) == libc::KERN_SUCCESS
    };
    if !remapped {
        return None;
    }
    if unsafe { libc::mprotect(rw as *mut c_void, size, PROT_READ | PROT_WRITE) } != 0 {
        unsafe { libc::vm_deallocate(task, rw, size) };
        return None;
    }
    Some(rw)
}

enum Ready {
    WxToggle,
    Pool(Pool),
}

struct State {
    ready: Option<Ready>,
    wx_maps: Vec<(usize, usize)>,
}

static STATE: Mutex<State> = Mutex::new(State { ready: None, wx_maps: Vec::new() });

fn state() -> MutexGuard<'static, State> {
    STATE.lock().unwrap_or_else(|e| e.into_inner())
}

fn ready(slot: &mut Option<Ready>) -> Option<&mut Ready> {
    if slot.is_none() {
        *slot = set_up(plan(facts()));
    }
    slot.as_mut()
}

// The debugger leaves even when the pool fails, or StikDebug's script would stay attached for good.
fn set_up(plan: Plan) -> Option<Ready> {
    let (ready, detach) = match plan {
        Plan::Off => (None, false),
        Plan::WxToggle { detach } => (Some(Ready::WxToggle), detach),
        Plan::Pool { approve, detach } => (Pool::map(POOL_SIZE, approve).map(Ready::Pool), detach),
    };
    if detach && ask_debugger(DETACH, 0, 0) {
        eprintln!("JIT: the debugger has left");
    }
    ready
}

fn page_rounded(size: usize) -> usize {
    let page = unsafe { libc::sysconf(libc::_SC_PAGESIZE) } as usize;
    size.div_ceil(page) * page
}

pub fn exec_mem_alloc(size: usize) -> Option<ExecMem> {
    let mut state = state();
    let state = &mut *state;
    let Some(ready) = ready(&mut state.ready) else {
        return (size == 0).then(|| ExecMem::probe(EXEC_MEM_MODE_UNAVAILABLE));
    };
    match ready {
        Ready::WxToggle if size == 0 => Some(ExecMem::probe(EXEC_MEM_MODE_WX_TOGGLE)),
        Ready::Pool(_) if size == 0 => Some(ExecMem::probe(EXEC_MEM_MODE_DUAL_MAP)),
        Ready::WxToggle => {
            let length = page_rounded(size);
            let ptr = unsafe {
                libc::mmap(std::ptr::null_mut(), length, PROT_READ | PROT_WRITE, MAP_ANON | MAP_PRIVATE, -1, 0)
            };
            if ptr == MAP_FAILED {
                return None;
            }
            state.wx_maps.push((ptr as usize, length));
            Some(ExecMem { mode: EXEC_MEM_MODE_WX_TOGGLE, rx: ptr, rw: ptr })
        }
        Ready::Pool(pool) => pool.take(page_rounded(size)),
    }
}

pub fn exec_mem_free(ptr: *mut c_void) -> bool {
    let mut state = state();
    let ptr = ptr as usize;
    if let Some(index) = state.wx_maps.iter().position(|&(start, _)| start == ptr) {
        let (start, length) = state.wx_maps.swap_remove(index);
        unsafe { libc::munmap(start as *mut c_void, length) };
        return true;
    }
    match &mut state.ready {
        Some(Ready::Pool(pool)) => pool.free(ptr),
        _ => false,
    }
}

pub fn release_exec_mem() {
    let mut state = state();
    for (start, length) in state.wx_maps.drain(..) {
        unsafe { libc::munmap(start as *mut c_void, length) };
    }
    if let Some(Ready::Pool(pool)) = &mut state.ready {
        pool.clear();
    }
}

pub fn jit_on() -> bool {
    ready(&mut state().ready).is_some()
}

// SideStore and AltStore sign the app with a bundle ID of their own.
pub fn enable_jit_url() -> Option<String> {
    let id = NSBundle::mainBundle().bundleIdentifier()?;
    Some(stikdebug_url(&id.to_string()))
}

fn stikdebug_url(bundle_id: &str) -> String {
    format!("stikdebug://enable-jit?bundle-id={bundle_id}&script-name=universal.js")
}

#[cfg(test)]
mod tests {
    use super::*;

    const IOS_26: Facts = Facts { ios_26: true, txm: Some(true), traced: false, debugged: false };
    const IOS_18: Facts = Facts { ios_26: false, txm: Some(false), traced: false, debugged: false };

    #[test]
    fn stays_off_until_a_debugger_has_attached() {
        assert_eq!(plan(IOS_18), Plan::Off);
        assert_eq!(plan(IOS_26), Plan::Off);
        assert_eq!(plan(Facts { txm: Some(false), ..IOS_26 }), Plan::Off);
    }

    #[test]
    fn toggles_pages_before_ios_26_once_a_debugger_has_attached() {
        assert_eq!(plan(Facts { debugged: true, ..IOS_18 }), Plan::WxToggle { detach: false });
    }

    #[test]
    fn sends_a_debugger_still_attached_before_ios_26_away() {
        assert_eq!(plan(Facts { traced: true, debugged: true, ..IOS_18 }), Plan::WxToggle { detach: true });
    }

    #[test]
    fn has_the_attached_debugger_approve_a_pool_on_txm_devices() {
        let attached = Facts { traced: true, debugged: true, ..IOS_26 };
        assert_eq!(plan(attached), Plan::Pool { approve: true, detach: true });
    }

    #[test]
    fn needs_the_debugger_attached_now_on_txm_devices() {
        assert_eq!(plan(Facts { debugged: true, ..IOS_26 }), Plan::Off);
    }

    #[test]
    fn maps_a_pool_without_approval_on_ios_26_devices_without_txm() {
        let left = Facts { txm: Some(false), debugged: true, ..IOS_26 };
        assert_eq!(plan(left), Plan::Pool { approve: false, detach: false });
        assert_eq!(plan(Facts { traced: true, ..left }), Plan::Pool { approve: false, detach: true });
    }

    #[test]
    fn assumes_txm_when_the_firmware_cant_be_read() {
        let unsure = Facts { txm: None, debugged: true, ..IOS_26 };
        assert_eq!(plan(unsure), Plan::Off);
        assert_eq!(plan(Facts { traced: true, ..unsure }), Plan::Pool { approve: true, detach: true });
    }

    fn preboot(firmware: bool) -> (tempfile::TempDir, PathBuf) {
        let root = tempfile::tempdir().unwrap();
        let boot = root.path().join("A".repeat(36)).join("boot").join("B".repeat(96));
        std::fs::create_dir_all(&boot).unwrap();
        if firmware {
            let path = boot.join(TXM_FIRMWARE);
            std::fs::create_dir_all(path.parent().unwrap()).unwrap();
            std::fs::write(path, b"").unwrap();
        }
        let path = root.path().to_path_buf();
        (root, path)
    }

    #[test]
    fn finds_the_txm_firmware_on_the_preboot_volume() {
        let (_root, path) = preboot(true);
        assert_eq!(txm(&path, Path::new("/nowhere")), Some(true));
    }

    #[test]
    fn says_no_txm_when_the_preboot_volume_lacks_its_firmware() {
        let (_root, path) = preboot(false);
        assert_eq!(txm(&path, Path::new("/nowhere")), Some(false));
    }

    #[test]
    fn falls_back_to_private_preboot() {
        let (_root, path) = preboot(true);
        let boot = path.join("A".repeat(36)).join("boot");
        assert_eq!(txm(Path::new("/nowhere"), &boot), Some(true));
    }

    #[test]
    fn doesnt_know_when_the_preboot_volume_cant_be_read() {
        assert_eq!(txm(Path::new("/nowhere"), Path::new("/nowhere either")), None);
    }

    #[test]
    fn hands_out_slices_until_the_pool_is_full() {
        let mut slices = Slices::new(3);
        assert_eq!((slices.take(1), slices.take(2), slices.take(1)), (Some(0), Some(1), None));
    }

    #[test]
    fn reuses_the_last_slice_once_freed() {
        let mut slices = Slices::new(3);
        slices.take(1);
        slices.take(2);
        assert!(slices.free(1));
        assert_eq!(slices.take(2), Some(1));
        assert!(!slices.free(2));
    }

    #[test]
    fn reuses_slices_freed_out_of_order() {
        let mut slices = Slices::new(4);
        let [a, b, c, _] = [1; 4].map(|length| slices.take(length).unwrap());
        assert!(slices.free(b));
        assert!(slices.free(a));
        assert_eq!(slices.take(1), Some(0));
        assert_eq!(slices.take(1), Some(1));
        assert!(slices.free(c));
        assert_eq!(slices.take(2), None);
        assert_eq!(slices.take(1), Some(2));
    }

    #[test]
    fn runs_code_written_through_the_writable_alias() {
        let page = page_rounded(1);
        let mut pool = Pool::map(page, false).expect("the simulator maps executable pages");
        let slice = pool.take(page).unwrap();
        // mov w0, #42; ret
        let code: [u32; 2] = [0x5280_0540, 0xd65f_03c0];
        unsafe {
            std::ptr::copy_nonoverlapping(code.as_ptr(), slice.rw as *mut u32, code.len());
            sys_icache_invalidate(slice.rx, 8);
            let run: extern "C" fn() -> u32 = std::mem::transmute(slice.rx);
            assert_eq!(run(), 42);
        }
        assert_ne!(slice.rx, slice.rw);
        assert!(pool.free(slice.rw as usize));
        assert!(pool.take(page).is_some());
    }

    extern "C" {
        fn sys_icache_invalidate(start: *mut c_void, length: usize);
    }

    const SMALLEST_CODE_CACHE: usize = 4 << 20;

    struct Played {
        frame_time: std::time::Duration,
        colours: usize,
        pool: Vec<usize>,
    }

    impl Played {
        fn code_caches(&self) -> Vec<usize> {
            self.pool.iter().copied().filter(|&length| length >= SMALLEST_CODE_CACHE).collect()
        }

        fn shaders(&self) -> Vec<usize> {
            self.pool.iter().copied().filter(|&length| length < SMALLEST_CODE_CACHE).collect()
        }
    }

    struct Pooled;

    impl Drop for Pooled {
        fn drop(&mut self) {
            state().ready = None;
        }
    }

    fn pooled(size: usize) -> Pooled {
        let pool = Pool::map(size, false).expect("the simulator maps executable pages");
        state().ready = Some(Ready::Pool(pool));
        Pooled
    }

    fn taken() -> Vec<usize> {
        match &state().ready {
            Some(Ready::Pool(pool)) => pool.slices.taken.iter().map(|&(_, length)| length).collect(),
            _ => Vec::new(),
        }
    }

    fn play(rom: crate::rom::Rom, pool: Option<usize>) -> Result<Played, String> {
        let _pooled = pool.map(pooled);
        let mut core = crate::retro::Core::load(rom, &std::env::temp_dir())?;
        (0..600).for_each(|_| core.run_frame());
        let started = std::time::Instant::now();
        (0..120).for_each(|_| core.run_frame());
        let frame_time = started.elapsed() / 120;
        let colours = core.last_frame(|frame| frame.pixels.iter().collect::<std::collections::HashSet<_>>().len());
        Ok(Played { frame_time, colours: colours.unwrap_or(0), pool: taken() })
    }

    fn play_pokemon_x(pool: Option<usize>) -> Option<Result<Played, String>> {
        Some(play(crate::test_games::pokemon_x()?, pool))
    }

    fn jit_capable() -> bool {
        let mut capable = false;
        let answered =
            unsafe { crate::retro::environment(crate::retro::ENV_GET_JIT_CAPABLE, (&mut capable as *mut bool).cast()) };
        answered && capable
    }

    #[test]
    fn tells_cores_they_can_jit_only_once_the_pool_is_mapped() {
        let _lock = crate::test_games::lock_core();
        assert!(!jit_capable());

        let _pooled = pooled(page_rounded(1));

        assert!(jit_capable());
    }

    // JitArm64 takes its near and far code in one block.
    const DOLPHIN_CODE: usize = 256 << 20;

    fn pressed_a_on_the_pad_reader(pool: Option<usize>) -> (u32, Vec<usize>) {
        let _pooled = pool.map(pooled);
        let rom = crate::test_games::gamecube_pad_reader_disc();
        let mut core = crate::retro::Core::load(rom, &std::env::temp_dir()).unwrap();
        (crate::test_games::buttons_after_pressing_a(&mut core), taken())
    }

    #[test]
    fn dolphin_runs_on_its_jit_from_the_pool() {
        let _lock = crate::test_games::lock_core();

        let (pad, pool) = pressed_a_on_the_pad_reader(Some(POOL_SIZE));

        assert!(pool.contains(&DOLPHIN_CODE), "Dolphin took {pool:?}");
        assert_eq!(pad, 0x0100, "A reached the pad as {pad:04x}");
    }

    #[test]
    fn dolphin_falls_back_to_the_cached_interpreter_without_executable_memory() {
        let _lock = crate::test_games::lock_core();

        let (pad, pool) = pressed_a_on_the_pad_reader(None);

        assert!(pool.is_empty());
        assert_eq!(pad, 0x0100, "A reached the pad as {pad:04x}");
    }

    #[test]
    fn dolphin_runs_colosseum_on_its_jit_from_the_pool() {
        let _lock = crate::test_games::lock_core();
        let colosseum = || crate::test_games::gamecube_disc("Pokémon Colosseum", "GC6P01", 0);
        let Some(rom) = colosseum() else { return };
        let interpreted = play(rom, None).unwrap();
        let jitted = play(colosseum().unwrap(), Some(POOL_SIZE)).unwrap();

        eprintln!(
            "Colosseum frame time: {:?} on the cached interpreter, {:?} on the JIT",
            interpreted.frame_time, jitted.frame_time
        );
        assert!(jitted.pool.contains(&DOLPHIN_CODE), "Dolphin took {:?}", jitted.pool);
        assert!(interpreted.colours > 50, "the cached interpreter drew {} colours", interpreted.colours);
        assert!(jitted.colours > 50, "the JIT drew {} colours", jitted.colours);
    }

    #[test]
    fn azahar_runs_pokemon_x_on_its_jits_from_the_pool() {
        let _lock = crate::test_games::lock_core();
        let Some(interpreted) = play_pokemon_x(None) else { return };
        let interpreted = interpreted.unwrap();
        let jitted = play_pokemon_x(Some(POOL_SIZE)).unwrap().unwrap();

        eprintln!(
            "Pokémon X frame time: {:?} interpreted, {:?} on the JITs",
            interpreted.frame_time, jitted.frame_time
        );
        assert!(jitted.code_caches().iter().any(|&length| length >= 8 << 20), "dynarmic took {:?}", jitted.pool);
        assert!(!jitted.shaders().is_empty(), "the shader JIT took nothing from the pool");
        assert!(interpreted.colours > 100, "FastInterp drew {} colours", interpreted.colours);
        assert!(jitted.colours > 100, "the JITs drew {} colours", jitted.colours);
    }

    #[test]
    fn interprets_the_shaders_that_dont_fit_in_the_pool() {
        let _lock = crate::test_games::lock_core();
        let Some(roomy) = play_pokemon_x(Some(POOL_SIZE)) else { return };
        let roomy = roomy.unwrap();
        let shaders = roomy.shaders();
        let size = roomy.code_caches().iter().sum::<usize>() + page_rounded(shaders.iter().sum::<usize>() / 2);

        let squeezed = play_pokemon_x(Some(size)).unwrap().unwrap();

        eprintln!("{} of {} shaders fit in {size} bytes", squeezed.shaders().len(), shaders.len());
        assert_eq!(squeezed.code_caches(), roomy.code_caches());
        assert!(squeezed.shaders().len() < shaders.len(), "every shader fit: {:?}", squeezed.pool);
        assert!(squeezed.colours > 100, "drew {} colours", squeezed.colours);
    }

    #[test]
    fn boots_pokemon_x_on_smaller_code_caches() {
        let _lock = crate::test_games::lock_core();
        let Some(played) = play_pokemon_x(Some(31 << 20)) else { return };
        let played = played.unwrap();

        let caches = played.code_caches();
        assert!(!caches.is_empty() && caches.iter().all(|&length| length < 32 << 20), "{:?}", played.pool);
        assert!(played.colours > 100, "drew {} colours", played.colours);
    }

    #[test]
    fn tells_the_player_when_no_code_cache_fits() {
        let _lock = crate::test_games::lock_core();
        crate::retro::take_messages();
        let Some(played) = play_pokemon_x(Some(SMALLEST_CODE_CACHE - page_rounded(1))) else { return };

        assert!(played.is_err());
        assert!(!crate::retro::take_messages().is_empty(), "Azahar said nothing");
        assert!(play_pokemon_x(Some(POOL_SIZE)).unwrap().is_ok(), "the next game didn't load");
    }

    #[test]
    fn a_brk_with_no_debugger_attached_fails_without_crashing() {
        assert!(!ask_debugger(DETACH, 0, 0));
        assert!(!ask_debugger(PREPARE_REGION, 0x1000, 0x1000));
    }

    #[test]
    fn opens_stikdebug_with_its_universal_script() {
        assert_eq!(
            stikdebug_url("fyi.openpkx.pkhemu.ABCDE12345"),
            "stikdebug://enable-jit?bundle-id=fyi.openpkx.pkhemu.ABCDE12345&script-name=universal.js"
        );
    }
}
