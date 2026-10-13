use super::HwRenderCallback;
use std::ffi::CStr;
use std::path::PathBuf;

// App Store apps can't map memory writable and executable.
pub const N64_CPU: &CStr = c"cached_interpreter";
pub const MELONDS_JIT: &CStr = c"disabled";

pub fn core_path(name: &str, _built: Option<&str>) -> Option<PathBuf> {
    let exe = std::env::current_exe().ok()?;
    let bundled = exe.parent()?.join("Frameworks").join(format!("{name}.framework")).join(name);
    bundled.is_file().then_some(bundled)
}

// There's no OpenGL context on iOS yet, so cores that ask for one report the device as unsupported.
pub fn supports(_hw: &HwRenderCallback) -> bool {
    false
}
