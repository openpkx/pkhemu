use crate::pace::OnRefresh;
use objc2::rc::{autoreleasepool, Retained};
use objc2::runtime::{AnyObject, NSObject, NSObjectProtocol, Sel};
use objc2::{class, define_class, msg_send, sel, AnyThread, DefinedClass};
use std::ffi::c_void;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Instant;

const POLL_SECONDS: f64 = 0.1;
const RUN_FINISHED: i32 = 1;

#[link(name = "CoreFoundation", kind = "framework")]
extern "C" {
    static kCFRunLoopDefaultMode: *const c_void;
    fn CFRunLoopRunInMode(mode: *const c_void, seconds: f64, return_after_source_handled: u8) -> i32;
}

pub struct Ivars {
    on_refresh: OnRefresh,
    stopped: Arc<AtomicBool>,
}

define_class!(
    #[unsafe(super(NSObject))]
    #[name = "PkhEmuRefreshTarget"]
    #[ivars = Ivars]
    pub struct Target;

    impl Target {
        #[unsafe(method(refresh:))]
        fn refresh(&self, _link: *mut AnyObject) {
            if !self.ivars().stopped.load(Ordering::Relaxed) {
                (self.ivars().on_refresh)(Instant::now());
            }
        }
    }

    unsafe impl NSObjectProtocol for Target {}
);

pub fn run(
    make: impl FnOnce(&Target, Sel) -> Option<Retained<AnyObject>>,
    on_refresh: &OnRefresh,
    stopped: &Arc<AtomicBool>,
) -> Result<(), String> {
    autoreleasepool(|_| unsafe {
        let target = Target::alloc().set_ivars(Ivars { on_refresh: on_refresh.clone(), stopped: stopped.clone() });
        let target: Retained<Target> = msg_send![super(target), init];
        let link = make(&target, sel!(refresh:)).ok_or("no display link")?;
        let run_loop: Retained<AnyObject> = msg_send![class!(NSRunLoop), currentRunLoop];
        let mode = kCFRunLoopDefaultMode as *const AnyObject;
        let _: () = msg_send![&*link, addToRunLoop: &*run_loop, forMode: mode];
        while !stopped.load(Ordering::Relaxed) {
            if CFRunLoopRunInMode(kCFRunLoopDefaultMode, POLL_SECONDS, 0) == RUN_FINISHED {
                break;
            }
        }
        let _: () = msg_send![&*link, invalidate];
        Ok(())
    })
}
