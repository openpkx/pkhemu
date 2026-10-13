use super::{HwRenderCallback, HW_CONTEXT_OPENGL_CORE};
use std::ffi::CStr;
use std::path::PathBuf;

// Apple Silicon refuses the memory the arm64 dynarec maps writable and executable.
pub const N64_CPU: &CStr = c"cached_interpreter";
pub const MELONDS_JIT: &CStr = c"enabled";

pub fn core_path(name: &str, built: Option<&str>) -> Option<PathBuf> {
    let exe = std::env::current_exe().ok()?;
    let bundled = exe.parent().map(|dir| dir.join("../Frameworks").join(format!("{name}.dylib")));
    bundled.into_iter().chain(built.map(PathBuf::from)).find(|path| path.is_file())
}

// The Mac's core profile stops at 4.1.
pub fn supports(hw: &HwRenderCallback) -> bool {
    hw.context_type == HW_CONTEXT_OPENGL_CORE && ((3, 3)..=(4, 1)).contains(&(hw.version_major, hw.version_minor))
}

#[cfg(test)]
pub const OWN_CONTEXT: (std::ffi::c_uint, std::ffi::c_uint, std::ffi::c_uint) = (HW_CONTEXT_OPENGL_CORE, 3, 3);

#[cfg(test)]
mod tests {
    use crate::retro::tests::option;

    #[test]
    fn runs_n64_games_on_the_cached_interpreter() {
        assert_eq!(option(c"mupen64plus-cpucore").as_deref(), Some("cached_interpreter"));
    }
}
