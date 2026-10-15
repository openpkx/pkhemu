mod ios_vulkan;

use super::{Layout, Native, Parallax, Picture, Screen, WindowChange};
use crate::gl::Window;
use crate::vulkan;
use ios_vulkan::Presenter;
use std::ffi::c_void;
use tauri::{AppHandle, Runtime};
use tauri_plugin_pkhemu_ios::PkhemuIosExt;

pub fn watch() {
    tauri_plugin_pkhemu_ios::watch_game_screen(shown, gone);
}

pub fn screen(native: Native) -> Box<dyn Screen> {
    Box::new(Layers {
        gl: native,
        window: None,
        presenter: None,
        last: None,
        layout: None,
        parallax: Vec::new(),
        metal_shown: false,
    })
}

// OpenGL frames go to the game screen's layer, and Vulkan frames to the Metal layer above it, shown only for them.
struct Layers {
    gl: Native,
    window: Option<Window>,
    presenter: Option<Presenter>,
    last: Option<vulkan::Frame>,
    layout: Option<Layout>,
    parallax: Vec<Parallax>,
    metal_shown: bool,
}

impl Layers {
    fn draw(&mut self) -> Result<(), String> {
        let (Some(frame), Some(layout), Some(window)) = (&self.last, &self.layout, &self.window) else { return Ok(()) };
        if !self.presenter.as_ref().is_some_and(|presenter| presenter.draws_with(&frame.gpu)) {
            // A layer takes one Vulkan surface at a time.
            self.presenter = None;
            self.presenter = Some(Presenter::new(frame.gpu.clone(), window)?);
        }
        if let Some(presenter) = &mut self.presenter {
            presenter.draw(frame, layout, &self.parallax)?;
        }
        self.show_metal(true);
        Ok(())
    }

    fn show_metal(&mut self, show: bool) {
        if self.metal_shown != show {
            self.metal_shown = show;
            tauri_plugin_pkhemu_ios::show_metal_screen(show);
        }
    }
}

impl Screen for Layers {
    fn has_window(&self) -> bool {
        self.gl.has_window()
    }

    fn show(&mut self, picture: Picture) -> Result<(), String> {
        match picture {
            Picture::Image(frame) => {
                self.last = Some(frame);
                self.draw()
            }
            picture => {
                self.last = None;
                self.show_metal(false);
                self.gl.show(picture)
            }
        }
    }

    fn redraw(&mut self) -> Result<(), String> {
        match self.last {
            Some(_) => self.draw(),
            None => self.gl.redraw(),
        }
    }

    fn lay_out(&mut self, layout: Layout) {
        self.layout = Some(layout.clone());
        self.gl.lay_out(layout);
    }

    fn lean(&mut self, parallax: Vec<Parallax>) {
        self.parallax.clone_from(&parallax);
        self.gl.lean(parallax);
    }

    // The swapchain is the layer's at one size, so a new window gets a new one.
    fn window(&mut self, change: WindowChange) -> Result<(), String> {
        self.presenter = None;
        match change {
            WindowChange::Shown(window) => {
                self.window = Some(window.clone());
                self.gl.window(WindowChange::Shown(window))
            }
            WindowChange::Gone(done) => {
                self.window = None;
                self.gl.window(WindowChange::Gone(done))
            }
        }
    }

    // The presenter holds the core's device, which goes with its game.
    fn clear(&mut self) {
        self.last = None;
        self.presenter = None;
        self.show_metal(false);
        self.gl.clear();
    }
}

impl Drop for Layers {
    fn drop(&mut self) {
        self.show_metal(false);
    }
}

#[tauri::command]
pub fn screen_set_playing<R: Runtime>(app: AppHandle<R>, playing: bool) -> Result<(), String> {
    app.pkhemu_ios().set_game_screen_playing(playing)
}

extern "C" fn shown(layer: *mut c_void, metal: *mut c_void, width: i32, height: i32) {
    if let Some(window) = unsafe { Window::from_layers(layer, metal, width, height) } {
        super::shown(window);
    }
}

extern "C" fn gone() {
    super::gone();
}
