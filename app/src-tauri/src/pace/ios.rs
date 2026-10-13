mod display_link;

use crate::pace::OnRefresh;
use dispatch2::DispatchQueue;
use objc2::rc::Retained;
use objc2::runtime::AnyObject;
use objc2::{class, msg_send, MainThreadMarker};
use objc2_quartz_core::CAFrameRateRange;
use objc2_ui_kit::UIApplication;
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::sync::Arc;

static RUNNING_REFRESHES: AtomicUsize = AtomicUsize::new(0);

const GAME_HZ: f32 = 60.0;

#[link(name = "QuartzCore", kind = "framework")]
extern "C" {}

pub fn refresh(on_refresh: &OnRefresh, stopped: &Arc<AtomicBool>) -> Result<(), String> {
    let _screen_on = ScreenOn::new();
    display_link::run(
        |target, selector| unsafe {
            let link: Option<Retained<AnyObject>> =
                msg_send![class!(CADisplayLink), displayLinkWithTarget: target, selector: selector];
            // Games run at 60 Hz, so a ProMotion display would otherwise show each frame twice.
            if let Some(link) = &link {
                let () =
                    msg_send![&**link, setPreferredFrameRateRange: CAFrameRateRange::new(GAME_HZ, GAME_HZ, GAME_HZ)];
            }
            link
        },
        on_refresh,
        stopped,
    )
}

// The old refresh thread can still be stopping when a new one starts, so the main thread goes by the count of running
// ones rather than by whichever called last.
struct ScreenOn;

impl ScreenOn {
    fn new() -> ScreenOn {
        RUNNING_REFRESHES.fetch_add(1, Ordering::Relaxed);
        update_idle_timer();
        ScreenOn
    }
}

impl Drop for ScreenOn {
    fn drop(&mut self) {
        RUNNING_REFRESHES.fetch_sub(1, Ordering::Relaxed);
        update_idle_timer();
    }
}

fn update_idle_timer() {
    DispatchQueue::main().exec_async(|| {
        let Some(mtm) = MainThreadMarker::new() else { return };
        UIApplication::sharedApplication(mtm).setIdleTimerDisabled(RUNNING_REFRESHES.load(Ordering::Relaxed) > 0);
    });
}
