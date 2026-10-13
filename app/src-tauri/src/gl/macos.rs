use std::ffi::{c_void, CStr};
use std::sync::OnceLock;

const PFA_ACCELERATED: i32 = 73;
const PFA_ALLOW_OFFLINE_RENDERERS: i32 = 96;
const PFA_OPENGL_PROFILE: i32 = 99;
const OGLP_VERSION_3_2_CORE: i32 = 0x3200;

#[link(name = "OpenGL", kind = "framework")]
extern "C" {
    fn CGLChoosePixelFormat(attribs: *const i32, pixel_format: *mut *mut c_void, count: *mut i32) -> i32;
    fn CGLDestroyPixelFormat(pixel_format: *mut c_void) -> i32;
    fn CGLCreateContext(pixel_format: *mut c_void, share: *mut c_void, context: *mut *mut c_void) -> i32;
    fn CGLDestroyContext(context: *mut c_void) -> i32;
    fn CGLSetCurrentContext(context: *mut c_void) -> i32;
}

pub struct Context(*mut c_void);

impl Context {
    // The 3.2 core profile gives the newest one the Mac has, which is 4.1.
    pub fn new() -> Result<Context, String> {
        unsafe {
            let attribs = [PFA_OPENGL_PROFILE, OGLP_VERSION_3_2_CORE, PFA_ACCELERATED, PFA_ALLOW_OFFLINE_RENDERERS, 0];
            let (mut pixel_format, mut count) = (std::ptr::null_mut(), 0);
            let error = CGLChoosePixelFormat(attribs.as_ptr(), &mut pixel_format, &mut count);
            if error != 0 || pixel_format.is_null() {
                return Err(format!("no OpenGL 3.2 core pixel format (CGL error {error})"));
            }
            let mut context = std::ptr::null_mut();
            let error = CGLCreateContext(pixel_format, std::ptr::null_mut(), &mut context);
            CGLDestroyPixelFormat(pixel_format);
            if error != 0 || context.is_null() {
                return Err(format!("creating the OpenGL context failed (CGL error {error})"));
            }
            let error = CGLSetCurrentContext(context);
            if error != 0 {
                CGLDestroyContext(context);
                return Err(format!("making the OpenGL context current failed (CGL error {error})"));
            }
            Ok(Context(context))
        }
    }

    pub fn make_current(&self) {
        unsafe { CGLSetCurrentContext(self.0) };
    }
}

impl Drop for Context {
    fn drop(&mut self) {
        unsafe {
            CGLSetCurrentContext(std::ptr::null_mut());
            CGLDestroyContext(self.0);
        }
    }
}

pub enum Window {}

pub enum ScreenContext {}

pub fn screen_context() -> Option<Result<ScreenContext, String>> {
    None
}

impl ScreenContext {
    pub fn shows(&self, _window: &Window) -> bool {
        match *self {}
    }

    pub fn attach(&mut self, _window: Window) -> Result<(), String> {
        match *self {}
    }

    pub fn detach(&mut self) {
        match *self {}
    }

    pub fn has_window(&self) -> bool {
        match *self {}
    }

    pub fn make_current(&self) -> Result<Option<(i32, i32)>, String> {
        match *self {}
    }

    pub fn swap(&mut self) -> Result<(), String> {
        match *self {}
    }
}

pub fn proc_address(name: &CStr) -> *const c_void {
    static OPENGL: OnceLock<usize> = OnceLock::new();
    let library = *OPENGL.get_or_init(|| unsafe {
        libc::dlopen(c"/System/Library/Frameworks/OpenGL.framework/OpenGL".as_ptr(), libc::RTLD_LAZY) as usize
    });
    unsafe { libc::dlsym(library as *mut c_void, name.as_ptr()) }
}
