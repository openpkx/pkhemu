use std::ffi::c_void;
use std::sync::atomic::{AtomicBool, AtomicIsize, Ordering};
use std::sync::Once;

use objc2::rc::Retained;
use objc2::runtime::{AnyClass, AnyObject, Imp, Sel};
use objc2::{msg_send, sel};
use objc2_ui_kit::{UIRectEdge, UIView};
use tauri::plugin::{Builder, TauriPlugin};
use tauri::{Manager, RunEvent, Runtime, WebviewWindow, WindowEvent};

const UI_STATUS_BAR_STYLE_DEFAULT: isize = 0;
const UI_STATUS_BAR_STYLE_LIGHT_CONTENT: isize = 1;
const UI_STATUS_BAR_STYLE_DARK_CONTENT: isize = 3;

static STATUS_BAR_STYLE: AtomicIsize = AtomicIsize::new(UI_STATUS_BAR_STYLE_DEFAULT);
static GAME_HIDES_BARS: AtomicBool = AtomicBool::new(false);

// UIKit hides the status bar in landscape by default, but tao's view controller overrides prefersStatusBarHidden with
// a property that defaults to NO, so it shows over the header unless it's hidden here on every rotation.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("ios-status-bar")
        .on_event(|app, event| {
            if let RunEvent::WindowEvent { label, event: WindowEvent::Resized(_), .. } = event {
                if let Some(window) = app.get_webview_window(label) {
                    let _ = with_view_controller(&window, update_status_bar);
                }
            }
        })
        .build()
}

// Tauri doesn't expose tao's window, so these send tao's view controller the messages its WindowExtIOS setters send.
#[tauri::command]
pub fn system_bars_set_hidden<R: Runtime>(window: WebviewWindow<R>, hidden: bool) -> Result<(), String> {
    GAME_HIDES_BARS.store(hidden, Ordering::Relaxed);
    with_view_controller(&window, move |controller| unsafe {
        let edges = if hidden { UIRectEdge::All } else { UIRectEdge::None };
        update_status_bar(controller);
        let () = msg_send![controller, setPrefersHomeIndicatorAutoHidden: hidden];
        let () = msg_send![controller, setPreferredScreenEdgesDeferringSystemGestures: edges];
    })
}

#[tauri::command]
pub fn system_bars_set_light<R: Runtime>(window: WebviewWindow<R>, light: bool) -> Result<(), String> {
    let style = if light { UI_STATUS_BAR_STYLE_DARK_CONTENT } else { UI_STATUS_BAR_STYLE_LIGHT_CONTENT };
    STATUS_BAR_STYLE.store(style, Ordering::Relaxed);
    with_view_controller(&window, |controller| unsafe {
        add_status_bar_style(controller.class());
        let () = msg_send![controller, setNeedsStatusBarAppearanceUpdate];
    })
}

fn update_status_bar(controller: &AnyObject) {
    let view: Option<Retained<UIView>> = unsafe { msg_send![controller, view] };
    let landscape = view.is_some_and(|view| {
        let size = view.bounds().size;
        size.width > size.height
    });
    let hidden = GAME_HIDES_BARS.load(Ordering::Relaxed) || landscape;
    let currently_hidden: bool = unsafe { msg_send![controller, prefersStatusBarHidden] };
    if hidden != currently_hidden {
        let () = unsafe { msg_send![controller, setPrefersStatusBarHidden: hidden] };
    }
}

// tao's view controller inherits preferredStatusBarStyle, whose default follows the device's appearance rather than the
// app's theme. Overriding the appearance instead would change prefers-color-scheme in the webview, which the system
// theme reads.
fn add_status_bar_style(class: &AnyClass) {
    static ADDED: Once = Once::new();
    extern "C-unwind" fn preferred_status_bar_style(_: &AnyObject, _: Sel) -> isize {
        STATUS_BAR_STYLE.load(Ordering::Relaxed)
    }
    ADDED.call_once(|| unsafe {
        let imp: Imp = std::mem::transmute(preferred_status_bar_style as extern "C-unwind" fn(_, _) -> _);
        let class = class as *const AnyClass as *mut AnyClass;
        if !objc2::ffi::class_addMethod(class, sel!(preferredStatusBarStyle), imp, c"q@:".as_ptr()).as_bool() {
            eprintln!("tao's view controller already has preferredStatusBarStyle, so the status bar ignores the theme");
        }
    });
}

fn with_view_controller<R: Runtime>(
    window: &WebviewWindow<R>,
    f: impl FnOnce(&AnyObject) + Send + 'static,
) -> Result<(), String> {
    window
        .with_webview(move |webview| {
            let controller: *mut c_void = webview.view_controller();
            // SAFETY: on iOS this is tao's root view controller, which lives as long as the window.
            if let Some(controller) = unsafe { controller.cast::<AnyObject>().as_ref() } {
                f(controller);
            }
        })
        .map_err(|e| e.to_string())
}
