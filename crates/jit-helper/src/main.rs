#[cfg_attr(target_os = "ios", path = "platform/ios.rs")]
#[cfg_attr(not(target_os = "ios"), path = "platform/desktop.rs")]
mod platform;

fn main() {
    platform::main();
}
