use super::memory::Memory;
use super::{Cloud, Syncer};
use crate::plus::fake::FakeStore;
use crate::plus::{Build, Plus, Purchases, Status};
use std::sync::Arc;
use tauri::async_runtime::block_on;

fn keyed(_: Cloud) -> bool {
    true
}

fn syncer(name: &str, build: Build, store: Option<Arc<FakeStore>>) -> Syncer {
    let dir = std::env::temp_dir().join(format!("pkh-emu-sync-plus-{name}-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).unwrap();
    let store = store.map(|store| store as Arc<dyn Purchases>);
    let plus = Arc::new(Plus::new(&dir, build, store, Box::new(|_| {})));
    Syncer::new(&dir, Arc::default(), plus)
}

fn sign_in(syncer: &Syncer) {
    syncer.check_sign_in(Cloud::Google, keyed).unwrap();
    syncer.connect(Some((Cloud::Google, Arc::new(Memory::default()))));
}

#[test]
fn a_build_without_a_store_key_is_unlocked_and_syncs() {
    let syncer = syncer("unlocked", Build::Unlocked, None);

    assert_eq!(block_on(syncer.plus.check()), Status::Unlocked);
    assert_eq!(syncer.available(keyed), [Cloud::Google, Cloud::Dropbox]);
    sign_in(&syncer);
    assert!(syncer.provider().is_ok());
}

#[test]
fn a_store_build_with_plus_off_offers_no_clouds() {
    let store = Arc::new(FakeStore::selling("$3.99").owning());
    let syncer = syncer("plus-off", Build::Store { plus: false }, Some(store));
    block_on(syncer.plus.check());

    assert!(syncer.available(keyed).is_empty());
    assert!(syncer.check_sign_in(Cloud::Google, keyed).is_err());
}

#[test]
fn a_store_build_with_plus_on_syncs_only_while_plus_is_owned() {
    let store = Arc::new(FakeStore::selling("$3.99"));
    let syncer = syncer("plus-on", Build::Store { plus: true }, Some(store.clone()));
    block_on(syncer.plus.check());

    assert_eq!(syncer.available(keyed), [Cloud::Google, Cloud::Dropbox]);
    assert!(syncer.check_sign_in(Cloud::Google, keyed).is_err());

    block_on(syncer.plus.buy()).unwrap();
    sign_in(&syncer);
    assert!(syncer.provider().is_ok());

    store.refund();
    block_on(syncer.plus.check());
    assert!(syncer.provider().is_err());
    assert_eq!(syncer.account(), None);
    assert!(syncer.connected().is_some());
}

#[test]
fn buying_again_resumes_the_account_that_stayed_signed_in() {
    let store = Arc::new(FakeStore::selling("$3.99").owning());
    let syncer = syncer("bought-again", Build::Store { plus: true }, Some(store.clone()));
    block_on(syncer.plus.check());
    sign_in(&syncer);
    store.refund();
    block_on(syncer.plus.check());

    block_on(syncer.plus.buy()).unwrap();

    assert!(syncer.provider().is_ok());
    assert_eq!(syncer.account().as_deref(), Some("player@example.com"));
}

#[test]
fn a_store_build_needs_an_answer_from_the_store_before_it_syncs() {
    let store = Arc::new(FakeStore::selling("$3.99").offline());
    let syncer = syncer("no-answer", Build::Store { plus: true }, Some(store));
    block_on(syncer.plus.check());

    assert!(syncer.check_sign_in(Cloud::Google, keyed).is_err());
}
