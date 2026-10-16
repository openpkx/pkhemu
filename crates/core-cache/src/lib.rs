use sha2::{Digest, Sha256};
use std::fs;
use std::io;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

pub struct Key {
    hasher: Sha256,
    uncacheable: Option<String>,
}

impl Key {
    pub fn new() -> Self {
        Key { hasher: Sha256::new(), uncacheable: None }
    }

    pub fn add(&mut self, label: &str, value: impl AsRef<[u8]>) -> &mut Self {
        let value = value.as_ref();
        for part in [label.as_bytes(), value] {
            self.hasher.update((part.len() as u64).to_le_bytes());
            self.hasher.update(part);
        }
        self
    }

    // The commit pins every nested submodule, so a clean tree is fully named by it.
    pub fn git_tree(&mut self, dir: &Path) -> &mut Self {
        let git = |args: &[&str]| {
            let output = Command::new("git").arg("-C").arg(dir).args(args).output().ok()?;
            output.status.success().then_some(output.stdout)
        };
        // An uninitialised submodule's folder would answer for the repo around it.
        let commit = git(&["rev-parse", "--show-prefix", "HEAD"]).filter(|output| output.starts_with(b"\n"));
        match (commit, git(&["status", "--porcelain", "--ignore-submodules=none", "--untracked-files=normal"])) {
            (Some(commit), Some(status)) if status.is_empty() => self.add("git tree", commit),
            (Some(_), Some(_)) => self.uncacheable(format!("{} has changes", dir.display())),
            _ => self.uncacheable(format!("{} isn't the top of a git checkout", dir.display())),
        }
    }

    pub fn file(&mut self, path: &Path) -> &mut Self {
        match fs::read(path) {
            Ok(contents) => self.add("file", contents),
            Err(error) => self.uncacheable(format!("{}: {error}", path.display())),
        }
    }

    pub fn uncacheable(&mut self, reason: String) -> &mut Self {
        self.uncacheable.get_or_insert(reason);
        self
    }

    fn finish(self) -> String {
        self.hasher.finalize().iter().map(|byte| format!("{byte:02x}")).collect()
    }
}

impl Default for Key {
    fn default() -> Self {
        Key::new()
    }
}

#[derive(Debug, PartialEq)]
pub enum Outcome {
    Hit,
    Stored,
    Uncached(String),
}

pub struct Cache {
    dir: Option<PathBuf>,
    keep: usize,
}

impl Cache {
    pub fn new(dir: &Path) -> Self {
        Cache { dir: Some(dir.to_path_buf()), keep: 3 }
    }

    pub fn off() -> Self {
        Cache { dir: None, keep: 0 }
    }

    pub fn keep(self, keep: usize) -> Self {
        Cache { keep, ..self }
    }

    pub fn fetch_or_build(&self, core: &str, mut key: Key, outputs: &[&Path], build: impl FnOnce()) -> Outcome {
        for output in outputs {
            key.add("output", output.file_name().unwrap().as_encoded_bytes());
        }
        let Some(dir) = &self.dir else {
            fresh_build(outputs, build);
            return Outcome::Uncached("the cache is off".into());
        };
        if let Some(reason) = key.uncacheable.take() {
            fresh_build(outputs, build);
            return Outcome::Uncached(reason);
        }
        let core_dir = dir.join(core);
        let entry = core_dir.join(key.finish());
        if entry.is_dir() {
            match restore(&entry, outputs) {
                Ok(()) => {
                    mark_used(&entry);
                    return Outcome::Hit;
                }
                Err(error) => {
                    eprintln!("{core}: discarding the broken cache entry {}: {error}", entry.display());
                    discard(&entry);
                }
            }
        }
        fresh_build(outputs, build);
        match store(&entry, outputs) {
            Ok(()) => prune(&core_dir, self.keep),
            Err(error) => eprintln!("{core}: couldn't cache the build in {}: {error}", entry.display()),
        }
        Outcome::Stored
    }
}

// An output restored from the cache is newer than the objects the build tree holds, so make would keep it.
fn fresh_build(outputs: &[&Path], build: impl FnOnce()) {
    for output in outputs {
        let _ = fs::remove_file(output);
    }
    build();
}

fn cached_name(index: usize, output: &Path) -> String {
    format!("{index}-{}", output.file_name().unwrap().to_string_lossy())
}

fn restore(entry: &Path, outputs: &[&Path]) -> io::Result<()> {
    for (index, output) in outputs.iter().enumerate() {
        fs::create_dir_all(output.parent().unwrap())?;
        // APFS clones a copy only into a new file.
        let _ = fs::remove_file(output);
        fs::copy(entry.join(cached_name(index, output)), output)?;
    }
    Ok(())
}

// Parallel builds share the cache, so an entry only appears once it's whole.
fn store(entry: &Path, outputs: &[&Path]) -> io::Result<()> {
    let temp = sibling(entry, ".tmp");
    let copied = (|| {
        fs::create_dir_all(&temp)?;
        for (index, output) in outputs.iter().enumerate() {
            fs::copy(output, temp.join(cached_name(index, output)))?;
        }
        fs::write(temp.join(USED), "")?;
        fs::rename(&temp, entry)
    })();
    if copied.is_err() {
        let _ = fs::remove_dir_all(&temp);
        if entry.is_dir() {
            // Another build stored the same key first.
            return Ok(());
        }
    }
    copied
}

const USED: &str = "used";

fn mark_used(entry: &Path) {
    let _ =
        fs::File::options().write(true).open(entry.join(USED)).and_then(|file| file.set_modified(SystemTime::now()));
}

fn last_used(entry: &Path) -> SystemTime {
    fs::metadata(entry.join(USED)).and_then(|metadata| metadata.modified()).unwrap_or(UNIX_EPOCH)
}

fn prune(core: &Path, keep: usize) {
    let Ok(dirs) = fs::read_dir(core) else { return };
    let (mut entries, leftovers): (Vec<PathBuf>, Vec<PathBuf>) = dirs
        .flatten()
        .map(|dir| dir.path())
        .partition(|path| !path.file_name().unwrap().to_string_lossy().starts_with('.'));
    entries.sort_by_key(|entry| std::cmp::Reverse(last_used(entry)));
    for entry in entries.iter().skip(keep) {
        discard(entry);
    }
    // A build that was killed mid-store leaves its temporary copy behind.
    let day_ago = SystemTime::now() - Duration::from_secs(24 * 60 * 60);
    for leftover in leftovers {
        if fs::metadata(&leftover).and_then(|metadata| metadata.modified()).is_ok_and(|modified| modified < day_ago) {
            let _ = fs::remove_dir_all(leftover);
        }
    }
}

// Renamed first, so no reader ever sees an entry with some files gone.
fn discard(entry: &Path) {
    let trash = sibling(entry, ".trash");
    if fs::rename(entry, &trash).is_ok() {
        let _ = fs::remove_dir_all(trash);
    }
}

fn sibling(entry: &Path, prefix: &str) -> PathBuf {
    let nanos = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos();
    entry.with_file_name(format!("{prefix}-{}-{nanos}", std::process::id()))
}
