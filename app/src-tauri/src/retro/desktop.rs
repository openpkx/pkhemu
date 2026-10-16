use super::{ExecMem, HwRenderCallback, HW_CONTEXT_OPENGL_CORE};
use crate::vulkan::Settings;
use std::ffi::{c_void, CStr};
use std::path::PathBuf;

// Apple Silicon refuses the memory the arm64 dynarec maps writable and executable.
pub const N64_CPU: &CStr = c"cached_interpreter";
pub const JIT: bool = true;
// Azahar has no OpenGL on Apple platforms, so it gets Vulkan through MoltenVK.
pub fn azahar_renderer() -> &'static CStr {
    c"Vulkan"
}
// The Mac draws through WebGL, so a Vulkan frame is read back.
pub const SCREEN_DRAWS_VULKAN: bool = false;
pub const UBERSHADER_FALLBACK: bool = true;

// Cores map their own executable memory here.
pub fn exec_mem_alloc(_size: usize) -> Option<ExecMem> {
    None
}

pub fn exec_mem_free(_rx: *mut c_void) -> bool {
    false
}

pub fn release_exec_mem() {}

pub fn jit_on() -> bool {
    JIT
}

pub fn enable_jit_url() -> Option<String> {
    None
}

pub fn core_path(name: &str) -> Option<PathBuf> {
    let exe = std::env::current_exe().ok()?;
    let bundled = exe.parent().map(|dir| dir.join("../Frameworks").join(format!("{name}.dylib")));
    bundled.into_iter().chain(built(name).map(PathBuf::from)).find(|path| path.is_file())
}

fn built(name: &str) -> Option<&'static str> {
    match name {
        "melondsds_libretro" => option_env!("PKH_EMU_MELONDS_DS"),
        "mupen64plus_next_libretro" => option_env!("PKH_EMU_MUPEN64PLUS_NEXT"),
        "azahar_libretro" => option_env!("PKH_EMU_AZAHAR"),
        "libMoltenVK" => option_env!("PKH_EMU_MOLTENVK"),
        _ => None,
    }
}

// A Vulkan loader in its place lets layers such as validation see the core's calls.
pub fn vulkan_library() -> Option<PathBuf> {
    std::env::var_os("PKH_EMU_VULKAN_LIBRARY").map(PathBuf::from).or_else(|| core_path("libMoltenVK"))
}

// Metal otherwise limits its compiler threads, so Azahar's pipeline workers wait on each other.
pub const VULKAN_SETTINGS: Settings = &[(c"MoltenVK", c"MVK_CONFIG_SHOULD_MAXIMIZE_CONCURRENT_COMPILATION")];

// The Mac's core profile stops at 4.1.
pub fn supports(hw: &HwRenderCallback) -> bool {
    hw.context_type == HW_CONTEXT_OPENGL_CORE && ((3, 3)..=(4, 1)).contains(&(hw.version_major, hw.version_minor))
}

#[cfg(test)]
pub const OWN_CONTEXT: (std::ffi::c_uint, std::ffi::c_uint, std::ffi::c_uint) = (HW_CONTEXT_OPENGL_CORE, 3, 3);

#[cfg(test)]
mod tests {
    use crate::retro::tests::{hw_render, option, BLUE, RED};
    use crate::retro::*;
    use crate::vulkan::tests::draw_two_rows;
    use crate::vulkan::{Context, Interface, Negotiation};
    use ash::vk::{self, Handle};
    use std::sync::atomic::AtomicU64;

    const VULKAN_1_1: (c_uint, c_uint, c_uint) = (HW_CONTEXT_VULKAN, 1 << 22 | 1 << 12, 0);

    #[test]
    fn runs_n64_games_on_the_cached_interpreter() {
        assert_eq!(option(c"mupen64plus-cpucore").as_deref(), Some("cached_interpreter"));
    }

    #[test]
    fn asks_azahar_for_vulkan() {
        assert_eq!(option(c"citra_graphics_api").as_deref(), Some("Vulkan"));
    }

    #[test]
    fn draws_through_azahars_ubershader_while_shaders_compile_in_the_background() {
        let _lock = crate::test_games::lock_core();

        set_async_shaders(true);
        let with_async = option(c"citra_ubershader_fallback");
        set_async_shaders(false);
        let without = option(c"citra_ubershader_fallback");

        assert_eq!(with_async.as_deref(), Some("enabled"));
        assert_eq!(without.as_deref(), Some("disabled"));
    }

    #[test]
    fn finds_vulkan_1_1_in_moltenvk() {
        let version = crate::vulkan::version(&vulkan_library().unwrap()).unwrap();

        assert!(version >= vk::API_VERSION_1_1, "{version:#x}");
    }

    fn interface() -> &'static Interface {
        let mut interface: *const Interface = std::ptr::null();
        let given = unsafe { environment(ENV_GET_HW_RENDER_INTERFACE, &mut interface as *mut _ as *mut c_void) };
        assert!(given);
        unsafe { &*interface }
    }

    #[test]
    fn gives_the_core_a_vulkan_device_through_moltenvk() {
        let _lock = crate::test_games::lock_core();

        assert!(hw_render(VULKAN_1_1).0);
        let interface = interface();

        assert!(!interface.device.is_null());
        assert!(!interface.queue.is_null());
        stop_hw_render();
    }

    #[test]
    fn holds_the_cores_queue_while_the_app_sleeps() {
        let _lock = crate::test_games::lock_core();
        hw_render(VULKAN_1_1);
        let interface = interface();
        let (handle, lock_queue, unlock_queue) =
            (interface.handle as usize, interface.lock_queue, interface.unlock_queue);
        sleep();

        let (locked, waiting) = std::sync::mpsc::channel();
        std::thread::spawn(move || unsafe {
            lock_queue(handle as *mut c_void);
            let _ = locked.send(());
            unlock_queue(handle as *mut c_void);
        });
        let while_asleep = waiting.recv_timeout(std::time::Duration::from_millis(200));
        wake();
        let once_awake = waiting.recv_timeout(std::time::Duration::from_secs(5));

        stop_hw_render();
        assert!(while_asleep.is_err());
        assert!(once_awake.is_ok());
    }

    #[link(name = "Metal", kind = "framework")]
    extern "C" {
        fn MTLCreateSystemDefaultDevice() -> *mut objc2::runtime::AnyObject;
    }

    #[test]
    fn lets_metal_compile_pipelines_concurrently() {
        let _lock = crate::test_games::lock_core();
        hw_render(VULKAN_1_1);
        interface();

        let maximized: bool =
            unsafe { objc2::msg_send![&*MTLCreateSystemDefaultDevice(), shouldMaximizeConcurrentCompilation] };

        stop_hw_render();
        assert!(maximized);
    }

    static CORES_DEVICE: AtomicU64 = AtomicU64::new(0);

    unsafe extern "C" fn create_device(
        context: *mut Context,
        instance: vk::Instance,
        gpu: vk::PhysicalDevice,
        _: vk::SurfaceKHR,
        get_instance_proc_addr: vk::PFN_vkGetInstanceProcAddr,
        _: *const *const c_char,
        _: c_uint,
        _: *const *const c_char,
        _: c_uint,
        _: *const vk::PhysicalDeviceFeatures,
    ) -> bool {
        let entry = ash::Entry::from_static_fn(ash::StaticFn { get_instance_proc_addr });
        let instance = ash::Instance::load(entry.static_fn(), instance);
        let priorities = [1.0];
        let queue = vk::DeviceQueueCreateInfo::default().queue_family_index(0).queue_priorities(&priorities);
        let extensions = [c"VK_KHR_portability_subset".as_ptr()];
        let info = vk::DeviceCreateInfo::default()
            .queue_create_infos(std::slice::from_ref(&queue))
            .enabled_extension_names(&extensions);
        let device = instance.create_device(gpu, &info, None).unwrap();
        let queue = device.get_device_queue(0, 0);
        CORES_DEVICE.store(device.handle().as_raw(), Ordering::Relaxed);
        *context = Context { gpu, device: device.handle(), queue, presentation_queue: queue, ..Context::default() };
        true
    }

    static NEGOTIATION: Negotiation = Negotiation {
        interface_type: 0,
        interface_version: 1,
        get_application_info: None,
        create_device: Some(create_device),
        destroy_device: None,
    };

    #[test]
    fn uses_the_device_the_core_makes() {
        let _lock = crate::test_games::lock_core();
        hw_render(VULKAN_1_1);

        let negotiation = &NEGOTIATION as *const Negotiation as *mut c_void;
        assert!(unsafe { environment(ENV_SET_HW_RENDER_CONTEXT_NEGOTIATION_INTERFACE, negotiation) });

        assert_eq!(interface().device.as_raw(), CORES_DEVICE.load(Ordering::Relaxed));
        stop_hw_render();
    }

    unsafe extern "C" fn fail_to_create_device(
        _: *mut Context,
        _: vk::Instance,
        _: vk::PhysicalDevice,
        _: vk::SurfaceKHR,
        _: vk::PFN_vkGetInstanceProcAddr,
        _: *const *const c_char,
        _: c_uint,
        _: *const *const c_char,
        _: c_uint,
        _: *const vk::PhysicalDeviceFeatures,
    ) -> bool {
        false
    }

    static FAILING_NEGOTIATION: Negotiation = Negotiation { create_device: Some(fail_to_create_device), ..NEGOTIATION };

    #[test]
    fn gives_no_device_when_the_core_cant_make_its_own() {
        let _lock = crate::test_games::lock_core();
        hw_render(VULKAN_1_1);

        let negotiation = &FAILING_NEGOTIATION as *const Negotiation as *mut c_void;
        unsafe { environment(ENV_SET_HW_RENDER_CONTEXT_NEGOTIATION_INTERFACE, negotiation) };
        let mut interface: *const Interface = std::ptr::null();
        let given = unsafe { environment(ENV_GET_HW_RENDER_INTERFACE, &mut interface as *mut _ as *mut c_void) };

        assert!(!given);
        stop_hw_render();
    }

    #[test]
    fn reads_vulkan_frames_top_row_first() {
        let _lock = crate::test_games::lock_core();
        hw_render(VULKAN_1_1);
        let rows = unsafe { draw_two_rows(interface()) };

        unsafe { video_refresh(HW_FRAME_BUFFER_VALID, 2, 2, 0) };

        FRAME.with_borrow(|frame| {
            assert_eq!((frame.width, frame.height), (2, 2));
            assert_eq!(frame.pixels, [BLUE, BLUE, RED, RED]);
        });
        drop(rows);
        stop_hw_render();
    }

    #[test]
    fn reads_vulkan_frames_back_where_the_screen_would_take_a_texture() {
        let _lock = crate::test_games::lock_core();
        hw_render(VULKAN_1_1);
        FRAME.with_borrow_mut(|frame| *frame = Frame::default());
        start_blend(false);
        READ_BACK.set(false);
        let rows = unsafe { draw_two_rows(interface()) };

        unsafe { video_refresh(HW_FRAME_BUFFER_VALID, 2, 2, 0) };
        let pixels = take_picture(|picture| match picture {
            Picture::Pixels { pixels, .. } => Some(pixels.to_vec()),
            _ => None,
        });

        READ_BACK.set(true);
        drop(rows);
        stop_hw_render();
        assert_eq!(pixels, Some(Some(vec![BLUE, BLUE, RED, RED])));
    }
}
