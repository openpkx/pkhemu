mod debugger;
mod device;
mod disk_image;

use std::path::Path;
use std::time::Duration;

pub use debugger::approve;

// How long the app may run between brk requests before the helper lets it go.
const ATTACHED_LIMIT: Duration = Duration::from_secs(60);

#[derive(Debug, Clone, PartialEq)]
pub enum Failure {
    Unreachable,
    PairingRejected,
    DeveloperModeOff,
    DiskImage(String),
    AttachRefused(String),
    Unexpected(String),
    ConnectionLost,
    AppExited,
    TimedOut,
}

impl std::fmt::Display for Failure {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        match self {
            Failure::Unreachable => write!(f, "Can't reach the iPhone. Turn LocalDevVPN on and try again."),
            Failure::PairingRejected => write!(f, "The iPhone rejected the pairing file. Make a new one with iloader."),
            Failure::DeveloperModeOff => {
                write!(f, "Developer Mode is off. Turn it on in Settings > Privacy & Security, then try again.")
            }
            Failure::DiskImage(reason) => write!(f, "Couldn't set up the Developer Disk Image: {reason}"),
            Failure::AttachRefused(reply) => write!(f, "debugserver wouldn't attach to the app ({reply})."),
            Failure::Unexpected(reply) => write!(f, "debugserver answered something unexpected: {reply}"),
            Failure::ConnectionLost => {
                write!(f, "Lost the connection to the iPhone. Keep LocalDevVPN on and try again.")
            }
            Failure::AppExited => write!(f, "The app quit while JIT was turning on."),
            Failure::TimedOut => write!(f, "Turning JIT on took too long. Try again."),
        }
    }
}

impl std::error::Error for Failure {}

impl Failure {
    pub fn code(&self) -> isize {
        match self {
            Failure::Unreachable => 1,
            Failure::PairingRejected => 2,
            Failure::DeveloperModeOff => 3,
            Failure::DiskImage(_) => 4,
            Failure::AttachRefused(_) => 5,
            Failure::Unexpected(_) => 6,
            Failure::ConnectionLost => 7,
            Failure::AppExited => 8,
            Failure::TimedOut => 9,
        }
    }
}

pub async fn enable(pid: u32, pairing_file: &[u8], cache_dir: &Path) -> Result<(), Failure> {
    let mut device = device::Device::connect(pairing_file).await?;
    device.mount_disk_image(cache_dir).await?;
    let client = device.debug_proxy().await?;
    approve(client, pid, ATTACHED_LIMIT).await
}
