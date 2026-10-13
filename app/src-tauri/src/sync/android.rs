pub use super::google::plugin as google_sign_in;
pub use super::network::plugin as network;
pub use super::oauth::plugin as browser_sign_in;

pub(super) const TELLS_MOBILE_DATA: bool = true;

pub fn device_name() -> String {
    let mut model = [0 as libc::c_char; libc::PROP_VALUE_MAX as usize];
    unsafe { libc::__system_property_get(c"ro.product.model".as_ptr(), model.as_mut_ptr()) };
    let model = unsafe { std::ffi::CStr::from_ptr(model.as_ptr()) }.to_string_lossy().into_owned();
    if model.is_empty() { "Android".into() } else { model }
}
