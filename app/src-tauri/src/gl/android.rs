use std::cell::Cell;
use std::ffi::{c_char, c_void, CStr};
use std::sync::OnceLock;

const EGL_NONE: i32 = 0x3038;
const EGL_RENDERABLE_TYPE: i32 = 0x3040;
const EGL_OPENGL_ES3_BIT: i32 = 0x0040;
const EGL_SURFACE_TYPE: i32 = 0x3033;
const EGL_PBUFFER_BIT: i32 = 0x0001;
const EGL_WINDOW_BIT: i32 = 0x0004;
const EGL_RED_SIZE: i32 = 0x3024;
const EGL_GREEN_SIZE: i32 = 0x3023;
const EGL_BLUE_SIZE: i32 = 0x3022;
const EGL_WIDTH: i32 = 0x3057;
const EGL_HEIGHT: i32 = 0x3056;
const EGL_CONTEXT_CLIENT_VERSION: i32 = 0x3098;
const EGL_OPENGL_ES_API: u32 = 0x30A0;
const EGL_BAD_NATIVE_WINDOW: i32 = 0x300B;
const EGL_BAD_SURFACE: i32 = 0x300D;

// Links the GL functions gl.rs declares.
#[link(name = "GLESv3")]
extern "C" {}

#[link(name = "EGL")]
extern "C" {
    fn eglGetDisplay(display: *mut c_void) -> *mut c_void;
    fn eglInitialize(display: *mut c_void, major: *mut i32, minor: *mut i32) -> u32;
    fn eglBindAPI(api: u32) -> u32;
    fn eglChooseConfig(
        display: *mut c_void,
        attribs: *const i32,
        configs: *mut *mut c_void,
        size: i32,
        count: *mut i32,
    ) -> u32;
    fn eglCreateContext(
        display: *mut c_void,
        config: *mut c_void,
        share: *mut c_void,
        attribs: *const i32,
    ) -> *mut c_void;
    fn eglCreatePbufferSurface(display: *mut c_void, config: *mut c_void, attribs: *const i32) -> *mut c_void;
    fn eglCreateWindowSurface(
        display: *mut c_void,
        config: *mut c_void,
        window: *mut c_void,
        attribs: *const i32,
    ) -> *mut c_void;
    fn eglQuerySurface(display: *mut c_void, surface: *mut c_void, attribute: i32, value: *mut i32) -> u32;
    fn eglSwapBuffers(display: *mut c_void, surface: *mut c_void) -> u32;
    fn eglMakeCurrent(display: *mut c_void, draw: *mut c_void, read: *mut c_void, context: *mut c_void) -> u32;
    fn eglDestroySurface(display: *mut c_void, surface: *mut c_void) -> u32;
    fn eglDestroyContext(display: *mut c_void, context: *mut c_void) -> u32;
    fn eglGetError() -> i32;
    fn eglGetProcAddress(name: *const c_char) -> *const c_void;
}

#[link(name = "android")]
extern "C" {
    fn ANativeWindow_fromSurface(env: *mut c_void, surface: *mut c_void) -> *mut c_void;
    fn ANativeWindow_release(window: *mut c_void);
}

thread_local! {
    // The screen's context and config. The core's contexts share its textures, so the screen draws their frames.
    static SCREEN: Cell<Option<(*mut c_void, *mut c_void)>> = const { Cell::new(None) };
    static CURRENT: Cell<(*mut c_void, *mut c_void)> = const { Cell::new((std::ptr::null_mut(), std::ptr::null_mut())) };
}

fn failed(what: &str) -> String {
    format!("{what} failed (EGL error {:#x})", unsafe { eglGetError() })
}

fn display() -> Result<*mut c_void, String> {
    unsafe {
        let display = eglGetDisplay(std::ptr::null_mut());
        if display.is_null() || eglInitialize(display, std::ptr::null_mut(), std::ptr::null_mut()) == 0 {
            return Err(failed("initialising EGL"));
        }
        Ok(display)
    }
}

fn config(display: *mut c_void, surfaces: i32) -> Result<*mut c_void, String> {
    let attribs = [
        EGL_RENDERABLE_TYPE,
        EGL_OPENGL_ES3_BIT,
        EGL_SURFACE_TYPE,
        surfaces,
        EGL_RED_SIZE,
        8,
        EGL_GREEN_SIZE,
        8,
        EGL_BLUE_SIZE,
        8,
        EGL_NONE,
    ];
    let (mut config, mut count) = (std::ptr::null_mut(), 0);
    if unsafe { eglChooseConfig(display, attribs.as_ptr(), &mut config, 1, &mut count) } == 0 || count == 0 {
        return Err("the device has no OpenGL ES 3 config".into());
    }
    Ok(config)
}

// Returns the context and its pbuffer, current.
fn context(
    display: *mut c_void,
    config: *mut c_void,
    share: *mut c_void,
) -> Result<(*mut c_void, *mut c_void), String> {
    unsafe {
        eglBindAPI(EGL_OPENGL_ES_API);
        let version = [EGL_CONTEXT_CLIENT_VERSION, 3, EGL_NONE];
        let context = eglCreateContext(display, config, share, version.as_ptr());
        if context.is_null() {
            return Err(failed("creating an OpenGL ES 3 context"));
        }
        let size = [EGL_WIDTH, 1, EGL_HEIGHT, 1, EGL_NONE];
        let surface = eglCreatePbufferSurface(display, config, size.as_ptr());
        if surface.is_null() {
            let error = failed("creating a pbuffer");
            eglDestroyContext(display, context);
            return Err(error);
        }
        if !make_current(display, surface, context) {
            let error = failed("making the context current");
            destroy(display, surface, context);
            return Err(error);
        }
        Ok((context, surface))
    }
}

fn make_current(display: *mut c_void, surface: *mut c_void, context: *mut c_void) -> bool {
    if CURRENT.get() == (context, surface) {
        return true;
    }
    let made = unsafe { eglMakeCurrent(display, surface, surface, context) } != 0;
    CURRENT.set(if made { (context, surface) } else { (std::ptr::null_mut(), std::ptr::null_mut()) });
    made
}

// Leaves no context current, like dropping any context does.
fn destroy(display: *mut c_void, surface: *mut c_void, context: *mut c_void) {
    let none = std::ptr::null_mut();
    unsafe {
        eglMakeCurrent(display, none, none, none);
        CURRENT.set((none, none));
        eglDestroySurface(display, surface);
        eglDestroyContext(display, context);
    }
}

pub struct Context {
    display: *mut c_void,
    surface: *mut c_void,
    context: *mut c_void,
}

impl Context {
    pub fn new() -> Result<Context, String> {
        let display = display()?;
        let (config, share) = match SCREEN.get() {
            Some((context, config)) => (config, context),
            None => (config(display, EGL_PBUFFER_BIT)?, std::ptr::null_mut()),
        };
        let (context, surface) = context(display, config, share)?;
        Ok(Context { display, surface, context })
    }

    pub fn make_current(&self) {
        make_current(self.display, self.surface, self.context);
    }
}

// The display stays initialised, since the WebView draws through it in the same process.
impl Drop for Context {
    fn drop(&mut self) {
        destroy(self.display, self.surface, self.context);
    }
}

pub struct Window(*mut c_void);

// An ANativeWindow is reference counted and safe to use from any thread.
unsafe impl Send for Window {}

impl Window {
    pub unsafe fn from_surface(env: *mut c_void, surface: *mut c_void) -> Option<Window> {
        let window = ANativeWindow_fromSurface(env, surface);
        (!window.is_null()).then_some(Window(window))
    }
}

impl Drop for Window {
    fn drop(&mut self) {
        unsafe { ANativeWindow_release(self.0) };
    }
}

pub struct ScreenContext {
    display: *mut c_void,
    config: *mut c_void,
    context: *mut c_void,
    pbuffer: *mut c_void,
    window: Option<(Window, *mut c_void)>,
}

pub fn screen_context() -> Option<Result<ScreenContext, String>> {
    Some(ScreenContext::new())
}

impl ScreenContext {
    fn new() -> Result<ScreenContext, String> {
        let display = display()?;
        let config = config(display, EGL_WINDOW_BIT | EGL_PBUFFER_BIT)?;
        let (context, pbuffer) = context(display, config, std::ptr::null_mut())?;
        SCREEN.set(Some((context, config)));
        Ok(ScreenContext { display, config, context, pbuffer, window: None })
    }

    pub fn has_window(&self) -> bool {
        self.window.is_some()
    }

    pub fn shows(&self, window: &Window) -> bool {
        self.window.as_ref().is_some_and(|(shown, _)| shown.0 == window.0)
    }

    pub fn attach(&mut self, window: Window) -> Result<(), String> {
        self.detach();
        let surface = unsafe { eglCreateWindowSurface(self.display, self.config, window.0, [EGL_NONE].as_ptr()) };
        if surface.is_null() {
            return Err(failed("creating the window surface"));
        }
        self.window = Some((window, surface));
        Ok(())
    }

    pub fn detach(&mut self) {
        let Some((_window, surface)) = self.window.take() else { return };
        make_current(self.display, self.pbuffer, self.context);
        unsafe { eglDestroySurface(self.display, surface) };
    }

    // Answers the window's size, or nothing when the context is current on its pbuffer for want of a window.
    pub fn make_current(&self) -> Result<Option<(i32, i32)>, String> {
        let Some((_, surface)) = self.window else {
            make_current(self.display, self.pbuffer, self.context);
            return Ok(None);
        };
        if !make_current(self.display, surface, self.context) {
            return Err(failed("drawing on the window"));
        }
        let (mut width, mut height) = (0, 0);
        unsafe {
            eglQuerySurface(self.display, surface, EGL_WIDTH, &mut width);
            eglQuerySurface(self.display, surface, EGL_HEIGHT, &mut height);
        }
        Ok(Some((width, height)))
    }

    // A window lost under the screen just waits for the next one.
    pub fn swap(&mut self) -> Result<(), String> {
        let Some((_, surface)) = self.window else { return Ok(()) };
        if unsafe { eglSwapBuffers(self.display, surface) } != 0 {
            return Ok(());
        }
        match unsafe { eglGetError() } {
            EGL_BAD_SURFACE | EGL_BAD_NATIVE_WINDOW => {
                self.detach();
                Ok(())
            }
            error => Err(format!("showing a frame failed (EGL error {error:#x})")),
        }
    }
}

impl Drop for ScreenContext {
    fn drop(&mut self) {
        self.detach();
        SCREEN.set(None);
        destroy(self.display, self.pbuffer, self.context);
    }
}

// Before EGL_KHR_get_all_proc_addresses, eglGetProcAddress only finds extensions.
pub fn proc_address(name: &CStr) -> *const c_void {
    let found = unsafe { eglGetProcAddress(name.as_ptr()) };
    if !found.is_null() {
        return found;
    }
    static GLES: OnceLock<usize> = OnceLock::new();
    let library = *GLES.get_or_init(|| unsafe { libc::dlopen(c"libGLESv3.so".as_ptr(), libc::RTLD_LAZY) as usize });
    unsafe { libc::dlsym(library as *mut c_void, name.as_ptr()) }
}
