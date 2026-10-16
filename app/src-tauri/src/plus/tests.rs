use super::fake::FakeStore;
use super::{Bought, Build, Plus, Purchases, Status};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

fn data_dir(name: &str) -> PathBuf {
    let dir = std::env::temp_dir().join(format!("pkh-emu-plus-{name}-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).unwrap();
    dir
}

struct Started {
    plus: Plus,
    changes: Arc<Mutex<Vec<Status>>>,
}

fn start(dir: &PathBuf, store: Option<Arc<dyn Purchases>>) -> Started {
    let build = if store.is_some() { Build::Store { plus: true } } else { Build::Unlocked { sideload: false } };
    start_build(dir, build, store)
}

fn start_build(dir: &PathBuf, build: Build, store: Option<Arc<dyn Purchases>>) -> Started {
    let changes = Arc::new(Mutex::new(Vec::new()));
    let seen = changes.clone();
    let plus = Plus::new(dir, build, store, Box::new(move |status: &Status| seen.lock().unwrap().push(status.clone())));
    Started { plus, changes }
}

fn status_with(name: &str, store: FakeStore) -> Status {
    let started = start(&data_dir(name), Some(Arc::new(store)));
    tauri::async_runtime::block_on(started.plus.check())
}

fn not_owned() -> Status {
    Status::NotOwned { price: "$3.99".into() }
}

#[test]
fn a_build_that_isnt_a_store_build_is_unlocked() {
    let started = start(&data_dir("unlocked"), None);

    assert_eq!(tauri::async_runtime::block_on(started.plus.check()), Status::Unlocked { sideload: false });
}

#[test]
fn a_sideload_build_is_unlocked_and_says_so() {
    let started = start_build(&data_dir("sideload"), Build::Unlocked { sideload: true }, None);

    assert_eq!(tauri::async_runtime::block_on(started.plus.check()), Status::Unlocked { sideload: true });
    assert_eq!(started.plus.cached(), Some(Status::Unlocked { sideload: true }));
    assert!(started.plus.syncs());
}

#[test]
fn reports_each_status_from_the_store() {
    assert_eq!(status_with("not-owned", FakeStore::selling("$3.99")), not_owned());
    assert_eq!(status_with("owned", FakeStore::selling("$3.99").owning()), Status::Owned);
    assert_eq!(status_with("missing", FakeStore::missing()), Status::Unavailable);
    assert_eq!(status_with("not-selling", FakeStore::not_selling()), Status::Unavailable);
}

#[test]
fn buying_moves_not_owned_to_owned() {
    let started = start(&data_dir("buy"), Some(Arc::new(FakeStore::selling("$3.99"))));

    let bought = tauri::async_runtime::block_on(async {
        started.plus.check().await;
        started.plus.buy().await
    });

    assert_eq!(bought, Ok(Bought::Purchased));
    assert_eq!(*started.changes.lock().unwrap(), [not_owned(), Status::Owned]);
}

#[test]
fn a_pending_purchase_stays_not_owned() {
    let store = FakeStore::selling("$3.99").answering(Bought::Pending);
    let started = start(&data_dir("pending"), Some(Arc::new(store)));

    let bought = tauri::async_runtime::block_on(async {
        started.plus.check().await;
        started.plus.buy().await
    });

    assert_eq!(bought, Ok(Bought::Pending));
    assert_eq!(*started.changes.lock().unwrap(), [not_owned()]);
}

#[test]
fn a_build_that_isnt_a_store_build_refuses_to_buy() {
    let started = start(&data_dir("buy-unlocked"), None);

    assert!(tauri::async_runtime::block_on(started.plus.buy()).is_err());
}

#[test]
fn reports_a_change_only_once() {
    let store = Arc::new(FakeStore::selling("$3.99").owning());
    let started = start(&data_dir("once"), Some(store.clone()));

    tauri::async_runtime::block_on(async {
        started.plus.check().await;
        started.plus.check().await;
        store.refund();
        started.plus.check().await;
    });

    assert_eq!(*started.changes.lock().unwrap(), [Status::Owned, not_owned()]);
}

#[test]
fn an_owned_status_survives_a_restart_with_no_network() {
    let dir = data_dir("restart");
    let online = start(&dir, Some(Arc::new(FakeStore::selling("$3.99").owning())));
    tauri::async_runtime::block_on(online.plus.check());

    let offline = start(&dir, Some(Arc::new(FakeStore::selling("$3.99").owning().offline())));

    assert_eq!(offline.plus.cached(), Some(Status::Owned));
    assert_eq!(tauri::async_runtime::block_on(offline.plus.check()), Status::Owned);
    assert!(offline.changes.lock().unwrap().is_empty());
}

#[test]
fn keeps_the_last_answer_while_the_store_is_unreachable() {
    let store = Arc::new(FakeStore::selling("$3.99"));
    let started = start(&data_dir("unreachable"), Some(store.clone()));

    let status = tauri::async_runtime::block_on(async {
        started.plus.check().await;
        store.go_offline(true);
        started.plus.check().await
    });

    assert_eq!(status, not_owned());
}

#[test]
fn is_unavailable_offline_with_no_last_answer() {
    assert_eq!(status_with("offline", FakeStore::selling("$3.99").offline()), Status::Unavailable);
}

#[test]
fn sends_the_status_in_the_shape_the_frontend_reads() {
    let json = |status: Status| serde_json::to_value(status).unwrap();

    assert_eq!(json(not_owned()), serde_json::json!({ "state": "notOwned", "price": "$3.99" }));
    assert_eq!(
        json(Status::Unlocked { sideload: false }),
        serde_json::json!({ "state": "unlocked", "sideload": false })
    );
    assert_eq!(json(Status::Unlocked { sideload: true }), serde_json::json!({ "state": "unlocked", "sideload": true }));
}

#[test]
fn keeps_an_owned_plus_while_the_store_is_unavailable() {
    let dir = data_dir("owned-unavailable");
    let online = start(&dir, Some(Arc::new(FakeStore::selling("$3.99").owning())));
    tauri::async_runtime::block_on(online.plus.check());

    let signed_out = start(&dir, Some(Arc::new(FakeStore::missing())));

    assert_eq!(tauri::async_runtime::block_on(signed_out.plus.check()), Status::Owned);
}

#[test]
fn reads_the_build_from_the_store_and_plus_keys() {
    assert_eq!(Build::from_keys("", ""), Build::Unlocked { sideload: false });
    assert_eq!(Build::from_keys("", "on"), Build::Unlocked { sideload: false });
    assert_eq!(Build::from_keys("play", ""), Build::Store { plus: false });
    assert_eq!(Build::from_keys("play", "on"), Build::Store { plus: true });
    assert_eq!(Build::from_keys("appstore", "on"), Build::Store { plus: true });
    assert_eq!(Build::from_keys("sideload", ""), Build::Unlocked { sideload: true });
}

#[test]
fn only_a_store_build_without_plus_leaves_out_sync() {
    assert!(Build::Unlocked { sideload: false }.offers_sync());
    assert!(Build::Unlocked { sideload: true }.offers_sync());
    assert!(Build::Store { plus: true }.offers_sync());
    assert!(!Build::Store { plus: false }.offers_sync());
}

#[test]
fn a_store_build_without_a_store_on_this_device_is_unavailable() {
    let started = start_build(&data_dir("no-store"), Build::Store { plus: true }, None);

    assert_eq!(tauri::async_runtime::block_on(started.plus.check()), Status::Unavailable);
    assert!(tauri::async_runtime::block_on(started.plus.buy()).is_err());
}
