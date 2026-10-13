use crate::pace::OnRefresh;
use std::ffi::{c_int, c_long, c_void};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Instant;

const POLL_MS: c_int = 100;

type FrameCallback = unsafe extern "C" fn(frame_time_nanos: c_long, data: *mut c_void);

#[link(name = "android")]
extern "C" {
    fn ALooper_prepare(opts: c_int) -> *mut c_void;
    fn ALooper_pollOnce(timeout_ms: c_int, fd: *mut c_int, events: *mut c_int, data: *mut *mut c_void) -> c_int;
    fn AChoreographer_getInstance() -> *mut c_void;
    // Deprecated from API 29 for postFrameCallback64, which minSdk 26 doesn't have. A long is 64 bits on arm64.
    fn AChoreographer_postFrameCallback(choreographer: *mut c_void, callback: FrameCallback, data: *mut c_void);
}

struct Context<'a> {
    choreographer: *mut c_void,
    on_refresh: &'a OnRefresh,
    stopped: &'a AtomicBool,
}

unsafe extern "C" fn on_frame(_frame_time_nanos: c_long, data: *mut c_void) {
    let context = &*(data as *const Context);
    if context.stopped.load(Ordering::Relaxed) {
        return;
    }
    (context.on_refresh)(Instant::now());
    AChoreographer_postFrameCallback(context.choreographer, on_frame, data);
}

// The choreographer calls back on the looper of the thread that asked for it, which is this one.
pub fn refresh(on_refresh: &OnRefresh, stopped: &Arc<AtomicBool>) -> Result<(), String> {
    unsafe {
        if ALooper_prepare(0).is_null() {
            return Err("no looper for the refresh thread".into());
        }
        let choreographer = AChoreographer_getInstance();
        if choreographer.is_null() {
            return Err("no choreographer".into());
        }
        // The last callback posted never runs, since nothing polls this thread's looper once it returns.
        let context = Context { choreographer, on_refresh, stopped };
        AChoreographer_postFrameCallback(choreographer, on_frame, &context as *const Context as *mut c_void);
        while !stopped.load(Ordering::Relaxed) {
            ALooper_pollOnce(POLL_MS, std::ptr::null_mut(), std::ptr::null_mut(), std::ptr::null_mut());
        }
    }
    Ok(())
}
