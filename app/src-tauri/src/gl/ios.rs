use super::{GLenum, GLint, GLuint, GL_COLOR_ATTACHMENT0, GL_FRAMEBUFFER, GL_FRAMEBUFFER_COMPLETE, GL_RENDERBUFFER};
use objc2::rc::{Allocated, Retained};
use objc2::runtime::AnyObject;
use objc2::{class, msg_send};
use std::cell::RefCell;
use std::ffi::{c_void, CStr};
use std::sync::OnceLock;

const EAGL_RENDERING_API_OPENGLES3: usize = 3;
const GL_RENDERBUFFER_WIDTH: GLenum = 0x8D42;
const GL_RENDERBUFFER_HEIGHT: GLenum = 0x8D43;

#[link(name = "OpenGLES", kind = "framework")]
extern "C" {
    fn glGetRenderbufferParameteriv(target: GLenum, name: GLenum, value: *mut GLint);
}

thread_local! {
    // The screen's sharegroup. The core's contexts join it, so the screen draws their frames.
    static SHAREGROUP: RefCell<Option<Retained<AnyObject>>> = const { RefCell::new(None) };
}

// One report has App Review's devices answering nil, which has to show as an unsupported device rather than crash.
fn new_context(sharegroup: Option<&AnyObject>) -> Result<Retained<AnyObject>, String> {
    let context: Option<Retained<AnyObject>> = unsafe {
        let allocated: Allocated<AnyObject> = msg_send![class!(EAGLContext), alloc];
        msg_send![allocated, initWithAPI: EAGL_RENDERING_API_OPENGLES3, sharegroup: sharegroup]
    };
    context.ok_or_else(|| "creating an OpenGL ES 3 context failed".into())
}

pub struct Context(Retained<AnyObject>);

impl Context {
    pub fn new() -> Result<Context, String> {
        let context = SHAREGROUP.with_borrow(|sharegroup| new_context(sharegroup.as_deref()))?;
        set_current(Some(&context))?;
        Ok(Context(context))
    }

    pub fn make_current(&self) {
        let _ = set_current(Some(&self.0));
    }
}

// Leaves no context current, like dropping any context does.
impl Drop for Context {
    fn drop(&mut self) {
        let _ = set_current(None);
    }
}

// The screen draws OpenGL on the layer and Vulkan on the Metal layer above it.
#[derive(Clone)]
pub struct Window {
    layer: Retained<AnyObject>,
    metal: Retained<AnyObject>,
    size: (i32, i32),
}

// Core Animation's layers can be drawn on from any thread.
unsafe impl Send for Window {}

impl Window {
    pub unsafe fn from_layers(layer: *mut c_void, metal: *mut c_void, width: i32, height: i32) -> Option<Window> {
        let layer = Retained::retain(layer.cast::<AnyObject>())?;
        let metal = Retained::retain(metal.cast::<AnyObject>())?;
        Some(Window { layer, metal, size: (width, height) })
    }

    pub fn metal(&self) -> &AnyObject {
        &self.metal
    }

    pub fn size(&self) -> (i32, i32) {
        self.size
    }
}

struct Shown {
    window: Window,
    renderbuffer: GLuint,
    drawable: (i32, i32),
}

// There's no default framebuffer on iOS, so the screen draws into one whose colour is the layer's storage.
pub struct ScreenContext {
    context: Retained<AnyObject>,
    framebuffer: GLuint,
    shown: Option<Shown>,
}

pub fn screen_context() -> Option<Result<ScreenContext, String>> {
    Some(ScreenContext::new())
}

fn set_current(context: Option<&AnyObject>) -> Result<(), String> {
    let made: bool = unsafe { msg_send![class!(EAGLContext), setCurrentContext: context] };
    made.then_some(()).ok_or_else(|| "making the OpenGL ES context current failed".into())
}

impl ScreenContext {
    fn new() -> Result<ScreenContext, String> {
        let context = new_context(None)?;
        set_current(Some(&context))?;
        let mut framebuffer = 0;
        unsafe { super::glGenFramebuffers(1, &mut framebuffer) };
        SHAREGROUP.set(unsafe { msg_send![&*context, sharegroup] });
        Ok(ScreenContext { context, framebuffer, shown: None })
    }

    pub fn has_window(&self) -> bool {
        self.shown.is_some()
    }

    pub fn shows(&self, window: &Window) -> bool {
        self.shown
            .as_ref()
            .is_some_and(|shown| std::ptr::eq(&*shown.window.layer, &*window.layer) && shown.window.size == window.size)
    }

    pub fn attach(&mut self, window: Window) -> Result<(), String> {
        self.detach();
        set_current(Some(&self.context))?;
        unsafe {
            let mut renderbuffer = 0;
            super::glGenRenderbuffers(1, &mut renderbuffer);
            super::glBindRenderbuffer(GL_RENDERBUFFER, renderbuffer);
            let stored: bool =
                msg_send![&*self.context, renderbufferStorage: GL_RENDERBUFFER as usize, fromDrawable: &*window.layer];
            if !stored {
                super::glDeleteRenderbuffers(1, &renderbuffer);
                return Err("giving the game screen's layer storage failed".into());
            }
            let (mut width, mut height) = (0, 0);
            glGetRenderbufferParameteriv(GL_RENDERBUFFER, GL_RENDERBUFFER_WIDTH, &mut width);
            glGetRenderbufferParameteriv(GL_RENDERBUFFER, GL_RENDERBUFFER_HEIGHT, &mut height);
            super::glBindFramebuffer(GL_FRAMEBUFFER, self.framebuffer);
            super::glFramebufferRenderbuffer(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0, GL_RENDERBUFFER, renderbuffer);
            let status = super::glCheckFramebufferStatus(GL_FRAMEBUFFER);
            self.shown = Some(Shown { window, renderbuffer, drawable: (width, height) });
            if status != GL_FRAMEBUFFER_COMPLETE {
                self.detach();
                return Err(format!("the game screen's {width}×{height} framebuffer is incomplete ({status:#x})"));
            }
        }
        Ok(())
    }

    // Finishes drawing, since iOS kills an app whose OpenGL commands run in the background.
    pub fn detach(&mut self) {
        let Some(shown) = self.shown.take() else { return };
        let _ = set_current(Some(&self.context));
        unsafe {
            super::glBindFramebuffer(GL_FRAMEBUFFER, self.framebuffer);
            super::glFramebufferRenderbuffer(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0, GL_RENDERBUFFER, 0);
            super::glDeleteRenderbuffers(1, &shown.renderbuffer);
            super::glFinish();
        }
    }

    pub fn make_current(&self) -> Result<Option<(i32, i32)>, String> {
        set_current(Some(&self.context))?;
        let Some(shown) = &self.shown else { return Ok(None) };
        unsafe { super::glBindFramebuffer(GL_FRAMEBUFFER, self.framebuffer) };
        Ok(Some(shown.drawable))
    }

    pub fn swap(&mut self) -> Result<(), String> {
        let Some(shown) = &self.shown else { return Ok(()) };
        unsafe {
            super::glBindRenderbuffer(GL_RENDERBUFFER, shown.renderbuffer);
            let presented: bool = msg_send![&*self.context, presentRenderbuffer: GL_RENDERBUFFER as usize];
            if !presented {
                return Err("showing a frame failed".into());
            }
        }
        Ok(())
    }
}

impl Drop for ScreenContext {
    fn drop(&mut self) {
        self.detach();
        SHAREGROUP.set(None);
        let _ = set_current(Some(&self.context));
        unsafe { super::glDeleteFramebuffers(1, &self.framebuffer) };
        let _ = set_current(None);
    }
}

pub fn proc_address(name: &CStr) -> *const c_void {
    static OPENGLES: OnceLock<usize> = OnceLock::new();
    let library = *OPENGLES.get_or_init(|| unsafe {
        libc::dlopen(c"/System/Library/Frameworks/OpenGLES.framework/OpenGLES".as_ptr(), libc::RTLD_LAZY) as usize
    });
    unsafe { libc::dlsym(library as *mut c_void, name.as_ptr()) }
}
