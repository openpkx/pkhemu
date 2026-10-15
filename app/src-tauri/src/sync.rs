mod drive;
mod dropbox;
mod dropbox_sign_in;
#[cfg(test)]
mod fake_drive;
#[cfg(test)]
mod fake_dropbox;
#[cfg(test)]
mod fake_http;
mod google;
mod in_use;
mod kept;
#[cfg(test)]
mod memory;
mod network;
mod oauth;
#[cfg(test)]
mod plus_tests;
mod progress;
mod provider;
mod queue;
mod record;
mod removed;
mod skins;
#[cfg(test)]
mod tests;

#[cfg_attr(target_os = "android", path = "sync/android.rs")]
#[cfg_attr(target_os = "ios", path = "sync/ios.rs")]
#[cfg_attr(desktop, path = "sync/desktop.rs")]
mod platform;

pub use platform::*;

pub use in_use::InUse;
pub use oauth::{http, tls};
pub use progress::{Events, GameState, RunProgress, Stage, Tracker, Wait};
pub use provider::{BoxFuture, Error, Provider, Versioned};
pub use record::syncs;

use crate::backups::{self, Reason};
use crate::games_folder::{DirEntry, GamesFolder};
use crate::index::{self, FileHash, Index, PendingUpload, SyncedFile, SyncedGame};
use crate::plus::Plus;
use crate::save;
use crate::three_ds::update;
use crate::{box_art, cheats, game_art, keep_alive, rom};
use queue::{KeepAlive, Queue, Request};
use record::{Blob, Entry, Record, Unit};
use serde::{Deserialize, Serialize};
use sha1::{Digest, Sha1};
use std::collections::{BTreeMap, BTreeSet, HashMap, HashSet};
use std::future::Future;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter, Manager, Runtime, State};

const SYSTEMS: [&str; 6] = ["gb", "gbc", "gba", "nds", "n64", "3ds"];
const ROM_EXTENSIONS: [&str; 9] = ["gb", "gbc", "gba", "nds", "z64", "n64", "v64", "zip", "7z"];
const RETRIES: usize = 8;
const FIRST_RETRY: Duration = Duration::from_secs(1);
const LONGEST_RETRY: Duration = Duration::from_secs(60);
const STALE_RETRIES: usize = 3;
const RETIRED_FOR: Duration = Duration::from_secs(30 * 24 * 60 * 60);

pub type Sleep = dyn Fn(Duration) -> BoxFuture<'static, ()> + Send + Sync;
pub type OnProgress<'a> = dyn Fn(u64, u64) + Sync + 'a;

struct Checked {
    rom: String,
    game: Game,
    files: u64,
    rom_size: Option<u64>,
    moved: bool,
}

impl Checked {
    fn bytes(&self) -> u64 {
        self.files + self.rom_size.unwrap_or(0)
    }
}

struct PendingRom {
    rom: String,
    id: String,
    conflicted: bool,
}

struct LocalUpdate {
    version: u16,
    size: u64,
    modified: SystemTime,
}

enum UpdateTransfer {
    Up(LocalUpdate),
    Down(record::Update),
}

impl UpdateTransfer {
    fn size(&self) -> u64 {
        match self {
            UpdateTransfer::Up(local) => local.size,
            UpdateTransfer::Down(cloud) => cloud.size,
        }
    }
}

#[derive(Serialize, Clone, Debug, Default, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Synced {
    pub path: String,
    pub conflicts: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    #[serde(skip)]
    pub account_error: bool,
}

impl Synced {
    fn failed(rom: &str, e: &Error) -> Synced {
        let mut synced = Synced { path: rom.into(), ..Synced::default() };
        synced.fail(e);
        synced
    }

    fn fail(&mut self, e: &Error) {
        self.error = Some(e.to_string());
        self.account_error = matches!(e, Error::Account(_));
    }
}

pub type Report = BTreeMap<String, Synced>;

#[derive(Deserialize, Clone, Copy, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum Choice {
    Device,
    Cloud,
}

#[derive(Serialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Conflict {
    pub file: String,
    pub device: Version,
    pub cloud: Version,
}

#[derive(Serialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Version {
    pub saved_on: String,
    pub modified: Option<i64>,
    pub cheats: bool,
}

#[derive(Clone, Debug, PartialEq)]
struct Local {
    size: u64,
    mtime: i64,
    sha1: String,
}

#[derive(Clone, Copy, Debug, PartialEq)]
enum Bond {
    Known,
    Found,
    Renamed,
    New,
}

struct Game {
    id: String,
    path: String,
    bond: Bond,
}

#[derive(Clone, Debug, PartialEq)]
enum Step {
    Agree(String),
    Upload(String),
    DeleteCloud(String),
    Download(String),
    DeleteLocal(String),
    Newer(String),
    Conflict(Unit),
}

type Sha1s = BTreeMap<String, String>;

#[derive(Clone, Copy, PartialEq)]
enum Winner {
    Device,
    Cloud,
}

/// `deleted` is what the app logged deleting. A file missing here for any other reason comes back down.
fn plan(rom: &str, local: &Sha1s, base: &Sha1s, cloud: &Sha1s, deleted: &Sha1s) -> Vec<Step> {
    let mut units: BTreeMap<Unit, BTreeSet<&String>> = BTreeMap::new();
    for path in local.keys().chain(base.keys()).chain(cloud.keys()) {
        units.entry(Unit::of(rom, path)).or_default().insert(path);
    }
    let changed = |side: &Sha1s, path: &String| side.get(path) != base.get(path);
    let winner = |paths: &[&String]| {
        if !paths.iter().any(|path| changed(local, path)) {
            Some(Winner::Cloud)
        } else if !paths.iter().any(|path| changed(cloud, path)) || paths.iter().all(|path| !cloud.contains_key(*path)) {
            Some(Winner::Device)
        } else if paths.iter().all(|path| !local.contains_key(*path)) {
            Some(Winner::Cloud)
        } else {
            None
        }
    };
    let mut steps = Vec::new();
    for (unit, paths) in units {
        let paths: Vec<&String> = paths.into_iter().collect();
        let unit_winner = winner(&paths);
        // Only a save or a slot's state and save make a conflict. The files beside them go with whichever the player picks.
        let conflict = unit_winner.is_none()
            && paths.iter().any(|path| record::decides(rom, path) && changed(local, path) && changed(cloud, path) && local.get(*path) != cloud.get(*path));
        if conflict {
            steps.push(Step::Conflict(unit));
            continue;
        }
        for path in paths {
            let path_winner = unit_winner.or_else(|| winner(&[path]));
            steps.push(match (local.get(path) == cloud.get(path), path_winner) {
                (true, _) => Step::Agree(path.clone()),
                (false, _) if !local.contains_key(path) && deleted.get(path) == cloud.get(path) => {
                    Step::DeleteCloud(path.clone())
                }
                (false, _) if !local.contains_key(path) => Step::Download(path.clone()),
                (false, Some(Winner::Device)) => Step::Upload(path.clone()),
                (false, Some(Winner::Cloud)) if cloud.contains_key(path) => Step::Download(path.clone()),
                (false, Some(Winner::Cloud)) => Step::DeleteLocal(path.clone()),
                (false, None) => Step::Newer(path.clone()),
            });
        }
    }
    // A slot counts as filled once its state is there, so states come down last.
    steps.sort_by_key(|step| matches!(step, Step::Download(path) if path.ends_with(".state")));
    steps
}

struct Hashing<T> {
    inner: T,
    sha1: Sha1,
}

impl<T> Hashing<T> {
    fn new(inner: T) -> Hashing<T> {
        Hashing { inner, sha1: Sha1::new() }
    }

    fn finish(self) -> (T, String) {
        (self.inner, hex(&self.sha1.finalize()))
    }
}

impl<T: Read> Read for Hashing<T> {
    fn read(&mut self, buf: &mut [u8]) -> std::io::Result<usize> {
        let read = self.inner.read(buf)?;
        self.sha1.update(&buf[..read]);
        Ok(read)
    }
}

impl<T: Write> Write for Hashing<T> {
    fn write(&mut self, buf: &[u8]) -> std::io::Result<usize> {
        let written = self.inner.write(buf)?;
        self.sha1.update(&buf[..written]);
        Ok(written)
    }

    fn flush(&mut self) -> std::io::Result<()> {
        self.inner.flush()
    }
}

struct Counting<'a, T> {
    inner: T,
    done: u64,
    total: u64,
    progress: &'a OnProgress<'a>,
}

impl<T: Write> Write for Counting<'_, T> {
    fn write(&mut self, buf: &[u8]) -> std::io::Result<usize> {
        let written = self.inner.write(buf)?;
        let percent = |done: u64| done * 100 / self.total.max(1);
        let before = percent(self.done);
        self.done += written as u64;
        if percent(self.done) != before {
            (self.progress)(self.done, self.total);
        }
        Ok(written)
    }

    fn flush(&mut self) -> std::io::Result<()> {
        self.inner.flush()
    }
}

/// Cuts a transfer short when `stop` says so. An upload resumes from where it got to.
struct Stopping<'a, T> {
    inner: T,
    stop: Option<&'a (dyn Fn() -> bool + Sync)>,
}

impl<T: Read> Read for Stopping<'_, T> {
    fn read(&mut self, buf: &mut [u8]) -> std::io::Result<usize> {
        if self.stop.is_some_and(|stop| stop()) {
            return Err(std::io::Error::other("the upload paused"));
        }
        self.inner.read(buf)
    }
}

impl<T: Write> Write for Stopping<'_, T> {
    fn write(&mut self, buf: &[u8]) -> std::io::Result<usize> {
        if self.stop.is_some_and(|stop| stop()) {
            return Err(std::io::Error::other("the download paused"));
        }
        self.inner.write(buf)
    }

    fn flush(&mut self) -> std::io::Result<()> {
        self.inner.flush()
    }
}

fn is_game(id: &str) -> bool {
    !kept::is_kept(id) && !skins::is_skins(id)
}

fn hex(bytes: &[u8]) -> String {
    bytes.iter().map(|byte| format!("{byte:02x}")).collect()
}

fn millis(time: SystemTime) -> i64 {
    time.duration_since(UNIX_EPOCH).unwrap_or_default().as_millis() as i64
}

// A save keeps its size when it's rewritten, so the hash cache needs a finer clock than milliseconds.
fn nanos(time: SystemTime) -> i64 {
    time.duration_since(UNIX_EPOCH).unwrap_or_default().as_nanos() as i64
}

fn file_name(path: &str) -> &str {
    path.rsplit('/').next().unwrap_or(path)
}

fn parent(path: &str) -> &str {
    path.rsplit_once('/').map_or("", |(dir, _)| dir)
}

fn io(path: impl std::fmt::Display) -> impl FnOnce(std::io::Error) -> Error {
    move |e| Error::Failed(format!("{path}: {e}"))
}

fn is_rom(entry: &DirEntry) -> bool {
    !entry.is_directory
        && !entry.name.starts_with('.')
        && entry.name.rsplit_once('.').is_some_and(|(stem, extension)| {
            !stem.is_empty()
                && ROM_EXTENSIONS
                    .iter()
                    .chain(&rom::THREE_DS_EXTENSIONS)
                    .any(|known| extension.eq_ignore_ascii_case(known))
        })
}

/// The ROMs the library shows: in a system's folder, or one folder below it.
pub async fn scan<R: Runtime>(games: &GamesFolder<'_, R>) -> Vec<String> {
    let mut roms = Vec::new();
    for system in SYSTEMS {
        let entries = games.read_dir(system).await.unwrap_or_default();
        let found: Vec<&DirEntry> = entries.iter().filter(|entry| is_rom(entry)).collect();
        let data: HashSet<String> = found
            .iter()
            .map(|entry| entry.name.rsplit_once('.').map_or(entry.name.as_str(), |(stem, _)| stem).to_lowercase())
            .collect();
        roms.extend(found.iter().map(|entry| format!("{system}/{}", entry.name)));
        for folder in entries.iter().filter(|entry| entry.is_directory && !entry.name.starts_with('.')) {
            if data.contains(&folder.name.to_lowercase()) {
                continue;
            }
            let dir = format!("{system}/{}", folder.name);
            let inside = games.read_dir(&dir).await.unwrap_or_default();
            roms.extend(inside.iter().filter(|entry| is_rom(entry)).map(|entry| format!("{dir}/{}", entry.name)));
        }
    }
    roms
}

pub async fn remove_game<R: Runtime>(games: &GamesFolder<'_, R>, rom: &str) -> Result<(), String> {
    for save in save::paths(rom) {
        if games.has_file(&save).await {
            games.remove_unlogged(&save).await.map_err(|e| format!("{save}: {e}"))?;
        }
    }
    games.remove_dir(&rom::data_dir(rom)).await.map_err(|e| format!("{}: {e}", rom::data_dir(rom)))?;
    // The ROM goes last, so a removal cut short still shows the game and finishes when it's removed again.
    if games.has_file(rom).await {
        games.remove_unlogged(rom).await.map_err(|e| format!("{rom}: {e}"))?;
    }
    Ok(())
}

pub struct Engine<'a, R: Runtime> {
    pub games: &'a GamesFolder<'a, R>,
    pub index: &'a Index,
    pub provider: &'a dyn Provider,
    pub conflicts: &'a Path,
    pub cheat_bases: &'a Path,
    pub kept_copies: &'a Path,
    pub skins: &'a Path,
    pub removed: &'a Path,
    pub device: &'a str,
    pub sleep: &'a Sleep,
    pub events: &'a dyn Events,
    pub in_use: &'a InUse,
    pub sync_games: &'a AtomicBool,
    pub metered: &'a AtomicBool,
    pub mobile_data: &'a AtomicBool,
    pub mobile_roms: &'a AtomicBool,
    pub others_waiting: &'a (dyn Fn() -> bool + Sync),
    pub stopping: &'a AtomicBool,
    pub tracker: Tracker,
    pub stopped_early: AtomicBool,
}

impl<R: Runtime> Engine<'_, R> {
    fn syncs_games(&self) -> bool {
        self.sync_games.load(Ordering::Relaxed)
    }

    fn mobile_data_holds_everything(&self) -> bool {
        self.metered.load(Ordering::Relaxed) && !self.mobile_data.load(Ordering::Relaxed)
    }

    fn mobile_data_holds_roms(&self) -> bool {
        self.metered.load(Ordering::Relaxed)
            && !(self.mobile_data.load(Ordering::Relaxed) && self.mobile_roms.load(Ordering::Relaxed))
    }

    fn stopping(&self) -> bool {
        self.stopping.load(Ordering::Relaxed)
    }

    fn roms_wait(&self) -> bool {
        self.stopping()
            || !self.syncs_games()
            || self.mobile_data_holds_roms()
            || (self.others_waiting)()
            || self.in_use.any_playing()
    }

    // A full sync stops between games for one waiting to open, and leaves the rest for a sync after it.
    fn stops_for_others(&self) -> bool {
        let stops = (self.others_waiting)();
        if stops {
            self.stopped_early.store(true, Ordering::Relaxed);
        }
        stops
    }

    // Only a full sync sends ROMs, so syncing one game, as before it opens, never waits on an upload.
    pub async fn sync_all(&self) -> Result<Report, Error> {
        self.games.remove_half_written(&SYSTEMS).await;
        let roms = scan(self.games).await;
        let (mut report, pending, on_mobile_data) = self.check_and_sync(&roms, true).await?;
        if on_mobile_data || self.stopping() || self.stops_for_others() {
            self.hold_roms(pending.into_iter());
            return Ok(report);
        }
        self.sync_cloud_box_art().await;
        if let Err(e) = self.retry(|| self.provider.purge_retired(RETIRED_FOR)).await {
            eprintln!("purging retired blobs: {e}");
        }
        let kept = self.sync_kept_copies().await;
        let skins = self.sync_skins().await;
        self.sync_roms(pending, &mut report).await;
        kept.and(skins).map(|_| report)
    }

    pub async fn sync(&self, roms: &[String]) -> Result<Report, Error> {
        Ok(self.check_and_sync(roms, false).await?.0)
    }

    async fn check_and_sync(&self, roms: &[String], full: bool) -> Result<(Report, Vec<PendingRom>, bool), Error> {
        if let Err(e) = removed::clear_old(self.removed) {
            eprintln!("{}: {e}", self.removed.display());
        }
        if self.mobile_data_holds_everything() {
            self.wait(roms, Wait::MobileData).await;
            return Err(Error::MobileData);
        }
        let deleted = match self.refresh().await {
            Err(Error::Offline) => {
                self.wait(roms, Wait::Offline).await;
                return Err(Error::Offline);
            }
            deleted => deleted?,
        };
        let mut report = Report::new();
        let checked = self.check(roms, &deleted, full, &mut report).await;
        for game in &checked {
            let bytes = game.bytes();
            if bytes > 0 {
                self.tracker.plan(&game.rom, bytes);
                self.events.game(&game.rom, &GameState::Queued);
            }
        }
        self.emit_run();
        let mut pending = Vec::new();
        let mut on_mobile_data = false;
        let mut checked = checked.into_iter();
        while let Some(next) = checked.next() {
            if full && self.stopping() {
                self.hold_stopped(std::iter::once(next).chain(checked));
                break;
            }
            if full && self.stops_for_others() {
                break;
            }
            if self.mobile_data_holds_everything() {
                on_mobile_data = true;
                self.hold_games(std::iter::once(next).chain(checked));
                break;
            }
            let Checked { rom, game, rom_size, .. } = next;
            let Some(_syncing) = self.in_use.start_syncing(&rom) else {
                self.tracker.settle(&rom, 0);
                self.events.game(&rom, &GameState::Waiting { reason: Wait::Playing });
                self.emit_run();
                continue;
            };
            self.tracker.game(&rom);
            let id = game.id.clone();
            match self.sync_bound(game).await {
                Ok(synced) => {
                    self.tracker.settle(&rom, rom_size.unwrap_or(0));
                    self.emit_run();
                    let conflicted = !synced.conflicts.is_empty();
                    if conflicted {
                        self.events.game(&synced.path, &GameState::Conflict);
                    }
                    match rom_size {
                        Some(_) => {
                            if !conflicted {
                                self.events.game(&rom, &GameState::Queued);
                            }
                            pending.push(PendingRom { rom: rom.clone(), id, conflicted });
                        }
                        None if !conflicted => self.synced_now(&synced.path, &id),
                        None => {}
                    }
                    report.insert(rom, synced);
                }
                Err(e) => {
                    self.failed(&rom, &e);
                    self.emit_run();
                    report.insert(rom.clone(), Synced::failed(&rom, &e));
                }
            }
        }
        self.index.keep_last_synced(index::now())?;
        Ok((report, pending, on_mobile_data))
    }

    fn hold_games(&self, held: impl Iterator<Item = Checked>) {
        for game in held.filter(|game| game.bytes() > 0) {
            self.tracker.settle(&game.rom, 0);
            if game.rom_size.is_some() {
                self.tracker.wait_for_wifi(&game.rom);
            }
            self.events.game(&game.rom, &GameState::Waiting { reason: Wait::MobileData });
        }
        self.emit_run();
    }

    fn hold_stopped(&self, held: impl Iterator<Item = Checked>) {
        for game in held.filter(|game| game.bytes() > 0) {
            self.tracker.settle(&game.rom, 0);
            self.events.game(&game.rom, &GameState::Waiting { reason: Wait::Stopped });
        }
        self.emit_run();
    }

    // The cached records are enough to tell which games have changes waiting to go up.
    async fn wait(&self, roms: &[String], reason: Wait) {
        for checked in self.check(roms, &HashSet::new(), false, &mut Report::new()).await {
            if checked.files > 0 {
                self.events.game(&checked.rom, &GameState::Waiting { reason });
            }
        }
    }

    async fn check(
        &self,
        roms: &[String],
        deleted: &HashSet<String>,
        full: bool,
        report: &mut Report,
    ) -> Vec<Checked> {
        let mut bound = HashSet::new();
        let mut checked = Vec::new();
        for (done, rom) in roms.iter().enumerate() {
            if full && self.stops_for_others() {
                break;
            }
            self.events.run(&RunProgress::Checking { done, total: roms.len() });
            if deleted.contains(rom) {
                continue;
            }
            let Some(_syncing) = self.in_use.start_syncing(rom) else {
                self.events.game(rom, &GameState::Waiting { reason: Wait::Playing });
                continue;
            };
            match self.check_game(rom, &bound, full).await {
                Ok(game) if game.moved && self.in_use.lent(rom) => {
                    self.events.game(rom, &GameState::Waiting { reason: Wait::Playing });
                }
                Ok(game) => {
                    bound.insert(game.game.id.clone());
                    checked.push(game);
                }
                Err(e) => {
                    self.failed(rom, &e);
                    report.insert(rom.clone(), Synced::failed(rom, &e));
                }
            }
        }
        self.events.run(&RunProgress::Checking { done: roms.len(), total: roms.len() });
        checked
    }

    async fn check_game(&self, rom: &str, bound: &HashSet<String>, with_roms: bool) -> Result<Checked, Error> {
        let game = self.bind(rom, bound).await?;
        let record = self.cached(&game.id)?.map(|(_, record)| record);
        let from = record.as_ref().map_or(rom, |record| record.rom.path.as_str());
        // A ROM renamed here keeps its files under the old name until it syncs.
        // One another device moved has the cloud's files under the new name.
        let here = if game.bond == Bond::Renamed { from } else { rom };
        let local: BTreeMap<String, Local> = self
            .local_files(here)
            .await?
            .into_iter()
            .map(|(path, file)| (record::moved(&path, here, rom), file))
            .collect();
        let base: Sha1s = self
            .index
            .synced_files(&game.id)?
            .into_iter()
            .map(|base| (record::moved(&base.path, here, rom), base.sha1))
            .collect();
        let cloud: BTreeMap<String, Entry> = record
            .iter()
            .flat_map(|record| &record.files)
            .map(|entry| (record::moved(&entry.path, from, rom), entry.clone()))
            .filter(|(path, _)| record::syncs(rom, path))
            .collect();
        let local_sha1s: Sha1s = local.iter().map(|(path, file)| (path.clone(), file.sha1.clone())).collect();
        let cloud_sha1s: Sha1s = cloud.iter().map(|(path, entry)| (path.clone(), entry.sha1.clone())).collect();
        let deleted: Sha1s = self
            .index
            .sync_deletions(here)?
            .into_iter()
            .map(|(path, sha1)| (record::moved(&path, here, rom), sha1))
            .collect();
        let lent = self.in_use.lent(rom);
        let mut files = 0;
        for step in plan(rom, &local_sha1s, &base, &cloud_sha1s, &deleted) {
            files += match step {
                Step::Upload(path) => local[&path].size,
                Step::Download(path) if !lent => cloud[&path].size,
                Step::Newer(path) if local[&path].mtime > cloud[&path].modified => local[&path].size,
                Step::Newer(path) if !lent => cloud[&path].size,
                _ => 0,
            };
        }
        let rom_size = match with_roms && self.syncs_games() {
            true => self.rom_transfers(rom, &game, record.as_ref()).await?,
            false => None,
        };
        Ok(Checked { rom: rom.into(), game, files, rom_size, moved: from != rom })
    }

    // A ROM or update held back for mobile data is listed as waiting. One held back for anything else is planned,
    // and drops out of the run if it still waits at its turn.
    async fn rom_transfers(&self, rom: &str, game: &Game, record: Option<&Record>) -> Result<Option<u64>, Error> {
        let rom_upload = self.rom_upload(rom, game, record).await?;
        let update = self.update_transfer(rom, record.and_then(|record| record.update.as_ref())).await?;
        if rom_upload.is_none() && update.is_none() {
            return Ok(None);
        }
        if self.mobile_data_holds_roms() {
            self.tracker.wait_for_wifi(rom);
            return Ok(None);
        }
        Ok(Some(rom_upload.unwrap_or(0) + update.map_or(0, |update| update.size())))
    }

    async fn rom_upload(&self, rom: &str, game: &Game, record: Option<&Record>) -> Result<Option<u64>, Error> {
        let (size, modified) = self.stat(rom).await?;
        let sha1 = self.rom_sha1(rom, size, millis(modified)).await?;
        let previous = self.index.synced_games()?.into_iter().find(|synced| synced.id == game.id);
        let changed_here = previous.is_none_or(|previous| previous.rom_sha1 != sha1);
        let goes_up = match record {
            None => true,
            Some(record) if changed_here && (record.rom.sha1 != sha1 || record.rom.size != size) => true,
            Some(record) => record.rom.blob.is_none() && record.rom.sha1 == sha1,
        };
        Ok(goes_up.then_some(size))
    }

    async fn local_update(&self, rom: &str) -> Result<Option<LocalUpdate>, Error> {
        let path = update::path(rom);
        if !rom::is_3ds(rom) || !self.games.has_file(&path).await {
            return Ok(None);
        }
        let (size, modified) = self.stat(&path).await?;
        let mut file = self.games.open_file(&path).await.map_err(|e| format!("{path}: {e}"))?;
        // An update the app can't read stays on this device, so it holds back none of the game's other files.
        match update::read(&mut file) {
            Ok(Some(update)) => Ok(Some(LocalUpdate { version: update.version, size, modified })),
            Ok(None) => Ok(None),
            Err(refused) => {
                eprintln!("{}", refused.message(&path));
                Ok(None)
            }
        }
    }

    async fn update_transfer(
        &self,
        rom: &str,
        cloud: Option<&record::Update>,
    ) -> Result<Option<UpdateTransfer>, Error> {
        Ok(match (self.local_update(rom).await?, cloud) {
            (Some(local), cloud) if cloud.is_none_or(|cloud| cloud.version < local.version) => {
                Some(UpdateTransfer::Up(local))
            }
            (local, Some(cloud)) if local.as_ref().is_none_or(|local| local.version < cloud.version) => {
                Some(UpdateTransfer::Down(cloud.clone()))
            }
            _ => None,
        })
    }

    // Outside the games' locks, so a long upload holds back no game from starting.
    async fn sync_roms(&self, pending: Vec<PendingRom>, report: &mut Report) {
        let mut pending = pending.into_iter().peekable();
        while let Some(next) = pending.peek() {
            if self.stops_for_others() || self.roms_wait() {
                break;
            }
            self.tracker.game(&next.rom);
            match self.sync_rom(&next.rom).await {
                Ok(()) => {
                    self.tracker.settle(&next.rom, 0);
                    self.rom_synced(next);
                }
                Err(_) if self.stops_for_others() || self.roms_wait() => break,
                Err(e) => {
                    self.failed(&next.rom, &e);
                    self.emit_run();
                    if let Some(synced) = report.get_mut(&next.rom) {
                        synced.fail(&e);
                    }
                }
            }
            pending.next();
        }
        self.hold_roms(pending);
    }

    // A game whose only transfer left is a ROM held back counts as synced, unless a stop held it.
    fn hold_roms(&self, held: impl Iterator<Item = PendingRom>) {
        let for_wifi = self.mobile_data_holds_roms() && self.syncs_games();
        let stopped = self.stopping();
        for rom in held {
            self.tracker.settle(&rom.rom, 0);
            if for_wifi {
                self.tracker.wait_for_wifi(&rom.rom);
            }
            match stopped {
                true => self.events.game(&rom.rom, &GameState::Waiting { reason: Wait::Stopped }),
                false => self.rom_synced(&rom),
            }
        }
        self.emit_run();
    }

    fn rom_synced(&self, rom: &PendingRom) {
        match rom.conflicted {
            true => self.events.game(&rom.rom, &GameState::Conflict),
            false => self.synced_now(&rom.rom, &rom.id),
        }
    }

    fn synced_now(&self, rom: &str, id: &str) {
        let at = index::now();
        if let Err(e) = self.index.keep_game_last_synced(id, at) {
            eprintln!("{rom}: {e}");
        }
        self.events.game(rom, &GameState::Synced { last_synced: at });
    }

    fn failed(&self, rom: &str, e: &Error) {
        self.tracker.settle(rom, 0);
        let state = match e {
            Error::Offline => GameState::Waiting { reason: Wait::Offline },
            e => GameState::Error { message: e.to_string() },
        };
        self.events.game(rom, &state);
    }

    fn sent(&self, held: u64) {
        if let Some((rom, state)) = self.tracker.sent(held) {
            self.events.game(&rom, &state);
            self.emit_run();
        }
    }

    fn finish_file(&self) {
        if let Some((rom, state)) = self.tracker.finish_file() {
            self.events.game(&rom, &state);
            self.emit_run();
        }
    }

    fn emit_run(&self) {
        self.events.run(&self.tracker.run());
    }

    async fn sync_rom(&self, rom: &str) -> Result<(), Error> {
        let Some(game) = self.synced_game(rom)? else { return Ok(()) };
        self.send_rom(rom, &game).await?;
        self.sync_update(rom, &game).await
    }

    async fn send_rom(&self, rom: &str, game: &SyncedGame) -> Result<(), Error> {
        for _ in 0..STALE_RETRIES {
            let Some((version, mut record)) = self.cached(&game.id)? else { return Ok(()) };
            if record.rom.blob.is_some() || record.rom.path != rom || record.rom.sha1 != game.rom_sha1 {
                return Ok(());
            }
            let (size, modified) = self.stat(rom).await?;
            if size as i64 != game.rom_size || millis(modified) != game.rom_mtime {
                return Ok(());
            }
            self.tracker.begin(rom, Stage::UploadingRom, size);
            record.rom.blob = Some(self.retry(|| self.upload_rom(&game.id, rom, size, modified)).await?);
            let json = serde_json::to_vec(&record).map_err(|e| e.to_string())?;
            match self.retry(|| self.provider.write_record(&game.id, &json, Some(&version))).await {
                Ok(version) => {
                    self.keep_record(&record, &version)?;
                    self.index.forget_sync_upload(&game.id, rom)?;
                    self.finish_file();
                    return Ok(());
                }
                Err(Error::Stale) => {
                    self.fetch(&game.id).await?;
                }
                Err(e) => return Err(e),
            }
        }
        Err(Error::Stale)
    }

    async fn sync_update(&self, rom: &str, game: &SyncedGame) -> Result<(), Error> {
        let path = update::path(rom);
        for _ in 0..STALE_RETRIES {
            let Some((version, mut record)) = self.cached(&game.id)? else { return Ok(()) };
            if record.rom.path != rom {
                return Ok(());
            }
            let local = match self.update_transfer(rom, record.update.as_ref()).await? {
                None => return Ok(()),
                Some(UpdateTransfer::Down(update)) => {
                    self.tracker.begin(&path, Stage::DownloadingUpdate, update.size);
                    let stop = || self.roms_wait();
                    self.download_update(rom, &update, &|done, _| self.sent(done), Some(&stop)).await?;
                    self.finish_file();
                    return Ok(());
                }
                Some(UpdateTransfer::Up(local)) => local,
            };
            self.tracker.begin(&path, Stage::UploadingUpdate, local.size);
            let sha1 = self.file_sha1(&path, local.size, nanos(local.modified)).await?;
            let file = Local { size: local.size, mtime: millis(local.modified), sha1: sha1.clone() };
            let stop = || self.roms_wait();
            let blob = self.retry(|| self.upload(&game.id, &path, &file, Some(&stop))).await?;
            let replaced =
                record.update.replace(record::Update { version: local.version, sha1, size: local.size, blob });
            let json = serde_json::to_vec(&record).map_err(|e| e.to_string())?;
            match self.retry(|| self.provider.write_record(&game.id, &json, Some(&version))).await {
                Ok(version) => {
                    self.keep_record(&record, &version)?;
                    self.index.forget_sync_upload(&game.id, &path)?;
                    self.finish_file();
                    if let Some(old) = replaced {
                        if let Err(e) = self.retry(|| self.provider.delete_blob(&old.blob)).await {
                            eprintln!("deleting blob {}: {e}", old.blob);
                        }
                    }
                    return Ok(());
                }
                Err(Error::Stale) => {
                    self.fetch(&game.id).await?;
                }
                Err(e) => return Err(e),
            }
        }
        Err(Error::Stale)
    }

    async fn download_update(
        &self,
        rom: &str,
        update: &record::Update,
        progress: &OnProgress<'_>,
        stop: Option<&(dyn Fn() -> bool + Sync)>,
    ) -> Result<(), Error> {
        let path = update::path(rom);
        let blob = Blob { id: update.blob.clone(), sha1: update.sha1.clone() };
        self.retry(|| self.download_rom_file(&path, &blob, update.size, progress, stop)).await?;
        let (size, modified) = self.stat(&path).await?;
        let hash = FileHash { size: size as i64, mtime: nanos(modified), sha1: update.sha1.clone() };
        Ok(self.index.keep_file_hash(&path, &hash)?)
    }

    async fn retry<T, F, Fut>(&self, mut call: F) -> Result<T, Error>
    where
        F: FnMut() -> Fut,
        Fut: Future<Output = Result<T, Error>>,
    {
        let mut wait = FIRST_RETRY;
        for _ in 0..RETRIES {
            match call().await {
                Err(Error::SlowDown(asked)) => {
                    (self.sleep)(asked.map_or(wait, |asked| asked.max(wait))).await;
                    wait = (wait * 2).min(LONGEST_RETRY);
                }
                done => return done,
            }
        }
        call().await
    }

    async fn refresh(&self) -> Result<HashSet<String>, Error> {
        let cursor = self.index.start_sync(&self.provider.account())?;
        let changes = self.retry(|| self.provider.changes(cursor.as_deref())).await?;
        if changes.complete {
            for (id, _, _) in self.index.sync_records()? {
                if !changes.records.contains(&id) {
                    self.index.forget_sync_record(&id)?;
                }
            }
        }
        let mut deleted = HashSet::new();
        for id in &changes.records {
            if self.fetch(id).await? {
                deleted.extend(self.deleted_elsewhere(id).await?);
            }
        }
        self.index.keep_sync_cursor(&changes.cursor)?;
        Ok(deleted)
    }

    async fn deleted_elsewhere(&self, id: &str) -> Result<Option<String>, Error> {
        let Some(game) = self.index.synced_games()?.into_iter().find(|game| game.id == id) else {
            self.forget_cloud_only(id).await?;
            return Ok(None);
        };
        let Some(_syncing) = self.in_use.start_removing(&game.path) else {
            // A game being played stays. Forgetting its sync lets its next sync send it all back as a new game.
            self.forget_game(id)?;
            return Ok(None);
        };
        self.remove_here(id, &game.path).await?;
        Ok(Some(game.path))
    }

    // Forgotten first, so files deleted before a crash come down again rather than being deleted from the cloud.
    async fn remove_here(&self, id: &str, rom: &str) -> Result<(), Error> {
        self.forget_game(id)?;
        self.index.forget_sync_deletions(rom)?;
        // The update goes like the ROM, which isn't held either.
        for path in self.game_files(rom).await?.into_iter().filter(|path| *path != update::path(rom)) {
            self.hold(&path).await?;
        }
        Ok(remove_game(self.games, rom).await?)
    }

    async fn hold(&self, path: &str) -> Result<(), Error> {
        let to = removed::free_path(&removed::today(self.removed), path);
        Ok(self.games.move_out(path, &to).await.map_err(|e| format!("{path}: {e}"))?)
    }

    fn forget_game(&self, id: &str) -> Result<(), Error> {
        self.index.forget_synced_game(id)?;
        remove_dir(&self.conflicts.join(id))?;
        remove_file(&self.cheats_base_path(id))
    }

    async fn fetch(&self, id: &str) -> Result<bool, Error> {
        match self.retry(|| self.provider.read_record(id)).await? {
            // Kept as it is, so a record this version can't read still has its version and stays untouched.
            Some(Versioned { json, version }) if !is_game(id) => {
                self.index.keep_sync_record(id, &version, &String::from_utf8_lossy(&json))?;
                Ok(false)
            }
            Some(Versioned { json, version }) => match serde_json::from_slice::<Record>(&json) {
                Ok(record) if record.id == id => self.keep_record(&record, &version).map(|_| false),
                Ok(record) => {
                    eprintln!("record {id}: names game {}", record.id);
                    Ok(false)
                }
                Err(e) => {
                    eprintln!("record {id}: {e}");
                    Ok(false)
                }
            },
            None => {
                let known = self.index.sync_record(id)?.is_some();
                self.index.forget_sync_record(id)?;
                Ok(known)
            }
        }
    }

    fn keep_record(&self, record: &Record, version: &str) -> Result<(), Error> {
        let json = serde_json::to_string(record).map_err(|e| e.to_string())?;
        Ok(self.index.keep_sync_record(&record.id, version, &json)?)
    }

    fn cached(&self, id: &str) -> Result<Option<(String, Record)>, Error> {
        let Some((version, json)) = self.index.sync_record(id)? else { return Ok(None) };
        Ok(serde_json::from_str(&json).ok().map(|record| (version, record)))
    }

    fn cached_all(&self) -> Result<Vec<(String, Record)>, Error> {
        Ok(self
            .index
            .sync_records()?
            .into_iter()
            .filter(|(id, _, _)| is_game(id))
            .filter_map(|(_, version, json)| Some((version, serde_json::from_str(&json).ok()?)))
            .collect())
    }

    fn synced_game(&self, rom: &str) -> Result<Option<SyncedGame>, Error> {
        Ok(self.index.synced_games()?.into_iter().find(|game| game.path == rom))
    }

    async fn stat(&self, path: &str) -> Result<(u64, SystemTime), Error> {
        Ok(self.games.stat(path).await.map_err(|e| format!("{path}: {e}"))?)
    }

    async fn rom_sha1(&self, rom: &str, size: u64, mtime: i64) -> Result<String, Error> {
        let unchanged = |known_size: i64, known_mtime: i64| known_size == size as i64 && known_mtime == mtime;
        if let Some(game) = self.synced_game(rom)?.filter(|game| unchanged(game.rom_size, game.rom_mtime)) {
            return Ok(game.rom_sha1);
        }
        if let Some(art) = self.index.rom_art(rom)?.filter(|art| unchanged(art.size, art.mtime) && !art.sha1.is_empty()) {
            return Ok(art.sha1);
        }
        let file = self.games.open_file(rom).await.map_err(|e| format!("{rom}: {e}"))?;
        let name = rom.to_owned();
        Ok(tauri::async_runtime::spawn_blocking(move || game_art::sha1_of_rom(&name, file))
            .await
            .map_err(|e| e.to_string())??)
    }

    async fn bind(&self, rom: &str, bound: &HashSet<String>) -> Result<Game, Error> {
        let synced = self.index.synced_games()?;
        let game = |id: &str, bond| Game { id: id.into(), path: rom.into(), bond };
        if let Some(known) = synced.iter().find(|game| game.path == rom && !bound.contains(&game.id)) {
            return Ok(game(&known.id, Bond::Known));
        }
        let mut free = Vec::new();
        for record in self.free_records(&synced).await? {
            if !bound.contains(&record.id) {
                free.push(record);
            }
        }
        if let Some(record) = free.iter().find(|record| record.rom.path == rom) {
            return Ok(game(&record.id, Bond::Found));
        }
        let mut gone = Vec::new();
        for record in free {
            if !self.games.has_file(&record.rom.path).await {
                gone.push(record);
            }
        }
        if !gone.is_empty() {
            let (size, modified) = self.stat(rom).await?;
            let sha1 = self.rom_sha1(rom, size, millis(modified)).await?;
            if let Some(record) = gone.iter().find(|record| record.rom.sha1 == sha1) {
                return Ok(game(&record.id, Bond::Renamed));
            }
        }
        Ok(game(&uuid::Uuid::new_v4().to_string(), Bond::New))
    }

    async fn free_records(&self, synced: &[SyncedGame]) -> Result<Vec<Record>, Error> {
        let mut free = Vec::new();
        for (_, record) in self.cached_all()? {
            let held = match synced.iter().find(|game| game.id == record.id) {
                Some(game) => self.games.has_file(&game.path).await,
                None => false,
            };
            if !held {
                free.push(record);
            }
        }
        Ok(free)
    }

    async fn sync_bound(&self, mut game: Game) -> Result<Synced, Error> {
        for _ in 0..STALE_RETRIES {
            match self.sync_files(&mut game).await {
                Err(Error::Stale) => {
                    self.fetch(&game.id).await?;
                }
                done => return done,
            }
        }
        Err(Error::Stale)
    }

    fn move_bases(&self, game: &str, from: &str, to: &str) -> Result<(), Error> {
        for base in self.index.synced_files(game)? {
            let path = record::moved(&base.path, from, to);
            if path != base.path {
                self.index.forget_synced_file(game, &base.path)?;
                self.index.keep_synced_file(game, &SyncedFile { path, ..base })?;
            }
        }
        Ok(())
    }

    fn move_deletions(&self, from: &str, to: &str) -> Result<(), Error> {
        for (path, _) in self.index.sync_deletions(from)? {
            self.index.move_sync_deletion(from, &path, to, &record::moved(&path, from, to))?;
        }
        Ok(())
    }

    async fn move_files(&self, from: &str, to: &str) -> Result<(), Error> {
        let mut paths = self.local_paths(from).await?;
        if self.games.has_file(&update::path(from)).await {
            paths.push(update::path(from));
        }
        for path in paths {
            let target = record::moved(&path, from, to);
            if !self.games.has_file(&target).await {
                self.games.rename(&path, &target).await.map_err(|e| format!("{path}: {e}"))?;
            }
        }
        Ok(())
    }

    async fn follow(&self, game: &str, from: &str, to: &str) -> Result<(), Error> {
        if self.games.has_file(to).await {
            return Err(format!("another device moved {from} to {to}, which is taken here").into());
        }
        self.move_files(from, to).await?;
        // The ROM moves last, so a move cut short carries on at the next sync.
        self.games.rename(from, to).await.map_err(|e| format!("{from}: {e}"))?;
        self.move_deletions(from, to)?;
        self.move_bases(game, from, to)
    }

    async fn entries(&self, dir: &str) -> Result<Vec<DirEntry>, Error> {
        match self.games.read_dir(dir).await {
            Ok(entries) => Ok(entries),
            Err(_) if !self.games.has_file(dir).await => Ok(Vec::new()),
            Err(e) => Err(format!("{dir}: {e}").into()),
        }
    }

    async fn game_files(&self, rom: &str) -> Result<Vec<String>, Error> {
        let beside = self.entries(parent(rom)).await?;
        let mut paths: Vec<String> = save::paths(rom)
            .into_iter()
            .filter(|save| beside.iter().any(|entry| !entry.is_directory && entry.name == file_name(save)))
            .collect();
        let mut dirs = vec![rom::data_dir(rom)];
        while let Some(dir) = dirs.pop() {
            for entry in self.entries(&dir).await? {
                let path = format!("{dir}/{}", entry.name);
                match entry.is_directory {
                    true => dirs.push(path),
                    false => paths.push(path),
                }
            }
        }
        Ok(paths)
    }

    async fn local_paths(&self, rom: &str) -> Result<Vec<String>, Error> {
        let mut paths = self.game_files(rom).await?;
        paths.retain(|path| record::syncs(rom, path));
        Ok(paths)
    }

    async fn local_files(&self, rom: &str) -> Result<BTreeMap<String, Local>, Error> {
        let mut files = BTreeMap::new();
        for path in self.local_paths(rom).await? {
            let (size, modified) = self.stat(&path).await?;
            let sha1 = self.file_sha1(&path, size, nanos(modified)).await?;
            files.insert(path, Local { size, mtime: millis(modified), sha1 });
        }
        Ok(files)
    }

    async fn file_sha1(&self, path: &str, size: u64, mtime: i64) -> Result<String, Error> {
        if let Some(hash) = self.index.file_hash(path)?.filter(|hash| hash.size == size as i64 && hash.mtime == mtime) {
            return Ok(hash.sha1);
        }
        let mut file = Hashing::new(self.games.open_file(path).await.map_err(|e| format!("{path}: {e}"))?);
        std::io::copy(&mut file, &mut std::io::sink()).map_err(io(path))?;
        let (_, sha1) = file.finish();
        self.index.keep_file_hash(path, &FileHash { size: size as i64, mtime, sha1: sha1.clone() })?;
        Ok(sha1)
    }

    async fn keep_both_backups(&self, rom: &str, local: &BTreeMap<String, Local>, base: &Sha1s, cloud: &BTreeMap<String, Entry>) -> Result<bool, Error> {
        let dir = format!("{}/backups/", rom::data_dir(rom));
        let mut renamed = false;
        for (path, entry) in cloud.iter().filter(|(path, _)| path.starts_with(&dir)) {
            let Some(mine) = local.get(path) else { continue };
            if mine.sha1 == entry.sha1 || base.get(path).is_some_and(|sha1| *sha1 == mine.sha1 || *sha1 == entry.sha1) {
                continue;
            }
            let taken = |name: &str| {
                let path = format!("{dir}{name}");
                local.contains_key(&path) || cloud.contains_key(&path)
            };
            let Some((note, free, free_note)) = backups::free_name(file_name(path), taken) else { continue };
            self.games.rename(path, &format!("{dir}{free}")).await?;
            if local.contains_key(&format!("{dir}{note}")) {
                self.games.rename(&format!("{dir}{note}"), &format!("{dir}{free_note}")).await?;
            }
            renamed = true;
        }
        Ok(renamed)
    }

    async fn sync_files(&self, game: &mut Game) -> Result<Synced, Error> {
        let cached = self.cached(&game.id)?;
        let version = cached.as_ref().map(|(version, _)| version.clone());
        let mut record = cached.map(|(_, record)| record);
        let mut dirty = false;
        if let Some(record) = record.as_mut().filter(|record| record.rom.path != game.path) {
            if game.bond == Bond::Renamed {
                let from = record.rom.path.clone();
                self.move_files(&from, &game.path).await?;
                record.move_to(&game.path);
                self.move_deletions(&from, &game.path)?;
                self.move_bases(&game.id, &from, &game.path)?;
                dirty = true;
            } else {
                let to = record.rom.path.clone();
                self.follow(&game.id, &game.path, &to).await?;
                game.path = to;
                game.bond = Bond::Known;
            }
        }
        let rom = game.path.clone();
        let previous = self.index.synced_games()?.into_iter().find(|synced| synced.id == game.id);
        let (rom_size, rom_modified) = self.stat(&rom).await?;
        let rom_mtime = millis(rom_modified);
        let rom_sha1 = self.rom_sha1(&rom, rom_size, rom_mtime).await?;
        let synced_game = SyncedGame { id: game.id.clone(), path: rom.clone(), rom_size: rom_size as i64, rom_mtime, rom_sha1: rom_sha1.clone() };
        // A new game keeps its id even if this sync fails, so an upload cut short resumes. A rename waits for the record.
        if game.bond != Bond::Renamed {
            self.index.keep_synced_game(&synced_game)?;
        }
        let mut stale_rom = None;
        let mut stale_blobs = Vec::new();
        let mut record = match record {
            Some(mut record) => {
                // Only a ROM that changed here updates the record, so two devices with different dumps don't take turns.
                let changed_here = previous.is_none_or(|previous| previous.rom_sha1 != rom_sha1);
                if changed_here && (record.rom.sha1 != rom_sha1 || record.rom.size != rom_size) {
                    stale_rom = record.rom.blob.take().map(|blob| blob.id);
                    record.rom = record::Rom { path: rom.clone(), sha1: rom_sha1.clone(), size: rom_size, blob: None };
                    dirty = true;
                }
                record
            }
            None => {
                dirty = true;
                Record {
                    id: game.id.clone(),
                    rom: record::Rom { path: rom.clone(), sha1: rom_sha1.clone(), size: rom_size, blob: None },
                    update: None,
                    files: Vec::new(),
                }
            }
        };

        let cloud: BTreeMap<String, Entry> =
            record.files.iter().filter(|entry| record::syncs(&rom, &entry.path)).map(|entry| (entry.path.clone(), entry.clone())).collect();
        let bases: BTreeMap<String, SyncedFile> =
            self.index.synced_files(&game.id)?.into_iter().map(|base| (base.path.clone(), base)).collect();
        let base: Sha1s = bases.iter().map(|(path, base)| (path.clone(), base.sha1.clone())).collect();
        let mut local = self.local_files(&rom).await?;
        if self.keep_both_backups(&rom, &local, &base, &cloud).await? {
            local = self.local_files(&rom).await?;
        }
        let lent = self.in_use.lent(&rom);
        if !lent && self.settle_box_art(&rom, &local, &base, &cloud).await? {
            self.events.box_art(&rom);
            local = self.local_files(&rom).await?;
        }
        let deleted: Sha1s = self.index.sync_deletions(&rom)?.into_iter().collect();
        let local_sha1s: Sha1s = local.iter().map(|(path, file)| (path.clone(), file.sha1.clone())).collect();
        let cloud_sha1s: Sha1s = cloud.iter().map(|(path, entry)| (path.clone(), entry.sha1.clone())).collect();

        let mut synced = Synced { path: rom.clone(), ..Synced::default() };
        let mut uploaded = Vec::new();
        let mut removed = Vec::new();
        let newer = |path: String, local: &BTreeMap<String, Local>| match local[&path].mtime > cloud[&path].modified {
            true => Step::Upload(path),
            false => Step::Download(path),
        };
        for step in plan(&rom, &local_sha1s, &base, &cloud_sha1s, &deleted) {
            let step = match step {
                Step::Download(_) | Step::DeleteLocal(_) if lent => continue,
                Step::Newer(path) if lent => match newer(path, &local) {
                    Step::Upload(path) if path != cheats::path(&rom) => Step::Upload(path),
                    _ => continue,
                },
                Step::Newer(path) if path == cheats::path(&rom) => {
                    match self.merge_cheats(&game.id, &path, base.get(&path).map(String::as_str), &cloud[&path]).await? {
                        Some(merged) if merged.sha1 == cloud[&path].sha1 => Step::Agree(path),
                        Some(merged) => {
                            local.insert(path.clone(), merged);
                            Step::Upload(path)
                        }
                        None => newer(path, &local),
                    }
                }
                Step::Newer(path) => newer(path, &local),
                step => step,
            };
            let box_art = matches!(&step, Step::Download(path) | Step::DeleteLocal(path)
                if box_art::chosen_paths(&rom).contains(path));
            match step {
                Step::Agree(path) => match cloud.get(&path) {
                    Some(entry) => self.index.keep_synced_file(&game.id, &SyncedFile::from(entry))?,
                    None => self.index.forget_synced_file(&game.id, &path)?,
                },
                Step::Download(path) => {
                    let entry = &cloud[&path];
                    self.tracker.begin(&path, Stage::DownloadingSaves, entry.size);
                    self.retry(|| self.download(entry)).await?;
                    self.finish_file();
                    self.index.keep_synced_file(&game.id, &SyncedFile::from(entry))?;
                }
                Step::DeleteLocal(path) => {
                    self.hold(&path).await?;
                    self.index.forget_synced_file(&game.id, &path)?;
                }
                Step::Upload(path) => {
                    let file = &local[&path];
                    self.tracker.begin(&path, Stage::UploadingSaves, file.size);
                    let blob = self.retry(|| self.upload(&game.id, &path, file, None)).await?;
                    self.finish_file();
                    let entry = Entry {
                        path: path.clone(),
                        sha1: file.sha1.clone(),
                        size: file.size,
                        blob: blob.clone(),
                        modified: file.mtime,
                        device: self.device.into(),
                        cheats: self.index.save_had_cheats(&rom, &file.sha1)?,
                    };
                    stale_blobs.extend(record.put(entry).map(|old| old.blob));
                    uploaded.push(SyncedFile { path, sha1: file.sha1.clone(), blob });
                    dirty = true;
                }
                Step::DeleteCloud(path) => {
                    stale_blobs.extend(record.remove(&path).map(|old| old.blob));
                    removed.push(path);
                    dirty = true;
                }
                Step::Conflict(unit) => {
                    let entries = cloud.values().filter(|entry| Unit::of(&rom, &entry.path) == unit).cloned().collect();
                    self.keep_conflict(&game.id, &unit, entries).await?;
                    synced.conflicts.push(unit.key());
                }
                Step::Newer(_) => unreachable!("newer steps become uploads or downloads"),
            }
            if box_art {
                self.events.box_art(&rom);
            }
        }
        for (file, _) in self.index.sync_conflicts(&game.id)? {
            if !synced.conflicts.contains(&file) {
                self.forget_conflict(&game.id, &file)?;
            }
        }

        if dirty {
            let json = serde_json::to_vec(&record).map_err(|e| e.to_string())?;
            let version = self.retry(|| self.provider.write_record(&game.id, &json, version.as_deref())).await?;
            self.keep_record(&record, &version)?;
            for file in uploaded {
                self.index.forget_sync_upload(&game.id, &file.path)?;
                self.index.keep_synced_file(&game.id, &file)?;
            }
            for path in removed {
                self.index.forget_synced_file(&game.id, &path)?;
            }

            if let Some(blob) = stale_rom {
                if let Err(e) = self.retry(|| self.provider.delete_blob(&blob)).await {
                    eprintln!("deleting blob {blob}: {e}");
                }
            }
            for blob in stale_blobs {
                if let Err(e) = self.retry(|| self.provider.retire_blob(&blob)).await {
                    eprintln!("retiring blob {blob}: {e}");
                }
            }
        }
        // A deletion in a conflict waits for the player's pick, and one logged during this sync for the next.
        let settled =
            |path: &&String| !local.contains_key(*path) && !synced.conflicts.contains(&Unit::of(&rom, path).key());
        for path in deleted.keys().filter(settled) {
            self.index.forget_sync_deletion(&rom, path)?;
        }
        self.index.keep_synced_game(&synced_game)?;
        self.keep_cheats_base(&game.id, &rom).await?;
        Ok(synced)
    }

    // Choosing box art removes the other box art files, so two devices choosing different ones offline keep the newer.
    async fn settle_box_art(
        &self,
        rom: &str,
        local: &BTreeMap<String, Local>,
        base: &Sha1s,
        cloud: &BTreeMap<String, Entry>,
    ) -> Result<bool, Error> {
        let paths = box_art::chosen_paths(rom);
        let changed = |sha1: &String, path: &String| base.get(path) != Some(sha1);
        let here: Vec<(i64, &String)> = paths
            .iter()
            .filter_map(|path| local.get(path).filter(|file| changed(&file.sha1, path)).map(|file| (file.mtime, path)))
            .collect();
        let there: Vec<(i64, &String)> = paths
            .iter()
            .filter_map(|path| {
                cloud.get(path).filter(|entry| changed(&entry.sha1, path)).map(|entry| (entry.modified, path))
            })
            .collect();
        if here.is_empty() || there.is_empty() {
            return Ok(false);
        }
        let Some(&(_, newest)) = here.iter().chain(&there).max() else { return Ok(false) };
        let mut removed = false;
        for path in paths.iter().filter(|path| *path != newest) {
            if local.contains_key(path) {
                self.hold(path).await?;
                removed = true;
            }
            if let Some(entry) = cloud.get(path) {
                self.index.keep_sync_deletion(rom, path, &entry.sha1, index::now())?;
            }
        }
        Ok(removed)
    }

    // A cloud-only game's tile shows its chosen box art, so those files come down before its ROM and nothing else does.
    async fn sync_cloud_box_art(&self) {
        let records = match self.cloud_records().await {
            Ok(records) => records,
            Err(e) => return eprintln!("box art: {e}"),
        };
        for record in records {
            if let Err(e) = self.sync_box_art(&record).await {
                eprintln!("{}: {e}", record.rom.path);
            }
        }
    }

    async fn sync_box_art(&self, record: &Record) -> Result<(), Error> {
        let rom = &record.rom.path;
        let dir = rom::data_dir(rom);
        let paths = box_art::chosen_paths(rom);
        let cloud: BTreeMap<&String, &Entry> =
            record.files.iter().filter(|entry| paths.contains(&entry.path)).map(|entry| (&entry.path, entry)).collect();
        let bases = self.index.synced_files(&record.id)?;
        if cloud.is_empty() && bases.is_empty() {
            return Ok(());
        }
        self.follow_box_art(&record.id, &dir, &bases).await?;
        let names: Vec<String> =
            self.entries(&dir).await?.into_iter().filter(|entry| !entry.is_directory).map(|entry| entry.name).collect();
        let mut local = Sha1s::new();
        for path in paths.iter().filter(|path| names.iter().any(|name| name == file_name(path))) {
            let (size, modified) = self.stat(path).await?;
            local.insert(path.clone(), self.file_sha1(path, size, nanos(modified)).await?);
        }
        let base: Sha1s = self
            .index
            .synced_files(&record.id)?
            .into_iter()
            .filter(|base| paths.contains(&base.path))
            .map(|base| (base.path, base.sha1))
            .collect();
        let deleted: Sha1s =
            self.index.sync_deletions(rom)?.into_iter().filter(|(path, _)| paths.contains(path)).collect();
        // A choice made here goes up with the game's own sync once its ROM is down, and the newer choice wins then.
        let chosen_here = |path: &String| {
            local.get(path) != base.get(path) && (local.contains_key(path) || deleted.contains_key(path))
        };
        if paths.iter().any(chosen_here) {
            return Ok(());
        }
        let cloud_sha1s: Sha1s = cloud.iter().map(|(path, entry)| ((*path).clone(), entry.sha1.clone())).collect();
        for step in plan(rom, &local, &base, &cloud_sha1s, &deleted) {
            match step {
                Step::Agree(path) => match cloud.get(&path) {
                    Some(entry) => self.index.keep_synced_file(&record.id, &SyncedFile::from(*entry))?,
                    None => self.index.forget_synced_file(&record.id, &path)?,
                },
                Step::Download(path) => {
                    self.download_whole(cloud[&path]).await?;
                    self.index.keep_synced_file(&record.id, &SyncedFile::from(cloud[&path]))?;
                    self.events.box_art(rom);
                }
                Step::DeleteLocal(path) => {
                    self.hold(&path).await?;
                    self.index.forget_synced_file(&record.id, &path)?;
                    self.remove_if_empty(&dir).await?;
                    self.events.box_art(rom);
                }
                _ => {}
            }
        }
        Ok(())
    }

    async fn follow_box_art(&self, id: &str, dir: &str, bases: &[SyncedFile]) -> Result<(), Error> {
        for base in bases {
            let name = file_name(&base.path);
            if parent(&base.path) == dir || !box_art::CHOSEN.contains(&name) {
                continue;
            }
            let to = format!("{dir}/{name}");
            self.index.forget_synced_file(id, &base.path)?;
            if !self.games.has_file(&base.path).await {
            } else if self.games.has_file(&to).await {
                self.hold(&base.path).await?;
            } else {
                self.games.rename(&base.path, &to).await.map_err(|e| format!("{}: {e}", base.path))?;
                self.index.keep_synced_file(id, &SyncedFile { path: to, ..base.clone() })?;
            }
            self.remove_if_empty(parent(&base.path)).await?;
        }
        Ok(())
    }

    // Only a cloud-only game has synced files without a synced game: the box art that came down before its ROM.
    async fn forget_cloud_only(&self, id: &str) -> Result<(), Error> {
        for base in self.index.synced_files(id)? {
            if self.games.has_file(&base.path).await {
                self.hold(&base.path).await?;
            }
            self.remove_if_empty(parent(&base.path)).await?;
        }
        Ok(self.index.forget_synced_game(id)?)
    }

    async fn remove_if_empty(&self, dir: &str) -> Result<(), Error> {
        if self.entries(dir).await?.is_empty() {
            self.games.remove_dir(dir).await.map_err(|e| format!("{dir}: {e}"))?;
        }
        Ok(())
    }

    // Outside the run's progress, which counts only the files of the game syncing.
    async fn download_whole(&self, entry: &Entry) -> Result<(), Error> {
        let bytes = self.retry(|| self.download_bytes(entry)).await?;
        self.games.write(&entry.path, &bytes).await.map_err(|e| format!("{}: {e}", entry.path))?;
        let (size, modified) = self.stat(&entry.path).await?;
        Ok(self.index.keep_file_hash(
            &entry.path,
            &FileHash { size: size as i64, mtime: nanos(modified), sha1: entry.sha1.clone() },
        )?)
    }

    fn cheats_base_path(&self, game: &str) -> PathBuf {
        self.cheat_bases.join(format!("{game}.json"))
    }

    // The base is only good while it matches the last synced version. Without it every code counts as new on both sides.
    fn cheats_base(&self, game: &str, base_sha1: Option<&str>) -> Vec<cheats::Code> {
        let Ok(json) = std::fs::read(self.cheats_base_path(game)) else { return Vec::new() };
        match base_sha1 == Some(game_art::sha1_of(&json).as_str()) {
            true => cheats::parse(&json).unwrap_or_default(),
            false => Vec::new(),
        }
    }

    async fn keep_cheats_base(&self, game: &str, rom: &str) -> Result<(), Error> {
        let path = cheats::path(rom);
        let Some(base) = self.index.synced_files(game)?.into_iter().find(|base| base.path == path) else { return Ok(()) };
        let Ok(json) = self.games.read(&path).await else { return Ok(()) };
        let copy = self.cheats_base_path(game);
        if game_art::sha1_of(&json) != base.sha1 || std::fs::read(&copy).is_ok_and(|kept| kept == json) {
            return Ok(());
        }
        std::fs::create_dir_all(self.cheat_bases).map_err(io(self.cheat_bases.display()))?;
        std::fs::write(&copy, json).map_err(io(copy.display()))
    }

    /// `None` leaves the newer file to win, when either side can't be read.
    async fn merge_cheats(&self, game: &str, path: &str, base_sha1: Option<&str>, cloud: &Entry) -> Result<Option<Local>, Error> {
        let mine = self.games.read(path).await.map_err(|e| format!("{path}: {e}"))?;
        let theirs = self.retry(|| self.download_bytes(cloud)).await?;
        let (device, cloud) = match (cheats::parse(&mine), cheats::parse(&theirs)) {
            (Ok(device), Ok(cloud)) => (device, cloud),
            (Err(e), _) | (_, Err(e)) => {
                eprintln!("merging {path}: {e}");
                return Ok(None);
            }
        };
        let merged = cheats::to_json(cheats::merge(device, cloud, &self.cheats_base(game, base_sha1)));
        if merged != mine {
            self.games.write(path, &merged).await.map_err(|e| format!("{path}: {e}"))?;
        }
        let (size, modified) = self.stat(path).await?;
        // Hashed from the bytes, since a coarse clock can leave the rewritten file with the cached hash's size and mtime.
        let sha1 = game_art::sha1_of(&merged);
        self.index.keep_file_hash(path, &FileHash { size: size as i64, mtime: nanos(modified), sha1: sha1.clone() })?;
        Ok(Some(Local { size, mtime: millis(modified), sha1 }))
    }

    async fn download_bytes(&self, entry: &Entry) -> Result<Vec<u8>, Error> {
        let mut bytes = Vec::new();
        self.provider.download(&entry.blob, &mut bytes).await?;
        match game_art::sha1_of(&bytes) == entry.sha1 {
            true => Ok(bytes),
            false => Err(format!("{} didn't download whole", entry.path).into()),
        }
    }

    async fn download(&self, entry: &Entry) -> Result<(), Error> {
        let file = self.games.create_file(&entry.path).await.map_err(|e| format!("{}: {e}", entry.path))?;
        let progress = |done: u64, _: u64| self.sent(done);
        let mut writer = Counting { inner: Hashing::new(file), done: 0, total: entry.size, progress: &progress };
        self.provider.download(&entry.blob, &mut writer).await?;
        let (file, sha1) = writer.inner.finish();
        if sha1 != entry.sha1 {
            return Err(format!("{} didn't download whole", entry.path).into());
        }
        file.finish().await.map_err(|e| format!("{}: {e}", entry.path))?;
        let (size, modified) = self.stat(&entry.path).await?;
        Ok(self.index.keep_file_hash(&entry.path, &FileHash { size: size as i64, mtime: nanos(modified), sha1 })?)
    }

    async fn upload_rom(&self, game: &str, rom: &str, size: u64, modified: SystemTime) -> Result<Blob, Error> {
        let sha1 = self.file_sha1(rom, size, nanos(modified)).await?;
        let file = Local { size, mtime: millis(modified), sha1: sha1.clone() };
        let id = self.upload(game, rom, &file, Some(&|| self.roms_wait())).await?;
        Ok(Blob { id, sha1 })
    }

    async fn upload(&self, game: &str, path: &str, file: &Local, stop: Option<&(dyn Fn() -> bool + Sync)>) -> Result<String, Error> {
        let pending = self.index.sync_upload(game, path)?;
        let resumed = match pending.as_ref().filter(|pending| pending.sha1 == file.sha1) {
            Some(PendingUpload { blob, session: None, .. }) => return Ok(blob.clone()),
            Some(PendingUpload { blob, session: Some(session), .. }) => {
                self.provider.uploaded(session).await?.map(|offset| (blob.clone(), session.clone(), offset))
            }
            None => None,
        };
        let (blob, session, offset) = match resumed {
            Some(resumed) => resumed,
            None => {
                // A sync that stopped after writing the record but before forgetting the upload leaves a blob
                // the record still names. The record write that replaces it retires it then.
                if let Some(PendingUpload { blob, session: None, .. }) = pending {
                    if !self.cached(game)?.is_some_and(|(_, record)| record.names(&blob)) {
                        if let Err(e) = self.provider.retire_blob(&blob).await {
                            eprintln!("retiring blob {blob}: {e}");
                        }
                    }
                }
                let blob = uuid::Uuid::new_v4().to_string();
                let session = self.provider.start_upload(&blob, file.size, &file.sha1).await?;
                let pending = PendingUpload { sha1: file.sha1.clone(), blob: blob.clone(), session: Some(session.clone()) };
                self.index.keep_sync_upload(game, path, &pending)?;
                (blob, session, 0)
            }
        };
        let mut reader = Hashing::new(self.games.open_file(path).await.map_err(|e| format!("{path}: {e}"))?);
        std::io::copy(&mut (&mut reader).take(offset), &mut std::io::sink()).map_err(io(path))?;
        let mut stopping = Stopping { inner: reader, stop };
        self.provider.upload(&session, offset, &mut stopping, &|held| self.sent(held)).await?;
        let (_, sha1) = stopping.inner.finish();
        if sha1 != file.sha1 {
            self.index.forget_sync_upload(game, path)?;
            return Err(format!("{path} changed while it uploaded").into());
        }
        self.index.keep_sync_upload(game, path, &PendingUpload { sha1, blob: blob.clone(), session: None })?;
        Ok(blob)
    }

    fn conflict_dir(&self, game: &str, file: &str) -> PathBuf {
        self.conflicts.join(game).join(file)
    }

    async fn keep_conflict(&self, game: &str, unit: &Unit, entries: Vec<Entry>) -> Result<(), Error> {
        let key = unit.key();
        let known = self.index.sync_conflicts(game)?.into_iter().find(|(file, _)| *file == key);
        let dir = self.conflict_dir(game, &key);
        let kept = entries.iter().all(|entry| dir.join(file_name(&entry.path)).exists());
        if kept && known.and_then(|(_, json)| serde_json::from_str::<Vec<Entry>>(&json).ok()).as_ref() == Some(&entries) {
            return Ok(());
        }
        remove_dir(&dir)?;
        for entry in &entries {
            self.retry(|| self.download_conflict(&dir, entry)).await?;
        }
        let json = serde_json::to_string(&entries).map_err(|e| e.to_string())?;
        Ok(self.index.keep_sync_conflict(game, &key, &json)?)
    }

    async fn download_conflict(&self, dir: &Path, entry: &Entry) -> Result<(), Error> {
        let path = dir.join(file_name(&entry.path));
        std::fs::create_dir_all(dir).map_err(io(dir.display()))?;
        let partial = dir.join(format!("{}.partial", file_name(&entry.path)));
        let mut writer = Hashing::new(std::fs::File::create(&partial).map_err(io(partial.display()))?);
        let downloaded = self.provider.download(&entry.blob, &mut writer).await;
        let (_, sha1) = writer.finish();
        if let Err(e) = downloaded.and_then(|_| match sha1 == entry.sha1 {
            true => Ok(()),
            false => Err(Error::Failed(format!("{} didn't download whole", entry.path))),
        }) {
            let _ = std::fs::remove_file(&partial);
            return Err(e);
        }
        std::fs::rename(&partial, &path).map_err(io(path.display()))
    }

    fn forget_conflict(&self, game: &str, file: &str) -> Result<(), Error> {
        remove_dir(&self.conflict_dir(game, file))?;
        Ok(self.index.forget_sync_conflict(game, file)?)
    }

    fn conflict(&self, game: &str, file: &str) -> Result<Vec<Entry>, Error> {
        let (_, json) = self
            .index
            .sync_conflicts(game)?
            .into_iter()
            .find(|(known, _)| known == file)
            .ok_or_else(|| format!("{file} isn't in conflict"))?;
        Ok(serde_json::from_str(&json).map_err(|e| e.to_string())?)
    }

    pub async fn conflicts(&self, rom: &str) -> Result<Vec<Conflict>, Error> {
        let Some(game) = self.synced_game(rom)? else { return Ok(Vec::new()) };
        let mut conflicts = Vec::new();
        for (file, _) in self.index.sync_conflicts(&game.id)? {
            let entries = self.conflict(&game.id, &file)?;
            let main = |path: &str| match Unit::of(rom, path) {
                Unit::Save => record::is_save(rom, path),
                Unit::Slot(_) => path.ends_with(".state"),
                Unit::File(_) => true,
            };
            let cloud = entries.iter().find(|entry| main(&entry.path)).or(entries.first());
            let mut modified = None;
            let mut cheats = false;
            for path in self.local_paths(rom).await? {
                if Unit::of(rom, &path).key() != file {
                    continue;
                }
                let (size, mtime) = self.stat(&path).await?;
                if main(&path) {
                    modified = modified.max(Some(millis(mtime)));
                }
                if !cheats {
                    cheats = self.index.save_had_cheats(rom, &self.file_sha1(&path, size, nanos(mtime)).await?)?;
                }
            }
            conflicts.push(Conflict {
                file,
                device: Version { saved_on: self.device.into(), modified, cheats },
                cloud: Version {
                    saved_on: cloud.map_or_else(String::new, |entry| entry.device.clone()),
                    modified: cloud.map(|entry| entry.modified),
                    cheats: entries.iter().any(|entry| entry.cheats),
                },
            });
        }
        Ok(conflicts)
    }

    fn cloud_copies(&self, rom: &str, file: &str, wanted: impl Fn(&str) -> bool) -> Result<Vec<(Entry, Vec<u8>)>, Error> {
        let Some(game) = self.synced_game(rom)? else { return Ok(Vec::new()) };
        let conflicts = self.index.sync_conflicts(&game.id)?;
        let Some((_, json)) = conflicts.into_iter().find(|(known, _)| known == file) else { return Ok(Vec::new()) };
        let entries: Vec<Entry> = serde_json::from_str(&json).map_err(|e| e.to_string())?;
        let mut copies = Vec::new();
        for entry in entries.into_iter().filter(|entry| wanted(&entry.path)) {
            let copy = self.conflict_dir(&game.id, file).join(file_name(&entry.path));
            let bytes = std::fs::read(&copy).map_err(io(copy.display()))?;
            copies.push((entry, bytes));
        }
        Ok(copies)
    }

    pub fn cloud_save(&self, rom: &str) -> Result<Option<save::SaveFile>, Error> {
        let copies = self.cloud_copies(rom, &Unit::Save.key(), |path| record::is_save(rom, path))?;
        let modified = copies.iter().map(|(entry, _)| entry.modified).max();
        let files = copies.into_iter().map(|(entry, bytes)| (entry.path, bytes)).collect();
        let (Some((_, bytes)), Some(modified)) = (save::from_files(rom, files), modified) else { return Ok(None) };
        Ok(Some(save::SaveFile { sha256: save::sha256(&bytes), bytes, modified }))
    }

    pub fn cloud_screenshot(&self, rom: &str, file: &str) -> Result<Option<Vec<u8>>, Error> {
        Ok(self.cloud_copies(rom, file, |path| path.ends_with(".png"))?.into_iter().next().map(|(_, bytes)| bytes))
    }

    pub async fn resolve(&self, rom: &str, file: &str, choice: Choice) -> Result<(), Error> {
        let game = self.synced_game(rom)?.ok_or_else(|| format!("{rom} hasn't synced"))?;
        let entries = self.conflict(&game.id, file)?;
        let dir = self.conflict_dir(&game.id, file);
        let in_unit = |path: &str| Unit::of(rom, path).key() == file;
        match choice {
            Choice::Device => {
                let mut saves = Vec::new();
                for entry in entries.iter().filter(|entry| record::is_save(rom, &entry.path)) {
                    let copy = dir.join(file_name(&entry.path));
                    saves.push((entry.path.clone(), std::fs::read(&copy).map_err(io(copy.display()))?));
                }
                if let Some((slot, save)) = save::from_files(rom, saves) {
                    backups::take(self.games, rom, &slot, Reason::Sync, &save, &backups::now(), None).await?;
                }
                // Picking this device's files picks its missing ones too, so the cloud's copies go.
                for entry in &entries {
                    if !self.games.has_file(&entry.path).await {
                        self.index.keep_sync_deletion(rom, &entry.path, &entry.sha1, index::now())?;
                    }
                }
            }
            Choice::Cloud => {
                if file == Unit::Save.key() {
                    if let (slot, Some(save)) = save::open(self.games, rom).await? {
                        backups::take(self.games, rom, &slot, Reason::Sync, &save, &backups::now(), None).await?;
                    }
                }
                for path in self.local_paths(rom).await? {
                    if in_unit(&path) && !entries.iter().any(|entry| entry.path == path) {
                        self.games.remove_unlogged(&path).await.map_err(|e| format!("{path}: {e}"))?;
                    }
                }
                let mut entries = entries.clone();
                entries.sort_by_key(|entry| entry.path.ends_with(".state"));
                for entry in &entries {
                    let copy = dir.join(file_name(&entry.path));
                    let bytes = std::fs::read(&copy).map_err(io(copy.display()))?;
                    self.games.write(&entry.path, &bytes).await.map_err(|e| format!("{}: {e}", entry.path))?;
                    let (size, modified) = self.stat(&entry.path).await?;
                    let hash = FileHash { size: size as i64, mtime: nanos(modified), sha1: entry.sha1.clone() };
                    self.index.keep_file_hash(&entry.path, &hash)?;
                }
            }
        }
        // The cloud's version counts as the last synced one, so a device that kept its own uploads it next.
        for base in self.index.synced_files(&game.id)? {
            if in_unit(&base.path) {
                self.index.forget_synced_file(&game.id, &base.path)?;
            }
        }
        for entry in &entries {
            self.index.keep_synced_file(&game.id, &SyncedFile::from(entry))?;
        }
        self.forget_conflict(&game.id, file)
    }

    pub async fn cloud_games(&self) -> Result<Vec<String>, Error> {
        Ok(self.cloud_records().await?.into_iter().map(|record| record.rom.path).collect())
    }

    async fn cloud_records(&self) -> Result<Vec<Record>, Error> {
        let synced = self.index.synced_games()?;
        let mut listed: HashMap<String, HashSet<String>> = HashMap::new();
        let mut games = BTreeMap::new();
        for record in self.free_records(&synced).await? {
            if record.rom.blob.is_none() {
                continue;
            }
            let dir = parent(&record.rom.path).to_string();
            if !listed.contains_key(&dir) {
                let names = self.entries(&dir).await?.into_iter().map(|entry| entry.name).collect();
                listed.insert(dir.clone(), names);
            }
            if !listed[&dir].contains(file_name(&record.rom.path)) {
                games.entry(record.rom.path.clone()).or_insert(record);
            }
        }
        Ok(games.into_values().collect())
    }

    async fn free_record(&self, rom: &str) -> Result<Option<Record>, Error> {
        let synced = self.index.synced_games()?;
        Ok(self.free_records(&synced).await?.into_iter().find(|record| record.rom.path == rom))
    }

    pub async fn cloud_rom_size(&self, rom: &str) -> Result<Option<u64>, Error> {
        let record = self.free_record(rom).await?.filter(|record| record.rom.blob.is_some());
        Ok(record.map(|record| record.rom.size + record.update.map_or(0, |update| update.size)))
    }

    // Only the ROM and its update. The game's files follow at its next sync.
    pub async fn download_rom(&self, rom: &str, progress: &OnProgress<'_>) -> Result<(), Error> {
        let record = self.free_record(rom).await?.filter(|record| record.rom.blob.is_some());
        let record = record.ok_or_else(|| format!("{} isn't in your cloud", file_name(rom)))?;
        let blob = record.rom.blob.as_ref().expect("filtered on its blob");
        if self.games.has_file(rom).await {
            return Err(format!("{rom} is already on this device").into());
        }
        let total = record.rom.size + record.update.as_ref().map_or(0, |update| update.size);
        let before_rom = total - record.rom.size;
        // The update comes first, so a game on the device always has the update its record names.
        if let Some(update) = &record.update {
            self.download_update(rom, update, &|done, _| progress(done, total), None).await?;
        }
        let rom_progress = |done, _| progress(before_rom + done, total);
        self.retry(|| self.download_rom_file(rom, blob, record.rom.size, &rom_progress, None)).await?;
        let (size, modified) = self.stat(rom).await?;
        self.index.keep_file_hash(rom, &FileHash { size: size as i64, mtime: nanos(modified), sha1: blob.sha1.clone() })?;
        let game = SyncedGame { id: record.id.clone(), path: rom.into(), rom_size: size as i64, rom_mtime: millis(modified), rom_sha1: record.rom.sha1 };
        Ok(self.index.keep_synced_game(&game)?)
    }

    async fn download_rom_file(
        &self,
        rom: &str,
        blob: &Blob,
        size: u64,
        progress: &OnProgress<'_>,
        stop: Option<&(dyn Fn() -> bool + Sync)>,
    ) -> Result<(), Error> {
        let file = self.games.create_file(rom).await.map_err(|e| format!("{rom}: {e}"))?;
        let counting = Counting { inner: Hashing::new(file), done: 0, total: size, progress };
        let mut writer = Stopping { inner: counting, stop };
        self.provider.download(&blob.id, &mut writer).await?;
        let (file, sha1) = writer.inner.inner.finish();
        if sha1 != blob.sha1 {
            return Err(format!("{} didn't download whole", file_name(rom)).into());
        }
        Ok(file.finish().await.map_err(|e| format!("{rom}: {e}"))?)
    }

    pub async fn remove_from_device(&self, rom: &str) -> Result<(), Error> {
        let not_synced = || Error::from("This game hasn't synced yet");
        let game = self.synced_game(rom)?.ok_or_else(not_synced)?;
        let (_, record) = self.cached(&game.id)?.ok_or_else(not_synced)?;
        if record.rom.blob.is_none() || record.rom.path != rom || record.rom.sha1 != game.rom_sha1 {
            return Err("This game's ROM isn't in your cloud yet".into());
        }
        if matches!(self.update_transfer(rom, record.update.as_ref()).await?, Some(UpdateTransfer::Up(_))) {
            return Err("This game's update isn't in your cloud yet".into());
        }
        if !self.index.sync_conflicts(&game.id)?.is_empty() {
            return Err("This game changed on another device. Open it to pick which version to keep".into());
        }
        let cloud: Sha1s = record.files.iter().map(|entry| (entry.path.clone(), entry.sha1.clone())).collect();
        if self.local_files(rom).await?.iter().any(|(path, file)| cloud.get(path) != Some(&file.sha1)) {
            return Err("Some of this game's files haven't synced yet".into());
        }
        let _syncing = self.in_use.start_removing(rom).ok_or("Quit the game first")?;
        self.remove_here(&game.id, rom).await
    }

    pub async fn delete(&self, rom: &str) -> Result<(), Error> {
        let _syncing = self.in_use.start_removing(rom).ok_or("Quit the game first")?;
        self.refresh().await?;
        let id = match self.synced_game(rom)? {
            Some(game) => Some(game.id),
            None => self.free_record(rom).await?.map(|record| record.id),
        };
        if let Some(id) = id {
            if let Some((_, record)) = self.cached(&id)? {
                self.retry(|| self.provider.delete_record(&id)).await?;
                for entry in &record.files {
                    if let Err(e) = self.retry(|| self.provider.retire_blob(&entry.blob)).await {
                        eprintln!("retiring blob {}: {e}", entry.blob);
                    }
                }
                let rom_blob = record.rom.blob.map(|blob| blob.id);
                for blob in rom_blob.into_iter().chain(record.update.map(|update| update.blob)) {
                    if let Err(e) = self.retry(|| self.provider.delete_blob(&blob)).await {
                        eprintln!("deleting blob {blob}: {e}");
                    }
                }
            }
            self.index.forget_sync_record(&id)?;
            self.forget_game(&id)?;
        }
        self.index.forget_sync_deletions(rom)?;
        Ok(remove_game(self.games, rom).await?)
    }
}

fn remove_dir(dir: &Path) -> Result<(), Error> {
    match std::fs::remove_dir_all(dir) {
        Err(e) if e.kind() != std::io::ErrorKind::NotFound => Err(io(dir.display())(e)),
        _ => Ok(()),
    }
}

fn remove_file(file: &Path) -> Result<(), Error> {
    match std::fs::remove_file(file) {
        Err(e) if e.kind() != std::io::ErrorKind::NotFound => Err(io(file.display())(e)),
        _ => Ok(()),
    }
}

type Outcome = Result<Report, String>;

static NOT_METERED: AtomicBool = AtomicBool::new(false);
static STOPPING: AtomicBool = AtomicBool::new(false);

pub fn stop() {
    STOPPING.store(true, Ordering::Relaxed);
}

pub struct Syncer {
    connected: Mutex<Option<(Cloud, Arc<dyn Provider>)>>,
    queue: Arc<Queue<Outcome>>,
    running: tokio::sync::Mutex<()>,
    // Delete and Remove from this device wait for the running sync, so they cut it short.
    interrupting: std::sync::atomic::AtomicUsize,
    pub in_use: Arc<InUse>,
    plus: Arc<Plus>,
    conflicts: PathBuf,
    cheat_bases: PathBuf,
    kept_copies: PathBuf,
    skins: PathBuf,
    removed: PathBuf,
    signed_in: PathBuf,
    sync_games: AtomicBool,
    mobile_data: AtomicBool,
    mobile_roms: AtomicBool,
    settings_file: PathBuf,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct Settings {
    sync_games: bool,
    mobile_data: bool,
    mobile_roms: bool,
}

impl Default for Settings {
    fn default() -> Settings {
        Settings { sync_games: false, mobile_data: true, mobile_roms: false }
    }
}

#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq)]
pub struct MobileData {
    on: bool,
    roms: bool,
}

#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum Cloud {
    Google,
    Dropbox,
}

impl Cloud {
    fn available(self) -> bool {
        match self {
            Cloud::Google => google::available(google::CLIENT_ID),
            Cloud::Dropbox => dropbox_sign_in::available(dropbox_sign_in::APP_KEY),
        }
    }
}

#[derive(Serialize, Deserialize)]
struct SignedIn {
    cloud: Cloud,
    account: String,
}

impl Syncer {
    pub fn new(data_dir: &Path, in_use: Arc<InUse>, plus: Arc<Plus>) -> Syncer {
        let settings_file = data_dir.join("sync-settings.json");
        let settings: Settings = std::fs::read(&settings_file).ok().and_then(|json| serde_json::from_slice(&json).ok()).unwrap_or_default();
        Syncer {
            connected: Mutex::new(None),
            queue: Arc::new(Queue::new()),
            running: tokio::sync::Mutex::new(()),
            interrupting: Default::default(),
            in_use,
            plus,
            conflicts: data_dir.join("sync-conflicts"),
            cheat_bases: data_dir.join("sync-cheats"),
            kept_copies: crate::kept_copies::dir(data_dir),
            skins: crate::skins::file(data_dir),
            removed: data_dir.join("removed"),
            signed_in: data_dir.join("sync-account.json"),
            sync_games: AtomicBool::new(settings.sync_games),
            mobile_data: AtomicBool::new(settings.mobile_data),
            mobile_roms: AtomicBool::new(settings.mobile_roms),
            settings_file,
        }
    }

    fn mobile_data(&self) -> MobileData {
        MobileData { on: self.mobile_data.load(Ordering::Relaxed), roms: self.mobile_roms.load(Ordering::Relaxed) }
    }

    fn save_settings(&self, settings: Settings) -> Result<(), String> {
        let json = serde_json::to_vec(&settings).map_err(|e| e.to_string())?;
        std::fs::write(&self.settings_file, json).map_err(|e| e.to_string())?;
        self.sync_games.store(settings.sync_games, Ordering::Relaxed);
        self.mobile_data.store(settings.mobile_data, Ordering::Relaxed);
        self.mobile_roms.store(settings.mobile_roms, Ordering::Relaxed);
        Ok(())
    }

    fn settings(&self) -> Settings {
        let MobileData { on: mobile_data, roms: mobile_roms } = self.mobile_data();
        Settings { sync_games: self.sync_games.load(Ordering::Relaxed), mobile_data, mobile_roms }
    }

    fn set_games(&self, on: bool) -> Result<(), String> {
        self.save_settings(Settings { sync_games: on, ..self.settings() })
    }

    fn set_mobile_data(&self, mobile_data: MobileData) -> Result<(), String> {
        self.save_settings(Settings { mobile_data: mobile_data.on, mobile_roms: mobile_data.roms, ..self.settings() })
    }

    fn connected(&self) -> Option<(Cloud, Arc<dyn Provider>)> {
        self.connected.lock().unwrap_or_else(|e| e.into_inner()).clone()
    }

    // Losing Plus hides the account without signing out, so buying Plus again resumes sync.
    fn provider(&self) -> Result<Arc<dyn Provider>, String> {
        let provider = self.connected().map(|(_, provider)| provider).ok_or_else(|| "Sync is off".to_string())?;
        if !self.plus.syncs() {
            return Err("Sync needs Plus".into());
        }
        Ok(provider)
    }

    fn account(&self) -> Option<String> {
        self.provider().ok().map(|provider| provider.account())
    }

    fn available(&self, keyed: impl Fn(Cloud) -> bool) -> Vec<Cloud> {
        if !self.plus.offers_sync() {
            return Vec::new();
        }
        [Cloud::Google, Cloud::Dropbox].into_iter().filter(|cloud| keyed(*cloud)).collect()
    }

    fn check_sign_in(&self, cloud: Cloud, keyed: impl Fn(Cloud) -> bool) -> Result<(), String> {
        if !self.available(keyed).contains(&cloud) {
            return Err("This build can't sync there".into());
        }
        if !self.plus.syncs() {
            return Err("Sync needs Plus".into());
        }
        self.check_signed_out()
    }

    fn check_signed_out(&self) -> Result<(), String> {
        if self.connected().is_some() {
            return Err("Sign out first. pkhemu syncs with one account at a time".into());
        }
        Ok(())
    }

    fn others_waiting(&self) -> bool {
        self.queue.games_waiting() || self.interrupting.load(Ordering::Relaxed) > 0
    }

    async fn interrupt(&self) -> tokio::sync::MutexGuard<'_, ()> {
        self.interrupting.fetch_add(1, Ordering::Relaxed);
        let running = self.running.lock().await;
        self.interrupting.fetch_sub(1, Ordering::Relaxed);
        running
    }

    fn sign_in(&self, index: &Index, cloud: Cloud, provider: Arc<dyn Provider>) -> Result<String, String> {
        self.check_signed_out()?;
        forget_sign_in(self, index)?;
        let account = provider.account();
        let signed_in = serde_json::to_vec(&SignedIn { cloud, account: account.clone() }).map_err(|e| e.to_string())?;
        std::fs::write(&self.signed_in, signed_in).map_err(|e| e.to_string())?;
        self.connect(Some((cloud, provider)));
        Ok(account)
    }

    fn connect(&self, connected: Option<(Cloud, Arc<dyn Provider>)>) {
        *self.connected.lock().unwrap_or_else(|e| e.into_inner()) = connected;
    }
}

pub fn reconnect<R: Runtime>(app: &AppHandle<R>) {
    let state = app.state::<Syncer>();
    let Ok(json) = std::fs::read(&state.signed_in) else { return };
    let Ok(signed_in) = serde_json::from_slice::<SignedIn>(&json) else { return };
    if !signed_in.cloud.available() {
        return;
    }
    let provider: Arc<dyn Provider> = match signed_in.cloud {
        Cloud::Google => Arc::new(google::reconnect(app, &signed_in.account)),
        Cloud::Dropbox => match dropbox_sign_in::reconnect(app, &signed_in.account) {
            Ok(dropbox) => Arc::new(dropbox),
            Err(e) => return eprintln!("Dropbox: {e}"),
        },
    };
    state.connect(Some((signed_in.cloud, provider)));
}

#[tauri::command]
pub fn sync_available(state: State<'_, Syncer>) -> Vec<Cloud> {
    state.available(Cloud::available)
}

#[tauri::command]
pub fn sync_account(state: State<'_, Syncer>) -> Option<String> {
    state.account()
}

#[tauri::command]
pub async fn sync_sign_in<R: Runtime>(
    app: AppHandle<R>,
    state: State<'_, Syncer>,
    index: State<'_, Arc<Index>>,
    cloud: Cloud,
) -> Result<String, String> {
    state.check_sign_in(cloud, Cloud::available)?;
    let provider: Arc<dyn Provider> = match cloud {
        Cloud::Google => Arc::new(google::sign_in(&app).await.map_err(|e| e.to_string())?),
        Cloud::Dropbox => Arc::new(dropbox_sign_in::sign_in(&app).await.map_err(|e| e.to_string())?),
    };
    let _running = state.running.lock().await;
    state.sign_in(&index, cloud, provider)
}

#[tauri::command]
pub async fn sync_sign_out<R: Runtime>(app: AppHandle<R>, state: State<'_, Syncer>, index: State<'_, Arc<Index>>) -> Result<(), String> {
    let Some((cloud, provider)) = state.connected() else { return Ok(()) };
    state.connect(None);
    let _running = state.running.lock().await;
    if let Err(e) = forget_sign_in(&state, &index) {
        state.connect(Some((cloud, provider)));
        return Err(e);
    }
    let signed_out = match cloud {
        Cloud::Google => google::sign_out(&app, &provider.account()).await,
        Cloud::Dropbox => dropbox_sign_in::sign_out(&app, &provider.account()).await,
    };
    if let Err(e) = signed_out {
        eprintln!("{cloud:?} sign-out: {e}");
    }
    Ok(())
}

fn forget_sign_in(state: &Syncer, index: &Index) -> Result<(), String> {
    match std::fs::remove_file(&state.signed_in) {
        Err(e) if e.kind() != std::io::ErrorKind::NotFound => return Err(e.to_string()),
        _ => {}
    }
    remove_dir(&state.conflicts).map_err(|e| e.to_string())?;
    remove_dir(&state.cheat_bases).map_err(|e| e.to_string())?;
    index.forget_sync()
}

#[tauri::command]
pub fn sync_last_synced(state: State<'_, Syncer>, index: State<'_, Arc<Index>>) -> Result<Option<i64>, String> {
    if state.provider().is_err() {
        return Ok(None);
    }
    index.last_synced()
}

#[tauri::command]
pub fn sync_games_last_synced(
    state: State<'_, Syncer>,
    index: State<'_, Arc<Index>>,
) -> Result<HashMap<String, i64>, String> {
    if state.provider().is_err() {
        return Ok(HashMap::new());
    }
    Ok(index.games_last_synced()?.into_iter().collect())
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct Status {
    syncing: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    account_error: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    last_synced: Option<i64>,
}

pub fn account_error(report: &Result<Report, Error>) -> Option<String> {
    match report {
        Ok(report) => report.values().find(|synced| synced.account_error).and_then(|synced| synced.error.clone()),
        Err(e @ Error::Account(_)) => Some(e.to_string()),
        Err(_) => None,
    }
}

#[derive(Serialize, Clone)]
struct GameEvent<'a> {
    path: &'a str,
    #[serde(flatten)]
    state: &'a GameState,
}

struct AppEvents<R: Runtime>(AppHandle<R>);

impl<R: Runtime> Events for AppEvents<R> {
    fn game(&self, rom: &str, state: &GameState) {
        let _ = self.0.emit("sync-game", GameEvent { path: rom, state });
    }

    fn run(&self, run: &RunProgress) {
        let _ = self.0.emit("sync-run", run);
        keep_alive::progress(&self.0, run);
    }

    fn box_art(&self, rom: &str) {
        let _ = self.0.emit("box-art-changed", rom);
    }

    fn skins(&self, skins: &crate::skins::Skins) {
        let _ = self.0.emit("skins-changed", skins);
    }
}

impl<R: Runtime> KeepAlive for AppHandle<R> {
    fn begin(&self) {
        keep_alive::begin(self);
    }

    fn end(&self) {
        keep_alive::end(self);
    }
}

fn sleep(wait: Duration) -> BoxFuture<'static, ()> {
    Box::pin(tokio::time::sleep(wait))
}

async fn run<R: Runtime>(app: AppHandle<R>, folder: String, request: Request) -> Outcome {
    let state = app.state::<Syncer>();
    let index = app.state::<Arc<Index>>();
    // Taken before the provider, so a sign-out that clears the provider first waits for this sync or stops it starting.
    let _running = state.running.lock().await;
    STOPPING.store(false, Ordering::Relaxed);
    let provider = state.provider()?;
    let _ = app.emit("sync-status", Status { syncing: true, error: None, account_error: None, last_synced: None });
    let games = GamesFolder::open(&app, &folder);
    let device = device_name();
    let events = AppEvents(app.clone());
    let metered = Arc::new(AtomicBool::new(network::metered(&app).await));
    // The network can change during a long upload.
    let watching = {
        let (app, metered) = (app.clone(), metered.clone());
        tauri::async_runtime::spawn(async move {
            loop {
                tokio::time::sleep(Duration::from_secs(5)).await;
                metered.store(network::metered(&app).await, Ordering::Relaxed);
            }
        })
    };
    let others_waiting = || state.others_waiting();
    let engine = Engine {
        metered: &metered,
        others_waiting: &others_waiting,
        ..engine_for(&games, &index, provider.as_ref(), &state, &device, &events)
    };
    let report = match request {
        Request::All => {
            let report = engine.sync_all().await;
            if engine.stopped_early.load(Ordering::Relaxed) && !STOPPING.load(Ordering::Relaxed) {
                state.queue.run_after(Request::All);
            }
            report
        }
        Request::Games(roms) => engine.sync(&roms.into_iter().collect::<Vec<_>>()).await,
    };
    if STOPPING.load(Ordering::Relaxed) {
        state.queue.drop_waiting();
    }
    watching.abort();
    let error = match &report {
        Ok(report) => report.values().find_map(|synced| synced.error.clone()),
        Err(Error::MobileData) => None,
        Err(e) => Some(e.to_string()),
    };
    let account_error = account_error(&report);
    let last_synced = index.last_synced().ok().flatten();
    let _ = app.emit("sync-status", Status { syncing: false, error, account_error, last_synced });
    report.map_err(|e| e.to_string())
}

async fn queue<R: Runtime>(app: AppHandle<R>, folder: String, request: Request) -> Outcome {
    let queue = app.state::<Syncer>().queue.clone();
    queue
        .run(request, app.clone(), move |request| run(app.clone(), folder.clone(), request))
        .await
        .unwrap_or_else(|| Err("the sync stopped".into()))
}

#[tauri::command]
pub async fn sync_game<R: Runtime>(
    app: AppHandle<R>,
    emu: State<'_, crate::emu::Emu>,
    folder: String,
    path: String,
) -> Result<Synced, String> {
    crate::stop_game(&emu).await?;
    let mut report = queue(app, folder, Request::game(&path)).await?;
    let synced = report.remove(&path).ok_or_else(|| format!("{path} didn't sync"))?;
    match synced.error {
        Some(e) => Err(e),
        None => Ok(synced),
    }
}

pub async fn queue_game<R: Runtime>(app: AppHandle<R>, game: crate::emu::Playing) -> Outcome {
    queue(app, game.folder, Request::game(&game.path)).await
}

#[tauri::command]
pub async fn sync_all<R: Runtime>(app: AppHandle<R>, folder: String) -> Result<Report, String> {
    queue(app, folder, Request::All).await
}

fn engine_for<'a, R: Runtime>(
    games: &'a GamesFolder<'a, R>,
    index: &'a Index,
    provider: &'a dyn Provider,
    state: &'a Syncer,
    device: &'a str,
    events: &'a AppEvents<R>,
) -> Engine<'a, R> {
    Engine {
        games,
        index,
        provider,
        conflicts: &state.conflicts,
        cheat_bases: &state.cheat_bases,
        kept_copies: &state.kept_copies,
        skins: &state.skins,
        removed: &state.removed,
        device,
        sleep: &sleep,
        events,
        in_use: &state.in_use,
        sync_games: &state.sync_games,
        metered: &NOT_METERED,
        mobile_data: &state.mobile_data,
        mobile_roms: &state.mobile_roms,
        others_waiting: &|| false,
        stopping: &STOPPING,
        tracker: Tracker::default(),
        stopped_early: AtomicBool::new(false),
    }
}

#[tauri::command]
pub async fn sync_conflicts<R: Runtime>(
    app: AppHandle<R>,
    state: State<'_, Syncer>,
    index: State<'_, Arc<Index>>,
    folder: String,
    path: String,
) -> Result<Vec<Conflict>, String> {
    let (games, provider, device, events) = (GamesFolder::open(&app, &folder), state.provider()?, device_name(), AppEvents(app.clone()));
    engine_for(&games, &index, provider.as_ref(), &state, &device, &events).conflicts(&path).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn sync_cloud_save<R: Runtime>(
    app: AppHandle<R>,
    state: State<'_, Syncer>,
    index: State<'_, Arc<Index>>,
    folder: String,
    path: String,
) -> Result<Option<save::SaveFile>, String> {
    let (games, provider, device, events) = (GamesFolder::open(&app, &folder), state.provider()?, device_name(), AppEvents(app.clone()));
    engine_for(&games, &index, provider.as_ref(), &state, &device, &events).cloud_save(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn sync_cloud_screenshot<R: Runtime>(
    app: AppHandle<R>,
    state: State<'_, Syncer>,
    index: State<'_, Arc<Index>>,
    folder: String,
    path: String,
    file: String,
) -> Result<Option<Vec<u8>>, String> {
    let (games, provider, device, events) = (GamesFolder::open(&app, &folder), state.provider()?, device_name(), AppEvents(app.clone()));
    engine_for(&games, &index, provider.as_ref(), &state, &device, &events).cloud_screenshot(&path, &file).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn sync_resolve<R: Runtime>(
    app: AppHandle<R>,
    emu: State<'_, crate::emu::Emu>,
    state: State<'_, Syncer>,
    index: State<'_, Arc<Index>>,
    folder: String,
    path: String,
    file: String,
    choice: Choice,
) -> Result<(), String> {
    crate::stop_game(&emu).await?;
    let (games, provider, device, events) = (GamesFolder::open(&app, &folder), state.provider()?, device_name(), AppEvents(app.clone()));
    engine_for(&games, &index, provider.as_ref(), &state, &device, &events).resolve(&path, &file, choice).await.map_err(|e| e.to_string())
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncGames {
    on: bool,
    // Only Android tells mobile data from Wi-Fi.
    #[serde(skip_serializing_if = "Option::is_none")]
    mobile_data: Option<MobileData>,
}

#[tauri::command]
pub fn sync_games(state: State<'_, Syncer>) -> SyncGames {
    let mobile_data = TELLS_MOBILE_DATA.then(|| state.mobile_data());
    SyncGames { on: state.sync_games.load(Ordering::Relaxed), mobile_data }
}

#[tauri::command]
pub fn sync_set_games(state: State<'_, Syncer>, on: bool) -> Result<(), String> {
    state.set_games(on)
}

#[tauri::command]
pub fn sync_set_mobile_data(state: State<'_, Syncer>, mobile_data: MobileData) -> Result<(), String> {
    state.set_mobile_data(mobile_data)
}

#[tauri::command]
pub async fn sync_cloud_games<R: Runtime>(
    app: AppHandle<R>,
    state: State<'_, Syncer>,
    index: State<'_, Arc<Index>>,
    folder: String,
) -> Result<Vec<String>, String> {
    let Ok(provider) = state.provider() else { return Ok(Vec::new()) };
    let (games, device, events) = (GamesFolder::open(&app, &folder), device_name(), AppEvents(app.clone()));
    engine_for(&games, &index, provider.as_ref(), &state, &device, &events).cloud_games().await.map_err(|e| e.to_string())
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct Download<'a> {
    path: &'a str,
    done: u64,
    total: u64,
}

#[tauri::command]
pub async fn sync_download_rom<R: Runtime>(
    app: AppHandle<R>,
    state: State<'_, Syncer>,
    index: State<'_, Arc<Index>>,
    folder: String,
    path: String,
) -> Result<(), String> {
    let (games, provider, device, events) = (GamesFolder::open(&app, &folder), state.provider()?, device_name(), AppEvents(app.clone()));
    let progress = |done, total| {
        let _ = app.emit("sync-download", Download { path: &path, done, total });
    };
    engine_for(&games, &index, provider.as_ref(), &state, &device, &events).download_rom(&path, &progress).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn sync_mobile_download_size<R: Runtime>(
    app: AppHandle<R>,
    state: State<'_, Syncer>,
    index: State<'_, Arc<Index>>,
    folder: String,
    path: String,
) -> Result<Option<u64>, String> {
    if !network::metered(&app).await {
        return Ok(None);
    }
    let (games, provider, device, events) = (GamesFolder::open(&app, &folder), state.provider()?, device_name(), AppEvents(app.clone()));
    engine_for(&games, &index, provider.as_ref(), &state, &device, &events).cloud_rom_size(&path).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn sync_remove_from_device<R: Runtime>(
    app: AppHandle<R>,
    emu: State<'_, crate::emu::Emu>,
    folder: String,
    path: String,
) -> Result<(), String> {
    sync_game(app.clone(), emu, folder.clone(), path.clone()).await?;
    let (state, index) = (app.state::<Syncer>(), app.state::<Arc<Index>>());
    let _running = state.interrupt().await;
    let (games, provider, device, events) = (GamesFolder::open(&app, &folder), state.provider()?, device_name(), AppEvents(app.clone()));
    engine_for(&games, &index, provider.as_ref(), &state, &device, &events).remove_from_device(&path).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_game<R: Runtime>(
    app: AppHandle<R>,
    emu: State<'_, crate::emu::Emu>,
    state: State<'_, Syncer>,
    index: State<'_, Arc<Index>>,
    folder: String,
    path: String,
) -> Result<(), String> {
    crate::stop_game(&emu).await?;
    let games = GamesFolder::open(&app, &folder);
    let _running = state.interrupt().await;
    let Ok(provider) = state.provider() else { return remove_game(&games, &path).await };
    let (device, events) = (device_name(), AppEvents(app.clone()));
    engine_for(&games, &index, provider.as_ref(), &state, &device, &events).delete(&path).await.map_err(|e| e.to_string())
}
