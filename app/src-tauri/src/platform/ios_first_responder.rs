// No keyboard or gamepad input reaches the page until the webview is first responder, and wry's focus() does nothing
// on iOS. Going to the background takes first responder away, so it's given back on every return. Tao's window isn't
// key after launch either, and a window that isn't key gets no keys.

use dispatch2::DispatchQueue;
use objc2_ui_kit::UIView;
use tauri::plugin::{Builder, TauriPlugin};
use tauri::webview::PageLoadEvent;
use tauri::{Manager, RunEvent, Runtime, Webview, WindowEvent};

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("ios-first-responder")
        .on_page_load(|webview, payload| {
            if payload.event() == PageLoadEvent::Finished {
                make_first_responder(webview.clone());
            }
        })
        .on_event(|app, event| {
            if let RunEvent::WindowEvent { label, event: WindowEvent::Focused(true), .. } = event {
                if let Some(window) = app.get_webview_window(label) {
                    make_first_responder(window.as_ref().clone());
                }
            }
        })
        .build()
}

// Tauri holds its plugin lock while calling these hooks. makeKeyWindow fires the window's focus event synchronously,
// and that event takes the same lock, so running it inline deadlocks the main thread.
fn make_first_responder<R: Runtime>(webview: Webview<R>) {
    DispatchQueue::main().exec_async(move || {
        let _ = webview.with_webview(|webview| {
            // SAFETY: on iOS the platform webview's inner pointer is its WKWebView, which outlives the with_webview call.
            let view: &UIView = unsafe { &*webview.inner().cast() };
            if let Some(window) = view.window() {
                window.makeKeyWindow();
            }
            view.becomeFirstResponder();
        });
    });
}
