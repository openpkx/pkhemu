#[cfg_attr(target_os = "android", path = "keep_alive/android.rs")]
#[cfg_attr(target_os = "ios", path = "keep_alive/ios.rs")]
#[cfg_attr(desktop, path = "keep_alive/desktop.rs")]
pub mod platform;

use crate::sync::RunProgress;
use tauri::{AppHandle, Runtime};

pub fn begin<R: Runtime>(app: &AppHandle<R>) {
    // A store build without Plus leaves the sync service out of its manifest, since it never syncs.
    if !crate::plus::Build::current().offers_sync() {
        return;
    }
    platform::set(app, true);
}

pub fn end<R: Runtime>(app: &AppHandle<R>) {
    if !crate::plus::Build::current().offers_sync() {
        return;
    }
    platform::set(app, false);
}

pub fn progress<R: Runtime>(app: &AppHandle<R>, run: &RunProgress) {
    if !crate::plus::Build::current().offers_sync() {
        return;
    }
    platform::progress(app, notification_percent(run));
}

fn notification_percent(run: &RunProgress) -> Option<u8> {
    match *run {
        RunProgress::Transferring { done, total, .. } if total > 0 => {
            Some((done.saturating_mul(100) / total).min(100) as u8)
        }
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn transferring(done: u64, total: u64) -> RunProgress {
        RunProgress::Transferring { done, total, waiting_roms: vec![] }
    }

    #[test]
    fn checking_has_no_percent() {
        assert_eq!(notification_percent(&RunProgress::Checking { done: 1, total: 4 }), None);
    }

    #[test]
    fn nothing_planned_has_no_percent() {
        assert_eq!(notification_percent(&transferring(0, 0)), None);
    }

    #[test]
    fn percent_rounds_down() {
        assert_eq!(notification_percent(&transferring(42, 100)), Some(42));
        assert_eq!(notification_percent(&transferring(999, 1000)), Some(99));
        assert_eq!(notification_percent(&transferring(1000, 1000)), Some(100));
    }
}
