// tao creates its window with initWithFrame: and then setWindowScene: (src/platform_impl/ios/view.rs). A window made
// that way keeps its launch safe area through every rotation, so env(safe-area-inset-*) is wrong in landscape. A window
// made with initWithWindowScene: gets the right insets, so the root view controller makes up the difference. Once tao
// creates its window with initWithWindowScene:, delete this module, its plugin line in ios.rs and the objc2
// dependencies.

use objc2::rc::Retained;
use objc2::{msg_send, MainThreadMarker};
use objc2_ui_kit::{UIEdgeInsets, UIScrollView, UIScrollViewContentInsetAdjustmentBehavior, UIView, UIWindow};
use tauri::plugin::{Builder, TauriPlugin};
use tauri::{Manager, RunEvent, Runtime, WebviewWindow, WindowEvent};

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("ios-safe-area")
        .on_webview_ready(|webview| {
            // Otherwise a page that loads in landscape lays out narrower by the side insets added below, and stays so.
            let _ = webview.with_webview(|webview| {
                let scroll_view: Retained<UIScrollView> = unsafe { msg_send![web_view(webview.inner()), scrollView] };
                scroll_view.setContentInsetAdjustmentBehavior(UIScrollViewContentInsetAdjustmentBehavior::Never);
            });
        })
        .on_event(|app, event| {
            if let RunEvent::WindowEvent { label, event: WindowEvent::Resized(_), .. } = event {
                if let Some(window) = app.get_webview_window(label) {
                    correct(&window);
                }
            }
        })
        .build()
}

fn correct<R: Runtime>(window: &WebviewWindow<R>) {
    let _ = window.with_webview(|webview| {
        let Some(mtm) = MainThreadMarker::new() else { return };
        let view = web_view(webview.inner());
        let Some(window) = view.window() else { return };
        let (Some(scene), Some(controller)) = (window.windowScene(), window.rootViewController()) else { return };
        // A hidden window keeps the geometry it was made with, so each layout change needs a new one.
        let expected = UIWindow::initWithWindowScene(mtm.alloc(), &scene).safeAreaInsets();
        let stuck = window.safeAreaInsets();
        controller.setAdditionalSafeAreaInsets(UIEdgeInsets {
            top: expected.top - stuck.top,
            left: expected.left - stuck.left,
            bottom: expected.bottom - stuck.bottom,
            right: expected.right - stuck.right,
        });
    });
}

fn web_view<'a>(inner: *mut std::ffi::c_void) -> &'a UIView {
    // SAFETY: on iOS the platform webview's inner pointer is its WKWebView, which outlives the with_webview call.
    unsafe { &*inner.cast() }
}
