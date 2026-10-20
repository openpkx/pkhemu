use ash::vk;

pub const EXTENSION: Option<&std::ffi::CStr> = None;

pub struct Window;

pub unsafe fn create(_: &ash::Entry, _: &ash::Instance) -> Option<(vk::SurfaceKHR, Window)> {
    None
}
