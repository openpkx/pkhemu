use jit_helper::Failure;
use objc2::rc::Retained;
use objc2::runtime::{AnyObject, NSObject, NSObjectProtocol};
use objc2::{define_class, ClassType, Message};
use objc2_foundation::{
    NSData, NSDictionary, NSError, NSExtensionContext, NSExtensionItem, NSExtensionRequestHandling,
    NSLocalizedDescriptionKey, NSNumber, NSString,
};
use std::ffi::{c_char, c_int, CString};
use std::path::PathBuf;

// The app's retro/ios_jit/helper.rs puts these in the request's userInfo.
const PID: &str = "pid";
const PAIRING_FILE: &str = "pairingFile";
const ERROR_DOMAIN: &str = "pkhemu.jit-helper";

extern "C" {
    fn NSExtensionMain(argc: c_int, argv: *mut *mut c_char) -> c_int;
}

define_class!(
    // SAFETY: NSObject has no subclassing requirements, and Helper doesn't implement Drop.
    #[unsafe(super(NSObject))]
    #[name = "PKHJITHelper"]
    struct Helper;

    unsafe impl NSObjectProtocol for Helper {}

    unsafe impl NSExtensionRequestHandling for Helper {
        #[unsafe(method(beginRequestWithExtensionContext:))]
        fn begin_request(&self, context: &NSExtensionContext) {
            begin(context);
        }
    }
);

pub fn main() {
    // NSExtensionMain looks the principal class up by name, so it has to be registered first.
    let _ = Helper::class();
    let args: Vec<CString> = std::env::args().filter_map(|arg| CString::new(arg).ok()).collect();
    let mut argv: Vec<*mut c_char> =
        args.iter().map(|arg| arg.as_ptr() as *mut c_char).chain(std::iter::once(std::ptr::null_mut())).collect();
    std::process::exit(unsafe { NSExtensionMain(args.len() as c_int, argv.as_mut_ptr()) });
}

struct Context(Retained<NSExtensionContext>);

// NSExtensionContext's completion methods may be called from any thread.
unsafe impl Send for Context {}

fn begin(context: &NSExtensionContext) {
    let request = read_request(context);
    let context = Context(context.retain());
    std::thread::spawn(move || {
        let context = context;
        let result = request.and_then(|(pid, pairing_file)| run(pid, &pairing_file));
        match result {
            Ok(()) => unsafe { context.0.completeRequestReturningItems_completionHandler(None, None) },
            Err(failure) => {
                eprintln!("JIT helper: {failure}");
                context.0.cancelRequestWithError(&error(&failure));
            }
        }
    });
}

fn read_request(context: &NSExtensionContext) -> Result<(u32, Vec<u8>), Failure> {
    let missing = || Failure::Unexpected("the app sent no PID or pairing file".into());
    let item = context.inputItems().firstObject().ok_or_else(missing)?;
    let item = item.downcast::<NSExtensionItem>().map_err(|_| missing())?;
    let info = item.userInfo().ok_or_else(missing)?;
    let value = |key: &str| info.objectForKey(&NSString::from_str(key));
    let pid = value(PID).and_then(|pid| pid.downcast::<NSNumber>().ok()).ok_or_else(missing)?;
    let pairing_file = value(PAIRING_FILE).and_then(|data| data.downcast::<NSData>().ok()).ok_or_else(missing)?;
    Ok((pid.unsignedIntValue(), pairing_file.to_vec()))
}

fn run(pid: u32, pairing_file: &[u8]) -> Result<(), Failure> {
    let cache_dir = std::env::var_os("HOME").map(|home| PathBuf::from(home).join("Library/Caches")).unwrap_or_default();
    let runtime = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .map_err(|e| Failure::Unexpected(e.to_string()))?;
    runtime.block_on(jit_helper::enable(pid, pairing_file, &cache_dir))
}

fn error(failure: &Failure) -> Retained<NSError> {
    let message = NSString::from_str(&failure.to_string());
    let info: Retained<NSDictionary<NSString, AnyObject>> =
        NSDictionary::from_slices(&[unsafe { NSLocalizedDescriptionKey }], &[&*message as &AnyObject]);
    unsafe { NSError::errorWithDomain_code_userInfo(&NSString::from_str(ERROR_DOMAIN), failure.code(), Some(&info)) }
}
