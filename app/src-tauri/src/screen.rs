#[cfg_attr(target_os = "android", path = "screen/android.rs")]
#[cfg_attr(target_os = "ios", path = "screen/ios.rs")]
#[cfg_attr(desktop, path = "screen/desktop.rs")]
pub mod platform;

use crate::gl::{self, GLenum, GLint, GLsizei, GLuint, ScreenContext, Window};
use crate::vulkan;
use serde::Deserialize;
use std::ffi::{c_char, c_void, CString};
use std::sync::{mpsc, Mutex};
use std::time::Duration;

type GLfloat = f32;

const GL_VERTEX_SHADER: GLenum = 0x8B31;
const GL_FRAGMENT_SHADER: GLenum = 0x8B30;
const GL_COMPILE_STATUS: GLenum = 0x8B81;
const GL_LINK_STATUS: GLenum = 0x8B82;
const GL_ARRAY_BUFFER: GLenum = 0x8892;
const GL_STATIC_DRAW: GLenum = 0x88E4;
const GL_FLOAT: GLenum = 0x1406;
const GL_TRIANGLE_STRIP: GLenum = 0x0005;
const GL_TEXTURE_2D: GLenum = 0x0DE1;
const GL_TEXTURE0: GLenum = 0x84C0;
const GL_TEXTURE_MIN_FILTER: GLenum = 0x2801;
const GL_TEXTURE_MAG_FILTER: GLenum = 0x2800;
const GL_TEXTURE_WRAP_S: GLenum = 0x2802;
const GL_TEXTURE_WRAP_T: GLenum = 0x2803;
const GL_NEAREST: GLint = 0x2600;
const GL_CLAMP_TO_EDGE: GLint = 0x812F;
const GL_UNPACK_ALIGNMENT: GLenum = 0x0CF5;
const GL_RGB: GLenum = 0x1907;
const GL_RGB565: GLint = 0x8D62;
const GL_UNSIGNED_SHORT_5_6_5: GLenum = 0x8363;
const GL_SCISSOR_TEST: GLenum = 0x0C11;
const GL_COLOR_BUFFER_BIT: u32 = 0x4000;
const GL_SYNC_GPU_COMMANDS_COMPLETE: GLenum = 0x9117;
const GL_TIMEOUT_IGNORED: u64 = u64::MAX;

extern "C" {
    fn glCreateShader(kind: GLenum) -> GLuint;
    fn glShaderSource(shader: GLuint, count: GLsizei, sources: *const *const c_char, lengths: *const GLint);
    fn glCompileShader(shader: GLuint);
    fn glGetShaderiv(shader: GLuint, name: GLenum, value: *mut GLint);
    fn glGetShaderInfoLog(shader: GLuint, size: GLsizei, length: *mut GLsizei, log: *mut c_char);
    fn glDeleteShader(shader: GLuint);
    fn glCreateProgram() -> GLuint;
    fn glAttachShader(program: GLuint, shader: GLuint);
    fn glLinkProgram(program: GLuint);
    fn glGetProgramiv(program: GLuint, name: GLenum, value: *mut GLint);
    fn glGetProgramInfoLog(program: GLuint, size: GLsizei, length: *mut GLsizei, log: *mut c_char);
    fn glDeleteProgram(program: GLuint);
    fn glUseProgram(program: GLuint);
    fn glGetUniformLocation(program: GLuint, name: *const c_char) -> GLint;
    fn glUniform1i(location: GLint, value: GLint);
    fn glUniform1f(location: GLint, value: GLfloat);
    fn glUniform2f(location: GLint, x: GLfloat, y: GLfloat);
    fn glUniform3f(location: GLint, x: GLfloat, y: GLfloat, z: GLfloat);
    fn glUniform4f(location: GLint, x: GLfloat, y: GLfloat, z: GLfloat, w: GLfloat);
    fn glGenVertexArrays(n: GLsizei, ids: *mut GLuint);
    fn glBindVertexArray(id: GLuint);
    fn glDeleteVertexArrays(n: GLsizei, ids: *const GLuint);
    fn glGenBuffers(n: GLsizei, ids: *mut GLuint);
    fn glBindBuffer(target: GLenum, id: GLuint);
    fn glBufferData(target: GLenum, size: isize, data: *const c_void, usage: GLenum);
    fn glDeleteBuffers(n: GLsizei, ids: *const GLuint);
    fn glEnableVertexAttribArray(index: GLuint);
    fn glVertexAttribPointer(
        index: GLuint,
        size: GLint,
        kind: GLenum,
        normalized: u8,
        stride: GLsizei,
        offset: *const c_void,
    );
    fn glGenTextures(n: GLsizei, ids: *mut GLuint);
    fn glDeleteTextures(n: GLsizei, ids: *const GLuint);
    fn glActiveTexture(unit: GLenum);
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
    fn glTexSubImage2D(
        target: GLenum,
        level: GLint,
        x: GLint,
        y: GLint,
        width: GLsizei,
        height: GLsizei,
        format: GLenum,
        kind: GLenum,
        data: *const c_void,
    );
    fn glPixelStorei(name: GLenum, value: GLint);
    fn glViewport(x: GLint, y: GLint, width: GLsizei, height: GLsizei);
    fn glScissor(x: GLint, y: GLint, width: GLsizei, height: GLsizei);
    fn glEnable(capability: GLenum);
    fn glDisable(capability: GLenum);
    fn glClearColor(r: GLfloat, g: GLfloat, b: GLfloat, a: GLfloat);
    fn glClear(mask: u32);
    fn glDrawArrays(mode: GLenum, first: GLint, count: GLsizei);
    fn glFlush();
    fn glFenceSync(condition: GLenum, flags: u32) -> *mut c_void;
    fn glWaitSync(sync: *mut c_void, flags: u32, timeout: u64);
    fn glDeleteSync(sync: *mut c_void);
}

pub type Rgb = [f32; 3];

#[derive(Clone, Copy, Debug, Default, Deserialize, PartialEq)]
pub struct Point {
    pub x: f32,
    pub y: f32,
}

#[derive(Clone, Copy, Debug, Default, Deserialize, PartialEq)]
pub struct Rect {
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
}

// The source is a fraction of the frame, top first, and the target is in the canvas's pixels.
#[derive(Clone, Debug, Deserialize, PartialEq)]
pub struct View {
    pub source: Rect,
    pub target: Rect,
    pub window: usize,
}

#[derive(Clone, Debug, Deserialize, PartialEq)]
pub struct Look {
    pub shell: Rgb,
    pub plate: Rgb,
    pub dp: f32,
    pub radius: f32,
    pub glass: bool,
}

// The surface lies under the WebView at the same size, so page pixels are surface pixels. The page is see-through
// over the game, so the screen paints what it would have: its colour, the player's area and the canvas.
#[derive(Clone, Debug, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Layout {
    pub page: Rgb,
    pub area: Rect,
    pub area_color: Rgb,
    pub canvas: Point,
    pub border: f32,
    pub views: Vec<View>,
    pub look: Option<Look>,
}

#[derive(Clone, Copy, Debug, Default, Deserialize, PartialEq)]
pub struct Parallax {
    pub shift: Point,
    pub exact: Point,
    pub lean: Point,
}

pub enum Picture<'a> {
    Pixels { width: u32, height: u32, pixels: &'a [u16] },
    Texture(Texture),
    Image(vulkan::Frame),
}

impl Picture<'_> {
    pub fn size(&self) -> (u32, u32) {
        match self {
            Picture::Pixels { width, height, .. } => (*width, *height),
            Picture::Texture(texture) => (texture.width, texture.height),
            Picture::Image(frame) => (frame.width, frame.height),
        }
    }
}

// A core's framebuffer texture, of which the frame takes the corner at the origin.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Texture {
    pub id: u32,
    pub width: u32,
    pub height: u32,
    pub texture_width: u32,
    pub texture_height: u32,
    pub bottom_left: bool,
}

// Only the platforms with a native screen make these.
#[allow(dead_code)]
pub enum WindowChange {
    Shown(Window),
    Gone(mpsc::Sender<()>),
}

pub type OnWindow = Box<dyn Fn(WindowChange) + Send>;

// Long enough for the emulation thread to finish a frame, short of the UI thread being reported as not responding.
const GONE_TIMEOUT: Duration = Duration::from_secs(2);

static ON_WINDOW: Mutex<Option<OnWindow>> = Mutex::new(None);

pub fn watch(on_window: OnWindow) {
    *ON_WINDOW.lock().unwrap_or_else(|e| e.into_inner()) = Some(on_window);
    platform::watch();
}

fn tell(change: WindowChange) -> bool {
    match &*ON_WINDOW.lock().unwrap_or_else(|e| e.into_inner()) {
        Some(on_window) => {
            on_window(change);
            true
        }
        None => false,
    }
}

// Only the platforms with a native screen call these.
#[allow(dead_code)]
fn shown(window: Window) {
    tell(WindowChange::Shown(window));
}

// The platform takes the window away once this returns, so the emulation thread has to let go of it first.
#[allow(dead_code)]
fn gone() {
    let (done, finished) = mpsc::channel();
    if tell(WindowChange::Gone(done)) && finished.recv_timeout(GONE_TIMEOUT) == Err(mpsc::RecvTimeoutError::Timeout) {
        eprintln!("the emulation thread didn't let go of the game's surface in time");
    }
}

pub trait Screen {
    fn has_window(&self) -> bool;
    fn show(&mut self, picture: Picture) -> Result<(), String>;
    fn redraw(&mut self) -> Result<(), String>;
    fn lay_out(&mut self, layout: Layout);
    fn lean(&mut self, parallax: Vec<Parallax>);
    fn window(&mut self, change: WindowChange) -> Result<(), String>;
    // Forgets the last frame, whose texture can go with its game.
    fn clear(&mut self);
}

pub fn start() -> Option<Box<dyn Screen>> {
    match gl::screen_context()?.and_then(Native::new) {
        Ok(native) => Some(platform::screen(native)),
        Err(e) => {
            eprintln!("the native screen: {e}");
            None
        }
    }
}

// The WebGL twin of this shader is in app/src/screen.ts. A change to one belongs in both.
const VERTEX: &str = "#version 300 es
precision highp float;
layout(location = 0) in vec2 p;
uniform vec2 window;
out vec2 at;
void main() { at = window * vec2((p.x + 1.0) / 2.0, (1.0 - p.y) / 2.0); gl_Position = vec4(p, 0.0, 1.0); }";

// The window is the opening in the shell, and the game sits on a plate below it, seen from q at q - shift. A ray that
// leaves the window first shows the wall it hits. The lip's shadow stays on the plate and leans away from a light fixed
// in the room. The texel maps the frame's fractions onto the texture, which can hold it upside down in a corner.
const FRAGMENT: &str = concat!(
    "#version 300 es
precision highp float;
in vec2 at;
out vec4 color;
uniform sampler2D frame;
uniform vec4 source;
uniform vec3 texel;
uniform vec2 window;
uniform vec2 image;
uniform float margin;
uniform vec2 shift;
uniform vec2 exact;
uniform vec2 lean;
uniform vec3 shell;
uniform vec3 plate;
uniform float dp;
uniform float radius;
uniform float recess;
uniform float glass;
",
    include_str!("screen/frame.glsl")
);

// A rectangle from the top left, in the GL's terms from the bottom left.
fn from_bottom(rect: Rect, surface_height: i32) -> [i32; 4] {
    let (x, y) = (rect.x.round() as i32, rect.y.round() as i32);
    let (width, height) = (rect.width.round() as i32, rect.height.round() as i32);
    [x, surface_height - y - height, width, height]
}

#[derive(Debug, PartialEq)]
struct Pass {
    viewport: [i32; 4],
    window: [f32; 2],
    image: [f32; 2],
    source: Rect,
    moved: Parallax,
}

fn passes(layout: &Layout, parallax: &[Parallax], surface_height: i32) -> Vec<Pass> {
    let edge = layout.border;
    let canvas = layout.canvas;
    layout
        .views
        .iter()
        .map(|view| {
            let target = view.target;
            let window = Rect {
                x: canvas.x + target.x - edge,
                y: canvas.y + target.y - edge,
                width: target.width + 2.0 * edge,
                height: target.height + 2.0 * edge,
            };
            let moved = match layout.look {
                Some(_) => parallax.get(view.window).copied().unwrap_or_default(),
                None => Parallax::default(),
            };
            Pass {
                viewport: from_bottom(window, surface_height),
                window: [window.width, window.height],
                image: [target.width, target.height],
                source: view.source,
                moved,
            }
        })
        .collect()
}

fn texel(texture: &Texture) -> [f32; 3] {
    let width = texture.width as f32 / texture.texture_width as f32;
    let height = texture.height as f32 / texture.texture_height as f32;
    if texture.bottom_left {
        [width, -height, height]
    } else {
        [width, height, 0.0]
    }
}

enum Source {
    Uploaded,
    Core(Texture),
}

struct Uniforms {
    frame: GLint,
    source: GLint,
    texel: GLint,
    window: GLint,
    image: GLint,
    margin: GLint,
    shift: GLint,
    exact: GLint,
    lean: GLint,
    shell: GLint,
    plate: GLint,
    dp: GLint,
    radius: GLint,
    recess: GLint,
    glass: GLint,
}

pub struct Native {
    context: ScreenContext,
    program: GLuint,
    uniforms: Uniforms,
    vertex_array: GLuint,
    vertices: GLuint,
    texture: GLuint,
    uploaded: (u32, u32),
    last: Option<Source>,
    layout: Option<Layout>,
    parallax: Vec<Parallax>,
}

unsafe fn compile(kind: GLenum, source: &str) -> Result<GLuint, String> {
    let shader = glCreateShader(kind);
    let text = CString::new(source).unwrap_or_default();
    glShaderSource(shader, 1, &text.as_ptr(), std::ptr::null());
    glCompileShader(shader);
    let mut compiled = 0;
    glGetShaderiv(shader, GL_COMPILE_STATUS, &mut compiled);
    if compiled == 0 {
        let log = info_log(|size, length, log| glGetShaderInfoLog(shader, size, length, log));
        glDeleteShader(shader);
        return Err(format!("compiling the shader: {log}"));
    }
    Ok(shader)
}

unsafe fn info_log(read: impl FnOnce(GLsizei, *mut GLsizei, *mut c_char)) -> String {
    let mut log = vec![0u8; 1024];
    let mut length = 0;
    read(log.len() as GLsizei, &mut length, log.as_mut_ptr() as *mut c_char);
    log.truncate(length.max(0) as usize);
    String::from_utf8_lossy(&log).into_owned()
}

unsafe fn link() -> Result<GLuint, String> {
    let vertex = compile(GL_VERTEX_SHADER, VERTEX)?;
    let fragment = compile(GL_FRAGMENT_SHADER, FRAGMENT).inspect_err(|_| glDeleteShader(vertex))?;
    let program = glCreateProgram();
    glAttachShader(program, vertex);
    glAttachShader(program, fragment);
    glLinkProgram(program);
    glDeleteShader(vertex);
    glDeleteShader(fragment);
    let mut linked = 0;
    glGetProgramiv(program, GL_LINK_STATUS, &mut linked);
    if linked == 0 {
        let log = info_log(|size, length, log| glGetProgramInfoLog(program, size, length, log));
        glDeleteProgram(program);
        return Err(format!("linking the shader: {log}"));
    }
    Ok(program)
}

impl Native {
    fn new(context: ScreenContext) -> Result<Native, String> {
        context.make_current()?;
        unsafe {
            let program = link()?;
            let uniform = |name: &str| glGetUniformLocation(program, CString::new(name).unwrap_or_default().as_ptr());
            let uniforms = Uniforms {
                frame: uniform("frame"),
                source: uniform("source"),
                texel: uniform("texel"),
                window: uniform("window"),
                image: uniform("image"),
                margin: uniform("margin"),
                shift: uniform("shift"),
                exact: uniform("exact"),
                lean: uniform("lean"),
                shell: uniform("shell"),
                plate: uniform("plate"),
                dp: uniform("dp"),
                radius: uniform("radius"),
                recess: uniform("recess"),
                glass: uniform("glass"),
            };
            let (mut vertex_array, mut vertices, mut texture) = (0, 0, 0);
            glGenVertexArrays(1, &mut vertex_array);
            glBindVertexArray(vertex_array);
            glGenBuffers(1, &mut vertices);
            glBindBuffer(GL_ARRAY_BUFFER, vertices);
            let corners: [GLfloat; 8] = [-1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0];
            glBufferData(
                GL_ARRAY_BUFFER,
                size_of_val(&corners) as isize,
                corners.as_ptr() as *const c_void,
                GL_STATIC_DRAW,
            );
            glEnableVertexAttribArray(0);
            glVertexAttribPointer(0, 2, GL_FLOAT, 0, 0, std::ptr::null());
            glGenTextures(1, &mut texture);
            glBindTexture(GL_TEXTURE_2D, texture);
            glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_NEAREST);
            glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_NEAREST);
            glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);
            glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);
            glPixelStorei(GL_UNPACK_ALIGNMENT, 2);
            glUseProgram(program);
            glUniform1i(uniforms.frame, 0);
            Ok(Native {
                context,
                program,
                uniforms,
                vertex_array,
                vertices,
                texture,
                uploaded: (0, 0),
                last: None,
                layout: None,
                parallax: Vec::new(),
            })
        }
    }

    fn upload(&mut self, width: u32, height: u32, pixels: &[u16]) {
        let (w, h) = (width as GLsizei, height as GLsizei);
        let data = pixels.as_ptr() as *const c_void;
        unsafe {
            glBindTexture(GL_TEXTURE_2D, self.texture);
            if self.uploaded != (width, height) {
                self.uploaded = (width, height);
                glTexImage2D(GL_TEXTURE_2D, 0, GL_RGB565, w, h, 0, GL_RGB, GL_UNSIGNED_SHORT_5_6_5, data);
            } else {
                glTexSubImage2D(GL_TEXTURE_2D, 0, 0, 0, w, h, GL_RGB, GL_UNSIGNED_SHORT_5_6_5, data);
            }
        }
    }

    fn draw(&mut self) -> Result<(), String> {
        let (Some(layout), Some(source)) = (&self.layout, &self.last) else { return Ok(()) };
        let Some((width, height)) = self.context.make_current()? else { return Ok(()) };
        let (texture, texel) = match source {
            Source::Uploaded => (self.texture, [1.0, 1.0, 0.0]),
            Source::Core(texture) => (texture.id, texel(texture)),
        };
        let u = &self.uniforms;
        unsafe {
            glViewport(0, 0, width, height);
            let [r, g, b] = layout.page;
            glClearColor(r, g, b, 1.0);
            glClear(GL_COLOR_BUFFER_BIT);
            let [x, y, w, h] = from_bottom(layout.area, height);
            glEnable(GL_SCISSOR_TEST);
            glScissor(x, y, w, h);
            let [r, g, b] = layout.area_color;
            glClearColor(r, g, b, 1.0);
            glClear(GL_COLOR_BUFFER_BIT);
            glDisable(GL_SCISSOR_TEST);
            glUseProgram(self.program);
            glBindVertexArray(self.vertex_array);
            glActiveTexture(GL_TEXTURE0);
            glBindTexture(GL_TEXTURE_2D, texture);
            glUniform3f(u.texel, texel[0], texel[1], texel[2]);
            glUniform1f(u.margin, layout.border);
            glUniform1f(u.recess, if layout.look.is_some() { 1.0 } else { 0.0 });
            glUniform1f(u.glass, if layout.look.as_ref().is_some_and(|look| look.glass) { 1.0 } else { 0.0 });
            if let Some(look) = &layout.look {
                glUniform3f(u.shell, look.shell[0], look.shell[1], look.shell[2]);
                glUniform3f(u.plate, look.plate[0], look.plate[1], look.plate[2]);
                glUniform1f(u.dp, look.dp);
                glUniform1f(u.radius, look.radius);
            }
            for pass in passes(layout, &self.parallax, height) {
                let [x, y, w, h] = pass.viewport;
                glViewport(x, y, w, h);
                glUniform2f(u.window, pass.window[0], pass.window[1]);
                glUniform2f(u.image, pass.image[0], pass.image[1]);
                glUniform2f(u.shift, pass.moved.shift.x, pass.moved.shift.y);
                glUniform2f(u.exact, pass.moved.exact.x, pass.moved.exact.y);
                glUniform2f(u.lean, pass.moved.lean.x, pass.moved.lean.y);
                let source = pass.source;
                glUniform4f(u.source, source.x, source.y, source.width, source.height);
                glDrawArrays(GL_TRIANGLE_STRIP, 0, 4);
            }
        }
        if let Source::Core(_) = source {
            gl::texture_sampled();
        }
        self.context.swap()
    }
}

impl Screen for Native {
    fn has_window(&self) -> bool {
        self.context.has_window()
    }

    // A core's texture comes from its own context, which is current until the screen's is made current.
    fn show(&mut self, picture: Picture) -> Result<(), String> {
        match picture {
            Picture::Pixels { width, height, pixels } => {
                self.context.make_current()?;
                self.upload(width, height, pixels);
                self.last = Some(Source::Uploaded);
            }
            Picture::Texture(texture) => unsafe {
                let drawn = glFenceSync(GL_SYNC_GPU_COMMANDS_COMPLETE, 0);
                glFlush();
                self.context.make_current()?;
                glWaitSync(drawn, 0, GL_TIMEOUT_IGNORED);
                glDeleteSync(drawn);
                self.last = Some(Source::Core(texture));
            },
            Picture::Image(_) => return Err("OpenGL can't draw a Vulkan image".into()),
        }
        self.draw()
    }

    fn redraw(&mut self) -> Result<(), String> {
        self.draw()
    }

    fn lay_out(&mut self, layout: Layout) {
        self.layout = Some(layout);
    }

    fn lean(&mut self, parallax: Vec<Parallax>) {
        self.parallax = parallax;
    }

    fn window(&mut self, change: WindowChange) -> Result<(), String> {
        match change {
            WindowChange::Shown(window) if self.context.shows(&window) => Ok(()),
            WindowChange::Shown(window) => self.context.attach(window),
            WindowChange::Gone(done) => {
                self.context.detach();
                let _ = done.send(());
                Ok(())
            }
        }
    }

    fn clear(&mut self) {
        self.last = None;
    }
}

impl Drop for Native {
    fn drop(&mut self) {
        let _ = self.context.make_current();
        unsafe {
            glDeleteTextures(1, &self.texture);
            glDeleteBuffers(1, &self.vertices);
            glDeleteVertexArrays(1, &self.vertex_array);
            glDeleteProgram(self.program);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn rect(x: f32, y: f32, width: f32, height: f32) -> Rect {
        Rect { x, y, width, height }
    }

    fn layout(views: Vec<View>, look: Option<Look>) -> Layout {
        Layout {
            page: [0.0; 3],
            area: rect(0.0, 0.0, 400.0, 600.0),
            area_color: [0.0; 3],
            canvas: Point { x: 10.0, y: 20.0 },
            border: 4.0,
            views,
            look,
        }
    }

    fn look() -> Look {
        Look { shell: [0.5; 3], plate: [0.1; 3], dp: 3.0, radius: 6.0, glass: false }
    }

    fn view(target: Rect, window: usize) -> View {
        View { source: rect(0.0, 0.0, 1.0, 1.0), target, window }
    }

    #[test]
    fn places_each_window_on_the_surface_from_the_bottom() {
        let layout = layout(vec![view(rect(4.0, 4.0, 100.0, 50.0), 0)], None);

        let passes = passes(&layout, &[], 1000);

        assert_eq!(passes[0].viewport, [10, 922, 108, 58]);
        assert_eq!((passes[0].window, passes[0].image), ([108.0, 58.0], [100.0, 50.0]));
    }

    #[test]
    fn moves_each_window_by_its_own_parallax_in_the_shell() {
        let views = vec![view(rect(4.0, 4.0, 100.0, 50.0), 0), view(rect(4.0, 70.0, 100.0, 50.0), 1)];
        let deep = Parallax { shift: Point { x: 2.0, y: -1.0 }, ..Default::default() };

        let passes = passes(&layout(views, Some(look())), &[Parallax::default(), deep], 1000);

        assert_eq!(passes.iter().map(|pass| pass.moved).collect::<Vec<_>>(), [Parallax::default(), deep]);
    }

    #[test]
    fn keeps_the_game_still_out_of_the_shell() {
        let deep = Parallax { shift: Point { x: 2.0, y: -1.0 }, ..Default::default() };

        let passes = passes(&layout(vec![view(rect(4.0, 4.0, 100.0, 50.0), 0)], None), &[deep], 1000);

        assert_eq!(passes[0].moved, Parallax::default());
    }

    fn texture(bottom_left: bool) -> Texture {
        Texture { id: 1, width: 320, height: 240, texture_width: 640, texture_height: 480, bottom_left }
    }

    fn sample(texel: [f32; 3], [x, y]: [f32; 2]) -> [f32; 2] {
        [x * texel[0], y * texel[1] + texel[2]]
    }

    #[test]
    fn samples_a_frame_in_the_corner_of_a_larger_texture() {
        let texel = texel(&texture(false));

        assert_eq!(sample(texel, [0.0, 0.0]), [0.0, 0.0]);
        assert_eq!(sample(texel, [1.0, 1.0]), [0.5, 0.5]);
    }

    #[test]
    fn samples_a_frame_stored_bottom_row_first_from_its_top() {
        let texel = texel(&texture(true));

        assert_eq!(sample(texel, [0.0, 0.0]), [0.0, 0.5]);
        assert_eq!(sample(texel, [1.0, 1.0]), [0.5, 0.0]);
    }

    #[test]
    fn reads_the_layout_the_page_sends() {
        let json = r#"{"page":[1,1,1],"area":{"x":0,"y":56,"width":400,"height":600},"areaColor":[0,0,0],
            "canvas":{"x":10,"y":80},"border":0,"views":[{"source":{"x":0,"y":0,"width":1,"height":0.5},
            "target":{"x":0,"y":0,"width":256,"height":192},"window":0}],"look":null}"#;

        let layout: Layout = serde_json::from_str(json).unwrap();

        assert_eq!(layout.area, rect(0.0, 56.0, 400.0, 600.0));
        assert_eq!(layout.views[0].source, rect(0.0, 0.0, 1.0, 0.5));
    }
}
