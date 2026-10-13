mod display_link;

use crate::pace::OnRefresh;
use objc2::rc::Retained;
use objc2::runtime::{AnyObject, Sel};
use objc2::{class, msg_send, sel};
use std::ffi::c_void;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};

const POLL: Duration = Duration::from_millis(100);

type DisplayLinkRef = *mut c_void;
type Output = unsafe extern "C" fn(DisplayLinkRef, *const c_void, *const c_void, u64, *mut u64, *mut c_void) -> i32;

#[link(name = "CoreVideo", kind = "framework")]
extern "C" {
    fn CVDisplayLinkCreateWithActiveCGDisplays(link: *mut DisplayLinkRef) -> i32;
    fn CVDisplayLinkSetOutputCallback(link: DisplayLinkRef, output: Output, context: *mut c_void) -> i32;
    fn CVDisplayLinkStart(link: DisplayLinkRef) -> i32;
    fn CVDisplayLinkStop(link: DisplayLinkRef) -> i32;
    fn CVDisplayLinkRelease(link: DisplayLinkRef);
}

extern "C" {
    static _dispatch_main_q: c_void;
    fn dispatch_sync_f(queue: *const c_void, context: *mut c_void, work: unsafe extern "C" fn(*mut c_void));
}

pub fn refresh(on_refresh: &OnRefresh, stopped: &Arc<AtomicBool>) -> Result<(), String> {
    let screens_link: bool =
        unsafe { msg_send![class!(NSScreen), instancesRespondToSelector: sel!(displayLinkWithTarget:selector:)] };
    if screens_link {
        display_link::run(screen_link, on_refresh, stopped)
    } else {
        core_video(on_refresh, stopped)
    }
}

// NSScreen belongs to the main thread, so the link is made there and then runs on this one.
fn screen_link(target: &display_link::Target, selector: Sel) -> Option<Retained<AnyObject>> {
    let target = target as *const display_link::Target as usize;
    on_main(move || unsafe {
        let screen: Option<Retained<AnyObject>> = msg_send![class!(NSScreen), mainScreen];
        let target = &*(target as *const display_link::Target);
        let link: Option<Retained<AnyObject>> = msg_send![&*screen?, displayLinkWithTarget: target, selector: selector];
        link
    })
}

fn on_main<F: FnOnce() -> R, R>(work: F) -> R {
    struct Job<F, R>(Option<F>, Option<R>);
    unsafe extern "C" fn run<F: FnOnce() -> R, R>(context: *mut c_void) {
        let job = &mut *(context as *mut Job<F, R>);
        job.1 = job.0.take().map(|work| work());
    }
    let mut job = Job::<F, R>(Some(work), None);
    unsafe {
        dispatch_sync_f(&_dispatch_main_q, &mut job as *mut Job<F, R> as *mut c_void, run::<F, R>);
    }
    job.1.expect("the main thread ran the work")
}

struct Context<'a> {
    on_refresh: &'a OnRefresh,
    stopped: &'a AtomicBool,
}

unsafe extern "C" fn output(
    _link: DisplayLinkRef,
    _now: *const c_void,
    _output_time: *const c_void,
    _flags: u64,
    _flags_out: *mut u64,
    context: *mut c_void,
) -> i32 {
    let context = &*(context as *const Context);
    if !context.stopped.load(Ordering::Relaxed) {
        (context.on_refresh)(Instant::now());
    }
    0
}

fn core_video(on_refresh: &OnRefresh, stopped: &AtomicBool) -> Result<(), String> {
    let context = Context { on_refresh, stopped };
    unsafe {
        let mut link = std::ptr::null_mut();
        let error = CVDisplayLinkCreateWithActiveCGDisplays(&mut link);
        if error != 0 || link.is_null() {
            return Err(format!("no display link (CoreVideo error {error})"));
        }
        let mut error = CVDisplayLinkSetOutputCallback(link, output, &context as *const Context as *mut c_void);
        if error == 0 {
            error = CVDisplayLinkStart(link);
        }
        if error != 0 {
            CVDisplayLinkRelease(link);
            return Err(format!("starting the display link failed (CoreVideo error {error})"));
        }
        while !stopped.load(Ordering::Relaxed) {
            std::thread::sleep(POLL);
        }
        CVDisplayLinkStop(link);
        CVDisplayLinkRelease(link);
    }
    Ok(())
}
