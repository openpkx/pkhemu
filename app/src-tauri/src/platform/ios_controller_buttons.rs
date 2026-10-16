// WebKit already disables system gestures on the Home, Options and Menu buttons, yet iPadOS still took the PS button
// and opened one of its own apps. SDL disables them on every button of every controller, and so do we.

use block2::RcBlock;
use dispatch2::DispatchQueue;
use objc2_foundation::{NSNotificationCenter, NSOperationQueue};
use objc2_game_controller::{GCController, GCControllerDidConnectNotification, GCSystemGestureState};
use tauri::plugin::{Builder, TauriPlugin};
use tauri::Runtime;

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("ios-controller-buttons")
        .setup(|_, _| {
            DispatchQueue::main().exec_async(|| {
                let block = RcBlock::new(|_| disable_system_gestures());
                // SAFETY: the block captures nothing and the main queue runs it on the main thread. The centre keeps the
                // observer for the app's lifetime, so the returned token can be dropped.
                let _ = unsafe {
                    NSNotificationCenter::defaultCenter().addObserverForName_object_queue_usingBlock(
                        Some(GCControllerDidConnectNotification),
                        None,
                        Some(&NSOperationQueue::mainQueue()),
                        &block,
                    )
                };
                disable_system_gestures();
            });
            Ok(())
        })
        .build()
}

fn disable_system_gestures() {
    // SAFETY: GameController calls on the main thread, on objects GameController returned.
    unsafe {
        for controller in GCController::controllers() {
            for button in controller.physicalInputProfile().allButtons() {
                button.setPreferredSystemGestureState(GCSystemGestureState::Disabled);
            }
        }
    }
}
