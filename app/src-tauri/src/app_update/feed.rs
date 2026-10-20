use super::Check;
use crate::plus::Build;
use serde::{Deserialize, Serialize};
use std::future::Future;
use std::path::Path;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

pub const FEED: &str = "https://github.com/openpkx/pkhemu/releases/latest/download/altstore.json";
pub const JIT_PAGE: &str = "https://pkhemu.openpkx.fyi/ios-jit";
const DAY: Duration = Duration::from_secs(24 * 60 * 60);

#[derive(Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct Cached {
    checked_at: u64,
    latest: Option<String>,
}

#[derive(Deserialize)]
struct Source {
    apps: Vec<App>,
}

#[derive(Deserialize)]
struct App {
    #[serde(default)]
    versions: Vec<Release>,
}

#[derive(Deserialize)]
struct Release {
    version: String,
}

pub async fn check<F: Future<Output = Result<String, String>>>(
    build: Build,
    cache: &Path,
    now: SystemTime,
    current: &str,
    fetch: impl FnOnce() -> F,
) -> Check {
    if build != (Build::Unlocked { sideload: true }) {
        return Check::default();
    }
    let now = now.duration_since(UNIX_EPOCH).unwrap_or_default().as_secs();
    let mut cached: Cached =
        std::fs::read(cache).ok().and_then(|json| serde_json::from_slice(&json).ok()).unwrap_or_default();
    if now.checked_sub(cached.checked_at).is_none_or(|elapsed| elapsed >= DAY.as_secs()) {
        match fetch().await.and_then(|body| latest_version(&body)) {
            Ok(latest) => cached.latest = Some(latest),
            Err(e) => eprintln!("app update feed: {e}"),
        }
        cached.checked_at = now;
        if let Err(e) = save(cache, &cached) {
            eprintln!("app update feed: {e}");
        }
    }
    match cached.latest.as_deref().and_then(version_code).zip(version_code(current)) {
        Some((latest, current)) if latest > current => {
            Check { available: true, version_code: Some(latest), downloaded: false, downloading: false }
        }
        _ => Check::default(),
    }
}

fn save(cache: &Path, cached: &Cached) -> std::io::Result<()> {
    if let Some(dir) = cache.parent() {
        std::fs::create_dir_all(dir)?;
    }
    std::fs::write(cache, serde_json::to_vec(cached)?)
}

fn latest_version(body: &str) -> Result<String, String> {
    let source: Source = serde_json::from_str(body).map_err(|e| e.to_string())?;
    let release = source.apps.into_iter().next().and_then(|app| app.versions.into_iter().next());
    release.map(|release| release.version).ok_or_else(|| "the feed lists no version".to_owned())
}

// Matches the version code Tauri gives the Android build, so a dismissed notice stays dismissed the same way.
fn version_code(version: &str) -> Option<i64> {
    let parts: Vec<i64> =
        version.split('.').map(|part| part.parse().ok().filter(|n| (0..1000).contains(n))).collect::<Option<_>>()?;
    match parts[..] {
        [major, minor, patch] => Some(major * 1_000_000 + minor * 1_000 + patch),
        _ => None,
    }
}
