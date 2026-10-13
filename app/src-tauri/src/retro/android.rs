use super::{HwRenderCallback, HW_CONTEXT_OPENGLES3};
use std::ffi::CStr;
use std::path::PathBuf;

pub const N64_CPU: &CStr = c"dynamic_recompiler";
pub const MELONDS_JIT: &CStr = c"enabled";

pub fn core_path(name: &str, _built: Option<&str>) -> Option<PathBuf> {
    // The linker finds libraries by name in the APK's lib/<abi> folder.
    Some(format!("lib{name}.so").into())
}

pub fn supports(hw: &HwRenderCallback) -> bool {
    hw.context_type == HW_CONTEXT_OPENGLES3
}

#[cfg(test)]
pub const OWN_CONTEXT: (std::ffi::c_uint, std::ffi::c_uint, std::ffi::c_uint) = (HW_CONTEXT_OPENGLES3, 3, 0);

#[cfg(test)]
mod tests {
    use crate::retro::tests::option;

    #[test]
    fn runs_n64_games_on_the_dynarec() {
        assert_eq!(option(c"mupen64plus-cpucore").as_deref(), Some("dynamic_recompiler"));
    }
}
