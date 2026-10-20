use ash::vk;
use std::ffi::{c_int, c_void};

const AIMAGE_FORMAT_RGBA_8888: c_int = 1;
const AHARDWAREBUFFER_USAGE_GPU_COLOR_OUTPUT: u64 = 1 << 9;

#[link(name = "mediandk")]
extern "C" {
    fn AImageReader_newWithUsage(
        width: i32,
        height: i32,
        format: i32,
        usage: u64,
        max_images: i32,
        reader: *mut *mut c_void,
    ) -> c_int;
    fn AImageReader_getWindow(reader: *mut c_void, window: *mut *mut c_void) -> c_int;
    fn AImageReader_delete(reader: *mut c_void);
}

pub const EXTENSION: Option<&std::ffi::CStr> = Some(ash::khr::android_surface::NAME);

pub struct Window(*mut c_void);

impl Drop for Window {
    fn drop(&mut self) {
        unsafe { AImageReader_delete(self.0) };
    }
}

// Nothing is ever presented to it: the window only answers the driver's surface queries.
pub unsafe fn create(entry: &ash::Entry, instance: &ash::Instance) -> Option<(vk::SurfaceKHR, Window)> {
    let mut reader = std::ptr::null_mut();
    let usage = AHARDWAREBUFFER_USAGE_GPU_COLOR_OUTPUT;
    if AImageReader_newWithUsage(16, 16, AIMAGE_FORMAT_RGBA_8888, usage, 2, &mut reader) != 0 {
        return None;
    }
    let reader = Window(reader);
    let mut window = std::ptr::null_mut();
    if AImageReader_getWindow(reader.0, &mut window) != 0 {
        return None;
    }
    let info = vk::AndroidSurfaceCreateInfoKHR::default().window(window);
    let surface = ash::khr::android_surface::Instance::new(entry, instance).create_android_surface(&info, None);
    surface.inspect_err(|e| eprintln!("vkCreateAndroidSurfaceKHR: {e}")).ok().map(|surface| (surface, reader))
}
