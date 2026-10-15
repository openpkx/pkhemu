#[cfg_attr(target_os = "macos", path = "gl/macos.rs")]
#[cfg_attr(target_os = "android", path = "gl/android.rs")]
#[cfg_attr(target_os = "ios", path = "gl/ios.rs")]
mod platform;

pub use platform::{screen_context, ScreenContext, Window};
use std::cell::Cell;
use std::ffi::{c_char, c_void, CStr};

pub type GLenum = u32;
pub type GLuint = u32;
pub type GLint = i32;
pub type GLsizei = i32;

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
const GL_SYNC_GPU_COMMANDS_COMPLETE: GLenum = 0x9117;
const GL_TIMEOUT_IGNORED: u64 = u64::MAX;
const GL_MAJOR_VERSION: GLenum = 0x821B;
const GL_MINOR_VERSION: GLenum = 0x821C;

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
    fn glFlush();
    fn glFinish();
    fn glFenceSync(condition: GLenum, flags: u32) -> *mut c_void;
    fn glWaitSync(sync: *mut c_void, flags: u32, timeout: u64);
    fn glDeleteSync(sync: *mut c_void);
}

thread_local! {
    static SAMPLED: Cell<*mut c_void> = const { Cell::new(std::ptr::null_mut()) };
    static ASLEEP: Cell<bool> = const { Cell::new(false) };
}

pub fn sleep() {
    ASLEEP.set(true);
}

pub fn wake() {
    ASLEEP.set(false);
}

// iOS kills an app that calls OpenGL in the background. The simulator doesn't, so a debug build fails here instead.
fn check_awake() {
    debug_assert!(!ASLEEP.get(), "the core's OpenGL context was made current while the app is in the background");
}

// The screen samples the core's texture from its own context, so the core waits for that before drawing over it.
pub fn texture_sampled() {
    unsafe {
        let sampled = glFenceSync(GL_SYNC_GPU_COMMANDS_COMPLETE, 0);
        glFlush();
        let earlier = SAMPLED.replace(sampled);
        if !earlier.is_null() {
            glDeleteSync(earlier);
        }
    }
}

unsafe fn integer(name: GLenum) -> GLint {
    let mut value = 0;
    glGetIntegerv(name, &mut value);
    value
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
    context: platform::Context,
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
        check_awake();
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
            Ok(Renderer { framebuffer, color, depth, width: 0, height: 0, rgba: Vec::new(), context })
        }
    }

    pub fn framebuffer(&self) -> u32 {
        self.framebuffer
    }

    pub fn version(&self) -> (u32, u32) {
        unsafe { (integer(GL_MAJOR_VERSION) as u32, integer(GL_MINOR_VERSION) as u32) }
    }

    pub fn size(&self) -> (u32, u32) {
        (self.width, self.height)
    }

    pub fn texture(&self) -> GLuint {
        self.color
    }

    pub fn make_current(&self) {
        check_awake();
        self.context.make_current();
        let sampled = SAMPLED.replace(std::ptr::null_mut());
        if !sampled.is_null() {
            unsafe {
                glWaitSync(sampled, 0, GL_TIMEOUT_IGNORED);
                glDeleteSync(sampled);
            }
        }
    }

    pub fn finish(&self) {
        self.make_current();
        unsafe { glFinish() };
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
        self.make_current();
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

pub fn rgb565(r: u8, g: u8, b: u8) -> u16 {
    ((r as u16 >> 3) << 11) | ((g as u16 >> 2) << 5) | (b as u16 >> 3)
}
