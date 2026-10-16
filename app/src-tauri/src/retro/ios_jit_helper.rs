use block2::RcBlock;
use objc2::rc::Retained;
use objc2::runtime::{AnyClass, AnyObject, NSObject};
use objc2::{msg_send, sel, AnyThread, ClassType};
use objc2_foundation::{NSArray, NSBundle, NSData, NSDictionary, NSError, NSExtensionItem, NSNumber, NSString};
use std::path::Path;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

// crates/jit-helper's platform/ios.rs reads these from the request's userInfo.
const PID: &str = "pid";
const PAIRING_FILE: &str = "pairingFile";
const HELPER: &str = "JITHelper.appex";
// A first run downloads the Developer Disk Image before it attaches.
const ATTACH_LIMIT: Duration = Duration::from_secs(120);
const POLL: Duration = Duration::from_millis(100);

#[derive(Clone, Copy, Debug, PartialEq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub enum JitHelper {
    Ready,
    // SideStore offers to strip app extensions when it installs the app.
    Removed,
    // LiveContainer can't start a guest app's extensions.
    Unavailable,
}

pub fn jit_helper() -> JitHelper {
    if std::env::var_os("LC_HOME_PATH").is_some() {
        return JitHelper::Unavailable;
    }
    if helper_identifier().is_some() {
        JitHelper::Ready
    } else {
        JitHelper::Removed
    }
}

fn helper_identifier() -> Option<Retained<NSString>> {
    let plugins = NSBundle::mainBundle().builtInPlugInsPath()?.to_string();
    let path = Path::new(&plugins).join(HELPER);
    // SideStore gives the extension a bundle ID of its own, so it's read from the bundle rather than built.
    NSBundle::bundleWithPath(&NSString::from_str(path.to_str()?))?.bundleIdentifier()
}

#[derive(Default)]
struct Outcome {
    failed: Option<String>,
    finished: bool,
}

pub fn turn_on_jit_with_helper(pairing_file: Vec<u8>) -> Result<bool, String> {
    let identifier = helper_identifier()
        .ok_or("SideStore removed the JIT helper when it installed the app. Use StikDebug instead.")?;
    let outcome = Arc::new(Mutex::new(Outcome::default()));
    let extension = start(&identifier, &pairing_file, &outcome)?;
    let started = Instant::now();
    loop {
        if super::jit::traced() {
            break;
        }
        let outcome = outcome.lock().unwrap_or_else(|e| e.into_inner());
        if let Some(failed) = &outcome.failed {
            return Err(failed.clone());
        }
        if outcome.finished {
            return Err("The JIT helper finished without attaching.".into());
        }
        drop(outcome);
        if started.elapsed() > ATTACH_LIMIT {
            let _: () = unsafe { msg_send![&*extension, _kill: libc::SIGKILL] };
            return Err("The JIT helper didn't attach in time. Check that LocalDevVPN is on and try again.".into());
        }
        std::thread::sleep(POLL);
    }
    let on = super::jit_on();
    drop(extension);
    Ok(on)
}

// NSExtension is private API, which the sideload build can use and the App Store one never contains.
fn start(
    identifier: &NSString,
    pairing_file: &[u8],
    outcome: &Arc<Mutex<Outcome>>,
) -> Result<Retained<AnyObject>, String> {
    let class = AnyClass::get(c"NSExtension").ok_or("This iOS version can't start app extensions.")?;
    let mut error: *mut NSError = std::ptr::null_mut();
    let extension: Option<Retained<AnyObject>> =
        unsafe { msg_send![class, extensionWithIdentifier: identifier, error: &mut error] };
    let extension = extension.ok_or_else(|| describe(error, "Couldn't find the JIT helper."))?;
    let starts: bool =
        unsafe { msg_send![&*extension, respondsToSelector: sel!(beginExtensionRequestWithInputItems:error:)] };
    if !starts {
        return Err("This iOS version can't start the JIT helper. Use StikDebug instead.".into());
    }

    let cancelled = {
        let outcome = outcome.clone();
        RcBlock::new(move |_request: *mut AnyObject, error: *mut NSError| {
            outcome.lock().unwrap_or_else(|e| e.into_inner()).failed = Some(describe(error, "The JIT helper stopped."));
        })
    };
    let completed = {
        let outcome = outcome.clone();
        RcBlock::new(move |_request: *mut AnyObject, _items: *mut AnyObject| {
            outcome.lock().unwrap_or_else(|e| e.into_inner()).finished = true;
        })
    };
    let interrupted = {
        let outcome = outcome.clone();
        RcBlock::new(move |_request: *mut AnyObject| {
            outcome.lock().unwrap_or_else(|e| e.into_inner()).failed = Some("The JIT helper quit unexpectedly.".into());
        })
    };
    unsafe {
        let _: () = msg_send![&*extension, setRequestCancellationBlock: &*cancelled];
        let _: () = msg_send![&*extension, setRequestCompletionBlock: &*completed];
        let _: () = msg_send![&*extension, setRequestInterruptionBlock: &*interrupted];
    }

    let pid = NSNumber::new_u32(std::process::id());
    let pairing_file = NSData::with_bytes(pairing_file);
    let info: Retained<NSDictionary<NSString, NSObject>> = NSDictionary::from_slices(
        &[&*NSString::from_str(PID), &*NSString::from_str(PAIRING_FILE)],
        &[pid.as_super(), pairing_file.as_super()],
    );
    let item = NSExtensionItem::init(NSExtensionItem::alloc());
    // userInfo is typed as NSDictionary<AnyObject, AnyObject>, which this one is.
    let info: Retained<NSDictionary> = unsafe { Retained::cast_unchecked(info) };
    unsafe { item.setUserInfo(Some(&info)) };
    let items = NSArray::from_retained_slice(&[item]);
    let mut error: *mut NSError = std::ptr::null_mut();
    let request: Option<Retained<AnyObject>> =
        unsafe { msg_send![&*extension, beginExtensionRequestWithInputItems: &*items, error: &mut error] };
    request.ok_or_else(|| describe(error, "Couldn't start the JIT helper."))?;
    Ok(extension)
}

fn describe(error: *mut NSError, fallback: &str) -> String {
    match unsafe { error.as_ref() } {
        Some(error) => error.localizedDescription().to_string(),
        None => fallback.to_string(),
    }
}
