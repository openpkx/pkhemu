use super::feed::check;
use super::Check;
use crate::plus::Build;
use std::cell::Cell;
use std::path::PathBuf;
use std::time::{Duration, SystemTime};

const SIDELOAD: Build = Build::Unlocked { sideload: true };

fn cache(name: &str) -> PathBuf {
    let dir = std::env::temp_dir().join(format!("pkh-emu-app-update-{name}-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).unwrap();
    dir.join("app-update.json")
}

fn feed(version: &str) -> String {
    serde_json::json!({
        "name": "pkh-emu",
        "apps": [{
            "name": "pkh-emu",
            "bundleIdentifier": "fyi.openpkx.pkhemu",
            "versions": [
                { "version": version, "downloadURL": "https://example.com/pkhemu-sideload.ipa", "size": 1 },
                { "version": "0.1.0", "downloadURL": "https://example.com/old.ipa", "size": 1 }
            ]
        }]
    })
    .to_string()
}

fn run(build: Build, cache: &PathBuf, now: SystemTime, current: &str, body: Result<String, String>) -> (Check, u32) {
    let requests = Cell::new(0);
    let answer = tauri::async_runtime::block_on(check(build, cache, now, current, || {
        requests.set(requests.get() + 1);
        async { body }
    }));
    (answer, requests.get())
}

#[test]
fn a_newer_version_in_the_feed_is_available() {
    let (answer, _) = run(SIDELOAD, &cache("newer"), SystemTime::now(), "0.7.0", Ok(feed("0.8.1")));

    assert_eq!(answer, Check { available: true, version_code: Some(8_001), downloaded: false, downloading: false });
}

#[test]
fn the_same_version_in_the_feed_is_not_available() {
    let (answer, _) = run(SIDELOAD, &cache("same"), SystemTime::now(), "0.7.0", Ok(feed("0.7.0")));

    assert_eq!(answer, Check::default());
}

#[test]
fn store_and_source_builds_never_read_the_feed() {
    for build in [Build::Store { plus: true }, Build::Store { plus: false }, Build::Unlocked { sideload: false }] {
        let (answer, requests) = run(build, &cache("store"), SystemTime::now(), "0.7.0", Ok(feed("0.8.0")));

        assert_eq!((answer, requests), (Check::default(), 0), "{build:?}");
    }
}

#[test]
fn reads_the_feed_at_most_once_a_day_and_remembers_its_answer() {
    let cache = cache("daily");
    let morning = SystemTime::now();
    run(SIDELOAD, &cache, morning, "0.7.0", Ok(feed("0.8.0")));

    let evening = morning + Duration::from_secs(23 * 60 * 60);
    let (answer, requests) = run(SIDELOAD, &cache, evening, "0.7.0", Ok(feed("0.9.0")));
    assert_eq!((answer.version_code, requests), (Some(8_000), 0));

    let tomorrow = morning + Duration::from_secs(24 * 60 * 60);
    let (answer, requests) = run(SIDELOAD, &cache, tomorrow, "0.7.0", Ok(feed("0.9.0")));
    assert_eq!((answer.version_code, requests), (Some(9_000), 1));
}

#[test]
fn the_notice_goes_once_the_player_updates() {
    let cache = cache("updated");
    let now = SystemTime::now();
    run(SIDELOAD, &cache, now, "0.7.0", Ok(feed("0.8.0")));

    let (answer, _) = run(SIDELOAD, &cache, now, "0.8.0", Ok(feed("0.8.0")));

    assert_eq!(answer, Check::default());
}

#[test]
fn a_failed_read_waits_a_day_and_keeps_the_last_answer() {
    let cache = cache("failed");
    let morning = SystemTime::now();
    run(SIDELOAD, &cache, morning, "0.7.0", Ok(feed("0.8.0")));

    let tomorrow = morning + Duration::from_secs(24 * 60 * 60);
    let (answer, _) = run(SIDELOAD, &cache, tomorrow, "0.7.0", Err("offline".to_owned()));
    assert_eq!(answer.version_code, Some(8_000));

    let (_, requests) = run(SIDELOAD, &cache, tomorrow + Duration::from_secs(60), "0.7.0", Ok(feed("0.9.0")));
    assert_eq!(requests, 0);
}
