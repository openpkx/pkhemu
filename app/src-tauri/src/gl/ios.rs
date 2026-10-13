use super::{GLenum, GLint, GLuint, GL_COLOR_ATTACHMENT0, GL_FRAMEBUFFER, GL_FRAMEBUFFER_COMPLETE, GL_RENDERBUFFER};
use objc2::rc::{Allocated, Retained};
use objc2::runtime::AnyObject;
use objc2::{class, msg_send};
use std::ffi::{c_void, CStr};

const EAGL_RENDERING_API_OPENGLES3: usize = 3;
const GL_RENDERBUFFER_WIDTH: GLenum = 0x8D42;
const GL_RENDERBUFFER_HEIGHT: GLenum = 0x8D43;

#[link(name = "OpenGLES", kind = "framework")]
extern "C" {
    fn glGetRenderbufferParameteriv(target: GLenum, name: GLenum, value: *mut GLint);
    fn glFinish();
}

pub struct Context;

impl Context {
    pub fn new() -> Result<Context, String> {
        Err("OpenGL isn't available to cores on iOS yet".into())
    }

    pub fn make_current(&self) {}
}

pub struct Window {
    layer: Retained<AnyObject>,
    size: (i32, i32),
}

// Core Animation's layers can be drawn on from any thread.
unsafe impl Send for Window {}

impl Window {
    pub unsafe fn from_layer(layer: *mut c_void, width: i32, height: i32) -> Option<Window> {
        let layer = Retained::retain(layer.cast::<AnyObject>())?;
        Some(Window { layer, size: (width, height) })
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
        let context: Option<Retained<AnyObject>> = unsafe {
            let allocated: Allocated<AnyObject> = msg_send![class!(EAGLContext), alloc];
            msg_send![allocated, initWithAPI: EAGL_RENDERING_API_OPENGLES3]
        };
        let context = context.ok_or("creating an OpenGL ES 3 context failed")?;
        set_current(Some(&context))?;
        let mut framebuffer = 0;
        unsafe { super::glGenFramebuffers(1, &mut framebuffer) };
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
            glFinish();
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
        let _ = set_current(Some(&self.context));
        unsafe { super::glDeleteFramebuffers(1, &self.framebuffer) };
        let _ = set_current(None);
    }
}

pub fn proc_address(_name: &CStr) -> *const c_void {
    std::ptr::null()
}
