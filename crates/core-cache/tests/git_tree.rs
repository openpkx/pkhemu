use core_cache::{Cache, Key, Outcome};
use std::fs;
use std::path::Path;
use std::process::Command;

fn git(repo: &Path, args: &[&str]) {
    let status = Command::new("git")
        .arg("-C")
        .arg(repo)
        .args(["-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false"])
        .args(args)
        .status()
        .unwrap();
    assert!(status.success());
}

fn build(cache: &Cache, source: &Path, library: &Path) -> Outcome {
    let mut key = Key::new();
    key.git_tree(source);
    cache.fetch_or_build("core", key, &[library], || {
        fs::write(library, fs::read(source.join("core.c")).unwrap()).unwrap()
    })
}

#[test]
fn a_source_tree_is_cached_by_its_commit_and_never_while_dirty() {
    let (dir, source, out) = (tempfile::tempdir().unwrap(), tempfile::tempdir().unwrap(), tempfile::tempdir().unwrap());
    let (cache, source, library) = (Cache::new(dir.path()), source.path(), out.path().join("libcore.so"));
    git(source, &["init", "-q"]);
    fs::write(source.join("core.c"), "one").unwrap();
    git(source, &["add", "."]);
    git(source, &["commit", "-qm", "one"]);
    assert_eq!(build(&cache, source, &library), Outcome::Stored);
    assert_eq!(build(&cache, source, &library), Outcome::Hit);

    fs::write(source.join("core.c"), "two").unwrap();
    assert!(matches!(build(&cache, source, &library), Outcome::Uncached(_)));
    assert_eq!(fs::read_to_string(&library).unwrap(), "two");

    fs::write(source.join("new.c"), "").unwrap();
    git(source, &["checkout", "-q", "core.c"]);
    assert!(matches!(build(&cache, source, &library), Outcome::Uncached(_)));

    git(source, &["add", "."]);
    git(source, &["commit", "-qm", "two"]);
    assert_eq!(build(&cache, source, &library), Outcome::Stored);
}

#[test]
fn a_source_outside_git_is_never_cached() {
    let (dir, source, out) = (tempfile::tempdir().unwrap(), tempfile::tempdir().unwrap(), tempfile::tempdir().unwrap());
    let (cache, library) = (Cache::new(dir.path()), out.path().join("libcore.so"));
    fs::write(source.path().join("core.c"), "one").unwrap();
    assert!(matches!(build(&cache, source.path(), &library), Outcome::Uncached(_)));
    assert!(matches!(build(&cache, source.path(), &library), Outcome::Uncached(_)));
}

#[test]
fn a_folder_inside_a_checkout_is_never_cached() {
    let (dir, source, out) = (tempfile::tempdir().unwrap(), tempfile::tempdir().unwrap(), tempfile::tempdir().unwrap());
    let (cache, library) = (Cache::new(dir.path()), out.path().join("libcore.so"));
    git(source.path(), &["init", "-q"]);
    git(source.path(), &["commit", "-q", "--allow-empty", "-m", "empty"]);
    let folder = source.path().join("vendor");
    fs::create_dir(&folder).unwrap();
    fs::write(folder.join("core.c"), "one").unwrap();
    git(source.path(), &["add", "."]);
    git(source.path(), &["commit", "-qm", "core"]);
    assert!(matches!(build(&cache, &folder, &library), Outcome::Uncached(_)));
}
