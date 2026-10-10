use std::ffi::{c_char, c_void, CStr};

type GLenum = u32;
type GLuint = u32;
type GLint = i32;
type GLsizei = i32;

const GL_FRAMEBUFFER: GLenum = 0x8D40;
const GL_READ_FRAMEBUFFER: GLenum = 0x8CA8;
const GL_READ_FRAMEBUFFER_BINDING: GLenum = 0x8CAA;
const GL_DRAW_FRAMEBUFFER_BINDING: GLenum = 0x8CA6;
const GL_FRAMEBUFFER_COMPLETE: GLenum = 0x8CD5;
const GL_RENDERBUFFER: GLenum = 0x8D41;
const GL_RENDERBUFFER_BINDING: GLenum = 0x8CA7;
const GL_TEXTURE_2D: GLenum = 0x0DE1;
const GL_TEXTURE_BINDING_2D: GLenum = 0x8069;
const GL_TEXTURE_MIN_FILTER: GLenum = 0x2801;
const GL_TEXTURE_MAG_FILTER: GLenum = 0x2800;
const GL_NEAREST: GLint = 0x2600;
const GL_PIXEL_PACK_BUFFER: GLenum = 0x88EB;
const GL_PIXEL_PACK_BUFFER_BINDING: GLenum = 0x88ED;
const GL_PACK_ALIGNMENT: GLenum = 0x0D05;
const GL_RGBA: GLenum = 0x1908;
const GL_RGBA8: GLenum = 0x8058;
const GL_UNSIGNED_BYTE: GLenum = 0x1401;
const GL_COLOR_ATTACHMENT0: GLenum = 0x8CE0;
const GL_DEPTH_ATTACHMENT: GLenum = 0x8D00;
const GL_DEPTH_STENCIL_ATTACHMENT: GLenum = 0x821A;
const GL_DEPTH_COMPONENT24: GLenum = 0x81A6;
const GL_DEPTH24_STENCIL8: GLenum = 0x88F0;

#[cfg_attr(target_os = "macos", link(name = "OpenGL", kind = "framework"))]
#[cfg_attr(target_os = "android", link(name = "GLESv3"))]
extern "C" {
    fn glGetIntegerv(name: GLenum, data: *mut GLint);
    fn glGenFramebuffers(n: GLsizei, ids: *mut GLuint);
    fn glDeleteFramebuffers(n: GLsizei, ids: *const GLuint);
    fn glBindFramebuffer(target: GLenum, id: GLuint);
    fn glFramebufferTexture2D(target: GLenum, attachment: GLenum, textarget: GLenum, texture: GLuint, level: GLint);
    fn glFramebufferRenderbuffer(target: GLenum, attachment: GLenum, rbtarget: GLenum, rb: GLuint);
    fn glCheckFramebufferStatus(target: GLenum) -> GLenum;
    fn glGenTextures(n: GLsizei, ids: *mut GLuint);
    fn glDeleteTextures(n: GLsizei, ids: *const GLuint);
    fn glBindTexture(target: GLenum, id: GLuint);
    fn glTexParameteri(target: GLenum, name: GLenum, value: GLint);
    fn glTexImage2D(
        target: GLenum,
        level: GLint,
        internal: GLint,
        width: GLsizei,
        height: GLsizei,
        border: GLint,
        format: GLenum,
        kind: GLenum,
        data: *const c_void,
    );
    fn glGenRenderbuffers(n: GLsizei, ids: *mut GLuint);
    fn glDeleteRenderbuffers(n: GLsizei, ids: *const GLuint);
    fn glBindRenderbuffer(target: GLenum, id: GLuint);
    fn glRenderbufferStorage(target: GLenum, format: GLenum, width: GLsizei, height: GLsizei);
    fn glBindBuffer(target: GLenum, id: GLuint);
    fn glPixelStorei(name: GLenum, value: GLint);
    fn glReadPixels(x: GLint, y: GLint, w: GLsizei, h: GLsizei, format: GLenum, kind: GLenum, data: *mut c_void);
}

unsafe fn integer(name: GLenum) -> GLint {
    let mut value = 0;
    glGetIntegerv(name, &mut value);
    value
}

#[cfg(target_os = "macos")]
mod platform {
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
                let attribs =
                    [PFA_OPENGL_PROFILE, OGLP_VERSION_3_2_CORE, PFA_ACCELERATED, PFA_ALLOW_OFFLINE_RENDERERS, 0];
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
    }

    impl Drop for Context {
        fn drop(&mut self) {
            unsafe {
                CGLSetCurrentContext(std::ptr::null_mut());
                CGLDestroyContext(self.0);
            }
        }
    }

    pub fn proc_address(name: &CStr) -> *const c_void {
        static OPENGL: OnceLock<usize> = OnceLock::new();
        let library = *OPENGL.get_or_init(|| unsafe {
            libc::dlopen(c"/System/Library/Frameworks/OpenGL.framework/OpenGL".as_ptr(), libc::RTLD_LAZY) as usize
        });
        unsafe { libc::dlsym(library as *mut c_void, name.as_ptr()) }
    }
}

#[cfg(target_os = "android")]
mod platform {
    use std::ffi::{c_char, c_void, CStr};
    use std::sync::OnceLock;

    const EGL_NONE: i32 = 0x3038;
    const EGL_RENDERABLE_TYPE: i32 = 0x3040;
    const EGL_OPENGL_ES3_BIT: i32 = 0x0040;
    const EGL_SURFACE_TYPE: i32 = 0x3033;
    const EGL_PBUFFER_BIT: i32 = 0x0001;
    const EGL_RED_SIZE: i32 = 0x3024;
    const EGL_GREEN_SIZE: i32 = 0x3023;
    const EGL_BLUE_SIZE: i32 = 0x3022;
    const EGL_WIDTH: i32 = 0x3057;
    const EGL_HEIGHT: i32 = 0x3056;
    const EGL_CONTEXT_CLIENT_VERSION: i32 = 0x3098;
    const EGL_OPENGL_ES_API: u32 = 0x30A0;

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
        fn eglMakeCurrent(display: *mut c_void, draw: *mut c_void, read: *mut c_void, context: *mut c_void) -> u32;
        fn eglDestroySurface(display: *mut c_void, surface: *mut c_void) -> u32;
        fn eglDestroyContext(display: *mut c_void, context: *mut c_void) -> u32;
        fn eglGetError() -> i32;
        fn eglGetProcAddress(name: *const c_char) -> *const c_void;
    }

    pub struct Context {
        display: *mut c_void,
        surface: *mut c_void,
        context: *mut c_void,
    }

    impl Context {
        pub fn new() -> Result<Context, String> {
            let failed = |what: &str| format!("{what} failed (EGL error {:#x})", unsafe { eglGetError() });
            unsafe {
                let display = eglGetDisplay(std::ptr::null_mut());
                if display.is_null() || eglInitialize(display, std::ptr::null_mut(), std::ptr::null_mut()) == 0 {
                    return Err(failed("initialising EGL"));
                }
                let attribs = [
                    EGL_RENDERABLE_TYPE,
                    EGL_OPENGL_ES3_BIT,
                    EGL_SURFACE_TYPE,
                    EGL_PBUFFER_BIT,
                    EGL_RED_SIZE,
                    8,
                    EGL_GREEN_SIZE,
                    8,
                    EGL_BLUE_SIZE,
                    8,
                    EGL_NONE,
                ];
                let (mut config, mut count) = (std::ptr::null_mut(), 0);
                if eglChooseConfig(display, attribs.as_ptr(), &mut config, 1, &mut count) == 0 || count == 0 {
                    return Err("the device has no OpenGL ES 3 config".into());
                }
                eglBindAPI(EGL_OPENGL_ES_API);
                let version = [EGL_CONTEXT_CLIENT_VERSION, 3, EGL_NONE];
                let context = eglCreateContext(display, config, std::ptr::null_mut(), version.as_ptr());
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
                let created = Context { display, surface, context };
                if eglMakeCurrent(display, surface, surface, context) == 0 {
                    return Err(failed("making the context current"));
                }
                Ok(created)
            }
        }
    }

    // The display stays initialised, since the WebView draws through it in the same process.
    impl Drop for Context {
        fn drop(&mut self) {
            let none = std::ptr::null_mut();
            unsafe {
                eglMakeCurrent(self.display, none, none, none);
                eglDestroySurface(self.display, self.surface);
                eglDestroyContext(self.display, self.context);
            }
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
}

pub unsafe extern "C" fn proc_address(name: *const c_char) -> *const c_void {
    platform::proc_address(CStr::from_ptr(name))
}

pub struct Renderer {
    framebuffer: GLuint,
    color: GLuint,
    depth: Option<(GLuint, GLenum)>,
    width: u32,
    height: u32,
    rgba: Vec<u8>,
    _context: platform::Context,
}

struct Bindings {
    read: GLint,
    draw: GLint,
    texture: GLint,
    renderbuffer: GLint,
    pack_buffer: GLint,
    pack_alignment: GLint,
}

impl Bindings {
    unsafe fn save() -> Bindings {
        Bindings {
            read: integer(GL_READ_FRAMEBUFFER_BINDING),
            draw: integer(GL_DRAW_FRAMEBUFFER_BINDING),
            texture: integer(GL_TEXTURE_BINDING_2D),
            renderbuffer: integer(GL_RENDERBUFFER_BINDING),
            pack_buffer: integer(GL_PIXEL_PACK_BUFFER_BINDING),
            pack_alignment: integer(GL_PACK_ALIGNMENT),
        }
    }
}

// The core caches GL state, so anything bound behind its back has to go back as it was.
impl Drop for Bindings {
    fn drop(&mut self) {
        let Bindings { read, draw, texture, renderbuffer, pack_buffer, pack_alignment } = self;
        unsafe {
            glBindFramebuffer(GL_FRAMEBUFFER, *draw as GLuint);
            glBindFramebuffer(GL_READ_FRAMEBUFFER, *read as GLuint);
            glBindTexture(GL_TEXTURE_2D, *texture as GLuint);
            glBindRenderbuffer(GL_RENDERBUFFER, *renderbuffer as GLuint);
            glBindBuffer(GL_PIXEL_PACK_BUFFER, *pack_buffer as GLuint);
            glPixelStorei(GL_PACK_ALIGNMENT, *pack_alignment);
        }
    }
}

impl Renderer {
    pub fn new(depth: bool, stencil: bool) -> Result<Renderer, String> {
        let context = platform::Context::new()?;
        unsafe {
            let _bindings = Bindings::save();
            let (mut framebuffer, mut color) = (0, 0);
            glGenFramebuffers(1, &mut framebuffer);
            glGenTextures(1, &mut color);
            glBindTexture(GL_TEXTURE_2D, color);
            glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_NEAREST);
            glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_NEAREST);
            glBindFramebuffer(GL_FRAMEBUFFER, framebuffer);
            glFramebufferTexture2D(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0, GL_TEXTURE_2D, color, 0);
            let depth = (depth || stencil).then(|| {
                let mut renderbuffer = 0;
                glGenRenderbuffers(1, &mut renderbuffer);
                let (format, attachment) = if stencil {
                    (GL_DEPTH24_STENCIL8, GL_DEPTH_STENCIL_ATTACHMENT)
                } else {
                    (GL_DEPTH_COMPONENT24, GL_DEPTH_ATTACHMENT)
                };
                glBindRenderbuffer(GL_RENDERBUFFER, renderbuffer);
                glFramebufferRenderbuffer(GL_FRAMEBUFFER, attachment, GL_RENDERBUFFER, renderbuffer);
                (renderbuffer, format)
            });
            Ok(Renderer { framebuffer, color, depth, width: 0, height: 0, rgba: Vec::new(), _context: context })
        }
    }

    pub fn framebuffer(&self) -> u32 {
        self.framebuffer
    }

    #[cfg(test)]
    pub fn size(&self) -> (u32, u32) {
        (self.width, self.height)
    }

    // Keeps the framebuffer's name, since the core only asks for it once.
    pub fn resize(&mut self, width: u32, height: u32) -> Result<(), String> {
        if (width, height) == (self.width, self.height) {
            return Ok(());
        }
        (self.width, self.height) = (width, height);
        let (w, h) = (width as GLsizei, height as GLsizei);
        unsafe {
            let _bindings = Bindings::save();
            glBindTexture(GL_TEXTURE_2D, self.color);
            glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA8 as GLint, w, h, 0, GL_RGBA, GL_UNSIGNED_BYTE, std::ptr::null());
            if let Some((renderbuffer, format)) = self.depth {
                glBindRenderbuffer(GL_RENDERBUFFER, renderbuffer);
                glRenderbufferStorage(GL_RENDERBUFFER, format, w, h);
            }
            glBindFramebuffer(GL_FRAMEBUFFER, self.framebuffer);
            match glCheckFramebufferStatus(GL_FRAMEBUFFER) {
                GL_FRAMEBUFFER_COMPLETE => Ok(()),
                status => Err(format!("the {width}×{height} framebuffer is incomplete ({status:#x})")),
            }
        }
    }

    pub fn read(&mut self, width: u32, height: u32, bottom_left: bool, out: &mut Vec<u16>) -> (u32, u32) {
        let (width, height) = (width.min(self.width), height.min(self.height));
        let (w, h) = (width as usize, height as usize);
        self.rgba.resize(w * h * 4, 0);
        unsafe {
            let _bindings = Bindings::save();
            glBindFramebuffer(GL_READ_FRAMEBUFFER, self.framebuffer);
            glBindBuffer(GL_PIXEL_PACK_BUFFER, 0);
            glPixelStorei(GL_PACK_ALIGNMENT, 4);
            let pixels = self.rgba.as_mut_ptr() as *mut c_void;
            glReadPixels(0, 0, w as GLsizei, h as GLsizei, GL_RGBA, GL_UNSIGNED_BYTE, pixels);
        }
        out.clear();
        out.reserve(w * h);
        for y in 0..h {
            let row = if bottom_left { h - 1 - y } else { y };
            out.extend(self.rgba[row * w * 4..(row + 1) * w * 4].chunks_exact(4).map(|p| rgb565(p[0], p[1], p[2])));
        }
        (width, height)
    }
}

impl Drop for Renderer {
    fn drop(&mut self) {
        unsafe {
            glDeleteFramebuffers(1, &self.framebuffer);
            glDeleteTextures(1, &self.color);
            if let Some((renderbuffer, _)) = self.depth {
                glDeleteRenderbuffers(1, &renderbuffer);
            }
        }
    }
}

fn rgb565(r: u8, g: u8, b: u8) -> u16 {
    ((r as u16 >> 3) << 11) | ((g as u16 >> 2) << 5) | (b as u16 >> 3)
}
