use super::{ExecMem, HwRenderCallback, HW_CONTEXT_OPENGLES3};
use crate::vulkan::Settings;
use ash::vk;
use std::ffi::{c_void, CStr};
use std::path::PathBuf;
use std::sync::OnceLock;

pub const N64_CPU: &CStr = c"dynamic_recompiler";
pub const JIT: bool = true;
pub const DOLPHIN_CONTEXT: std::ffi::c_uint = super::HW_CONTEXT_VULKAN;
// The screen is OpenGL ES, so a Vulkan frame is read back.
pub const SCREEN_DRAWS_VULKAN: bool = false;
pub const UBERSHADER_FALLBACK: bool = true;
// Skip Drawing. The Pixel 10's PowerVR driver fails to build some of Dolphin's ubershader pipelines, so Hybrid
// Ubershaders stalled for up to 1.7 s in the first minute where this didn't, and took 500 MB more memory.
pub const DOLPHIN_ASYNC_SHADERS: &CStr = c"3";
pub const DOLPHIN_SYS: &[u8] = include_bytes!(concat!(env!("OUT_DIR"), "/dolphin-sys.zip"));

// The Pixel 10's PowerVR GLES driver scrambles the textures Azahar uploads, and its Vulkan doesn't. Azahar needs 1.1.
pub fn azahar_renderer() -> &'static CStr {
    static VULKAN: OnceLock<bool> = OnceLock::new();
    let vulkan = *VULKAN.get_or_init(|| {
        vulkan_library().is_some_and(|library| {
            crate::vulkan::version(&library)
                .inspect_err(|e| eprintln!("Vulkan: {e}"))
                .is_ok_and(|version| version >= vk::API_VERSION_1_1)
        })
    });
    if vulkan {
        c"Vulkan"
    } else {
        c"OpenGL"
    }
}

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
    // The linker finds libraries by name in the APK's lib/<abi> folder.
    Some(format!("lib{name}.so").into())
}

pub fn vulkan_library() -> Option<PathBuf> {
    Some("libvulkan.so".into())
}

pub const VULKAN_SETTINGS: Settings = &[];

pub fn supports(hw: &HwRenderCallback) -> bool {
    hw.context_type == HW_CONTEXT_OPENGLES3
}

#[cfg(test)]
pub const OWN_CONTEXT: (std::ffi::c_uint, std::ffi::c_uint, std::ffi::c_uint) = (HW_CONTEXT_OPENGLES3, 3, 0);

#[cfg(test)]
mod tests {
    use crate::retro::tests::{hw_render, option};
    use ash::vk;

    #[test]
    fn draws_through_azahars_ubershader_while_shaders_compile_in_the_background() {
        let _lock = crate::test_games::lock_core();

        crate::retro::set_async_shaders(true);
        let with_async = option(c"citra_ubershader_fallback");
        crate::retro::set_async_shaders(false);
        let without = option(c"citra_ubershader_fallback");

        assert_eq!(with_async.as_deref(), Some("enabled"));
        assert_eq!(without.as_deref(), Some("disabled"));
    }

    #[test]
    fn skips_gamecube_draws_while_their_shaders_compile() {
        let _lock = crate::test_games::lock_core();

        crate::retro::set_async_shaders(true);
        let mode = option(c"dolphin_shader_compilation_mode");
        crate::retro::set_async_shaders(false);

        assert_eq!(mode.as_deref(), Some("3"));
    }

    #[test]
    fn refuses_a_gles_version_the_device_lacks() {
        let _lock = crate::test_games::lock_core();

        assert!(!hw_render((super::HW_CONTEXT_OPENGLES3, 3, 9)).0);
        assert!(hw_render(super::OWN_CONTEXT).0);
    }

    #[test]
    fn asks_azahar_for_vulkan_only_where_the_device_has_1_1() {
        let version = crate::vulkan::version(&super::vulkan_library().unwrap()).unwrap_or(0);
        let expected = if version >= vk::API_VERSION_1_1 { "Vulkan" } else { "OpenGL" };

        assert_eq!(option(c"citra_graphics_api").as_deref(), Some(expected));
    }

    #[test]
    fn gives_vulkan_to_a_core_that_asks() {
        let _lock = crate::test_games::lock_core();

        assert!(hw_render((super::super::HW_CONTEXT_VULKAN, 1 << 22 | 1 << 12, 0)).0);
        super::super::stop_hw_render();
    }

    #[test]
    fn runs_n64_games_on_the_dynarec() {
        assert_eq!(option(c"mupen64plus-cpucore").as_deref(), Some("dynamic_recompiler"));
    }
}
