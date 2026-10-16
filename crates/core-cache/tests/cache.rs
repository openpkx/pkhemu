use core_cache::{Cache, Key, Outcome};
use std::cell::Cell;
use std::fs;
use std::path::Path;

fn key(value: &str) -> Key {
    let mut key = Key::new();
    key.add("recipe", value);
    key
}

#[test]
fn a_second_tree_reuses_the_first_trees_build() {
    let (cache, first, second) =
        (tempfile::tempdir().unwrap(), tempfile::tempdir().unwrap(), tempfile::tempdir().unwrap());
    let cache = Cache::new(cache.path());
    let builds = Cell::new(0);
    let build = |out: &Path| {
        let library = out.join("build/libcore.so");
        let outcome = cache.fetch_or_build("core", key("a"), &[&library], || {
            builds.set(builds.get() + 1);
            fs::create_dir_all(library.parent().unwrap()).unwrap();
            fs::write(&library, "built").unwrap();
        });
        (outcome, fs::read_to_string(&library).unwrap())
    };

    assert_eq!(build(first.path()), (Outcome::Stored, "built".into()));
    assert_eq!(build(second.path()), (Outcome::Hit, "built".into()));
    assert_eq!(builds.get(), 1);
}

fn build_counting(cache: &Cache, key: Key, library: &Path, builds: &Cell<u32>) -> Outcome {
    cache.fetch_or_build("core", key, &[library], || {
        builds.set(builds.get() + 1);
        fs::create_dir_all(library.parent().unwrap()).unwrap();
        fs::write(library, format!("build {}", builds.get())).unwrap();
    })
}

#[test]
fn a_new_key_builds_again() {
    let (dir, out) = (tempfile::tempdir().unwrap(), tempfile::tempdir().unwrap());
    let (cache, library, builds) = (Cache::new(dir.path()), out.path().join("libcore.so"), Cell::new(0));
    build_counting(&cache, key("a"), &library, &builds);
    assert_eq!(build_counting(&cache, key("b"), &library, &builds), Outcome::Stored);
    assert_eq!(build_counting(&cache, key("a"), &library, &builds), Outcome::Hit);
    assert_eq!(fs::read_to_string(&library).unwrap(), "build 1");
}

#[test]
fn a_broken_entry_is_built_again_and_replaced() {
    let (dir, out) = (tempfile::tempdir().unwrap(), tempfile::tempdir().unwrap());
    let (cache, library, builds) = (Cache::new(dir.path()), out.path().join("libcore.so"), Cell::new(0));
    build_counting(&cache, key("a"), &library, &builds);
    for entry in fs::read_dir(dir.path().join("core")).unwrap() {
        for file in fs::read_dir(entry.unwrap().path()).unwrap() {
            fs::remove_file(file.unwrap().path()).unwrap();
        }
    }
    assert_eq!(build_counting(&cache, key("a"), &library, &builds), Outcome::Stored);
    assert_eq!(build_counting(&cache, key("a"), &library, &builds), Outcome::Hit);
    assert_eq!(fs::read_to_string(&library).unwrap(), "build 2");
}

#[test]
fn a_build_that_loses_the_race_to_store_keeps_its_own_output() {
    let (dir, out) = (tempfile::tempdir().unwrap(), tempfile::tempdir().unwrap());
    let (cache, library, builds) = (Cache::new(dir.path()), out.path().join("libcore.so"), Cell::new(0));
    let outcome = cache.fetch_or_build("core", key("a"), &[&library], || {
        build_counting(&cache, key("a"), &library, &builds);
        fs::write(&library, "racer").unwrap();
    });
    assert_eq!(outcome, Outcome::Stored);
    assert_eq!(fs::read_to_string(&library).unwrap(), "racer");
    assert_eq!(build_counting(&cache, key("a"), &library, &builds), Outcome::Hit);
    assert_eq!(fs::read_to_string(&library).unwrap(), "build 1");
    assert_eq!(fs::read_dir(dir.path().join("core")).unwrap().count(), 1);
}

#[test]
fn storing_drops_the_least_recently_used_entries_past_the_limit() {
    let (dir, out) = (tempfile::tempdir().unwrap(), tempfile::tempdir().unwrap());
    let (cache, library, builds) = (Cache::new(dir.path()).keep(2), out.path().join("libcore.so"), Cell::new(0));
    build_counting(&cache, key("a"), &library, &builds);
    build_counting(&cache, key("b"), &library, &builds);
    build_counting(&cache, key("a"), &library, &builds);
    build_counting(&cache, key("c"), &library, &builds);
    assert_eq!(builds.get(), 3);
    assert_eq!(fs::read_dir(dir.path().join("core")).unwrap().count(), 2);
    assert_eq!(build_counting(&cache, key("a"), &library, &builds), Outcome::Hit);
    assert_eq!(build_counting(&cache, key("c"), &library, &builds), Outcome::Hit);
    assert_eq!(build_counting(&cache, key("b"), &library, &builds), Outcome::Stored);
}

#[test]
fn a_build_never_starts_from_a_restored_output() {
    let (dir, out) = (tempfile::tempdir().unwrap(), tempfile::tempdir().unwrap());
    let (cache, library, builds) = (Cache::new(dir.path()), out.path().join("libcore.so"), Cell::new(0));
    build_counting(&cache, key("a"), &library, &builds);
    let saw_output = Cell::new(true);
    cache.fetch_or_build("core", key("b"), &[&library], || {
        saw_output.set(library.exists());
        fs::write(&library, "b").unwrap();
    });
    assert!(!saw_output.get());
}

#[test]
fn with_the_cache_off_every_build_runs_from_scratch() {
    let out = tempfile::tempdir().unwrap();
    let (cache, library, builds) = (Cache::off(), out.path().join("libcore.so"), Cell::new(0));
    fs::write(&library, "old").unwrap();
    assert!(matches!(build_counting(&cache, key("a"), &library, &builds), Outcome::Uncached(_)));
    assert!(matches!(build_counting(&cache, key("a"), &library, &builds), Outcome::Uncached(_)));
    assert_eq!(fs::read_to_string(&library).unwrap(), "build 2");
}
