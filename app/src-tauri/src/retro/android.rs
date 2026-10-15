use super::{HwRenderCallback, HW_CONTEXT_OPENGLES3};
use crate::vulkan::Settings;
use ash::vk;
use std::ffi::CStr;
use std::path::PathBuf;
use std::sync::OnceLock;

pub const N64_CPU: &CStr = c"dynamic_recompiler";
pub const JIT: bool = true;
// The screen is OpenGL ES, so a Vulkan frame is read back.
pub const SCREEN_DRAWS_VULKAN: bool = false;
pub const UBERSHADER_FALLBACK: bool = true;

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
