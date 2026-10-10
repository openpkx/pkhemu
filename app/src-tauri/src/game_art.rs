use crate::games_folder::GamesFolder;
use crate::index::{self, Index, RomArtRow};
use crate::rom;
use crate::files::write_file;
use rom_art::{Extracted, Key, DECODER_VERSION};
use serde::{Deserialize, Serialize};
use sha1::{Digest, Sha1};
use std::collections::VecDeque;
use std::fs::File;
use std::io::{BufReader, Read, Seek};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Condvar, Mutex, MutexGuard};
use std::time::UNIX_EPOCH;
use tauri::ipc::Response;
use tauri::{AppHandle, Emitter, Runtime, State};

mod retail;

const MANIFEST: &str = "manifest.json";
const PENDING: &str = "pending";
const FAILED: &str = "failed";

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Stat {
    pub size: u64,
    pub mtime: i64,
}

pub trait Host: Send + Sync + 'static {
    fn stat(&self, folder: &str, path: &str) -> Result<Stat, String>;
    fn open_file(&self, folder: &str, path: &str) -> Result<File, String>;
    fn open_rom(&self, folder: &str, path: &str) -> Result<File, String>;
    fn changed(&self, sha1: &str);
    fn progress(&self, progress: Option<Progress>);
}

pub struct AppHost<R: Runtime>(pub AppHandle<R>);

impl<R: Runtime> Host for AppHost<R> {
    fn stat(&self, folder: &str, path: &str) -> Result<Stat, String> {
        let (size, modified) = tauri::async_runtime::block_on(GamesFolder::open(&self.0, folder).stat(path))?;
        let mtime = modified.duration_since(UNIX_EPOCH).unwrap_or_default().as_millis() as i64;
        Ok(Stat { size, mtime })
    }

    fn open_file(&self, folder: &str, path: &str) -> Result<File, String> {
        tauri::async_runtime::block_on(GamesFolder::open(&self.0, folder).open_file(path))
    }

    fn open_rom(&self, folder: &str, path: &str) -> Result<File, String> {
        tauri::async_runtime::block_on(GamesFolder::open(&self.0, folder).open_rom(path))
    }

    fn changed(&self, sha1: &str) {
        let _ = self.0.emit("game-art-changed", sha1);
    }

    fn progress(&self, progress: Option<Progress>) {
        let _ = self.0.emit("game-art-progress", progress);
    }
}

#[derive(Serialize, Clone, Copy, Debug, PartialEq)]
pub struct Progress {
    pub done: usize,
    pub total: usize,
}

#[derive(Serialize, Deserialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Manifest {
    pub decoder_version: u32,
    pub status: String,
    pub game: Option<ManifestGame>,
    pub keys: Vec<String>,
}

#[derive(Serialize, Debug, PartialEq)]
pub struct Art {
    pub status: String,
    pub manifest: Option<Manifest>,
}

#[derive(Serialize, Deserialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ManifestGame {
    pub platform: String,
    pub title: String,
    pub code: String,
    pub revision: u8,
}

impl Manifest {
    fn new(extracted: &Extracted, animations: &[Key]) -> Manifest {
        Manifest {
            decoder_version: DECODER_VERSION,
            status: extracted.status.as_str().into(),
            game: extracted.game.as_ref().map(|game| ManifestGame {
                platform: format!("{:?}", game.platform).to_lowercase(),
                title: game.title.clone(),
                code: game.code.clone(),
                revision: game.revision,
            }),
            keys: extracted
                .images
                .iter()
                .map(|image| image.key)
                .chain(animations.iter().copied())
                .map(|key| key.to_string())
                .collect(),
        }
    }
}

#[derive(Clone, Debug, PartialEq)]
struct Job {
    folder: String,
    path: String,
    sha1: String,
}

struct Worker<H> {
    root: PathBuf,
    index: Arc<Index>,
    host: H,
}

impl<H: Host> Worker<H> {
    fn check(&self, folder: &str, path: &str) -> Result<Option<Job>, String> {
        self.inspect(folder, path, false)
    }

    fn reextract(&self, folder: &str, path: &str) -> Result<Option<Job>, String> {
        self.inspect(folder, path, true)
    }

    fn inspect(&self, folder: &str, path: &str, fresh: bool) -> Result<Option<Job>, String> {
        if fresh {
            self.index.forget_rom_art(path)?;
        }
        let stat = self.host.stat(folder, path)?;
        let (size, mtime) = (stat.size as i64, stat.mtime);
        let unchanged = self.index.rom_art(path)?.filter(|row| row.size == size && row.mtime == mtime);
        if unchanged.as_ref().is_some_and(|row| row.decoder_version >= DECODER_VERSION) {
            return Ok(None);
        }
        let sha1 = match unchanged.filter(|row| !row.sha1.is_empty()) {
            Some(row) => row.sha1,
            None => match sha1_of_rom(path, self.host.open_file(folder, path)?) {
                Ok(sha1) => sha1,
                Err(e) if !rom::is_archive(path) => return Err(e),
                Err(e) => {
                    // An archive that won't unpack fails the same way until the file changes, so it isn't read again until then.
                    let row = RomArtRow { path: path.into(), size, mtime, sha1: String::new(), decoder_version: DECODER_VERSION, status: FAILED.into() };
                    self.index.keep_rom_art(&row, index::now())?;
                    return Err(e);
                }
            },
        };
        if fresh {
            let dir = sha1_folder(&self.root, &sha1)?;
            if dir.exists() {
                std::fs::remove_dir_all(&dir).map_err(|e| format!("deleting {}: {e}", dir.display()))?;
            }
            // Copies of the ROM share the folder, so a scan checks them again if this extraction never finishes.
            self.index.mark_rom_art(&sha1, PENDING, Some(0), index::now())?;
        }
        let manifest = read_manifest(&self.root, &sha1);
        let current = manifest.as_ref().filter(|manifest| manifest.decoder_version >= DECODER_VERSION);
        let row = RomArtRow {
            path: path.into(),
            size,
            mtime,
            sha1: sha1.clone(),
            decoder_version: manifest.as_ref().map_or(0, |manifest| manifest.decoder_version),
            status: current.map_or(PENDING.into(), |manifest| manifest.status.clone()),
        };
        self.index.keep_rom_art(&row, index::now())?;
        Ok(current.is_none().then(|| Job { folder: folder.into(), path: path.into(), sha1 }))
    }

    fn hash(&self, folder: &str, path: &str) -> Result<(String, File), String> {
        let mut rom = self.host.open_rom(folder, path)?;
        let sha1 = sha1_of_stream(&mut rom).map_err(|e| format!("{path}: {e}"))?;
        rom.rewind().map_err(|e| format!("{path}: {e}"))?;
        Ok((sha1, rom))
    }

    fn extract(&self, job: &Job) {
        if let Err(e) = self.try_extract(job) {
            eprintln!("extracting game art from {}: {e}", job.path);
            match self.index.mark_rom_art(&job.sha1, FAILED, None, index::now()) {
                Ok(()) => self.host.changed(&job.sha1),
                Err(e) => eprintln!("{e}"),
            }
        }
    }

    fn try_extract(&self, job: &Job) -> Result<(), String> {
        if self.index.rom_art(&job.path)?.is_none_or(|row| row.sha1 != job.sha1) {
            return Ok(());
        }
        let manifest = match read_manifest(&self.root, &job.sha1) {
            Some(manifest) if manifest.decoder_version >= DECODER_VERSION => manifest,
            _ => {
                let (sha1, rom) = self.hash(&job.folder, &job.path)?;
                if sha1 != job.sha1 {
                    return Ok(());
                }
                let dir = self.root.join(&sha1);
                let mut animations = Ok(Vec::new());
                let extracted = rom_art::extract_each_from(rom, |animation| {
                    if let Ok(keys) = &mut animations {
                        match write_animation(&dir, &animation) {
                            Ok(()) => keys.push(animation.key),
                            Err(e) => animations = Err(e),
                        }
                    }
                })
                .map_err(|e| format!("{}: {e}", job.path))?;
                let manifest = Manifest::new(&extracted, &animations?);
                write_art(&dir, &extracted, &manifest)?;
                manifest
            }
        };
        self.index.mark_rom_art(&job.sha1, &manifest.status, Some(manifest.decoder_version), index::now())?;
        self.host.changed(&job.sha1);
        Ok(())
    }

    fn forget_all_but(&self, paths: &[String]) -> Result<(), String> {
        self.index.forget_rom_art_except(paths)?;
        let kept = self.index.rom_art_sha1s()?;
        let Ok(folders) = std::fs::read_dir(&self.root) else { return Ok(()) };
        for folder in folders.flatten() {
            let sha1 = folder.file_name().to_string_lossy().into_owned();
            if !kept.contains(&sha1) {
                match std::fs::remove_dir_all(folder.path()) {
                    Ok(()) => self.host.changed(&sha1),
                    Err(e) => eprintln!("deleting {}: {e}", folder.path().display()),
                }
            }
        }
        Ok(())
    }
}

pub(crate) fn sha1_of(bytes: &[u8]) -> String {
    hex(&Sha1::digest(bytes))
}

fn hex(digest: &[u8]) -> String {
    digest.iter().map(|b| format!("{b:02x}")).collect()
}

const CHUNK: usize = 1 << 20;

fn sha1_of_stream(rom: impl Read) -> std::io::Result<String> {
    let mut sha1 = Sha1::new();
    std::io::copy(&mut BufReader::with_capacity(CHUNK, rom), &mut sha1)?;
    Ok(hex(&sha1.finalize()))
}

pub(crate) fn sha1_of_rom(name: &str, file: impl Read + Seek) -> Result<String, String> {
    if rom::is_archive(name) {
        rom::read_archived(name, BufReader::new(file), |_, _, rom| sha1_of_stream(rom))
    } else {
        sha1_of_stream(file).map_err(|e| format!("{name}: {e}"))
    }
}

fn read_manifest(root: &Path, sha1: &str) -> Option<Manifest> {
    serde_json::from_slice(&std::fs::read(root.join(sha1).join(MANIFEST)).ok()?).ok()
}

type Encoder<'a> = png::Encoder<'a, &'a mut Vec<u8>>;

fn indexed<'a>(file: &'a mut Vec<u8>, width: u32, height: u32, palette: &[[u8; 4]]) -> Encoder<'a> {
    let mut encoder = png::Encoder::new(file, width, height);
    encoder.set_color(png::ColorType::Indexed);
    encoder.set_depth(png::BitDepth::Eight);
    encoder.set_palette(palette.iter().flat_map(|&[r, g, b, _]| [r, g, b]).collect::<Vec<_>>());
    encoder.set_trns(palette.iter().map(|&[.., a]| a).collect::<Vec<_>>());
    encoder.set_filter(png::Filter::NoFilter);
    encoder
}

fn png(image: &rom_art::Image) -> Result<Vec<u8>, String> {
    let mut file = Vec::new();
    let encoder = indexed(&mut file, image.width, image.height, &image.palette);
    let mut writer = encoder.write_header().map_err(|e| e.to_string())?;
    writer.write_image_data(&image.pixels).map_err(|e| e.to_string())?;
    writer.finish().map_err(|e| e.to_string())?;
    Ok(file)
}

const GAME_FRAMES_PER_SECOND: u16 = 60;

fn changed_region(width: usize, before: &[u8], after: &[u8]) -> (usize, usize, usize, usize) {
    let changed =
        before.iter().zip(after).enumerate().filter(|(_, (a, b))| a != b).map(|(i, _)| (i % width, i / width));
    let bounds = changed.fold(None, |bounds, (x, y)| match bounds {
        None => Some((x, y, x, y)),
        Some((left, top, right, bottom)) => Some((left.min(x), top.min(y), right.max(x), bottom.max(y))),
    });
    bounds.map_or((0, 0, 1, 1), |(left, top, right, bottom)| (left, top, right - left + 1, bottom - top + 1))
}

fn apng(animation: &rom_art::AnimatedSprite) -> Result<Vec<u8>, String> {
    let mut file = Vec::new();
    let mut encoder = indexed(&mut file, animation.width, animation.height, &animation.palette);
    encoder.set_animated(animation.frames.len() as u32, 0).map_err(|e| e.to_string())?;
    let mut writer = encoder.write_header().map_err(|e| e.to_string())?;
    let width = animation.width as usize;
    let mut previous: Option<&[u8]> = None;
    for frame in &animation.frames {
        let (x, y, w, h) = previous.map_or((0, 0, width, animation.height as usize), |previous| {
            changed_region(width, previous, &frame.pixels)
        });
        let region: Vec<u8> =
            frame.pixels.chunks(width).skip(y).take(h).flat_map(|row| &row[x..x + w]).copied().collect();
        // The writer checks a new size against the last frame's position, so the position moves after the size.
        writer.reset_frame_position().map_err(|e| e.to_string())?;
        writer.set_frame_dimension(w as u32, h as u32).map_err(|e| e.to_string())?;
        writer.set_frame_position(x as u32, y as u32).map_err(|e| e.to_string())?;
        writer.set_dispose_op(png::DisposeOp::None).map_err(|e| e.to_string())?;
        writer.set_blend_op(png::BlendOp::Source).map_err(|e| e.to_string())?;
        writer.set_frame_delay(frame.delay, GAME_FRAMES_PER_SECOND).map_err(|e| e.to_string())?;
        writer.write_image_data(&region).map_err(|e| e.to_string())?;
        previous = Some(&frame.pixels);
    }
    writer.finish().map_err(|e| e.to_string())?;
    Ok(file)
}

fn write_animation(dir: &Path, animation: &rom_art::AnimatedSprite) -> Result<(), String> {
    write_file(&dir.join(format!("{}.png", animation.key)), &apng(animation)?).map_err(|e| e.to_string())
}

fn write_art(dir: &Path, extracted: &Extracted, manifest: &Manifest) -> Result<(), String> {
    for image in &extracted.images {
        write_file(&dir.join(format!("{}.png", image.key)), &png(image)?).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_vec(manifest).map_err(|e| e.to_string())?;
    write_file(&dir.join(MANIFEST), &json).map_err(|e| e.to_string())?;
    let kept: Vec<String> = manifest.keys.iter().map(|key| format!("{key}.png")).chain([MANIFEST.into()]).collect();
    for file in std::fs::read_dir(dir).map_err(|e| e.to_string())?.flatten() {
        if !kept.contains(&file.file_name().to_string_lossy().into_owned()) {
            let _ = std::fs::remove_file(file.path());
        }
    }
    Ok(())
}

struct Scan {
    folder: String,
    paths: Vec<String>,
    next: usize,
}

impl Scan {
    fn covers(&self, folder: &str, paths: &[String]) -> bool {
        self.folder == folder && self.paths == paths
    }
}

#[derive(Default)]
struct Queue {
    folder: Option<String>,
    library: Vec<String>,
    scan: Option<Scan>,
    reextract: VecDeque<(String, String)>,
    jobs: VecDeque<Job>,
    playing: Option<String>,
    check_playing: Option<String>,
    busy: bool,
    done: usize,
    reported: Option<Progress>,
}

impl Queue {
    fn progress(&self) -> Option<Progress> {
        let left = self.reextract.len() + self.jobs.len() + usize::from(self.busy);
        (left > 0).then_some(Progress { done: self.done, total: self.done + left })
    }

    fn enqueue(&mut self, job: Job) {
        let reextracting = self.reextract.iter().any(|(_, path)| *path == job.path);
        if !reextracting && !self.jobs.iter().any(|queued| queued.sha1 == job.sha1) {
            self.jobs.push_back(job);
        }
    }
}

enum Task {
    Scan(Scan),
    Extract(Job),
    Reextract(String, String),
    CheckPlaying(String, String),
}

type Shared = (Mutex<Queue>, Condvar);

fn lock(shared: &Shared) -> MutexGuard<'_, Queue> {
    shared.0.lock().unwrap_or_else(|e| e.into_inner())
}

pub struct GameArt {
    root: PathBuf,
    shared: Arc<Shared>,
}

impl GameArt {
    pub fn start(root: PathBuf, index: Arc<Index>, host: impl Host) -> GameArt {
        let shared = Arc::new((Mutex::new(Queue::default()), Condvar::new()));
        let worker = Worker { root: root.clone(), index, host };
        let queue = shared.clone();
        std::thread::Builder::new()
            .name("game-art".into())
            .spawn(move || {
                lower_priority();
                run(&worker, &queue)
            })
            .expect("failed to start the game art thread");
        GameArt { root, shared }
    }

    fn update(&self, change: impl FnOnce(&mut Queue)) {
        change(&mut lock(&self.shared));
        self.shared.1.notify_all();
    }

    pub fn scan(&self, folder: String, paths: Vec<String>) {
        self.update(|queue| {
            queue.folder = Some(folder.clone());
            queue.library = paths.clone();
            queue.reextract.retain(|(queued, _)| *queued == folder);
            if !queue.scan.as_ref().is_some_and(|scan| scan.covers(&folder, &paths)) {
                queue.scan = Some(Scan { folder, paths, next: 0 });
            }
        });
    }

    pub fn reextract(&self, folder: String, paths: Vec<String>) {
        self.update(|queue| {
            queue.jobs.retain(|job| !paths.contains(&job.path));
            for path in paths {
                if !queue.reextract.iter().any(|(_, queued)| *queued == path) {
                    queue.reextract.push_back((folder.clone(), path));
                }
            }
        });
    }

    pub fn reextract_all(&self) {
        let (folder, library) = {
            let queue = lock(&self.shared);
            (queue.folder.clone(), queue.library.clone())
        };
        if let Some(folder) = folder {
            self.reextract(folder, library);
        }
    }

    pub fn progress(&self) -> Option<Progress> {
        lock(&self.shared).progress()
    }

    pub fn playing(&self, path: Option<String>) {
        self.update(|queue| {
            queue.playing = path.clone();
            queue.check_playing = path;
        });
    }
}

fn next_task(shared: &Shared) -> Task {
    let mut queue = lock(shared);
    loop {
        if let Some(folder) = queue.folder.clone() {
            if let Some(path) = queue.check_playing.take() {
                return Task::CheckPlaying(folder, path);
            }
        }
        if queue.playing.is_none() {
            if let Some(scan) = queue.scan.take() {
                return Task::Scan(scan);
            }
            if let Some((folder, path)) = queue.reextract.pop_front() {
                queue.busy = true;
                return Task::Reextract(folder, path);
            }
            if let Some(job) = queue.jobs.pop_front() {
                queue.busy = true;
                return Task::Extract(job);
            }
        }
        queue = shared.1.wait(queue).unwrap_or_else(|e| e.into_inner());
    }
}

fn run<H: Host>(worker: &Worker<H>, shared: &Shared) {
    loop {
        let task = next_task(shared);
        report(worker, shared);
        match task {
            Task::CheckPlaying(folder, path) => match worker.check(&folder, &path) {
                Ok(Some(job)) => {
                    {
                        let mut queue = lock(shared);
                        queue.jobs.retain(|queued| queued.sha1 != job.sha1);
                        queue.busy = true;
                    }
                    worker.extract(&job);
                    finish(worker, shared, 1);
                }
                Ok(None) => {}
                Err(e) => eprintln!("checking the game art of {path}: {e}"),
            },
            Task::Extract(job) => {
                worker.extract(&job);
                finish(worker, shared, 1);
            }
            Task::Reextract(folder, path) => {
                match worker.reextract(&folder, &path) {
                    Ok(Some(job)) => {
                        lock(shared).jobs.retain(|queued| queued.sha1 != job.sha1);
                        worker.extract(&job);
                    }
                    Ok(None) => {}
                    Err(e) => eprintln!("re-extracting the game art of {path}: {e}"),
                }
                finish(worker, shared, 1);
            }
            Task::Scan(scan) => run_scan(worker, shared, scan),
        }
    }
}

fn finish<H: Host>(worker: &Worker<H>, shared: &Shared, done: usize) {
    {
        let mut queue = lock(shared);
        queue.busy = false;
        queue.done += done;
        if queue.progress().is_none() {
            queue.done = 0;
        }
    }
    report(worker, shared);
}

fn report<H: Host>(worker: &Worker<H>, shared: &Shared) {
    let progress = {
        let mut queue = lock(shared);
        let progress = queue.progress();
        if progress == queue.reported {
            return;
        }
        queue.reported = progress;
        progress
    };
    worker.host.progress(progress);
}

fn run_scan<H: Host>(worker: &Worker<H>, shared: &Shared, mut scan: Scan) {
    while let Some(path) = scan.paths.get(scan.next).cloned() {
        {
            let mut queue = lock(shared);
            // Every window focus rescans the same library. Restarting would read every ROM again, so a slow scan
            // never finished.
            if queue.scan.as_ref().is_some_and(|newer| newer.covers(&scan.folder, &scan.paths)) {
                queue.scan = None;
            }
            if queue.playing.is_some() || queue.scan.is_some() {
                // A game starting pauses the scan where it is, and a newer scan of another library replaces it.
                queue.scan.get_or_insert(scan);
                return;
            }
        }
        scan.next += 1;
        match worker.check(&scan.folder, &path) {
            Ok(Some(job)) => {
                lock(shared).enqueue(job);
                report(worker, shared);
            }
            Ok(None) => {}
            Err(e) => eprintln!("checking the game art of {path}: {e}"),
        }
    }
    if let Err(e) = worker.forget_all_but(&scan.paths) {
        eprintln!("deleting game art: {e}");
    }
}

// The worker only runs while no game does, except to extract the running game's own art, which shouldn't cost it frames.
#[cfg(target_vendor = "apple")]
fn lower_priority() {
    unsafe { libc::pthread_set_qos_class_self_np(libc::qos_class_t::QOS_CLASS_UTILITY, 0) };
}

// Linux and Android give each thread its own nice value.
#[cfg(any(target_os = "linux", target_os = "android"))]
fn lower_priority() {
    unsafe { libc::setpriority(libc::PRIO_PROCESS as _, libc::gettid() as _, 10) };
}

#[cfg(not(any(target_vendor = "apple", target_os = "linux", target_os = "android")))]
fn lower_priority() {}

fn sha1_folder(root: &Path, sha1: &str) -> Result<PathBuf, String> {
    if sha1.len() != 40 || !sha1.bytes().all(|b| matches!(b, b'0'..=b'9' | b'a'..=b'f')) {
        return Err(format!("{sha1}: not a SHA-1"));
    }
    Ok(root.join(sha1))
}

fn art(root: &Path, index: &Index, sha1: &str) -> Result<Option<Art>, String> {
    sha1_folder(root, sha1)?;
    let manifest = read_manifest(root, sha1);
    let status = index.rom_art_status(sha1)?.or_else(|| manifest.as_ref().map(|manifest| manifest.status.clone()));
    Ok(status.map(|status| Art { status, manifest }))
}

#[derive(Serialize, Debug, PartialEq)]
pub struct Lender {
    pub sha1: String,
    pub generation: u8,
}

fn retail_generation(sha1: &str) -> Option<u8> {
    retail::ROMS.binary_search_by(|(rom, _)| rom.cmp(&sha1)).ok().map(|found| retail::ROMS[found].1)
}

// A hack keeps its base game's header, so only a retail ROM's hash shows its sprites are the species' own.
fn lenders(index: &Index, generation: impl Fn(&str) -> Option<u8>) -> Result<Vec<Lender>, String> {
    let mut lenders: Vec<Lender> = index
        .rom_art_sha1s()?
        .into_iter()
        .filter_map(|sha1| Some(Lender { generation: generation(&sha1)?, sha1 }))
        .collect();
    lenders.sort_by(|a, b| b.generation.cmp(&a.generation).then_with(|| a.sha1.cmp(&b.sha1)));
    Ok(lenders)
}

fn read_image(root: &Path, sha1: &str, key: &str) -> Result<Vec<u8>, String> {
    let key: Key = key.parse()?;
    let file = sha1_folder(root, sha1)?.join(format!("{key}.png"));
    std::fs::read(&file).map_err(|e| format!("{key}: {e}"))
}

#[tauri::command]
pub fn game_art_scan(art: State<'_, Arc<GameArt>>, folder: String, paths: Vec<String>) {
    art.scan(folder, paths);
}

#[tauri::command]
pub async fn game_art_image(art: State<'_, Arc<GameArt>>, sha1: String, key: String) -> Result<Response, String> {
    read_image(&art.root, &sha1, &key).map(Response::new)
}

#[tauri::command]
pub fn game_art_manifest(
    game_art: State<'_, Arc<GameArt>>,
    index: State<'_, Arc<Index>>,
    sha1: String,
) -> Result<Option<Art>, String> {
    art(&game_art.root, &index, &sha1)
}

#[tauri::command]
pub fn game_art_lenders(index: State<'_, Arc<Index>>) -> Result<Vec<Lender>, String> {
    lenders(&index, retail_generation)
}

#[tauri::command]
pub fn game_art_reextract(art: State<'_, Arc<GameArt>>, folder: String, path: String) {
    art.reextract(folder, vec![path]);
}

#[tauri::command]
pub fn game_art_reextract_all(art: State<'_, Arc<GameArt>>) {
    art.reextract_all();
}

#[tauri::command]
pub fn game_art_progress(art: State<'_, Arc<GameArt>>) -> Option<Progress> {
    art.progress()
}

#[tauri::command]
pub fn game_art_status(index: State<'_, Arc<Index>>, path: String) -> Result<Option<String>, String> {
    Ok(index.rom_art(&path)?.map(|row| row.status))
}

#[tauri::command]
pub fn game_art_sha1(index: State<'_, Arc<Index>>, path: String) -> Result<Option<String>, String> {
    Ok(index.rom_art(&path)?.map(|row| row.sha1).filter(|sha1| !sha1.is_empty()))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::index::temp_index;
    use crate::test_games::{counting_rom, gba_rom, pattern, sevenz_of};
    use std::collections::{HashMap, HashSet};
    use std::io::Write;
    use std::sync::atomic::{AtomicUsize, Ordering};
    use std::sync::mpsc;
    use std::time::{Duration, SystemTime};

    type Reports = Arc<Mutex<Vec<(Option<Progress>, usize)>>>;
    type OnRead = Box<dyn Fn(&str) + Send + Sync>;

    struct Folder {
        reads: Arc<AtomicUsize>,
        changed: Mutex<mpsc::Sender<String>>,
        progress: Reports,
        on_read: Option<OnRead>,
    }

    impl Host for Folder {
        fn stat(&self, folder: &str, path: &str) -> Result<Stat, String> {
            let file = Path::new(folder).join(path).metadata().map_err(|e| e.to_string())?;
            let modified = file.modified().unwrap().duration_since(UNIX_EPOCH).unwrap();
            Ok(Stat { size: file.len(), mtime: modified.as_millis() as i64 })
        }

        fn open_file(&self, folder: &str, path: &str) -> Result<File, String> {
            self.reads.fetch_add(1, Ordering::SeqCst);
            if let Some(on_read) = &self.on_read {
                on_read(path);
            }
            File::open(Path::new(folder).join(path)).map_err(|e| e.to_string())
        }

        fn open_rom(&self, folder: &str, path: &str) -> Result<File, String> {
            let file = self.open_file(folder, path)?;
            if !rom::is_archive(path) {
                return Ok(file);
            }
            rom::unpack_to_file(path, file, &std::env::temp_dir())
        }

        fn changed(&self, sha1: &str) {
            let _ = self.changed.lock().unwrap().send(sha1.into());
        }

        fn progress(&self, progress: Option<Progress>) {
            self.progress.lock().unwrap().push((progress, self.reads.load(Ordering::SeqCst)));
        }
    }

    struct Library {
        games: PathBuf,
        root: PathBuf,
        index: Arc<Index>,
        reads: Arc<AtomicUsize>,
        changed: mpsc::Receiver<String>,
        progress: Reports,
        worker: Option<Worker<Folder>>,
    }

    impl Library {
        fn new(name: &str) -> Library {
            let dir = std::env::temp_dir().join(format!("pkh-emu-game-art-{name}-{}", std::process::id()));
            let _ = std::fs::remove_dir_all(&dir);
            let (index, _) = temp_index(&format!("rom-art-{name}"));
            let reads = Arc::new(AtomicUsize::new(0));
            let (sender, changed) = mpsc::channel();
            let progress = Arc::new(Mutex::new(Vec::new()));
            let changed_sender = Mutex::new(sender);
            let host = Folder { reads: reads.clone(), changed: changed_sender, progress: progress.clone(), on_read: None };
            let root = dir.join("rom-art");
            let worker = Worker { root: root.clone(), index: index.clone(), host };
            Library { games: dir.join("games"), root, index, reads, changed, progress, worker: Some(worker) }
        }

        fn add(&self, path: &str, bytes: &[u8]) {
            let file = self.games.join(path);
            std::fs::create_dir_all(file.parent().unwrap()).unwrap();
            std::fs::write(file, bytes).unwrap();
        }

        fn folder(&self) -> String {
            self.games.to_string_lossy().into_owned()
        }

        fn worker(&self) -> &Worker<Folder> {
            self.worker.as_ref().unwrap()
        }

        fn scan(&self, paths: &[&str]) {
            let worker = self.worker();
            let paths: Vec<String> = paths.iter().map(|path| path.to_string()).collect();
            for path in &paths {
                if let Some(job) = worker.check(&self.folder(), path).unwrap() {
                    worker.extract(&job);
                }
            }
            worker.forget_all_but(&paths).unwrap();
        }

        fn start(&mut self) -> GameArt {
            let worker = self.worker.take().unwrap();
            GameArt::start(worker.root, worker.index, worker.host)
        }

        fn stopped(&mut self) -> (Worker<Folder>, GameArt) {
            let worker = self.worker.take().unwrap();
            let shared = Arc::new((Mutex::new(Queue::default()), Condvar::new()));
            let art = GameArt { root: worker.root.clone(), shared };
            (worker, art)
        }

        fn row(&self, path: &str) -> RomArtRow {
            self.index.rom_art(path).unwrap().unwrap()
        }

        fn manifest(&self, path: &str) -> Manifest {
            read_manifest(&self.root, &self.row(path).sha1).unwrap()
        }

        fn changes(&self, count: usize) -> HashSet<String> {
            (0..count).map(|_| self.changed.recv_timeout(Duration::from_secs(5)).unwrap()).collect()
        }
    }

    fn wait_until_idle(art: &GameArt) {
        let deadline = std::time::Instant::now() + Duration::from_secs(5);
        while art.progress().is_some() {
            assert!(std::time::Instant::now() < deadline, "still extracting: {:?}", art.progress());
            std::thread::sleep(Duration::from_millis(10));
        }
    }

    #[test]
    fn lends_only_retail_roms_newest_generation_first() {
        let library = Library::new("lenders");
        let roms = [("gb/Red.gb", b"red".as_slice()), ("nds/Black.nds", b"black"), ("gba/Hack.gba", b"hack")];
        roms.iter().for_each(|(path, bytes)| library.add(path, bytes));
        library.scan(&roms.map(|(path, _)| path));
        let retail = HashMap::from([(sha1_of(b"red"), 1), (sha1_of(b"black"), 5)]);

        let lenders = lenders(&library.index, |sha1| retail.get(sha1).copied()).unwrap();

        let expected =
            [(sha1_of(b"black"), 5), (sha1_of(b"red"), 1)].map(|(sha1, generation)| Lender { sha1, generation });
        assert_eq!(lenders, expected);
    }

    #[test]
    fn finds_a_retail_rom_by_its_sha1() {
        assert!(retail::ROMS.windows(2).all(|pair| pair[0].0 < pair[1].0));
        assert_eq!(retail_generation("f3ae088181bf583e55daf962a92bb46f4f1d07b7"), Some(3));
        assert_eq!(retail_generation(&sha1_of(b"hack")), None);
    }

    #[test]
    fn records_an_added_rom_as_unsupported() {
        let library = Library::new("added");
        library.add("gba/Game.gba", &gba_rom().bytes);

        library.scan(&["gba/Game.gba"]);

        let row = library.row("gba/Game.gba");
        assert_eq!((row.sha1.as_str(), row.status.as_str()), (sha1_of(&gba_rom().bytes).as_str(), "unsupported"));
        assert_eq!(row.decoder_version, DECODER_VERSION);
        assert_eq!(library.manifest("gba/Game.gba").status, "unsupported");
        assert_eq!(library.changed.try_recv(), Ok(row.sha1));
    }

    #[test]
    fn does_not_hash_an_unchanged_rom_twice() {
        let library = Library::new("unchanged");
        library.add("gba/Game.gba", &gba_rom().bytes);
        library.scan(&["gba/Game.gba"]);
        let reads = library.reads.load(Ordering::SeqCst);

        library.scan(&["gba/Game.gba"]);

        assert_eq!(library.reads.load(Ordering::SeqCst), reads);
    }

    #[test]
    fn hashes_a_rom_again_when_its_modified_time_changes() {
        let library = Library::new("touched");
        library.add("gba/Game.gba", &gba_rom().bytes);
        library.scan(&["gba/Game.gba"]);
        let reads = library.reads.load(Ordering::SeqCst);
        let file = std::fs::File::options().write(true).open(library.games.join("gba/Game.gba")).unwrap();
        file.set_modified(SystemTime::now() + Duration::from_secs(60)).unwrap();

        library.scan(&["gba/Game.gba"]);

        assert_eq!(library.reads.load(Ordering::SeqCst), reads + 1);
        assert_eq!(library.changed.try_iter().count(), 1);
    }

    #[test]
    fn extracts_again_when_the_art_came_from_an_older_decoder() {
        let library = Library::new("older");
        library.add("gba/Game.gba", &gba_rom().bytes);
        library.scan(&["gba/Game.gba"]);
        let sha1 = library.row("gba/Game.gba").sha1;
        let old = Manifest { decoder_version: DECODER_VERSION - 1, ..library.manifest("gba/Game.gba") };
        write_file(&library.root.join(&sha1).join(MANIFEST), &serde_json::to_vec(&old).unwrap()).unwrap();
        library.index.mark_rom_art(&sha1, "unsupported", Some(DECODER_VERSION - 1), 0).unwrap();
        let _ = library.changed.try_iter().count();

        library.scan(&["gba/Game.gba"]);

        assert_eq!(library.manifest("gba/Game.gba").decoder_version, DECODER_VERSION);
        assert_eq!(library.row("gba/Game.gba").decoder_version, DECODER_VERSION);
        assert_eq!(library.changed.try_recv(), Ok(sha1));
    }

    #[test]
    fn does_not_hash_an_unchanged_rom_again_when_its_art_came_from_an_older_decoder() {
        let library = Library::new("older-unchanged");
        library.add("gba/Game.gba", &gba_rom().bytes);
        library.scan(&["gba/Game.gba"]);
        let sha1 = library.row("gba/Game.gba").sha1;
        library.index.mark_rom_art(&sha1, "unsupported", Some(DECODER_VERSION - 1), 0).unwrap();
        std::fs::remove_file(library.root.join(&sha1).join(MANIFEST)).unwrap();
        let reads = library.reads.load(Ordering::SeqCst);

        let job = library.worker().check(&library.folder(), "gba/Game.gba").unwrap();

        assert_eq!(job.map(|job| job.sha1), Some(sha1));
        assert_eq!(library.reads.load(Ordering::SeqCst), reads);
    }

    #[test]
    fn reuses_the_art_another_copy_of_the_rom_extracted() {
        let library = Library::new("current");
        library.add("gba/Game.gba", &gba_rom().bytes);
        library.add("gba/Copy.gba", &gba_rom().bytes);
        library.scan(&["gba/Game.gba"]);
        let _ = library.changed.try_iter().count();

        library.scan(&["gba/Game.gba", "gba/Copy.gba"]);

        assert_eq!(library.row("gba/Copy.gba").status, "unsupported");
        assert_eq!(library.changed.try_recv(), Err(mpsc::TryRecvError::Empty));
    }

    #[test]
    fn deletes_the_art_of_a_rom_that_left_the_library() {
        let library = Library::new("removed");
        library.add("gba/Game.gba", &gba_rom().bytes);
        library.add("gb/Other.gb", &counting_rom().bytes);
        library.scan(&["gba/Game.gba", "gb/Other.gb"]);
        let (gone, kept) = (library.row("gba/Game.gba").sha1, library.row("gb/Other.gb").sha1);
        library.changes(2);

        library.scan(&["gb/Other.gb"]);

        assert_eq!(library.index.rom_art("gba/Game.gba"), Ok(None));
        assert_eq!(library.changed.try_recv().as_ref(), Ok(&gone));
        assert!(!library.root.join(gone).exists());
        assert!(library.root.join(kept).join(MANIFEST).exists());
    }

    #[test]
    fn keeps_the_art_while_another_copy_of_the_rom_stays() {
        let library = Library::new("copies");
        library.add("gba/Game.gba", &gba_rom().bytes);
        library.add("gba/Copy.gba", &gba_rom().bytes);
        library.scan(&["gba/Game.gba", "gba/Copy.gba"]);

        library.scan(&["gba/Copy.gba"]);

        assert!(library.root.join(library.row("gba/Copy.gba").sha1).join(MANIFEST).exists());
    }

    #[test]
    fn hashes_the_rom_inside_a_zip() {
        let library = Library::new("zip");
        let mut zip = zip::ZipWriter::new(std::io::Cursor::new(Vec::new()));
        zip.start_file("Game.gba", zip::write::SimpleFileOptions::default()).unwrap();
        zip.write_all(&gba_rom().bytes).unwrap();
        library.add("gba/Game.zip", &zip.finish().unwrap().into_inner());

        library.scan(&["gba/Game.zip"]);

        assert_eq!(library.row("gba/Game.zip").sha1, sha1_of(&gba_rom().bytes));
    }

    #[test]
    fn hashes_the_rom_inside_a_7z() {
        let library = Library::new("7z");
        library.add("gba/Game.7z", &sevenz_of(&[("Game.gba", &gba_rom().bytes)]));

        library.scan(&["gba/Game.7z"]);

        assert_eq!(library.row("gba/Game.7z").sha1, sha1_of(&gba_rom().bytes));
    }

    #[test]
    fn hashes_a_rom_longer_than_a_chunk_as_one() {
        let rom = pattern(3 * CHUNK + 5, 7);

        assert_eq!(sha1_of_rom("nds/Game.nds", std::io::Cursor::new(&rom)), Ok(sha1_of(&rom)));
    }

    #[test]
    fn does_not_read_a_broken_zip_again_until_it_changes() {
        let library = Library::new("broken-zip");
        library.add("gba/Game.zip", b"not a zip");

        assert!(library.worker().check(&library.folder(), "gba/Game.zip").is_err());
        assert_eq!(library.worker().check(&library.folder(), "gba/Game.zip"), Ok(None));

        assert_eq!(library.row("gba/Game.zip").status, FAILED);
        assert_eq!(library.reads.load(Ordering::SeqCst), 1);
    }

    #[test]
    fn marks_a_rom_it_cannot_read_as_failed() {
        let library = Library::new("failed");
        library.add("gba/Game.zip", b"not a zip");
        let row = RomArtRow {
            path: "gba/Game.zip".into(),
            size: 9,
            mtime: 0,
            sha1: "abc".into(),
            decoder_version: 0,
            status: PENDING.into(),
        };
        library.index.keep_rom_art(&row, 0).unwrap();

        library.worker().extract(&Job { folder: library.folder(), path: "gba/Game.zip".into(), sha1: "abc".into() });

        assert_eq!(library.row("gba/Game.zip").status, FAILED);
        assert_eq!(library.changed.try_recv(), Ok("abc".into()));
    }

    #[test]
    fn writes_indexed_pngs_with_transparency() {
        let image = rom_art::Image {
            key: Key::Item(4),
            width: 2,
            height: 1,
            pixels: vec![0, 1],
            palette: vec![[0, 0, 0, 0], [255, 128, 0, 255]],
        };

        let file = png(&image).unwrap();

        let mut decoder = png::Decoder::new(std::io::Cursor::new(file));
        decoder.set_transformations(png::Transformations::EXPAND);
        let mut reader = decoder.read_info().unwrap();
        let mut pixels = vec![0; reader.output_buffer_size().unwrap()];
        reader.next_frame(&mut pixels).unwrap();
        assert_eq!(pixels, [0, 0, 0, 0, 255, 128, 0, 255]);
    }

    #[test]
    fn writes_animations_as_endless_indexed_apngs() {
        let animation = rom_art::AnimatedSprite {
            key: Key::AnimatedSprite { species: 25, form: 0, shiny: false, female: false },
            width: 2,
            height: 1,
            palette: vec![[0, 0, 0, 0], [255, 128, 0, 255]],
            frames: vec![
                rom_art::Frame { pixels: vec![0, 1], delay: 30 },
                rom_art::Frame { pixels: vec![1, 0], delay: 120 },
            ],
        };

        let file = apng(&animation).unwrap();

        let mut decoder = png::Decoder::new(std::io::Cursor::new(file));
        decoder.set_transformations(png::Transformations::EXPAND);
        let mut reader = decoder.read_info().unwrap();
        let control = reader.info().animation_control.unwrap();
        assert_eq!((control.num_frames, control.num_plays), (2, 0));
        let mut frames = Vec::new();
        let mut pixels = vec![0; reader.output_buffer_size().unwrap()];
        for _ in 0..2 {
            reader.next_frame(&mut pixels).unwrap();
            let delay = reader.info().frame_control.unwrap();
            frames.push((pixels.clone(), delay.delay_num, delay.delay_den));
        }
        assert_eq!(
            frames,
            [(vec![0, 0, 0, 0, 255, 128, 0, 255], 30, 60), (vec![255, 128, 0, 255, 0, 0, 0, 0], 120, 60)]
        );
    }

    type Region = (u32, u32, u32, u32);

    fn play(file: Vec<u8>) -> Vec<(Region, Vec<u8>, u16)> {
        let mut decoder = png::Decoder::new(std::io::Cursor::new(file));
        decoder.set_transformations(png::Transformations::EXPAND);
        let mut reader = decoder.read_info().unwrap();
        let width = reader.info().width as usize;
        let mut canvas = vec![0; reader.output_buffer_size().unwrap()];
        let mut pixels = canvas.clone();
        let mut frames = Vec::new();
        for _ in 0..reader.info().animation_control.unwrap().num_frames {
            let output = reader.next_frame(&mut pixels).unwrap();
            let control = reader.info().frame_control.unwrap();
            assert_eq!((control.dispose_op, control.blend_op), (png::DisposeOp::None, png::BlendOp::Source));
            let (x, y) = (control.x_offset as usize, control.y_offset as usize);
            for row in 0..output.height as usize {
                let line = &pixels[row * output.line_size..][..output.line_size];
                canvas[((y + row) * width + x) * 4..][..output.line_size].copy_from_slice(line);
            }
            let region = (control.x_offset, control.y_offset, control.width, control.height);
            frames.push((region, canvas.clone(), control.delay_num));
        }
        frames
    }

    fn rgba(pixels: &[u8], palette: &[[u8; 4]]) -> Vec<u8> {
        pixels.iter().flat_map(|&index| palette[index as usize]).collect()
    }

    #[test]
    fn writes_later_frames_as_the_box_of_pixels_that_changed() {
        let palette = vec![[0, 0, 0, 0], [255, 128, 0, 255], [0, 64, 255, 255]];
        #[rustfmt::skip]
        let pixels = [
            vec![1, 1, 1, 1,
                 1, 2, 1, 1,
                 1, 1, 1, 0],
            vec![1, 1, 1, 1,
                 1, 1, 0, 1,
                 1, 1, 1, 0],
            vec![1, 1, 1, 1,
                 1, 1, 0, 1,
                 2, 1, 1, 2],
        ];
        let animation = rom_art::AnimatedSprite {
            key: Key::AnimatedSprite { species: 25, form: 0, shiny: false, female: false },
            width: 4,
            height: 3,
            palette: palette.clone(),
            frames: pixels.iter().map(|pixels| rom_art::Frame { pixels: pixels.clone(), delay: 8 }).collect(),
        };

        let frames = play(apng(&animation).unwrap());

        let regions: Vec<Region> = frames.iter().map(|(region, ..)| *region).collect();
        assert_eq!(regions, [(0, 0, 4, 3), (1, 1, 2, 1), (0, 2, 4, 1)]);
        for ((_, canvas, _), pixels) in frames.iter().zip(&pixels) {
            assert_eq!(*canvas, rgba(pixels, &palette));
        }
    }

    #[test]
    fn writes_a_frame_identical_to_the_one_before_as_one_pixel_and_keeps_its_delay() {
        let palette = vec![[0, 0, 0, 0], [255, 128, 0, 255]];
        let animation = rom_art::AnimatedSprite {
            key: Key::AnimatedSprite { species: 25, form: 0, shiny: false, female: false },
            width: 2,
            height: 2,
            palette: palette.clone(),
            frames: vec![
                rom_art::Frame { pixels: vec![0, 1, 1, 0], delay: 30 },
                rom_art::Frame { pixels: vec![0, 1, 1, 0], delay: 90 },
            ],
        };

        let frames = play(apng(&animation).unwrap());

        assert_eq!(frames[1].0, (0, 0, 1, 1));
        assert_eq!(frames[1].1, rgba(&[0, 1, 1, 0], &palette));
        assert_eq!(frames[1].2, 90);
    }

    #[test]
    fn keeps_the_animations_it_writes_and_lists_them_in_the_manifest() {
        let library = Library::new("animations");
        let dir = library.root.join(sha1_of(b"rom"));
        let still = rom_art::Image {
            key: Key::Sprite { species: 25, form: 0, shiny: false, female: false },
            width: 1,
            height: 1,
            pixels: vec![0],
            palette: vec![[0, 0, 0, 0]],
        };
        let animation = rom_art::AnimatedSprite {
            key: still.key.animated().unwrap(),
            width: 1,
            height: 1,
            palette: still.palette.clone(),
            frames: vec![rom_art::Frame { pixels: vec![0], delay: 120 }],
        };
        let status = rom_art::Status::Done;
        let extracted = Extracted { game: None, images: vec![still], animations: Vec::new(), status };
        let manifest = Manifest::new(&extracted, &[animation.key]);

        write_animation(&dir, &animation).unwrap();
        write_art(&dir, &extracted, &manifest).unwrap();

        assert_eq!(manifest.keys, ["sprite-25-0", "anim-25-0"]);
        assert!(dir.join("anim-25-0.png").exists());
        assert!(read_image(&library.root, &sha1_of(b"rom"), "anim-25-0").is_ok());
    }

    #[test]
    fn reads_only_images_named_by_a_sha1_and_a_key() {
        let library = Library::new("read");
        let sha1 = sha1_of(b"rom");
        write_file(&library.root.join(&sha1).join("item-4.png"), b"png").unwrap();

        assert_eq!(read_image(&library.root, &sha1, "item-4"), Ok(b"png".to_vec()));
        assert!(read_image(&library.root, &sha1, "item-5").is_err());
        assert!(read_image(&library.root, &sha1, "../item-4").is_err());
        assert!(read_image(&library.root, "../rom-art", "item-4").is_err());
        assert!(read_image(&library.root, &sha1.to_uppercase(), "item-4").is_err());
    }

    #[test]
    fn reports_art_as_pending_until_it_is_extracted() {
        let library = Library::new("status");
        library.add("gba/Game.gba", &gba_rom().bytes);
        let sha1 = sha1_of(&gba_rom().bytes);
        assert_eq!(art(&library.root, &library.index, &sha1), Ok(None));

        let job = library.worker().check(&library.folder(), "gba/Game.gba").unwrap().unwrap();

        assert_eq!(art(&library.root, &library.index, &sha1), Ok(Some(Art { status: PENDING.into(), manifest: None })));
        library.worker().extract(&job);
        let extracted = art(&library.root, &library.index, &sha1).unwrap().unwrap();
        assert_eq!((extracted.status.as_str(), extracted.manifest.unwrap().keys), ("unsupported", vec![]));
        assert!(art(&library.root, &library.index, "../rom-art").is_err());
    }

    #[test]
    fn waits_for_the_game_to_stop_before_extracting() {
        let mut library = Library::new("paused");
        library.add("gba/Game.gba", &gba_rom().bytes);
        let art = library.start();
        art.playing(Some("gb/Running.gb".into()));

        art.scan(library.folder(), vec!["gba/Game.gba".into()]);

        assert_eq!(library.changed.recv_timeout(Duration::from_millis(300)), Err(mpsc::RecvTimeoutError::Timeout));
        art.playing(None);
        assert_eq!(library.changed.recv_timeout(Duration::from_secs(5)), Ok(sha1_of(&gba_rom().bytes)));
    }

    #[test]
    fn checks_the_running_games_art_once_the_first_scan_names_the_folder() {
        let mut library = Library::new("early");
        library.add("gb/Other.gb", &counting_rom().bytes);
        let art = library.start();
        art.playing(Some("gb/Other.gb".into()));

        art.scan(library.folder(), vec!["gb/Other.gb".into()]);

        assert_eq!(library.changed.recv_timeout(Duration::from_secs(5)), Ok(sha1_of(&counting_rom().bytes)));
    }

    #[test]
    fn extracts_the_running_games_own_art_first() {
        let mut library = Library::new("running");
        library.add("gba/Game.gba", &gba_rom().bytes);
        library.add("gb/Other.gb", &counting_rom().bytes);
        let art = library.start();
        art.playing(Some("gb/Running.gb".into()));
        art.scan(library.folder(), vec!["gba/Game.gba".into(), "gb/Other.gb".into()]);

        art.playing(Some("gb/Other.gb".into()));

        assert_eq!(library.changed.recv_timeout(Duration::from_secs(5)), Ok(sha1_of(&counting_rom().bytes)));
        assert_eq!(library.changed.recv_timeout(Duration::from_millis(300)), Err(mpsc::RecvTimeoutError::Timeout));
        art.playing(None);
        assert_eq!(library.changed.recv_timeout(Duration::from_secs(5)), Ok(sha1_of(&gba_rom().bytes)));
        assert_eq!(library.changed.recv_timeout(Duration::from_millis(300)), Err(mpsc::RecvTimeoutError::Timeout));
    }

    #[test]
    fn re_extracts_only_the_rom_it_is_given() {
        let mut library = Library::new("reextract-one");
        library.add("gba/Game.gba", &gba_rom().bytes);
        library.add("gb/Other.gb", &counting_rom().bytes);
        library.scan(&["gba/Game.gba", "gb/Other.gb"]);
        let _ = library.changed.try_iter().count();
        let (game, other) = (library.row("gba/Game.gba").sha1, library.row("gb/Other.gb").sha1);
        write_file(&library.root.join(&other).join("stale.png"), b"png").unwrap();
        let art = library.start();

        art.reextract(library.folder(), vec!["gba/Game.gba".into()]);

        assert_eq!(library.changed.recv_timeout(Duration::from_secs(5)), Ok(game));
        assert_eq!(library.changed.recv_timeout(Duration::from_millis(300)), Err(mpsc::RecvTimeoutError::Timeout));
        assert_eq!(library.row("gba/Game.gba").status, "unsupported");
        assert!(library.root.join(other).join("stale.png").exists());
    }

    #[test]
    fn re_extracts_a_rom_whose_copy_already_has_art() {
        let mut library = Library::new("reextract-copy");
        library.add("gba/Game.gba", &gba_rom().bytes);
        library.add("gba/Copy.gba", &gba_rom().bytes);
        library.scan(&["gba/Game.gba"]);
        let sha1 = library.changed.try_recv().unwrap();
        let art = library.start();

        art.reextract(library.folder(), vec!["gba/Copy.gba".into()]);

        assert_eq!(library.changed.recv_timeout(Duration::from_secs(5)), Ok(sha1));
        assert_eq!(library.row("gba/Game.gba").decoder_version, DECODER_VERSION);
        assert_eq!(library.row("gba/Copy.gba").status, "unsupported");
    }

    #[test]
    fn re_extracts_every_rom_in_the_library() {
        let mut library = Library::new("reextract-all");
        library.add("gba/Game.gba", &gba_rom().bytes);
        library.add("gb/Other.gb", &counting_rom().bytes);
        let art = library.start();
        art.scan(library.folder(), vec!["gba/Game.gba".into(), "gb/Other.gb".into()]);
        let extracted = library.changes(2);

        art.reextract_all();

        assert_eq!(library.changes(2), extracted);
        assert_eq!(library.changed.recv_timeout(Duration::from_millis(300)), Err(mpsc::RecvTimeoutError::Timeout));
    }

    #[test]
    fn reports_progress_across_games_until_the_queue_empties() {
        let mut library = Library::new("progress");
        library.add("gba/Game.gba", &gba_rom().bytes);
        library.add("gb/Other.gb", &counting_rom().bytes);
        let art = library.start();
        assert_eq!(art.progress(), None);
        art.playing(Some("gb/Running.gb".into()));
        art.scan(library.folder(), vec!["gba/Game.gba".into(), "gb/Other.gb".into()]);

        art.reextract_all();

        assert_eq!(art.progress(), Some(Progress { done: 0, total: 2 }));
        art.playing(None);
        library.changes(2);
        wait_until_idle(&art);
        let reported: Vec<_> = library.progress.lock().unwrap().iter().map(|(progress, _)| *progress).collect();
        assert!(reported.contains(&Some(Progress { done: 1, total: 2 })), "{reported:?}");
        assert_eq!(reported.last(), Some(&None));
    }

    fn rescan_while_reading(library: &mut Library, first: &str, paths: Vec<String>) -> (Worker<Folder>, GameArt) {
        let (mut worker, art) = library.stopped();
        let again = GameArt { root: art.root.clone(), shared: art.shared.clone() };
        let (folder, first) = (library.folder(), first.to_string());
        worker.host.on_read = Some(Box::new(move |path| {
            if path == first {
                again.scan(folder.clone(), paths.clone());
            }
        }));
        (worker, art)
    }

    #[test]
    fn keeps_scanning_when_the_same_library_is_scanned_again() {
        let mut library = Library::new("rescan-same");
        library.add("gba/Game.gba", &gba_rom().bytes);
        library.add("gb/Other.gb", &counting_rom().bytes);
        let paths = vec!["gba/Game.gba".to_string(), "gb/Other.gb".to_string()];
        let (worker, art) = rescan_while_reading(&mut library, "gba/Game.gba", paths.clone());

        run_scan(&worker, &art.shared, Scan { folder: library.folder(), paths, next: 0 });

        assert_eq!(library.reads.load(Ordering::SeqCst), 2);
        assert!(lock(&art.shared).scan.is_none());
    }

    #[test]
    fn replaces_the_scan_when_another_library_is_scanned() {
        let mut library = Library::new("rescan-other");
        library.add("gba/Game.gba", &gba_rom().bytes);
        library.add("gb/Other.gb", &counting_rom().bytes);
        let (worker, art) = rescan_while_reading(&mut library, "gba/Game.gba", vec!["gb/Other.gb".into()]);
        let paths = vec!["gba/Game.gba".to_string(), "gb/Other.gb".to_string()];

        run_scan(&worker, &art.shared, Scan { folder: library.folder(), paths, next: 0 });

        assert_eq!(library.reads.load(Ordering::SeqCst), 1);
        let waiting = lock(&art.shared).scan.as_ref().map(|scan| scan.paths.clone());
        assert_eq!(waiting, Some(vec!["gb/Other.gb".to_string()]));
    }

    #[test]
    fn keeps_a_paused_scan_where_it_was_when_the_same_library_is_scanned_again() {
        let mut library = Library::new("rescan-paused");
        let (_, art) = library.stopped();
        let paths = vec!["gba/Game.gba".to_string(), "gb/Other.gb".to_string()];
        art.scan(library.folder(), paths.clone());
        lock(&art.shared).scan.as_mut().unwrap().next = 1;

        art.scan(library.folder(), paths);

        assert_eq!(lock(&art.shared).scan.as_ref().map(|scan| scan.next), Some(1));
    }

    #[test]
    fn counts_each_re_extracted_game_as_soon_as_its_art_is_extracted() {
        let mut library = Library::new("reextract-progress");
        library.add("gba/Game.gba", &gba_rom().bytes);
        library.add("gb/Other.gb", &counting_rom().bytes);
        let art = library.start();
        art.scan(library.folder(), vec!["gba/Game.gba".into(), "gb/Other.gb".into()]);
        library.changes(2);
        wait_until_idle(&art);
        let reads = library.reads.load(Ordering::SeqCst);
        let earlier = library.progress.lock().unwrap().len();

        art.reextract_all();

        library.changes(2);
        wait_until_idle(&art);
        let reported = library.progress.lock().unwrap()[earlier..].to_vec();
        let first = reported.iter().find(|(progress, _)| progress.is_some_and(|progress| progress.done == 1));
        assert_eq!(first.map(|(_, read)| read - reads), Some(2), "{reported:?}");
    }

    #[test]
    fn counts_a_game_queued_by_a_scan_once_when_it_is_re_extracted() {
        let mut library = Library::new("reextract-queued");
        let (_, art) = library.stopped();
        lock(&art.shared).enqueue(Job { folder: library.folder(), path: "gba/Game.gba".into(), sha1: "abc".into() });

        art.reextract(library.folder(), vec!["gba/Game.gba".into()]);

        assert_eq!(art.progress(), Some(Progress { done: 0, total: 1 }));
    }
}
