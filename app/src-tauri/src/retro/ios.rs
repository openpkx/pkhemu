use super::{HwRenderCallback, HW_CONTEXT_OPENGLES3, HW_CONTEXT_VULKAN};
use crate::vulkan::Settings;
use std::ffi::CStr;
use std::path::PathBuf;

#[cfg_attr(sideload, path = "ios_jit.rs")]
#[cfg_attr(not(sideload), path = "ios_no_jit.rs")]
mod jit;
pub use jit::{enable_jit_url, exec_mem_alloc, exec_mem_free, jit_on, release_exec_mem};
#[cfg(sideload)]
#[path = "ios_jit_helper.rs"]
mod jit_helper;
#[cfg(sideload)]
pub use jit_helper::{jit_helper, turn_on_jit_with_helper, JitHelper};

// App Store apps can't map memory writable and executable.
pub const N64_CPU: &CStr = c"cached_interpreter";
pub const JIT: bool = false;
// Azahar has no OpenGL on Apple platforms, so it gets Vulkan through MoltenVK. The simulator's Metal refuses the texel
// buffers Azahar reads its lookup tables from, so the simulator renders on the CPU.
pub fn azahar_renderer() -> &'static CStr {
    if cfg!(target_abi = "sim") {
        c"Software"
    } else {
        c"Vulkan"
    }
}
// Dolphin reads texel buffers on every frame, which the simulator's Metal refuses too, and its GL backend runs on the
// simulator's OpenGL ES 3.0.
pub const DOLPHIN_CONTEXT: std::ffi::c_uint =
    if cfg!(target_abi = "sim") { HW_CONTEXT_OPENGLES3 } else { HW_CONTEXT_VULKAN };
pub const SCREEN_DRAWS_VULKAN: bool = true;
// The ubershader fallback runs vertex shaders on the CPU, without a JIT here, and its cost isn't measured yet.
pub const UBERSHADER_FALLBACK: bool = false;
// Hybrid Ubershaders.
pub const DOLPHIN_ASYNC_SHADERS: &CStr = c"2";
pub const DOLPHIN_SYS: &[u8] = include_bytes!(concat!(env!("OUT_DIR"), "/dolphin-sys.zip"));

pub fn core_path(name: &str) -> Option<PathBuf> {
    let exe = std::env::current_exe().ok()?;
    let bundled = exe.parent().map(|dir| dir.join("Frameworks").join(format!("{name}.framework")).join(name));
    bundled.into_iter().chain(built(name).map(PathBuf::from)).find(|path| path.is_file())
}

// A test binary has no Frameworks folder, so it takes the libraries from the build. The app never reads these paths,
// which keeps them out of the IPA.
#[cfg(test)]
fn built(name: &str) -> Option<&'static str> {
    match name {
        "azahar_libretro" => option_env!("PKH_EMU_AZAHAR"),
        "dolphin_libretro" => option_env!("PKH_EMU_DOLPHIN"),
        "MoltenVK" => option_env!("PKH_EMU_MOLTENVK"),
        _ => None,
    }
}

#[cfg(not(test))]
fn built(_name: &str) -> Option<&'static str> {
    None
}

pub fn vulkan_library() -> Option<PathBuf> {
    core_path("MoltenVK")
}

// MoltenVK only applies it on macOS for now, where Metal otherwise limits its compiler threads.
pub const VULKAN_SETTINGS: Settings = &[(c"MoltenVK", c"MVK_CONFIG_SHOULD_MAXIMIZE_CONCURRENT_COMPILATION")];

pub fn supports(hw: &HwRenderCallback) -> bool {
    hw.context_type == HW_CONTEXT_OPENGLES3
}

#[cfg(test)]
pub const OWN_CONTEXT: (std::ffi::c_uint, std::ffi::c_uint, std::ffi::c_uint) = (HW_CONTEXT_OPENGLES3, 3, 0);

#[cfg(test)]
mod tests {
    use crate::retro::tests::{hw_render, option, preferred_by_dolphin};
    use crate::retro::*;
    use crate::vulkan::tests::draw_two_rows;
    use crate::vulkan::Interface;

    #[test]
    fn leaves_azahars_ubershader_off_even_with_async_shaders() {
        let _lock = crate::test_games::lock_core();

        crate::retro::set_async_shaders(true);
        let fallback = option(c"citra_ubershader_fallback");
        crate::retro::set_async_shaders(false);

        assert_eq!(fallback.as_deref(), Some("disabled"));
    }

    #[test]
    fn draws_gamecube_games_through_ubershaders_while_shaders_compile() {
        let _lock = crate::test_games::lock_core();

        crate::retro::set_async_shaders(true);
        let mode = option(c"dolphin_shader_compilation_mode");
        crate::retro::set_async_shaders(false);

        assert_eq!(mode.as_deref(), Some("2"));
    }

    #[test]
    fn tells_cores_there_is_no_executable_memory_with_no_debugger_attached() {
        let _lock = crate::test_games::lock_core();
        let mut alloc = ExecMemAlloc {
            version: 1,
            size: 0,
            mode: EXEC_MEM_MODE_DUAL_MAP,
            rx: std::ptr::null_mut(),
            rw: std::ptr::null_mut(),
        };
        let ask = |alloc: &mut ExecMemAlloc| unsafe { environment(ENV_EXEC_MEM_ALLOC, alloc as *mut _ as *mut c_void) };

        assert!(ask(&mut alloc));
        assert_eq!(alloc.mode, EXEC_MEM_MODE_UNAVAILABLE);
        alloc.size = 4096;
        assert!(!ask(&mut alloc));
        assert!(!jit_on());
    }

    #[test]
    fn asks_azahar_for_vulkan_on_a_phone_and_software_in_the_simulator() {
        let expected = if cfg!(target_abi = "sim") { "Software" } else { "Vulkan" };
        assert_eq!(option(c"citra_graphics_api").as_deref(), Some(expected));
    }

    #[test]
    fn asks_dolphin_for_vulkan_on_a_phone_and_opengl_es_in_the_simulator() {
        let expected = if cfg!(target_abi = "sim") { HW_CONTEXT_OPENGLES3 } else { HW_CONTEXT_VULKAN };
        assert_eq!(preferred_by_dolphin(), Some(expected));
    }

    #[test]
    fn hands_the_screen_vulkan_frames_in_the_cores_image() {
        let _lock = crate::test_games::lock_core();
        assert!(hw_render((HW_CONTEXT_VULKAN, 1 << 22 | 1 << 12, 0)).0);
        FRAME.with_borrow_mut(|frame| *frame = Frame::default());
        start_blend(false);
        READ_BACK.set(false);
        let mut interface: *const Interface = std::ptr::null();
        assert!(unsafe { environment(ENV_GET_HW_RENDER_INTERFACE, &mut interface as *mut _ as *mut c_void) });
        let rows = unsafe { draw_two_rows(&*interface) };

        unsafe { video_refresh(HW_FRAME_BUFFER_VALID, 2, 2, 0) };
        let size = take_picture(|picture| match picture {
            Picture::Image(frame) => Some((frame.width, frame.height)),
            _ => None,
        });

        READ_BACK.set(true);
        drop(rows);
        stop_hw_render();
        assert_eq!(size, Some(Some((2, 2))));
        assert!(FRAME.with_borrow(|frame| frame.pixels.is_empty()));
    }
}
