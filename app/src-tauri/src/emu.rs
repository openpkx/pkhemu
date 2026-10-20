use crate::achievements;
use crate::audio::Audio;
use crate::backups::Reason;
use crate::cheats::{self, Code, Platform};
use crate::clock::Clock;
use crate::edit;
use crate::frame_time::FrameTimes;
use crate::index::{self, Index, Session};
use crate::memory::Range;
use crate::pace::{self, DisplayRate, OnRefresh, Pacer, Refreshes, Ticker, MAX_OWED_FRAMES};
use crate::resume::{self, Resume};
use crate::retro::{self, Core};
use crate::rom::{Rom, StateName};
use crate::save::{self, game_cube::Card, three_ds::Main, Memory};
use crate::screen::{self, Layout, Parallax, Screen, WindowChange};
use crate::states::{self, Loaded, Saved};
use crate::sync::InUse;
use crate::three_ds;
use crate::transfer_pak::{self, Cart};
use crate::writer::{StateChange, Write};
use serde::Deserialize;
use std::collections::VecDeque;
use std::path::{Path, PathBuf};
use std::sync::{mpsc, Arc, Weak};
use std::time::{Instant, SystemTime, UNIX_EPOCH};
use tauri::async_runtime::JoinHandle;
use tauri::ipc::{Channel, InvokeResponseBody};
use tokio::sync::{mpsc as tokio_mpsc, oneshot, watch};

const NO_GAME: &str = "no game is running";
const NO_SAVE_YET: &str = "no-save-yet";
const IDLE: std::time::Duration = std::time::Duration::from_secs(1);

pub type BackUp = Box<dyn FnMut(Reason, &[u8]) -> Result<(), String> + Send>;
/// The game that started, or none, and the cart in its Transfer Pak.
pub type OnGame = Box<dyn Fn(Option<&str>, Option<&str>) + Send>;
pub type OnMessage = Box<dyn Fn(retro::Message) + Send>;
pub type MarkCheats = Box<dyn FnMut(&[u8]) + Send>;
pub type MarkEdited = Box<dyn FnMut() + Send>;
pub type Display = Box<dyn Fn(OnRefresh) -> Ticker + Send>;
pub type MakeScreen = Box<dyn FnOnce() -> Option<Box<dyn Screen>> + Send>;

#[derive(Clone, Copy, Debug, Deserialize, PartialEq)]
pub struct Pacing {
    pub paused: bool,
    pub speed: u32,
    pub steady: bool,
    pub blend: bool,
}

impl Pacing {
    // Nothing runs until the game's screen says how.
    const HELD: Pacing = Pacing { paused: true, speed: 1, steady: false, blend: false };

    fn fast_forward(&self) -> bool {
        self.speed > 1
    }

    fn most_owed(&self) -> u32 {
        if self.steady && self.fast_forward() {
            1
        } else {
            MAX_OWED_FRAMES
        }
    }
}

pub enum Command {
    Play {
        folder: String,
        path: String,
        rom: Rom,
        update: Option<std::fs::File>,
        save: Option<Vec<u8>>,
        state: Option<Vec<u8>>,
        slot: Option<u8>,
        clock: Clock,
        cheats: Vec<Code>,
        cart: Option<Cart>,
        writes: tokio_mpsc::UnboundedSender<Write>,
        back_up: BackUp,
        mark_cheats: MarkCheats,
        mark_edited: MarkEdited,
        writer: JoinHandle<()>,
        on_frame: Channel<InvokeResponseBody>,
        native: bool,
        on_native_failed: Channel<()>,
        achievements: Option<achievements::Load>,
        reply: oneshot::Sender<Result<f64, String>>,
    },
    LeaveHardcore {
        done: oneshot::Sender<()>,
    },
    SetCheats {
        path: String,
        codes: Vec<Code>,
        done: oneshot::Sender<()>,
    },
    Refresh,
    Pace(Pacing),
    Screen(Layout),
    Parallax(Vec<Parallax>),
    Window(WindowChange),
    Step {
        frames: u32,
        done: oneshot::Sender<()>,
    },
    PlayTimeSinceSave {
        reply: oneshot::Sender<Option<f64>>,
    },
    Screenshot {
        reply: oneshot::Sender<Option<Vec<u8>>>,
    },
    ReadSave {
        reply: oneshot::Sender<Result<Vec<u8>, String>>,
    },
    ReadMemory {
        ranges: Vec<Range>,
        reply: oneshot::Sender<Result<Vec<u8>, String>>,
    },
    ApplyEdit {
        edited: Vec<u8>,
        reply: oneshot::Sender<Result<(), String>>,
    },
    UndoEdit {
        reply: oneshot::Sender<Result<(), String>>,
    },
    CanUndoEdit {
        reply: oneshot::Sender<bool>,
    },
    SaveState {
        slot: u8,
        reply: oneshot::Sender<Result<(), String>>,
    },
    LoadState {
        slot: u8,
        loaded: Loaded,
        kept: oneshot::Sender<Result<(), String>>,
        reply: oneshot::Sender<Result<(), String>>,
    },
    UndoLoadState {
        loaded: Loaded,
        removed: oneshot::Sender<Result<(), String>>,
        reply: oneshot::Sender<Result<(), String>>,
    },
    CurrentSlot {
        reply: oneshot::Sender<Option<u8>>,
    },
    ForgetSlot {
        slot: u8,
        done: oneshot::Sender<()>,
    },
    // Each platform sends only some of these as the app leaves and returns to the foreground.
    #[allow(dead_code)]
    Suspend,
    #[allow(dead_code)]
    Pause {
        reply: oneshot::Sender<Option<Playing>>,
    },
    #[allow(dead_code)]
    Resume,
    #[allow(dead_code)]
    Sleep {
        done: oneshot::Sender<()>,
    },
    #[allow(dead_code)]
    Wake,
    #[cfg_attr(not(target_os = "ios"), allow(dead_code))]
    RestartAudio,
    Stop {
        done: oneshot::Sender<(ResumeWrites, Option<Playing>)>,
    },
}

impl Command {
    // Reads and frames leave a paused game lent to sync. Anything that writes its files waits to take it back.
    fn takes_back(&self) -> bool {
        !matches!(
            self,
            Command::Refresh
                | Command::Pace(_)
                | Command::Screen(_)
                | Command::Parallax(_)
                | Command::Window(_)
                | Command::Step { .. }
                | Command::PlayTimeSinceSave { .. }
                | Command::Screenshot { .. }
                | Command::ReadSave { .. }
                | Command::ReadMemory { .. }
                | Command::CanUndoEdit { .. }
                | Command::CurrentSlot { .. }
                | Command::ForgetSlot { .. }
                | Command::Suspend
                | Command::Pause { .. }
                | Command::Sleep { .. }
                | Command::RestartAudio
        )
    }

    fn waits_for_wake(&self) -> bool {
        matches!(
            self,
            Command::Play { .. }
                | Command::SetCheats { .. }
                | Command::LeaveHardcore { .. }
                | Command::Step { .. }
                | Command::ApplyEdit { .. }
                | Command::UndoEdit { .. }
                | Command::SaveState { .. }
                | Command::LoadState { .. }
                | Command::UndoLoadState { .. }
                | Command::Window(WindowChange::Shown(_))
        )
    }
}

#[derive(Clone, Debug, PartialEq)]
pub struct Playing {
    pub folder: String,
    pub path: String,
}

#[derive(Clone)]
pub struct ResumeWrites(watch::Receiver<bool>);

impl ResumeWrites {
    fn none() -> ResumeWrites {
        ResumeWrites(watch::channel(true).1)
    }

    // A failed writer still counts as finished, so later stops and plays aren't stuck behind it.
    fn after(writer: JoinHandle<()>) -> ResumeWrites {
        let (finished, receiver) = watch::channel(false);
        tauri::async_runtime::spawn(async move {
            if let Err(e) = writer.await {
                eprintln!("writing the resume files: {e}");
            }
            finished.send_replace(true);
        });
        ResumeWrites(receiver)
    }

    pub async fn finished(mut self) -> Result<(), String> {
        self.0
            .wait_for(|finished| *finished)
            .await
            .map(drop)
            .map_err(|_| "the resume files weren't written".into())
    }
}

// The loop holds its sender weakly, so dropping the emulator still ends the thread.
pub struct Emu {
    tx: Arc<mpsc::Sender<Command>>,
}

impl Emu {
    pub fn start(
        system_dir: PathBuf,
        index: Arc<Index>,
        in_use: Arc<InUse>,
        on_game: OnGame,
        on_message: OnMessage,
    ) -> Emu {
        Emu::start_on(Box::new(pace::tick), Box::new(screen::start), system_dir, index, in_use, on_game, on_message)
    }

    fn start_on(
        display: Display,
        screen: MakeScreen,
        system_dir: PathBuf,
        index: Arc<Index>,
        in_use: Arc<InUse>,
        on_game: OnGame,
        on_message: OnMessage,
    ) -> Emu {
        let (tx, rx) = mpsc::channel();
        let tx = Arc::new(tx);
        let refresher = Arc::downgrade(&tx);
        let windows = Arc::downgrade(&tx);
        screen::watch(Box::new(move |change| {
            if let Some(tx) = windows.upgrade() {
                let _ = tx.send(Command::Window(change));
            }
        }));
        std::thread::Builder::new()
            .name("emu".into())
            .spawn(move || run(rx, refresher, display, screen, system_dir, index, in_use, on_game, on_message))
            .expect("failed to start the emulation thread");
        Emu { tx }
    }

    pub fn send(&self, command: Command) {
        let _ = self.tx.send(command);
    }
}

struct Game {
    folder: String,
    path: String,
    platform: Platform,
    // Dropped before the core, since it reads the core's memory.
    achievements: Option<achievements::Session>,
    core: Core,
    clock: Clock,
    audio: Option<Audio>,
    on_frame: Channel<InvokeResponseBody>,
    watch: save::Watch,
    save_file: Option<SaveFile>,
    writes: tokio_mpsc::UnboundedSender<Write>,
    back_up: BackUp,
    cheats: Vec<String>,
    // A hardcore session's codes, which wait for it to drop to softcore.
    held_cheats: Option<Vec<Code>>,
    mark_cheats: MarkCheats,
    mark_edited: MarkEdited,
    writer: JoinHandle<()>,
    undo: Option<edit::Undo>,
    slot: Option<u8>,
    session: Option<Session>,
    frames: u64,
    pacer: Pacer,
    frame_times: FrameTimes,
    paused: bool,
    native: bool,
    on_native_failed: Channel<()>,
    // Dropped after the core, whose last frame can still open the session's files.
    transfer_pak: Option<transfer_pak::Session>,
}

impl Game {
    fn run_frame(&mut self) {
        self.core.run_frame();
        if let Some(achievements) = &mut self.achievements {
            achievements.frame(&mut self.core);
        }
        self.frames += 1;
        let (core, save_file) = (&mut self.core, &mut self.save_file);
        let changed = self.watch.after_frame(|| save_memory(core, save_file, false));
        if let Some(file) = changed {
            self.saved(file);
        }
        if self.watch.due() {
            self.check_cart();
            self.settle_main();
        }
    }

    fn settle_main(&mut self) {
        let Some(SaveFile::Main(main)) = &mut self.save_file else { return };
        match main.settle() {
            Ok(true) => self.core.reset(),
            Err(e) => eprintln!("placing the 3DS save: {e}"),
            _ => {}
        }
    }

    fn advance(
        &mut self,
        frames: u32,
        fast_forward: bool,
        blend: bool,
        rate: &mut DisplayRate,
        samples: &mut Vec<i16>,
    ) {
        if fast_forward {
            self.core.blend(blend);
        }
        let fps = self.core.av().timing.fps;
        for _ in 0..frames {
            let started = Instant::now();
            if !fast_forward {
                rate.tick(started);
            }
            self.run_frame();
            if !fast_forward {
                if let Some(report) = self.frame_times.record(started.elapsed(), fps) {
                    eprintln!("{:?} {report}", self.platform);
                }
            }
            self.core.drain_audio(samples);
            if let Some(audio) = &mut self.audio {
                if fast_forward {
                    audio.fill_with_silence();
                } else {
                    audio.push(samples, rate.speed(fps));
                }
            }
            samples.clear();
        }
    }

    // A frame the native screen drew goes to the page without its pixels, for its size and the frame counts. Until the
    // screen has a window, the WebView draws.
    fn show(&mut self, screen: Option<&mut Box<dyn Screen>>) -> Result<(), String> {
        let (played, counts) = (self.frames as u32, self.pacer.counts);
        let packet = match screen.filter(|screen| self.native && screen.has_window()) {
            Some(screen) => match self.core.take_picture(|picture| (picture.size(), screen.show(picture))) {
                Some((size, shown)) => Some(shown.map(|()| frame_packet(played, counts, size, &[]))?),
                None => None,
            },
            None => self.core.take_frame(|frame| pixels_packet(played, counts, frame)),
        };
        self.send(packet);
        Ok(())
    }

    fn draw_in_webview(&mut self) {
        if self.native {
            let _ = self.on_native_failed.send(());
        }
        self.native = false;
        self.core.read_back(true);
        let (played, counts) = (self.frames as u32, self.pacer.counts);
        let packet = self.core.last_frame(|frame| pixels_packet(played, counts, frame));
        self.send(packet);
    }

    fn send(&self, packet: Option<Vec<u8>>) {
        if let Some(packet) = packet {
            let _ = self.on_frame.send(InvokeResponseBody::Raw(packet));
        }
    }

    fn check_cart(&mut self) {
        if let Some((slot, file)) = self.transfer_pak.as_mut().and_then(transfer_pak::Session::check) {
            self.write(Write::Cart(slot, file));
        }
    }

    fn saved(&mut self, file: Vec<u8>) {
        self.undo = None;
        if !self.cheats.is_empty() {
            (self.mark_cheats)(&file);
            (self.mark_edited)();
        }
        self.write(Write::Save(file));
    }

    fn set_cheats(&mut self, codes: &[Code]) {
        if let Some(held) = &mut self.held_cheats {
            *held = codes.to_vec();
            return;
        }
        let codes = cheats::on_codes(self.platform, codes);
        if codes == self.cheats {
            return;
        }
        if codes.iter().any(|code| !self.cheats.contains(code)) {
            let [save_ram, rtc] = self.core.save_memory();
            if !save_ram.iter().all(|&byte| byte == 0xFF) {
                if let Err(e) = (self.back_up)(Reason::Cheats, &[&*save_ram, &*rtc].concat()) {
                    eprintln!("backing up before cheats: {e}");
                }
            }
        }
        self.core.set_cheats(&codes);
        self.cheats = codes;
    }

    fn read_save(&mut self) -> Option<Vec<u8>> {
        edit::read(save_memory(&mut self.core, &mut self.save_file, true).save())
    }

    fn leave_hardcore(&mut self) {
        if let Some(achievements) = &mut self.achievements {
            achievements.leave_hardcore();
        }
        if let Some(codes) = self.held_cheats.take() {
            self.set_cheats(&codes);
        }
    }

    fn apply(&mut self, edited: &[u8]) -> Result<(), String> {
        self.leave_hardcore();
        let back_up = |save: &[u8]| (self.back_up)(Reason::Edit, save);
        let (undo, file) = match &mut self.save_file {
            Some(SaveFile::Main(main)) => edit::apply_main(&mut self.core, main, &mut self.watch, edited, back_up)?,
            Some(SaveFile::Card(card)) => edit::apply_card(&mut self.core, card, &mut self.watch, edited, back_up)?,
            None => edit::apply(&mut self.core, &mut self.watch, edited, back_up)?,
        };
        self.undo = Some(undo);
        self.reset_achievements();
        (self.mark_edited)();
        self.write(Write::Save(file));
        Ok(())
    }

    fn undo(&mut self) -> Result<(), String> {
        let undo = self.undo.take().ok_or("there's no edit to undo")?;
        self.leave_hardcore();
        let file = match &mut self.save_file {
            Some(SaveFile::Card(card)) => edit::undo_card(&mut self.core, card, &mut self.watch, undo)?,
            _ => edit::undo(&mut self.core, &mut self.watch, undo)?,
        };
        self.reset_achievements();
        (self.mark_edited)();
        if let Some(SaveFile::Main(main)) = &mut self.save_file {
            main.place(Some(&file)).map_err(|e| format!("couldn't write the save back: {e}"))?;
        }
        self.write(Write::Save(file));
        Ok(())
    }

    fn moment(&mut self) -> Result<Saved, String> {
        self.check_save();
        let state = self.core.serialize().ok_or("the core couldn't save its state")?;
        let save = save_memory(&mut self.core, &mut self.save_file, true).concat();
        let core = self.core.info();
        let info = states::Info {
            saved_at: epoch_ms(),
            play_since_save: self.play_since_save(),
            slot: None,
            core: Some(core.name),
            core_version: Some(core.version),
        };
        Ok(Saved { state, screenshot: self.screenshot(), save, info })
    }

    fn save_state(&mut self, slot: u8, written: oneshot::Sender<Result<(), String>>) {
        match self.moment() {
            Ok(saved) => {
                self.write(Write::State(StateChange::Put { name: StateName::Slot(slot), saved, written }));
                self.slot = Some(slot);
            }
            Err(e) => {
                let _ = written.send(Err(e));
            }
        }
    }

    fn load_state(
        &mut self,
        slot: Option<u8>,
        loaded: &Loaded,
        kept: Option<oneshot::Sender<Result<(), String>>>,
    ) -> Result<(), String> {
        if self.save_file.as_ref().is_some_and(SaveFile::is_waiting) {
            return Err("The game has to reach its title screen once before a state loads.".into());
        }
        self.leave_hardcore();
        let mut before = self.moment()?;
        before.info.slot = self.slot;
        let fps = self.core.av().timing.fps;
        let frames_since_save = loaded.info.play_since_save.map(|seconds| (seconds * fps).round() as u64);
        let back_up = &mut self.back_up;
        let back_up = |save: &[u8]| back_up(Reason::Load, save);
        let (core, watch) = (&mut self.core, &mut self.watch);
        let mut file = match &mut self.save_file {
            Some(SaveFile::Card(card)) => {
                states::load_with_card(core, card, watch, loaded, frames_since_save, &mut before, back_up)?
            }
            _ => states::load(core, &self.clock, watch, loaded, frames_since_save, &before, back_up)?,
        };
        self.reset_achievements();
        if let Some(SaveFile::Main(main)) = &mut self.save_file {
            if !loaded.save.is_empty() {
                main.place(Some(&loaded.save)).map_err(|e| format!("couldn't write the state's save: {e}"))?;
            }
            file = self.watch.load([main.bytes(), &[]], frames_since_save);
        }
        self.undo = None;
        self.slot = slot;
        self.write(Write::Save(file));
        if let Some(written) = kept {
            self.write(Write::State(StateChange::Put { name: StateName::BeforeLoad, saved: before, written }));
        }
        Ok(())
    }

    fn undo_load_state(&mut self, loaded: &Loaded, removed: oneshot::Sender<Result<(), String>>) -> Result<(), String> {
        self.load_state(loaded.info.slot, loaded, None)?;
        self.write(Write::State(StateChange::Remove { name: StateName::BeforeLoad, removed }));
        Ok(())
    }

    fn reset_achievements(&self) {
        if let Some(achievements) = &self.achievements {
            achievements.reset();
        }
    }

    fn idle(&self) {
        if let Some(achievements) = &self.achievements {
            achievements.idle();
        }
    }

    fn forget_slot(&mut self, slot: u8) {
        if self.slot == Some(slot) {
            self.slot = None;
        }
    }

    fn check_save(&mut self) {
        let memory = save_memory(&mut self.core, &mut self.save_file, true);
        if let Some(file) = self.watch.check(memory) {
            self.saved(file);
        }
    }

    fn screenshot(&self) -> Option<Vec<u8>> {
        self.core
            .last_frame(resume::screenshot)
            .and_then(|png| png.inspect_err(|e| eprintln!("screenshot: {e}")).ok())
    }

    fn play_time_since_save(&self) -> f64 {
        self.watch.frames_since_write() as f64 / self.core.av().timing.fps
    }

    fn play_since_save(&self) -> Option<f64> {
        (self.watch.frames_since_write() != u64::MAX).then(|| self.play_time_since_save())
    }

    fn can_undo(&self) -> bool {
        self.undo.is_some()
    }

    fn write(&self, write: Write) {
        let _ = self.writes.send(write);
    }

    fn suspend(&mut self) {
        self.check_save();
        self.check_cart();
        // A game that never ran a frame, such as one whose screen never came up, would replace the state it was
        // resumed from.
        if self.frames > 0 {
            self.write_resume();
        }
        if let Some(session) = &self.session {
            if let Err(e) = session.record(self.frames, index::now()) {
                eprintln!("recording play time: {e}");
            }
        }
    }

    fn write_resume(&mut self) {
        match self.core.serialize() {
            Some(state) => {
                let screenshot = self.screenshot();
                let core = self.core.info();
                let info = resume::Info {
                    play_since_save: self.play_since_save(),
                    slot: self.slot,
                    core: Some(core.name),
                    core_version: Some(core.version),
                };
                self.write(Write::Resume(Resume { state, screenshot, info }));
            }
            None => eprintln!("the core couldn't save its state to resume from"),
        }
    }

    // The files are on disk before a sync is let at them.
    fn pause(&mut self, in_use: &InUse) -> Playing {
        self.suspend();
        let (flushed, written) = oneshot::channel();
        self.write(Write::Flush(flushed));
        let _ = tauri::async_runtime::block_on(written);
        in_use.lend();
        self.paused = true;
        self.playing()
    }

    fn take_back(&mut self, in_use: &InUse) {
        if self.paused {
            tauri::async_runtime::block_on(in_use.take_back());
            self.paused = false;
        }
    }

    fn playing(&self) -> Playing {
        Playing { folder: self.folder.clone(), path: self.path.clone() }
    }

    // Dropping the game drops its sender, which lets the writer finish.
    fn quit(mut self) -> JoinHandle<()> {
        self.suspend();
        self.forget_before_load();
        let Game { achievements, core, save_file, mut watch, writes, writer, .. } = self;
        // Dolphin writes the card up to 15 seconds after the game saves, and once more as it unloads.
        if let Some(SaveFile::Card(mut card)) = save_file {
            drop(achievements);
            drop(core);
            if let Some(file) = watch.check(card.read()) {
                let _ = writes.send(Write::Save(file));
            }
        }
        writer
    }

    // The game was suspended as the app went to sleep, and unloading the core calls OpenGL, so it waits for the app to
    // wake.
    fn quit_asleep(mut self) -> (JoinHandle<()>, Unloading) {
        if matches!(self.save_file, Some(SaveFile::Card(_))) {
            self.check_save();
        }
        self.forget_before_load();
        let Game { writer, core, transfer_pak, .. } = self;
        (writer, Unloading { _core: core, _transfer_pak: transfer_pak })
    }

    fn forget_before_load(&self) {
        let (removed, _) = oneshot::channel();
        self.write(Write::State(StateChange::Remove { name: StateName::BeforeLoad, removed }));
    }
}

// Fields drop in order, and the core goes before the Transfer Pak session, as it does with the game.
struct Unloading {
    _core: Core,
    _transfer_pak: Option<transfer_pak::Session>,
}

fn run(
    rx: mpsc::Receiver<Command>,
    tx: Weak<mpsc::Sender<Command>>,
    display: Display,
    screen: MakeScreen,
    system_dir: PathBuf,
    index: Arc<Index>,
    in_use: Arc<InUse>,
    on_game: OnGame,
    on_message: OnMessage,
) {
    let mut game: Option<Game> = None;
    let mut last_quit = ResumeWrites::none();
    let mut rate = DisplayRate::new();
    let mut samples = Vec::with_capacity(4096);
    let mut pacing = Pacing::HELD;
    let mut ticker: Option<Ticker> = None;
    let refreshes = Arc::new(Refreshes::default());
    let mut screen = screen();
    let mut asleep = false;
    let mut held = VecDeque::new();
    let mut unloading: Option<Unloading> = None;

    loop {
        let idle = || {
            if let Some(game) = game.as_ref().filter(|_| !runs(&pacing, &game)) {
                game.idle();
            }
        };
        let Some(command) = next(&rx, &mut held, asleep, idle) else { break };
        if asleep && command.waits_for_wake() {
            held.push_back(command);
            continue;
        }
        if command.takes_back() {
            if let Some(game) = &mut game {
                game.take_back(&in_use);
            }
        }
        match command {
            Command::Play {
                folder,
                path,
                rom,
                update,
                save,
                state,
                slot,
                clock,
                cheats,
                cart,
                writes,
                back_up,
                mark_cheats,
                mark_edited,
                writer,
                on_frame,
                native,
                on_native_failed,
                achievements,
                reply,
            } => {
                let hardcore = achievements.as_ref().is_some_and(achievements::Load::hardcore);
                quit_running(&mut game, &mut last_quit, &mut screen, false);
                retro::release_input();
                let platform = Platform::of_rom(&rom);
                let cart_path = cart.as_ref().map(|cart| cart.path.clone());
                let loaded =
                    cart.map(|cart| transfer_pak::Session::start(cart, &rom)).transpose().and_then(|session| {
                        let files = session.as_ref().map(transfer_pak::Session::files);
                        let azahar_dir = retro::azahar_dir(&system_dir);
                        three_ds::update::placed(&rom, update, &azahar_dir)?;
                        let main = save::three_ds::placed(&rom, save.as_deref(), &azahar_dir)?;
                        let card = save::game_cube::placed(&rom, save.as_deref(), retro::dolphin_card(&system_dir))?;
                        let save_file = main.map(SaveFile::Main).or(card.map(SaveFile::Card));
                        // A state would skip the boot in which the game formats the save data its save waits for.
                        let state = state.filter(|_| !save_file.as_ref().is_some_and(SaveFile::is_waiting));
                        load(rom, save, state, &clock, &system_dir, files)
                            .map(|(core, watch)| (core, watch, save_file, session))
                    });
                on_game(loaded.as_ref().ok().map(|_| path.as_str()), cart_path.as_deref());
                let _ = reply.send(loaded.map(|(mut core, watch, save_file, transfer_pak)| {
                    let (cheats, held_cheats) = match hardcore {
                        true => (Vec::new(), Some(cheats)),
                        false => (cheats::on_codes(platform, &cheats), None),
                    };
                    if !cheats.is_empty() {
                        core.set_cheats(&cheats);
                    }
                    let fps = core.av().timing.fps;
                    if native && screen.is_none() {
                        let _ = on_native_failed.send(());
                    }
                    let native = native && screen.is_some();
                    core.read_back(!native);
                    let achievements = achievements.map(achievements::Load::start);
                    let audio = open_audio(&core);
                    let session = index
                        .start_session(&path, fps, index::now())
                        .inspect_err(|e| eprintln!("recording play time: {e}"))
                        .ok();
                    game = Some(Game {
                        folder,
                        path,
                        platform,
                        achievements,
                        core,
                        clock,
                        audio,
                        on_frame,
                        watch,
                        save_file,
                        writes,
                        back_up,
                        cheats,
                        held_cheats,
                        mark_cheats,
                        mark_edited,
                        writer,
                        undo: None,
                        slot,
                        session,
                        frames: 0,
                        pacer: Pacer::new(fps),
                        frame_times: FrameTimes::new(),
                        paused: false,
                        native,
                        on_native_failed,
                        transfer_pak,
                    });
                    fps
                }));
            }
            Command::SetCheats { path, codes, done } => {
                if let Some(game) = game.as_mut().filter(|game| game.path == path) {
                    game.set_cheats(&codes);
                }
                let _ = done.send(());
            }
            Command::LeaveHardcore { done } => {
                if let Some(game) = &mut game {
                    game.leave_hardcore();
                }
                let _ = done.send(());
            }
            Command::Refresh => {
                let taken = refreshes.take();
                let playing = game.as_mut().filter(|game| !game.paused && !pacing.paused);
                if let (Some((count, at)), Some(game)) = (taken, playing) {
                    let owed = game.pacer.refresh(at, count, pacing.most_owed());
                    game.advance(owed * pacing.speed, pacing.fast_forward(), pacing.blend, &mut rate, &mut samples);
                    let shown = game.show(screen.as_mut());
                    fall_back_on(shown, &mut screen, Some(game));
                }
            }
            Command::Pace(new) => pacing = new,
            Command::Step { frames, done } => {
                if let Some(game) = game.as_mut().filter(|game| !game.paused) {
                    game.leave_hardcore();
                    game.advance(frames, false, false, &mut rate, &mut samples);
                    let shown = game.show(screen.as_mut());
                    fall_back_on(shown, &mut screen, Some(game));
                }
                let _ = done.send(());
            }
            Command::Screen(layout) => {
                if let Some(native) = &mut screen {
                    native.lay_out(layout);
                }
                redraw_held(&mut screen, &mut game, &pacing, asleep);
            }
            Command::Parallax(parallax) => {
                if let Some(native) = &mut screen {
                    native.lean(parallax);
                }
                redraw_held(&mut screen, &mut game, &pacing, asleep);
            }
            Command::Window(change) => {
                // A window shown while the app slept is held, so this one is going, and the held one went with it.
                if asleep {
                    held.retain(|command| !matches!(command, Command::Window(WindowChange::Shown(_))));
                }
                if let Some(native) = &mut screen {
                    let changed = native.window(change);
                    fall_back_on(changed, &mut screen, game.as_mut());
                }
                redraw_held(&mut screen, &mut game, &pacing, asleep);
            }
            Command::PlayTimeSinceSave { reply } => {
                let _ = reply.send(
                    game.as_ref().map(Game::play_time_since_save),
                );
            }
            Command::Screenshot { reply } => {
                let _ = reply.send(game.as_ref().and_then(Game::screenshot));
            }
            Command::ReadSave { reply } => {
                let _ =
                    reply.send(running(&mut game).and_then(|game| game.read_save().ok_or_else(|| NO_SAVE_YET.into())));
            }
            Command::ReadMemory { ranges, reply } => {
                let _ = reply.send(running(&mut game).and_then(|game| game.core.read_memory(&ranges)));
            }
            Command::ApplyEdit { edited, reply } => {
                clear_before_reboot(&mut screen, &game);
                let _ = reply.send(running(&mut game).and_then(|game| game.apply(&edited)));
                stop_unloaded(&mut game, &mut last_quit, &mut screen, &on_game);
            }
            Command::UndoEdit { reply } => {
                clear_before_reboot(&mut screen, &game);
                let _ = reply.send(running(&mut game).and_then(Game::undo));
                stop_unloaded(&mut game, &mut last_quit, &mut screen, &on_game);
            }
            Command::CanUndoEdit { reply } => {
                let _ = reply.send(game.as_ref().is_some_and(Game::can_undo));
            }
            Command::SaveState { slot, reply } => match running(&mut game) {
                Ok(game) => game.save_state(slot, reply),
                Err(e) => {
                    let _ = reply.send(Err(e));
                }
            },
            Command::LoadState { slot, loaded, kept, reply } => {
                clear_before_reboot(&mut screen, &game);
                let _ = reply.send(running(&mut game).and_then(|game| game.load_state(Some(slot), &loaded, Some(kept))));
                stop_unloaded(&mut game, &mut last_quit, &mut screen, &on_game);
            }
            Command::UndoLoadState { loaded, removed, reply } => {
                clear_before_reboot(&mut screen, &game);
                let _ = reply.send(running(&mut game).and_then(|game| game.undo_load_state(&loaded, removed)));
                stop_unloaded(&mut game, &mut last_quit, &mut screen, &on_game);
            }
            Command::CurrentSlot { reply } => {
                let _ = reply.send(game.as_ref().and_then(|game| game.slot));
            }
            Command::ForgetSlot { slot, done } => {
                if let Some(game) = &mut game {
                    game.forget_slot(slot);
                }
                let _ = done.send(());
            }
            Command::Suspend => {
                if let Some(game) = game.as_mut().filter(|game| !game.paused) {
                    game.suspend();
                }
            }
            Command::Pause { reply } => {
                let _ = reply.send(game.as_mut().filter(|game| !game.paused).map(|game| game.pause(&in_use)));
            }
            Command::Resume => {}
            Command::Sleep { done } => {
                if let Some(game) = game.as_mut().filter(|game| !game.paused) {
                    game.pause(&in_use);
                }
                retro::sleep();
                asleep = true;
                let _ = done.send(());
            }
            Command::Wake => {
                retro::wake();
                asleep = false;
                drop(unloading.take());
                redraw_held(&mut screen, &mut game, &pacing, asleep);
            }
            Command::RestartAudio => {
                if let Some(game) = &mut game {
                    game.audio = None;
                    game.audio = open_audio(&game.core);
                }
            }
            Command::Stop { done } => {
                let stopped = game.as_ref().map(Game::playing);
                if let Some(core) = quit_running(&mut game, &mut last_quit, &mut screen, asleep) {
                    unloading = Some(core);
                }
                on_game(None, None);
                let _ = done.send((last_quit.clone(), stopped));
            }
        }
        for message in retro::take_messages() {
            on_message(message);
        }
        let running = runs(&pacing, &game);
        if running && ticker.is_none() {
            ticker = Some(display(on_refresh(tx.clone(), refreshes.clone())));
        } else if !running {
            ticker = None;
        }
    }
}

fn runs(pacing: &Pacing, game: &Option<Game>) -> bool {
    !pacing.paused && game.as_ref().is_some_and(|game| !game.paused)
}

// rcheevos keeps sending unlocks and the player's rich presence while nothing runs frames.
fn next(rx: &mpsc::Receiver<Command>, held: &mut VecDeque<Command>, asleep: bool, idle: impl Fn()) -> Option<Command> {
    if !asleep && !held.is_empty() {
        return held.pop_front();
    }
    loop {
        match rx.recv_timeout(IDLE) {
            Ok(command) => return Some(command),
            Err(mpsc::RecvTimeoutError::Timeout) => idle(),
            Err(mpsc::RecvTimeoutError::Disconnected) => return None,
        }
    }
}

// A running game draws again on its next frame anyway, and a sleeping app draws once it wakes.
fn redraw_held(screen: &mut Option<Box<dyn Screen>>, game: &mut Option<Game>, pacing: &Pacing, asleep: bool) {
    if asleep || runs(pacing, game) {
        return;
    }
    if let (Some(native), Some(game)) = (screen.as_mut(), game.as_mut()) {
        let drawn = native.redraw();
        fall_back_on(drawn, screen, Some(game));
    }
}

fn fall_back_on(result: Result<(), String>, screen: &mut Option<Box<dyn Screen>>, game: Option<&mut Game>) {
    if let Err(e) = result {
        eprintln!("the native screen failed, so the WebView draws the game: {e}");
        *screen = None;
        if let Some(game) = game {
            game.draw_in_webview();
        }
    }
}

fn on_refresh(tx: Weak<mpsc::Sender<Command>>, refreshes: Arc<Refreshes>) -> OnRefresh {
    Arc::new(move |at| {
        if refreshes.add(at) {
            if let Some(tx) = tx.upgrade() {
                let _ = tx.send(Command::Refresh);
            }
        }
    })
}

fn load(
    rom: Rom,
    save: Option<Vec<u8>>,
    state: Option<Vec<u8>>,
    clock: &Clock,
    system_dir: &Path,
    transfer_pak: Option<&transfer_pak::Files>,
) -> Result<(Core, save::Watch), String> {
    clock.set_core_options();
    let mut core = match transfer_pak {
        Some(files) => Core::load_transfer_pak(rom, system_dir, files)?,
        None => Core::load(rom, system_dir)?,
    };
    if let Some(file) = save {
        let [save_ram, rtc] = core.save_memory();
        save::fill(save_ram, rtc, &file);
    }
    if let Some(mut state) = state {
        if clock.set(&mut state).is_ok() && core.unserialize(&state) {
            return Ok((core, save::Watch::resumed()));
        }
        // A state cut short by the app being killed mid-write would otherwise stop the game from opening.
        eprintln!("the core didn't accept the resume state, so the game starts over");
        core.reset();
    }
    if let Err(e) = clock.start(&mut core) {
        eprintln!("setting the game clock: {e}");
    }
    Ok((core, save::Watch::new()))
}

// A 3DS Pokémon game's save is a file on the virtual SD card, and a GameCube game's is its memory card. Each stands in
// for the save memory the core lacks.
enum SaveFile {
    Main(Main),
    Card(Card),
}

impl SaveFile {
    fn is_waiting(&self) -> bool {
        matches!(self, SaveFile::Main(main) if main.is_waiting())
    }
}

fn save_memory<'a>(core: &'a mut Core, save_file: &'a mut Option<SaveFile>, now: bool) -> Memory<'a> {
    match save_file {
        Some(SaveFile::Main(main)) => [if now { main.read() } else { main.refresh() }, &[]].into(),
        Some(SaveFile::Card(card)) => {
            if now {
                card.read()
            } else {
                card.refresh()
            }
        }
        None => core.save_memory().into(),
    }
}

fn open_audio(core: &Core) -> Option<Audio> {
    Audio::open(core.av().timing.sample_rate).inspect_err(|e| eprintln!("audio: {e}")).ok()
}

// The screen lets go of the last frame first, since it can be a texture of the core's.
fn quit_running(
    game: &mut Option<Game>,
    last_quit: &mut ResumeWrites,
    screen: &mut Option<Box<dyn Screen>>,
    asleep: bool,
) -> Option<Unloading> {
    if let Some(native) = screen {
        native.clear();
    }
    let game = game.take()?;
    if asleep {
        let (writer, unloading) = game.quit_asleep();
        *last_quit = ResumeWrites::after(writer);
        return Some(unloading);
    }
    *last_quit = ResumeWrites::after(game.quit());
    None
}

// A GameCube game boots again to load a state or an edit, and the screen's last frame can be an image of the core it
// unloads.
fn clear_before_reboot(screen: &mut Option<Box<dyn Screen>>, game: &Option<Game>) {
    if let (Some(native), Some(Game { save_file: Some(SaveFile::Card(_)), .. })) = (screen, game) {
        native.clear();
    }
}

// A game that failed to boot again has no core, so it stops the way a sleeping app's game does, without the core.
fn stop_unloaded(
    game: &mut Option<Game>,
    last_quit: &mut ResumeWrites,
    screen: &mut Option<Box<dyn Screen>>,
    on_game: &OnGame,
) {
    if game.as_ref().is_some_and(|game| !game.core.is_loaded()) {
        drop(quit_running(game, last_quit, screen, true));
        on_game(None, None);
    }
}

fn running(game: &mut Option<Game>) -> Result<&mut Game, String> {
    game.as_mut().ok_or_else(|| NO_GAME.into())
}

pub(crate) fn epoch_ms() -> f64 {
    SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs_f64() * 1000.0
}

fn pixels_packet(played: u32, counts: pace::Counts, frame: &retro::Frame) -> Vec<u8> {
    frame_packet(played, counts, (frame.width, frame.height), &frame.pixels)
}

fn frame_packet(played: u32, counts: pace::Counts, (width, height): (u32, u32), pixels: &[u16]) -> Vec<u8> {
    let mut packet = Vec::with_capacity(16 + pixels.len() * 2);
    packet.extend_from_slice(&played.to_le_bytes());
    packet.extend_from_slice(&(width as u16).to_le_bytes());
    packet.extend_from_slice(&(height as u16).to_le_bytes());
    packet.extend_from_slice(&counts.skipped.to_le_bytes());
    packet.extend_from_slice(&counts.repeated.to_le_bytes());
    for pixel in pixels {
        packet.extend_from_slice(&pixel.to_le_bytes());
    }
    packet
}

#[cfg(test)]
mod shader_harness;

#[cfg(test)]
mod tests {
    use super::*;
    use crate::games_folder::GamesFolder;
    use crate::index::{temp_index, PlayHistory};
    use crate::clock;
    use crate::screen::Picture;
    use crate::test_games::{
        boot_counting_rom, clock_rom, clock_save, counting_rom, days_on_the_clock, heartgold, lock_core, node, pattern,
        pokemon_x, pokemon_x_save, stadium,
    };
    use crate::writer;
    use std::time::Duration;
    use tauri::async_runtime::block_on;

    fn real_time() -> Clock {
        Clock::new(&counting_rom(), 0)
    }

    fn start(save: &[u8], state: Option<Vec<u8>>) -> Result<Core, String> {
        load(boot_counting_rom(), Some(save.to_vec()), state, &real_time(), &std::env::temp_dir(), None).map(|(core, _)| core)
    }

    fn start_rom(rom: Rom, save: &[u8]) -> Core {
        load(rom, Some(save.to_vec()), None, &real_time(), &std::env::temp_dir(), None).unwrap().0
    }

    fn playing(rom: Rom) -> Game {
        let mut game = game(start_rom(rom, &pattern(0x8030, 1)), save::Watch::new());
        game.play(60);
        game
    }

    fn game(core: Core, watch: save::Watch) -> Game {
        let (writes, _) = tokio_mpsc::unbounded_channel();
        Game {
            folder: String::new(),
            path: "gb/Game.gb".into(),
            platform: Platform::Gb,
            achievements: None,
            core,
            audio: None,
            on_frame: Channel::new(|_| Ok(())),
            watch,
            save_file: None,
            clock: real_time(),
            writes,
            back_up: Box::new(|_, _| Ok(())),
            cheats: Vec::new(),
            held_cheats: None,
            mark_cheats: Box::new(|_| {}),
            mark_edited: Box::new(|| {}),
            writer: tauri::async_runtime::spawn(async {}),
            undo: None,
            slot: None,
            session: None,
            frames: 0,
            pacer: Pacer::new(60.0),
            frame_times: FrameTimes::new(),
            paused: false,
            native: false,
            on_native_failed: Channel::new(|_| Ok(())),
            transfer_pak: None,
        }
    }

    fn resume(state: Vec<u8>) -> Game {
        let (core, watch) = load(counting_rom(), Some(pattern(0x8030, 1)), Some(state), &real_time(), &std::env::temp_dir(), None).unwrap();
        game(core, watch)
    }

    fn writing_to(name: &str, core: Core, watch: save::Watch) -> (Game, PathBuf) {
        let root = std::env::temp_dir().join(format!("pkh-emu-emu-{name}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        writing_into(root, core, watch)
    }

    fn writing_into(root: PathBuf, core: Core, watch: save::Watch) -> (Game, PathBuf) {
        let (writes, queued) = tokio_mpsc::unbounded_channel();
        let folder = GamesFolder::<tauri::Wry>::at(root.clone());
        let writer = tauri::async_runtime::spawn(async move {
            let (slot, _) = save::open(&folder, "gb/Game.gb").await.unwrap();
            writer::write_all(&folder, "gb/Game.gb", &slot, queued).await
        });
        (Game { writes, writer, ..game(core, watch) }, root.join("gb/Game/states"))
    }

    pub(super) fn quit(game: Game) {
        tauri::async_runtime::block_on(game.quit()).unwrap();
    }

    fn info(states: &Path) -> resume::Info {
        serde_json::from_slice(&std::fs::read(states.join("resume.json")).unwrap()).unwrap()
    }

    impl Game {
        fn play(&mut self, frames: u32) {
            for _ in 0..frames {
                self.run_frame();
            }
        }

        fn load_slot(&mut self, slot: u8, loaded: &Loaded) -> Result<(), String> {
            let (kept, written) = oneshot::channel();
            self.load_state(Some(slot), loaded, Some(kept))?;
            let _ = block_on(written);
            Ok(())
        }
    }

    impl Emu {
        fn play(&self, path: &str) -> f64 {
            self.play_writing(path, tauri::async_runtime::spawn(async {}))
        }

        fn play_writing(&self, path: &str, writer: JoinHandle<()>) -> f64 {
            let (writes, _) = tokio_mpsc::unbounded_channel();
            let on_frame = Channel::new(|_| Ok(()));
            self.play_with(
                String::new(),
                path,
                counting_rom(),
                writes,
                writer,
                on_frame,
                false,
                Channel::new(|_| Ok(())),
            )
        }

        fn play_showing(
            &self,
            path: &str,
            on_frame: Channel<InvokeResponseBody>,
            native: bool,
            on_native_failed: Channel<()>,
        ) {
            let (writes, _) = tokio_mpsc::unbounded_channel();
            let writer = tauri::async_runtime::spawn(async {});
            self.play_with(String::new(), path, counting_rom(), writes, writer, on_frame, native, on_native_failed);
        }

        pub(crate) fn play_into(&self, root: &Path) {
            self.play_rom_into(root, "gb/Game.gb", boot_counting_rom());
        }

        fn play_rom_into(&self, root: &Path, path: &'static str, rom: Rom) {
            let (writes, queued) = tokio_mpsc::unbounded_channel();
            let folder = GamesFolder::<tauri::Wry>::at(root.to_path_buf());
            let writer = tauri::async_runtime::spawn(async move {
                let (slot, _) = save::open(&folder, path).await.unwrap();
                writer::write_all(&folder, path, &slot, queued).await
            });
            let on_frame = Channel::new(|_| Ok(()));
            self.play_with(
                root.display().to_string(),
                path,
                rom,
                writes,
                writer,
                on_frame,
                false,
                Channel::new(|_| Ok(())),
            );
        }

        fn sleep(&self) {
            let (done, slept) = oneshot::channel();
            self.send(Command::Sleep { done });
            block_on(slept).unwrap();
        }

        fn play_with(
            &self,
            folder: String,
            path: &str,
            rom: Rom,
            writes: tokio_mpsc::UnboundedSender<Write>,
            writer: JoinHandle<()>,
            on_frame: Channel<InvokeResponseBody>,
            native: bool,
            on_native_failed: Channel<()>,
        ) -> f64 {
            let (reply, result) = oneshot::channel();
            self.send(Command::Play {
                folder,
                path: path.into(),
                rom,
                update: None,
                save: None,
                state: None,
                slot: None,
                clock: real_time(),
                cheats: Vec::new(),
                cart: None,
                writes,
                back_up: Box::new(|_, _| Ok(())),
                mark_cheats: Box::new(|_| {}),
                mark_edited: Box::new(|| {}),
                writer,
                on_frame,
                native,
                on_native_failed,
                achievements: None,
                reply,
            });
            block_on(result).unwrap().unwrap()
        }

        pub(crate) fn run_frames(&self, frames: u32) {
            block_on(self.running_frames(frames)).unwrap();
        }

        pub(crate) fn stop(&self) {
            self.stopping().recv().unwrap();
        }

        pub(crate) fn pause(&self) -> Option<Playing> {
            let (reply, paused) = oneshot::channel();
            self.send(Command::Pause { reply });
            block_on(paused).unwrap()
        }

        fn running_frames(&self, frames: u32) -> oneshot::Receiver<()> {
            let (done, finished) = oneshot::channel();
            self.send(Command::Step { frames, done });
            finished
        }

        fn screenshot(&self) -> Option<Vec<u8>> {
            let (reply, result) = oneshot::channel();
            self.send(Command::Screenshot { reply });
            block_on(result).unwrap()
        }

        pub(crate) fn read_memory(&self, address: u32, length: u32) -> Result<Vec<u8>, String> {
            let (reply, result) = oneshot::channel();
            self.send(Command::ReadMemory { ranges: vec![Range { address, length }], reply });
            block_on(result).unwrap()
        }

        fn stopping(&self) -> mpsc::Receiver<()> {
            let (done, stopped) = oneshot::channel();
            self.send(Command::Stop { done });
            let (finished, finishing) = mpsc::channel();
            tauri::async_runtime::spawn(async move {
                stopped.await.unwrap().0.finished().await.unwrap();
                let _ = finished.send(());
            });
            finishing
        }
    }

    fn played_frames(history: PlayHistory, fps: f64) -> u64 {
        (history.play_time * fps).round() as u64
    }

    fn lending(index: Arc<Index>, in_use: &Arc<InUse>) -> Emu {
        let playing = in_use.clone();
        Emu::start(
            std::env::temp_dir(),
            index,
            in_use.clone(),
            Box::new(move |path, cart| playing.playing(path, cart)),
            Box::new(|_| {}),
        )
    }

    fn finishes_soon(finished: &mut oneshot::Receiver<()>) -> bool {
        std::thread::sleep(Duration::from_millis(100));
        finished.try_recv().is_ok()
    }

    const STADIUM: &str = "n64/Stadium.z64";

    fn playing_stadium(root: &Path, rom: Rom) -> Game {
        let folder = GamesFolder::<tauri::Wry>::at(root.to_path_buf());
        let (slot, save) = block_on(save::open(&folder, STADIUM)).unwrap();
        let clock = Clock::new(&rom, 0);
        let (core, watch) = load(rom, save, None, &clock, &std::env::temp_dir(), None).unwrap();
        let (writes, queued) = tokio_mpsc::unbounded_channel();
        let writer =
            tauri::async_runtime::spawn(async move { writer::write_all(&folder, STADIUM, &slot, queued).await });
        Game { path: STADIUM.into(), writes, writer, ..game(core, watch) }
    }

    fn files_beside_the_rom(root: &Path) -> Vec<(String, u64)> {
        let mut files: Vec<_> = std::fs::read_dir(root.join("n64"))
            .unwrap()
            .flatten()
            .filter(|entry| entry.file_type().unwrap().is_file())
            .map(|entry| (entry.file_name().to_string_lossy().into_owned(), entry.metadata().unwrap().len()))
            .collect();
        files.sort();
        files
    }

    // Past the intro, Start, A and B through the menus get Stadium to write its save.
    fn play_stadium_until_it_saves(root: &Path, rom: Rom) {
        let mut game = playing_stadium(root, rom);
        for frame in 0..1500u32 {
            let buttons = [1 << 3, 1 << 8, 1 << 0, 1 << 3];
            retro::set_input(if frame > 600 && frame % 40 < 5 { buttons[(frame / 40) as usize % 4] } else { 0 });
            game.run_frame();
        }
        retro::set_input(0);
        quit(game);
    }

    #[test]
    #[cfg(target_arch = "aarch64")]
    fn stadium_saves_only_its_flashram_and_loads_it_back() {
        let _lock = lock_core();
        let Some(rom) = crate::test_games::stadium() else { return };
        let root = std::env::temp_dir().join(format!("pkh-emu-emu-stadium-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        let again = Rom { name: rom.name.clone(), bytes: rom.bytes.clone(), file: None };
        play_stadium_until_it_saves(&root, rom);

        assert_eq!(files_beside_the_rom(&root), [("Stadium.fla".to_string(), 0x20000)]);
        let fla = std::fs::read(root.join("n64/Stadium.fla")).unwrap();
        let mut game = playing_stadium(&root, again);
        game.play(120);
        assert_eq!(game.core.save_ram()[0x28800..], fla);
        quit(game);
        assert_eq!(std::fs::read(root.join("n64/Stadium.fla")).unwrap(), fla);
    }

    #[test]
    #[cfg(target_arch = "aarch64")]
    fn stadium_reads_a_library_gb_game_through_the_transfer_pak() {
        let _lock = lock_core();
        let (Some(stadium), Some(red)) = (crate::test_games::stadium(), crate::test_games::red()) else {
            eprintln!("skipped: the Transfer Pak needs both Pokémon Stadium and Pokémon Red");
            return;
        };

        let mut game = stadium_with_a_cart("transfer-pak", stadium, red);

        let working = std::fs::read(&game.transfer_pak.as_ref().unwrap().files().save).unwrap();
        assert_eq!(working, vec![0xFF; 0x8000]);
        assert_eq!(retro::transfer_pak_option().as_deref(), Some("transfer"));
        game.play(60);
        quit(game);
    }

    fn stadium_with_a_cart(name: &str, stadium: Rom, gb_rom: Rom) -> Game {
        let dir = std::env::temp_dir().join(format!("pkh-emu-emu-{name}-{}", std::process::id()));
        let (slot, _) = save::Slot::new("gb/Red.sav".into(), Vec::new());
        let cart =
            Cart { path: "gb/Red.gb".into(), dir, rom: gb_rom, save: None, slot, back_up: Box::new(|_, _| Ok(())) };
        let session = transfer_pak::Session::start(cart, &stadium).unwrap();
        let clock = Clock::new(&stadium, 0);
        let (core, watch) = load(stadium, None, None, &clock, &std::env::temp_dir(), Some(session.files())).unwrap();
        Game { transfer_pak: Some(session), ..game(core, watch) }
    }

    // The core used to keep the first game's pak for every game loaded after it.
    #[test]
    #[cfg(target_arch = "aarch64")]
    fn a_game_after_the_transfer_pak_gets_its_controller_pak_back() {
        let _lock = lock_core();
        let (Some(stadium), Some(red)) = (crate::test_games::stadium(), crate::test_games::red()) else { return };
        let again = Rom { name: stadium.name.clone(), bytes: stadium.bytes.clone(), file: None };
        let mut game = stadium_with_a_cart("pak-after", stadium, red);
        game.play(60);
        quit(game);
        let root = std::env::temp_dir().join(format!("pkh-emu-emu-stadium-after-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);

        play_stadium_until_it_saves(&root, again);

        assert_eq!(retro::transfer_pak_option().as_deref(), Some("memory"));
        assert_eq!(files_beside_the_rom(&root), [("Stadium.fla".to_string(), 0x20000)]);
    }

    #[test]
    fn pausing_writes_the_save_and_resume_state_and_lends_the_game_to_sync() {
        let _lock = lock_core();
        let (index, _) = temp_index("emu-pause");
        let in_use = Arc::new(InUse::default());
        let emu = lending(index, &in_use);
        let root = std::env::temp_dir().join(format!("pkh-emu-emu-pause-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        emu.play_into(&root);
        emu.run_frames(30);

        let paused = emu.pause();

        assert_eq!(paused, Some(Playing { folder: root.display().to_string(), path: "gb/Game.gb".into() }));
        assert!(root.join("gb/Game.sav").exists());
        assert!(root.join("gb/Game/states/resume.state").exists());
        assert!(in_use.start_syncing("gb/Game.gb").is_some());
        let memory = emu.read_memory(0xC000, 1).unwrap();
        emu.run_frames(10);
        assert_eq!(emu.read_memory(0xC000, 1).unwrap(), memory);
        emu.stop();
    }

    #[test]
    fn restarting_the_sound_leaves_a_paused_game_lent_to_sync() {
        let _lock = lock_core();
        let (index, _) = temp_index("emu-restart-audio");
        let in_use = Arc::new(InUse::default());
        let emu = lending(index, &in_use);
        emu.play("gb/Red.gb");
        emu.pause();

        emu.send(Command::RestartAudio);
        // Commands run in order, so this waits for the restart.
        emu.run_frames(0);

        assert!(in_use.start_syncing("gb/Red.gb").is_some());
        emu.stop();
    }

    #[test]
    fn resuming_waits_for_the_sync_and_carries_on_the_same_session() {
        let _lock = lock_core();
        let (index, _) = temp_index("emu-resume");
        let in_use = Arc::new(InUse::default());
        let emu = lending(index.clone(), &in_use);
        let fps = emu.play("gb/Red.gb");
        emu.run_frames(20);
        emu.pause();
        let memory = emu.read_memory(0xC000, 1).unwrap();
        let syncing = in_use.start_syncing("gb/Red.gb").unwrap();

        emu.send(Command::Resume);
        let mut ran = emu.running_frames(10);

        assert!(!finishes_soon(&mut ran));
        drop(syncing);
        block_on(ran).unwrap();
        assert_ne!(emu.read_memory(0xC000, 1).unwrap(), memory);
        assert!(in_use.start_syncing("gb/Red.gb").is_none());
        emu.stop();
        assert_eq!(index.recently_played(10), Ok(vec!["gb/Red.gb".to_string()]));
        assert_eq!(played_frames(index.play_history("gb/Red.gb").unwrap(), fps), 30);
    }

    #[test]
    fn quitting_a_paused_game_waits_for_its_sync() {
        let _lock = lock_core();
        let (index, _) = temp_index("emu-quit-paused");
        let in_use = Arc::new(InUse::default());
        let emu = lending(index, &in_use);
        emu.play("gb/Red.gb");
        emu.pause();
        let syncing = in_use.start_syncing("gb/Red.gb").unwrap();

        let stopped = emu.stopping();

        assert!(stopped.recv_timeout(Duration::from_millis(100)).is_err());
        drop(syncing);
        stopped.recv().unwrap();
    }

    #[test]
    fn going_to_sleep_writes_the_save_and_resume_state_and_lends_the_game_to_sync() {
        let _lock = lock_core();
        let (index, _) = temp_index("emu-sleep");
        let in_use = Arc::new(InUse::default());
        let emu = lending(index, &in_use);
        let root = std::env::temp_dir().join(format!("pkh-emu-emu-sleep-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        emu.play_into(&root);
        emu.run_frames(30);

        emu.sleep();

        assert!(root.join("gb/Game.sav").exists());
        assert!(root.join("gb/Game/states/resume.state").exists());
        assert!(in_use.start_syncing("gb/Game.gb").is_some());
        emu.send(Command::Wake);
        emu.stop();
    }

    #[test]
    fn holds_frames_while_asleep_and_runs_them_on_waking() {
        let _lock = lock_core();
        let (index, _) = temp_index("emu-sleep-step");
        let emu = Emu::start(std::env::temp_dir(), index, Arc::default(), Box::new(|_, _| {}), Box::new(|_| {}));
        emu.play("gb/Red.gb");
        emu.run_frames(20);
        emu.sleep();
        let memory = emu.read_memory(0xC000, 1).unwrap();

        let mut ran = emu.running_frames(10);

        assert!(!finishes_soon(&mut ran));
        assert_eq!(emu.read_memory(0xC000, 1).unwrap(), memory);
        emu.send(Command::Wake);
        block_on(ran).unwrap();
        assert_ne!(emu.read_memory(0xC000, 1).unwrap(), memory);
        emu.stop();
    }

    #[test]
    fn quitting_asleep_leaves_the_resume_state_to_the_one_written_on_sleep() {
        let _lock = lock_core();
        let (index, _) = temp_index("emu-sleep-quit");
        let emu = Emu::start(std::env::temp_dir(), index, Arc::default(), Box::new(|_, _| {}), Box::new(|_| {}));
        let root = std::env::temp_dir().join(format!("pkh-emu-emu-sleep-quit-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        emu.play_into(&root);
        emu.run_frames(30);
        emu.sleep();
        let states = root.join("gb/Game/states");
        assert!(states.join("resume.state").exists());
        std::fs::remove_dir_all(&states).unwrap();

        emu.stop();

        assert!(!states.join("resume.state").exists());
        emu.send(Command::Wake);
        // Commands run in order, so this waits for the Wake to unload the core before the next test loads one.
        emu.run_frames(0);
    }

    // A debug build fails when the core's context is made current asleep, so this checks iOS's rule on the Mac.
    #[test]
    #[cfg(target_arch = "aarch64")]
    fn an_n64_game_sleeps_wakes_and_quits_asleep_without_its_gl_context() {
        let _lock = lock_core();
        let Some(rom) = stadium() else { return };
        let (index, _) = temp_index("emu-sleep-n64");
        let emu = Emu::start(std::env::temp_dir(), index, Arc::default(), Box::new(|_, _| {}), Box::new(|_| {}));
        let root = std::env::temp_dir().join(format!("pkh-emu-emu-sleep-n64-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        emu.play_rom_into(&root, STADIUM, rom);
        emu.run_frames(60);

        for _ in 0..10 {
            emu.sleep();
            emu.send(Command::Wake);
            emu.run_frames(5);
        }
        emu.sleep();
        emu.stop();

        let states = root.join("n64/Stadium/states");
        assert!(states.join("resume.state").exists());
        assert!(states.join("resume.png").exists());
        emu.send(Command::Wake);
        emu.play("gb/Red.gb");
        emu.stop();
    }

    #[test]
    fn pausing_with_no_game_running_lends_nothing() {
        let (index, _) = temp_index("emu-pause-idle");
        let emu = Emu::start(std::env::temp_dir(), index, Arc::default(), Box::new(|_, _| {}), Box::new(|_| {}));

        assert_eq!(emu.pause(), None);
    }

    #[test]
    fn records_a_session_from_start_to_quit() {
        let _lock = lock_core();
        let (index, _) = temp_index("emu-quit");
        let emu =
            Emu::start(std::env::temp_dir(), index.clone(), Arc::default(), Box::new(|_, _| {}), Box::new(|_| {}));

        let fps = emu.play("gb/Red.gb");
        assert_eq!(index.recently_played(10), Ok(vec!["gb/Red.gb".to_string()]));
        emu.run_frames(30);
        emu.stop();

        let history = index.play_history("gb/Red.gb").unwrap();
        assert!(history.last_played.is_some());
        assert_eq!(played_frames(history, fps), 30);
    }

    #[test]
    fn records_frames_played_up_to_a_suspend() {
        let _lock = lock_core();
        let (index, _) = temp_index("emu-suspend");
        let emu =
            Emu::start(std::env::temp_dir(), index.clone(), Arc::default(), Box::new(|_, _| {}), Box::new(|_| {}));

        let fps = emu.play("gb/Red.gb");
        emu.run_frames(20);
        emu.send(Command::Suspend);
        // Commands run in order, so this waits for the suspend.
        emu.run_frames(0);
        assert_eq!(played_frames(index.play_history("gb/Red.gb").unwrap(), fps), 20);

        emu.run_frames(10);
        emu.stop();
        assert_eq!(played_frames(index.play_history("gb/Red.gb").unwrap(), fps), 30);
    }

    #[test]
    fn ends_a_session_when_another_game_starts() {
        let _lock = lock_core();
        let (index, _) = temp_index("emu-switch");
        let emu =
            Emu::start(std::env::temp_dir(), index.clone(), Arc::default(), Box::new(|_, _| {}), Box::new(|_| {}));

        let fps = emu.play("gb/Red.gb");
        emu.run_frames(20);
        emu.play("gbc/Crystal.gbc");
        emu.run_frames(5);
        emu.stop();
        emu.play("gb/Red.gb");
        emu.run_frames(10);
        emu.stop();

        assert_eq!(index.recently_played(10), Ok(vec!["gb/Red.gb".into(), "gbc/Crystal.gbc".into()]));
        assert_eq!(played_frames(index.play_history("gb/Red.gb").unwrap(), fps), 30);
        assert_eq!(played_frames(index.play_history("gbc/Crystal.gbc").unwrap(), fps), 5);
    }

    #[test]
    fn a_second_stop_waits_for_the_first_stops_writes() {
        let _lock = lock_core();
        let (index, _) = temp_index("emu-second-stop");
        let emu = Emu::start(std::env::temp_dir(), index, Arc::default(), Box::new(|_, _| {}), Box::new(|_| {}));
        let (release, released) = oneshot::channel::<()>();
        emu.play_writing("gb/Red.gb", tauri::async_runtime::spawn(async {
            let _ = released.await;
        }));

        let first = emu.stopping();
        let second = emu.stopping();

        assert!(first.recv_timeout(Duration::from_millis(200)).is_err());
        assert!(second.recv_timeout(Duration::from_millis(50)).is_err());
        release.send(()).unwrap();
        first.recv().unwrap();
        second.recv().unwrap();
    }

    #[test]
    fn stop_with_no_game_played_returns_at_once() {
        let (index, _) = temp_index("emu-stop-idle");
        let emu = Emu::start(std::env::temp_dir(), index, Arc::default(), Box::new(|_, _| {}), Box::new(|_| {}));

        assert!(emu.stopping().recv_timeout(Duration::from_secs(1)).is_ok());
    }

    #[test]
    fn reads_the_same_memory_until_more_frames_run() {
        let _lock = lock_core();
        let (index, _) = temp_index("emu-read-memory");
        let emu = Emu::start(std::env::temp_dir(), index, Arc::default(), Box::new(|_, _| {}), Box::new(|_| {}));
        emu.play("gb/Red.gb");
        emu.run_frames(1);

        let first = emu.read_memory(0xC000, 1).unwrap();
        assert_eq!(emu.read_memory(0xC000, 1).unwrap(), first);
        emu.run_frames(1);
        assert_ne!(emu.read_memory(0xC000, 1).unwrap(), first);
        emu.stop();
    }

    #[test]
    fn shows_the_running_game_s_last_frame_as_a_png() {
        let _lock = lock_core();
        let (index, _) = temp_index("emu-screenshot");
        let emu = Emu::start(std::env::temp_dir(), index, Arc::default(), Box::new(|_, _| {}), Box::new(|_| {}));
        assert_eq!(emu.screenshot(), None);
        emu.play("gb/Red.gb");
        emu.run_frames(1);

        let png = emu.screenshot().unwrap();

        assert_eq!(&png[1..4], b"PNG");
        emu.stop();
        assert_eq!(emu.screenshot(), None);
    }

    #[test]
    fn tells_who_is_listening_when_a_game_starts_and_stops() {
        let _lock = lock_core();
        let (index, _) = temp_index("emu-on-game");
        let (sender, games) = mpsc::channel();
        let sender = std::sync::Mutex::new(sender);
        let emu = Emu::start(
            std::env::temp_dir(),
            index,
            Arc::default(),
            Box::new(move |path, _| sender.lock().unwrap().send(path.map(String::from)).unwrap()),
            Box::new(|_| {}),
        );

        emu.play("gb/Red.gb");
        emu.stop();

        assert_eq!(games.try_iter().collect::<Vec<_>>(), [Some("gb/Red.gb".into()), None]);
    }

    #[test]
    fn reading_memory_with_no_game_running_fails() {
        let (index, _) = temp_index("emu-read-memory-idle");
        let emu = Emu::start(std::env::temp_dir(), index, Arc::default(), Box::new(|_, _| {}), Box::new(|_| {}));

        assert_eq!(emu.read_memory(0xC000, 1), Err(NO_GAME.into()));
    }

    fn with_achievements(name: &str) -> (Game, achievements::tests::Events) {
        let fake = achievements::tests::FakeRetroAchievements::start();
        let (achievements, unlocked, _) = achievements::tests::signed_in(&fake, name);
        let rom = counting_rom();
        let load = achievements.identify(&rom).unwrap();
        let mut core = start_rom(rom, &pattern(0x8030, 1));
        let mut session = load.start();
        achievements::tests::until_loaded(&mut core, &mut session);
        let mut game = game(core, save::Watch::new());
        game.achievements = Some(session);
        (game, unlocked)
    }

    #[test]
    fn checks_achievements_after_every_frame_fast_forwarded_ones_too() {
        let _lock = lock_core();
        let (mut game, unlocked) = with_achievements("emu-fast-forward");

        game.advance(achievements::tests::FRAMES_TO_UNLOCK + 2, true, false, &mut DisplayRate::new(), &mut Vec::new());

        assert_eq!(unlocked.unlocks(), [achievements::tests::ten_frames()]);
    }

    #[test]
    fn maps_n64_memory_for_achievements_once_the_core_has_run_a_frame() {
        let _lock = lock_core();
        let Some(rom) = crate::test_games::stadium() else { return };
        let fake = achievements::tests::FakeRetroAchievements::start();
        let (achievements, _, _) = achievements::tests::signed_in(&fake, "emu-n64");
        let load = achievements.identify(&rom).unwrap();
        let root = std::env::temp_dir().join(format!("pkh-emu-emu-achievements-n64-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        let mut game = playing_stadium(&root, rom);
        game.achievements = Some(load.start());

        game.run_frame();

        assert!(game.achievements.as_ref().unwrap().mapped());
        quit(game);
    }

    #[test]
    fn idles_while_no_command_comes() {
        let (tx, rx) = mpsc::channel();
        let idled = std::cell::Cell::new(0);
        std::thread::spawn(move || {
            std::thread::sleep(IDLE + IDLE / 2);
            let _ = tx.send(Command::Resume);
        });

        let command = next(&rx, &mut VecDeque::new(), false, || idled.set(idled.get() + 1));

        assert!(matches!(command, Some(Command::Resume)));
        assert_eq!(idled.get(), 1);
    }

    #[test]
    fn can_undo_an_edit_until_the_game_saves() {
        let _lock = lock_core();
        let mut game = playing(counting_rom());
        assert!(!game.can_undo());

        game.apply(&pattern(0x8000, 7)).unwrap();
        game.play(120);

        assert!(game.can_undo());
        assert!(game.undo().is_ok());
        assert!(!game.can_undo());
    }

    #[test]
    fn cannot_undo_an_edit_once_the_game_saves() {
        let _lock = lock_core();
        let mut game = playing(boot_counting_rom());

        game.apply(&pattern(0x8000, 7)).unwrap();
        game.play(60);

        assert!(!game.can_undo());
        assert!(game.undo().is_err());
    }

    #[test]
    fn resumes_the_game_where_it_was_left() {
        let _lock = lock_core();
        let save = pattern(0x8030, 1);
        let mut left = start(&save, None).unwrap();
        for _ in 0..60 {
            left.run_frame();
        }
        let state = left.serialize().unwrap();
        drop(left);

        let mut resumed = start(&save, Some(state.clone())).unwrap();

        assert_eq!(resumed.serialize().unwrap(), state);
    }

    #[test]
    fn keeps_the_save_from_the_file_when_resuming() {
        let _lock = lock_core();
        let mut left = start(&pattern(0x8030, 1), None).unwrap();
        left.run_frame();
        let state = left.serialize().unwrap();
        drop(left);
        let save = pattern(0x8030, 9);

        let mut resumed = start(&save, Some(state)).unwrap();

        assert_eq!(resumed.save_ram(), &save[..0x8000]);
    }

    #[test]
    fn starts_the_game_over_when_the_resume_state_does_not_load() {
        let _lock = lock_core();
        let save = pattern(0x8030, 1);
        let fresh = start(&save, None).unwrap().serialize().unwrap();

        let mut started = start(&save, Some(b"not a state".to_vec())).unwrap();

        assert_eq!(started.serialize().unwrap(), fresh);
    }

    #[test]
    fn asks_to_save_first_right_after_resuming() {
        let _lock = lock_core();
        let state = playing(counting_rom()).core.serialize().unwrap();

        let mut resumed = resume(state);
        resumed.play(1);

        assert!(resumed.play_time_since_save() > 60.0);
    }

    #[test]
    fn counts_from_the_start_when_the_resume_state_does_not_load() {
        let _lock = lock_core();

        let mut started = resume(b"not a state".to_vec());
        started.play(1);

        assert!(started.play_time_since_save() < 1.0);
    }

    #[test]
    fn quitting_writes_the_state_a_screenshot_and_the_play_since_save() {
        let _lock = lock_core();
        let (mut game, states) = writing_to("quit", start_rom(counting_rom(), &pattern(0x8030, 1)), save::Watch::new());
        game.play(60);
        let state = game.core.serialize().unwrap();

        quit(game);

        assert_eq!(std::fs::read(states.join("resume.state")).unwrap(), state);
        let screenshot = png::Decoder::new(std::io::Cursor::new(std::fs::read(states.join("resume.png")).unwrap()))
            .read_info()
            .unwrap();
        assert_eq!((screenshot.info().width, screenshot.info().height), (160, 144));
        assert!(info(&states).play_since_save.is_some());
    }

    #[test]
    fn quitting_before_a_frame_runs_keeps_the_resume_files() {
        let _lock = lock_core();
        let (game, states) = writing_to("quit-unplayed", start_rom(counting_rom(), &pattern(0x8030, 1)), save::Watch::new());
        std::fs::create_dir_all(&states).unwrap();
        std::fs::write(states.join("resume.state"), b"resumed from").unwrap();
        std::fs::write(states.join("resume.json"), b"{}").unwrap();

        quit(game);

        assert_eq!(std::fs::read(states.join("resume.state")).unwrap(), b"resumed from");
        assert_eq!(std::fs::read(states.join("resume.json")).unwrap(), b"{}");
        assert!(!states.join("resume.png").exists());
    }

    #[test]
    fn counts_play_since_save_from_the_last_save_write() {
        let _lock = lock_core();
        let (mut game, states) = writing_to("since-save", start_rom(counting_rom(), &pattern(0x8030, 1)), save::Watch::new());
        game.play(60);
        game.apply(&pattern(0x8000, 7)).unwrap();
        game.play(90);
        let fps = game.core.av().timing.fps;

        quit(game);

        assert_eq!((info(&states).play_since_save.unwrap() * fps).round(), 90.0);
    }

    #[test]
    fn writes_the_core_that_made_the_resume_state() {
        let _lock = lock_core();
        let (mut game, states) = writing_to("resume-core", start_rom(counting_rom(), &pattern(0x8030, 1)), save::Watch::new());
        game.play(1);

        quit(game);

        let core = retro::core_info();
        assert_eq!((info(&states).core, info(&states).core_version), (Some(core.name), Some(core.version)));
    }

    #[test]
    fn leaves_play_since_save_unknown_when_a_resumed_game_has_not_saved() {
        let _lock = lock_core();
        let state = playing(counting_rom()).core.serialize().unwrap();
        let (core, watch) = load(counting_rom(), Some(pattern(0x8030, 1)), Some(state), &real_time(), &std::env::temp_dir(), None).unwrap();
        let (mut game, states) = writing_to("resumed", core, watch);
        game.play(60);

        quit(game);

        assert_eq!(info(&states).play_since_save, None);
    }

    fn save_memory(core: &mut Core) -> Vec<u8> {
        let [save_ram, rtc] = core.save_memory();
        [&*save_ram, &*rtc].concat()
    }

    fn folder_of(states: &Path) -> GamesFolder<'static, tauri::Wry> {
        GamesFolder::at(states.ancestors().nth(3).unwrap().to_path_buf())
    }

    fn save_to(game: &mut Game, slot: u8) {
        let (written, done) = oneshot::channel();
        game.save_state(slot, written);
        block_on(done).unwrap().unwrap();
    }

    fn rejected() -> Loaded {
        Loaded {
            state: b"not a state".to_vec(),
            save: pattern(0x8030, 9),
            info: states::Info::default(),
        }
    }

    #[test]
    fn saves_the_state_a_copy_of_the_save_and_a_screenshot_to_a_slot() {
        let _lock = lock_core();
        let (mut game, states) = writing_to("save-state", start_rom(counting_rom(), &pattern(0x8030, 1)), save::Watch::new());
        game.play(60);
        let state = game.core.serialize().unwrap();
        let save = save_memory(&mut game.core);

        save_to(&mut game, 3);

        assert_eq!(std::fs::read(states.join("slot-3.state")).unwrap(), state);
        assert_eq!(std::fs::read(states.join("slot-3.sav")).unwrap(), save);
        assert!(states.join("slot-3.png").exists());
        let info: states::Info = serde_json::from_slice(&std::fs::read(states.join("slot-3.json")).unwrap()).unwrap();
        let core = retro::core_info();
        assert_eq!((info.core, info.core_version), (Some(core.name), Some(core.version)));
    }

    #[test]
    fn loading_a_slot_restores_its_save_into_save_memory_and_the_save_file() {
        let _lock = lock_core();
        let (mut game, states) = writing_to("load-state", start_rom(counting_rom(), &pattern(0x8030, 1)), save::Watch::new());
        game.play(60);
        save_to(&mut game, 3);
        let saved = save_memory(&mut game.core);
        game.apply(&pattern(0x8000, 7)).unwrap();
        game.play(60);
        let loaded = block_on(states::read(&folder_of(&states), "gb/Game.gb", 3, &retro::core_info())).unwrap();

        game.load_slot(3, &loaded).unwrap();

        assert_eq!(save_memory(&mut game.core), saved);
        assert!(game.play_since_save().is_some_and(|seconds| seconds < 2.0));
        quit(game);
        assert_eq!(std::fs::read(states.join("../../Game.sav")).unwrap(), saved);
    }

    #[test]
    fn loading_a_slot_backs_up_the_save_it_replaces() {
        let _lock = lock_core();
        let mut game = playing(counting_rom());
        let loaded = Loaded { state: game.core.serialize().unwrap(), ..rejected() };
        let before = save_memory(&mut game.core);
        let backups = Arc::new(std::sync::Mutex::new(Vec::new()));
        let taken = backups.clone();
        game.back_up = Box::new(move |reason, save| {
            taken.lock().unwrap().push((reason, save.to_vec()));
            Ok(())
        });

        game.load_slot(1, &loaded).unwrap();

        assert_eq!(*backups.lock().unwrap(), [(Reason::Load, before)]);
        assert_eq!(save_memory(&mut game.core), pattern(0x8030, 9));
    }

    #[test]
    fn loading_a_slot_carries_its_play_since_save() {
        let _lock = lock_core();
        let mut game = playing(counting_rom());
        let loaded = Loaded {
            state: game.core.serialize().unwrap(),
            info: states::Info { saved_at: 0.0, play_since_save: Some(90.0), ..states::Info::default() },
            ..rejected()
        };

        game.load_slot(1, &loaded).unwrap();
        game.play(1);

        assert!((game.play_time_since_save() - 90.0).abs() < 0.1);
    }

    #[test]
    fn a_rejected_state_leaves_save_memory_the_save_file_and_ram_alone() {
        let _lock = lock_core();
        let (mut game, states) = writing_to("rejected", start_rom(counting_rom(), &pattern(0x8030, 1)), save::Watch::new());
        game.play(60);
        let (state, save) = (game.core.serialize().unwrap(), save_memory(&mut game.core));

        assert_eq!(game.load_slot(3, &rejected()), Err(states::REJECTED.to_string()));

        assert_eq!(game.core.serialize().unwrap(), state);
        assert_eq!(save_memory(&mut game.core), save);
        assert_eq!(game.slot, None);
        assert!(!states.join("before-load.state").exists());
        quit(game);
        assert!(!states.join("../../Game.sav").exists());
    }

    #[test]
    fn loading_a_slot_clears_undo() {
        let _lock = lock_core();
        let mut game = playing(counting_rom());
        game.apply(&pattern(0x8000, 7)).unwrap();
        let loaded = Loaded { state: game.core.serialize().unwrap(), ..rejected() };

        assert!(game.load_slot(1, &rejected()).is_err());
        assert!(game.can_undo());
        game.load_slot(1, &loaded).unwrap();

        assert!(!game.can_undo());
    }

    #[test]
    fn writes_the_slot_last_saved_to_or_loaded_into_the_resume_info() {
        let _lock = lock_core();
        let (mut game, states) = writing_to("current-slot", start_rom(counting_rom(), &pattern(0x8030, 1)), save::Watch::new());
        game.play(60);
        save_to(&mut game, 4);
        let loaded = block_on(states::read(&folder_of(&states), "gb/Game.gb", 4, &retro::core_info())).unwrap();
        save_to(&mut game, 2);

        game.load_slot(4, &loaded).unwrap();
        quit(game);

        assert_eq!(info(&states).slot, Some(4));
    }

    fn read(states: &Path, name: impl Into<StateName>) -> Loaded {
        block_on(states::read(&folder_of(states), "gb/Game.gb", name, &retro::core_info())).unwrap()
    }

    fn undo_load(game: &mut Game, states: &Path) {
        let (removed, done) = oneshot::channel();
        game.undo_load_state(&read(states, StateName::BeforeLoad), removed).unwrap();
        block_on(done).unwrap().unwrap();
    }

    #[test]
    fn loading_a_slot_keeps_the_moment_before_it() {
        let _lock = lock_core();
        let (mut game, states) = writing_to("before-load", start_rom(counting_rom(), &pattern(0x8030, 1)), save::Watch::new());
        game.play(60);
        save_to(&mut game, 2);
        game.apply(&pattern(0x8000, 7)).unwrap();
        game.play(30);
        let (state, save) = (game.core.serialize().unwrap(), save_memory(&mut game.core));

        game.load_slot(2, &read(&states, 2)).unwrap();

        let before = read(&states, StateName::BeforeLoad);
        assert_eq!((before.state, before.save, before.info.slot), (state, save, Some(2)));
        assert!(states.join("before-load.png").exists());
    }

    #[test]
    fn a_load_from_the_game_page_keeps_the_resume_state_and_the_save_file_before_it() {
        let _lock = lock_core();
        let (mut game, states) = writing_to("game-page-load", start_rom(counting_rom(), &pattern(0x8030, 1)), save::Watch::new());
        game.play(60);
        save_to(&mut game, 3);
        game.apply(&pattern(0x8000, 7)).unwrap();
        game.play(30);
        let resume_state = game.core.serialize().unwrap();
        quit(game);
        let save = std::fs::read(states.join("../../Game.sav")).unwrap();
        let (core, watch) = load(counting_rom(), Some(save.clone()), Some(resume_state), &real_time(), &std::env::temp_dir(), None).unwrap();
        let (mut game, _) = writing_into(states.ancestors().nth(3).unwrap().to_path_buf(), core, watch);
        game.slot = Some(3);
        let resumed = game.core.serialize().unwrap();

        game.load_slot(3, &read(&states, 3)).unwrap();

        let before = read(&states, StateName::BeforeLoad);
        assert_eq!(before.info.slot, Some(3));
        assert!(before.state == resumed, "the state isn't the resumed one");
        assert!(before.save[..0x8000] == save[..0x8000], "the save isn't the save file");
    }

    #[test]
    fn undoing_a_load_brings_back_ram_save_memory_the_save_file_and_the_current_slot() {
        let _lock = lock_core();
        let (mut game, states) = writing_to("undo-load", start_rom(counting_rom(), &pattern(0x8030, 1)), save::Watch::new());
        game.play(60);
        save_to(&mut game, 3);
        save_to(&mut game, 5);
        game.apply(&pattern(0x8000, 7)).unwrap();
        game.play(30);
        let (state, save) = (game.core.serialize().unwrap(), save_memory(&mut game.core));
        game.load_slot(3, &read(&states, 3)).unwrap();
        game.play(30);

        undo_load(&mut game, &states);

        assert_eq!(game.core.serialize().unwrap(), state);
        assert_eq!(save_memory(&mut game.core), save);
        assert_eq!(game.slot, Some(5));
        quit(game);
        assert_eq!(std::fs::read(states.join("../../Game.sav")).unwrap(), save);
        assert_eq!(info(&states).slot, Some(5));
    }

    #[test]
    fn undoing_a_load_backs_up_the_save_it_replaces_and_drops_the_moment_before_the_load() {
        let _lock = lock_core();
        let (mut game, states) = writing_to("undo-load-backup", start_rom(counting_rom(), &pattern(0x8030, 1)), save::Watch::new());
        game.play(60);
        save_to(&mut game, 3);
        game.load_slot(3, &read(&states, 3)).unwrap();
        let loaded = save_memory(&mut game.core);
        let backups = Arc::new(std::sync::Mutex::new(Vec::new()));
        let taken = backups.clone();
        game.back_up = Box::new(move |reason, save| {
            taken.lock().unwrap().push((reason, save.to_vec()));
            Ok(())
        });

        undo_load(&mut game, &states);

        assert_eq!(*backups.lock().unwrap(), [(Reason::Load, loaded)]);
        assert!(!states.join("before-load.state").exists());
    }

    #[test]
    fn a_second_load_replaces_the_moment_before_the_first() {
        let _lock = lock_core();
        let (mut game, states) = writing_to("second-load", start_rom(counting_rom(), &pattern(0x8030, 1)), save::Watch::new());
        game.play(60);
        save_to(&mut game, 3);
        game.load_slot(3, &read(&states, 3)).unwrap();
        game.play(30);
        let state = game.core.serialize().unwrap();

        game.load_slot(3, &read(&states, 3)).unwrap();

        assert_eq!(read(&states, StateName::BeforeLoad).state, state);
    }

    #[test]
    fn quitting_drops_the_moment_before_a_load() {
        let _lock = lock_core();
        let (mut game, states) = writing_to("quit-before-load", start_rom(counting_rom(), &pattern(0x8030, 1)), save::Watch::new());
        game.play(60);
        save_to(&mut game, 3);
        game.load_slot(3, &read(&states, 3)).unwrap();

        quit(game);

        let mut names: Vec<_> = std::fs::read_dir(&states).unwrap().map(|e| e.unwrap().file_name()).collect();
        names.sort();
        assert!(names.iter().all(|name| !name.to_string_lossy().starts_with("before-load")), "{names:?}");
    }

    #[test]
    fn forgets_the_slot_it_was_playing_from_once_deleted() {
        let _lock = lock_core();
        let (mut game, states) = writing_to("forget-slot", start_rom(counting_rom(), &pattern(0x8030, 1)), save::Watch::new());
        game.play(1);
        save_to(&mut game, 4);

        game.forget_slot(2);
        assert_eq!(game.slot, Some(4));
        game.forget_slot(4);
        quit(game);

        assert_eq!(info(&states).slot, None);
    }

    #[test]
    fn writes_no_slot_into_the_resume_info_of_a_started_game() {
        let _lock = lock_core();
        let (mut game, states) = writing_to("no-slot", start_rom(counting_rom(), &pattern(0x8030, 1)), save::Watch::new());
        game.play(1);

        quit(game);

        assert_eq!(info(&states).slot, None);
    }

    const TWO_DAYS: i64 = 2 * 24 * 60 * 60;

    fn on_the_clock(state: Option<Vec<u8>>, offset: i64) -> Game {
        let clock = Clock::new(&clock_rom(), offset);
        let (core, watch) = load(clock_rom(), Some(clock_save()), state, &clock, &std::env::temp_dir(), None).unwrap();
        let mut game = Game { clock, ..game(core, watch) };
        game.play(1);
        game
    }

    #[test]
    fn a_cold_boot_runs_on_the_sessions_clock() {
        let _lock = lock_core();

        let mut game = on_the_clock(None, TWO_DAYS);

        assert_eq!(days_on_the_clock(&mut game.core), 2);
    }

    #[test]
    fn a_resumed_game_runs_on_the_sessions_clock() {
        let _lock = lock_core();
        let state = on_the_clock(None, 0).core.serialize().unwrap();

        let mut game = on_the_clock(Some(state), TWO_DAYS);

        assert_eq!(days_on_the_clock(&mut game.core), 2);
    }

    #[test]
    fn a_loaded_slot_runs_on_the_sessions_clock() {
        let _lock = lock_core();
        let slot = Loaded { state: on_the_clock(None, 0).core.serialize().unwrap(), ..rejected() };
        let mut game = on_the_clock(None, TWO_DAYS);

        game.load_slot(1, &slot).unwrap();
        game.play(1);

        assert_eq!(days_on_the_clock(&mut game.core), 2);
    }

    #[test]
    fn a_slot_made_under_another_offset_loads_on_the_sessions_clock() {
        let _lock = lock_core();
        let slot = Loaded { state: on_the_clock(None, 5 * TWO_DAYS).core.serialize().unwrap(), ..rejected() };
        let mut game = on_the_clock(None, TWO_DAYS);

        game.load_slot(1, &slot).unwrap();

        let state = game.core.serialize().unwrap();
        assert_eq!(clock::read(&state, clock::GB_STATE_SIZE), Some((clock::RTC_WALLCLOCK_OFFSET, TWO_DAYS * 1000)));
    }

    #[test]
    fn resumes_heartgold_where_it_was_left() {
        let _lock = lock_core();
        let Some((rom, save)) = heartgold() else { return };
        let (mut left, _) = load(rom, Some(save.clone()), None, &Clock::Ds { offset_seconds: 0 }, &std::env::temp_dir(), None).unwrap();
        for _ in 0..600 {
            left.run_frame();
        }
        let state = left.serialize().unwrap();
        drop(left);

        let (mut resumed, watch) = load(heartgold().unwrap().0, Some(save.clone()), Some(state), &Clock::Ds { offset_seconds: 0 }, &std::env::temp_dir(), None).unwrap();
        resumed.run_frame();

        assert_eq!(watch.frames_since_write(), u64::MAX);
        assert_eq!(resumed.take_frame(|frame| (frame.width, frame.height)), Some((256, 384)));
        assert_eq!(resumed.save_ram(), save);
    }

    #[test]
    #[cfg(target_arch = "aarch64")]
    fn resumes_stadium_where_it_was_left() {
        let _lock = lock_core();
        let Some(rom) = stadium() else { return };
        let clock = Clock::new(&rom, 0);
        let (mut left, _) = load(rom, None, None, &clock, &std::env::temp_dir(), None).unwrap();
        for _ in 0..300 {
            left.run_frame();
        }
        let state = left.serialize().unwrap();
        drop(left);

        let (mut resumed, watch) = load(stadium().unwrap(), None, Some(state), &clock, &std::env::temp_dir(), None).unwrap();
        let mut frames = 0;
        for _ in 0..120 {
            resumed.run_frame();
            if resumed.take_frame(|frame| (frame.width, frame.height)) == Some((640, 480)) {
                frames += 1;
            }
        }

        assert_eq!(watch.frames_since_write(), u64::MAX, "the resume state didn't load");
        assert!(frames > 30, "{frames} frames");
    }

    #[test]
    fn heartgold_loads_a_state_with_its_save_copy() {
        let _lock = lock_core();
        let Some((rom, save)) = heartgold() else { return };
        let (core, watch) = load(rom, Some(save), None, &Clock::Ds { offset_seconds: 0 }, &std::env::temp_dir(), None).unwrap();
        let mut game = Game { clock: Clock::Ds { offset_seconds: 0 }, ..game(core, watch) };
        game.play(600);
        let loaded = Loaded { state: game.core.serialize().unwrap(), save: save_memory(&mut game.core), ..rejected() };
        let mut edited = game.core.save_ram().to_vec();
        edited[0x100] ^= 0xFF;
        game.apply(&edited).unwrap();
        game.play(600);

        game.load_slot(1, &loaded).unwrap();
        game.play(600);

        // Loading a state copies the cart's save into save RAM, so this reads the save the game itself sees.
        let state = game.core.serialize().unwrap();
        assert!(game.core.unserialize(&state));
        assert!(save_memory(&mut game.core) == loaded.save, "the cart's save isn't the slot's copy");
    }

    #[test]
    fn a_3ds_save_the_game_writes_reaches_the_games_folder_within_a_second() {
        use save::three_ds::tests::{format, main_path, X, X_SIZE};
        let _lock = lock_core();
        let root = std::env::temp_dir().join(format!("pkh-emu-emu-3ds-watch-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        let azahar = root.join("Azahar");
        format(&azahar, X, X_SIZE);
        let mut main = Main::of(X, &azahar).unwrap();
        main.place(Some(&pattern(X_SIZE, 1))).unwrap();
        let (mut game, _) = writing_into(root.join("games"), start_rom(counting_rom(), &[]), save::Watch::new());
        game.save_file = Some(SaveFile::Main(main));
        game.play(45);
        assert_eq!(std::fs::read(root.join("games/gb/Game.sav")).ok(), None);

        let mut file = std::fs::File::create(main_path(&azahar, X)).unwrap();
        std::io::Write::write_all(&mut file, &pattern(X_SIZE, 2)).unwrap();
        file.set_modified(SystemTime::now() + Duration::from_secs(5)).unwrap();
        drop(file);
        game.play(60);

        assert_eq!(flushed(&game, &root.join("games/gb/Game.sav")), pattern(X_SIZE, 2));
        quit(game);
    }

    #[test]
    fn a_3ds_state_waits_until_the_game_has_formatted_its_save_data() {
        use save::three_ds::tests::{X, X_SIZE};
        let _lock = lock_core();
        let azahar = std::env::temp_dir().join(format!("pkh-emu-emu-3ds-waiting-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&azahar);
        let mut main = Main::of(X, &azahar).unwrap();
        main.place(Some(&pattern(X_SIZE, 1))).unwrap();
        let save_file = Some(SaveFile::Main(main));
        let mut game = Game { save_file, ..game(start_rom(counting_rom(), &[]), save::Watch::new()) };
        let loaded = Loaded { state: game.core.serialize().unwrap(), save: pattern(X_SIZE, 2), ..rejected() };

        assert!(game.load_slot(1, &loaded).is_err());
        let Some(SaveFile::Main(main)) = &game.save_file else { panic!("the game has no main") };
        assert_eq!(main.bytes(), pattern(X_SIZE, 1));
    }

    // Pokémon X keeps its party at 0x14200 in main, 0x104 bytes a Pokémon, and its RAM holds the same bytes.
    const X_PARTY: std::ops::Range<usize> = 0x14200..0x14304;

    pub(super) fn playing_pokemon_x(root: &Path, rom: Rom, save: &[u8]) -> Game {
        let azahar = retro::azahar_dir(&std::env::temp_dir());
        let _ = std::fs::remove_dir_all(azahar.join("sdmc/Nintendo 3DS"));
        let folder = GamesFolder::<tauri::Wry>::at(root.to_path_buf());
        block_on(folder.write("3ds/X.sav", save)).unwrap();
        let (slot, read) = block_on(save::open(&folder, "3ds/X.3ds")).unwrap();
        let save_file = save::three_ds::placed(&rom, read.as_deref(), &azahar).unwrap().map(SaveFile::Main);
        let clock = Clock::new(&rom, 0);
        let (core, watch) = load(rom, read, None, &clock, &std::env::temp_dir(), None).unwrap();
        let (writes, queued) = tokio_mpsc::unbounded_channel();
        let writer =
            tauri::async_runtime::spawn(async move { writer::write_all(&folder, "3ds/X.3ds", &slot, queued).await });
        let platform = Platform::ThreeDs;
        Game { path: "3ds/X.3ds".into(), platform, clock, save_file, writes, writer, ..game(core, watch) }
    }

    fn continue_pokemon_x(game: &mut Game) {
        for frame in 0..1800 {
            retro::set_input(if frame >= 300 && frame % 60 < 6 { 1 << 8 } else { 0 });
            game.run_frame();
        }
        retro::set_input(0);
    }

    fn flushed(game: &Game, save: &Path) -> Vec<u8> {
        let (done, flushed) = oneshot::channel();
        game.write(Write::Flush(done));
        block_on(flushed).unwrap();
        std::fs::read(save).unwrap()
    }

    fn azahar_ram(state: &[u8]) -> Vec<u8> {
        use std::io::Read;
        let magic = [0x28, 0xB5, 0x2F, 0xFD];
        let start = state.windows(4).position(|window| window == magic).expect("the state has no zstd frame");
        let mut ram = Vec::new();
        let mut frames = &state[start..];
        while frames.starts_with(&magic) {
            let mut decoder = ruzstd::decoding::StreamingDecoder::new(&mut frames).unwrap();
            decoder.read_to_end(&mut ram).unwrap();
        }
        ram
    }

    fn contains(haystack: &[u8], needle: &[u8]) -> bool {
        haystack.windows(needle.len()).any(|window| window == needle)
    }

    const COLOSSEUM: &str = "gc/Colosseum.rvz";

    fn playing_colosseum(root: &Path, state: Option<Vec<u8>>) -> Option<Game> {
        // Only the European release asks for 60 Hz, which the inputs below answer.
        let rom = crate::test_games::gamecube_disc("Pokémon Colosseum", "GC6P01", 0)?;
        let folder = GamesFolder::<tauri::Wry>::at(root.to_path_buf());
        let (slot, read) = block_on(save::open(&folder, COLOSSEUM)).unwrap();
        let card = retro::dolphin_card(&std::env::temp_dir());
        let save_file = save::game_cube::placed(&rom, read.as_deref(), card).unwrap().map(SaveFile::Card);
        let clock = Clock::new(&rom, 0);
        let (core, watch) = load(rom, read, state, &clock, &std::env::temp_dir(), None).unwrap();
        let (writes, queued) = tokio_mpsc::unbounded_channel();
        let writer =
            tauri::async_runtime::spawn(async move { writer::write_all(&folder, COLOSSEUM, &slot, queued).await });
        let platform = Platform::GameCube;
        Some(Game { path: COLOSSEUM.into(), platform, clock, save_file, writes, writer, ..game(core, watch) })
    }

    // A device that never ran the game has neither Dolphin's copy of the card nor its SRAM, where Colosseum keeps the
    // 60 Hz choice.
    fn as_on_a_new_device() {
        let _ = std::fs::remove_dir_all(retro::dolphin_card(&std::env::temp_dir()).parent().unwrap());
    }

    fn mash(game: &mut Game, button: u16, frames: u32, gap: u32) {
        for frame in 0..frames {
            retro::set_input(if frame % gap < 4 { button } else { 0 });
            game.run_frame();
        }
        retro::set_input(0);
    }

    // Past the 60 Hz prompt and the title to where Colosseum has read the card: it offers to make a save file on a
    // card without one, and says it has read one with a save.
    fn colosseum_card_message(game: &mut Game) -> Vec<u16> {
        game.play(410);
        mash(game, 1 << 6, 10, 10);
        game.play(20);
        mash(game, 1 << 8, 10, 10);
        game.play(1500);
        mash(game, 1 << 3, 200, 30);
        game.play(300);
        game.core.last_frame(|frame| frame.pixels.clone()).unwrap()
    }

    fn dolphin() -> retro::CoreInfo {
        retro::core_info_for(crate::rom::System::GameCube).unwrap()
    }

    fn colosseum_ram(game: &mut Game) -> Vec<u8> {
        game.core.memory_data(retro::MEMORY_SYSTEM_RAM).to_vec()
    }

    #[test]
    #[cfg(target_arch = "aarch64")]
    fn a_colosseum_game_resumes_from_the_state_it_quit_in() {
        let _lock = lock_core();
        let root = std::env::temp_dir().join(format!("pkh-emu-emu-colosseum-resume-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        let folder = GamesFolder::<tauri::Wry>::at(root.clone());
        as_on_a_new_device();
        let Some(mut game) = playing_colosseum(&root, None) else { return };
        game.play(600);
        let ram = colosseum_ram(&mut game);
        quit(game);
        assert!(block_on(folder.has_file("gc/Colosseum/states/resume.png")), "the resume state has no screenshot");
        let resumed = block_on(resume::read(&folder, COLOSSEUM, &dolphin())).unwrap();
        let (state, _) = resumed.expect("Colosseum left no resume state");

        let mut game = playing_colosseum(&root, Some(state)).unwrap();

        assert!(colosseum_ram(&mut game) == ram, "Colosseum didn't resume where it quit");
        game.play(60);
        quit(game);
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    #[cfg(target_arch = "aarch64")]
    fn a_colosseum_state_loads_after_a_restart_with_the_card_it_was_saved_with() {
        let _lock = lock_core();
        let root = std::env::temp_dir().join(format!("pkh-emu-emu-colosseum-state-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        let folder = GamesFolder::<tauri::Wry>::at(root.clone());
        as_on_a_new_device();
        let Some(mut game) = playing_colosseum(&root, None) else { return };
        colosseum_card_message(&mut game);
        quit(game);
        let blank = block_on(folder.read("gc/Colosseum.raw")).unwrap();
        as_on_a_new_device();

        let mut game = playing_colosseum(&root, None).unwrap();
        game.play(600);
        let ram = colosseum_ram(&mut game);
        save_to(&mut game, 1);
        colosseum_card_message(&mut game);
        mash(&mut game, 1 << 8, 300, 40);
        quit(game);
        let saved = block_on(folder.read("gc/Colosseum.raw")).unwrap();
        assert!(contains(&saved[0x2000..0x6000], b"GC6P01"), "Colosseum made no save file on the card");
        assert_eq!(block_on(folder.read("gc/Colosseum/states/slot-1.raw")).unwrap(), blank);
        assert!(block_on(folder.has_file("gc/Colosseum/states/slot-1.png")), "the slot has no screenshot");
        as_on_a_new_device();

        let mut game = playing_colosseum(&root, None).unwrap();
        let dolphin = dolphin();
        let listed = block_on(states::list(&folder, COLOSSEUM, Some(&dolphin)));
        assert_eq!(listed.iter().map(|listed| (listed.slot, listed.loadable)).collect::<Vec<_>>(), [(1, true)]);
        let loaded = block_on(states::read(&folder, COLOSSEUM, 1, &dolphin)).unwrap();
        game.load_slot(1, &loaded).unwrap();

        assert!(colosseum_ram(&mut game) == ram, "Colosseum isn't where the state was saved");
        assert_eq!(flushed(&game, &root.join("gc/Colosseum.raw")), blank);
        assert_eq!(block_on(folder.read("gc/Colosseum/states/before-load.raw")).unwrap(), saved);
        game.play(60);
        quit(game);
        assert_eq!(block_on(folder.read("gc/Colosseum.raw")).unwrap(), blank, "Dolphin kept the card from before");

        let other = states::Info { core_version: Some("2509.0.0+0000000000".into()), ..loaded.info };
        block_on(folder.write("gc/Colosseum/states/slot-1.json", &serde_json::to_vec(&other).unwrap())).unwrap();
        assert!(!block_on(states::list(&folder, COLOSSEUM, Some(&dolphin)))[0].loadable);
        assert!(block_on(states::read(&folder, COLOSSEUM, 1, &dolphin)).is_err());
        as_on_a_new_device();
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    #[cfg(target_arch = "aarch64")]
    fn a_colosseum_card_restored_from_a_backup_loads_on_another_device() {
        let _lock = lock_core();
        let root = std::env::temp_dir().join(format!("pkh-emu-emu-colosseum-card-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        let folder = GamesFolder::<tauri::Wry>::at(root.clone());
        as_on_a_new_device();
        let Some(mut game) = playing_colosseum(&root, None) else { return };
        let offer = colosseum_card_message(&mut game);
        mash(&mut game, 1 << 8, 300, 40);
        quit(game);

        let card = block_on(folder.read("gc/Colosseum.raw")).unwrap();
        assert!(contains(&card[0x2000..0x6000], b"GC6P01"), "Colosseum made no save file on the card");
        let (slot, _) = block_on(save::open(&folder, COLOSSEUM)).unwrap();
        block_on(crate::backups::take(&folder, COLOSSEUM, &slot, Reason::Start, &card, "2026-10-20_1200", None))
            .unwrap();
        block_on(folder.remove_unlogged("gc/Colosseum.raw")).unwrap();
        block_on(crate::backups::restore(&folder, COLOSSEUM, "2026-10-20_1200_start.raw", "2026-10-20_1201", 10))
            .unwrap();
        as_on_a_new_device();

        let mut game = playing_colosseum(&root, None).unwrap();
        let read = colosseum_card_message(&mut game);
        quit(game);

        // The offer's YES and NO sit over the logo, which shows once the game has read its save.
        let width = 640;
        let changed =
            (215..300).flat_map(|y| (90..210).map(move |x| y * width + x)).filter(|&at| offer[at] != read[at]).count();
        assert!(changed > 120 * 85 / 2, "Colosseum offered to make a save file again ({changed} pixels changed)");
        assert_eq!(block_on(folder.read("gc/Colosseum.raw")).unwrap(), card);
        as_on_a_new_device();
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    #[cfg(target_arch = "aarch64")]
    fn a_colosseum_edit_boots_the_game_again_on_the_edited_card_and_undo_brings_back_the_game_from_before() {
        let _lock = lock_core();
        let root = std::env::temp_dir().join(format!("pkh-emu-emu-colosseum-apply-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        let folder = GamesFolder::<tauri::Wry>::at(root.clone());
        as_on_a_new_device();
        let Some(mut game) = playing_colosseum(&root, None) else { return };
        colosseum_card_message(&mut game);
        mash(&mut game, 1 << 8, 300, 40);
        quit(game);
        let card = block_on(folder.read("gc/Colosseum.raw")).unwrap();
        let mut edited = card.clone();
        let last_block = edited.len() - 0x2000;
        edited[last_block..].fill(0x5A);
        as_on_a_new_device();

        let mut game = playing_colosseum(&root, None).unwrap();
        game.play(600);
        let ram = colosseum_ram(&mut game);
        game.apply(&edited).unwrap();
        assert_eq!(flushed(&game, &root.join("gc/Colosseum.raw")), edited);
        game.play(60);
        game.undo().unwrap();

        assert!(colosseum_ram(&mut game) == ram, "Colosseum isn't where it was before the edit");
        assert_eq!(flushed(&game, &root.join("gc/Colosseum.raw")), card);
        game.apply(&edited).unwrap();
        game.play(60);
        quit(game);
        assert_eq!(block_on(folder.read("gc/Colosseum.raw")).unwrap(), edited, "Dolphin kept the card from before");
        as_on_a_new_device();
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    #[cfg(target_arch = "aarch64")]
    #[ignore = "needs Node and the app's npm packages"]
    fn a_pokemon_edited_on_the_colosseum_card_is_in_the_game_after_it_boots_again() {
        let _lock = lock_core();
        let Some(card) = crate::test_games::colosseum_card() else { return };
        let root = std::env::temp_dir().join(format!("pkh-emu-emu-colosseum-edit-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        let folder = GamesFolder::<tauri::Wry>::at(root.clone());
        block_on(folder.write("gc/Colosseum.raw", &card)).unwrap();
        as_on_a_new_device();
        let Some(mut game) = playing_colosseum(&root, None) else { return };
        game.play(600);

        let dir = root.join("engine");
        std::fs::create_dir_all(&dir).unwrap();
        let (before, edited) = (dir.join("before.raw"), dir.join("edited.raw"));
        std::fs::write(&before, game.read_save().unwrap()).unwrap();
        node("nickname.mjs", &[before.as_ref(), "PKHEMU".as_ref(), edited.as_ref()]);
        let edited = std::fs::read(&edited).unwrap();
        game.apply(&edited).unwrap();
        assert_eq!(flushed(&game, &root.join("gc/Colosseum.raw")), edited);
        colosseum_card_message(&mut game);
        mash(&mut game, 1 << 8, 600, 40);
        game.play(600);

        // Colosseum keeps nicknames in UTF-16, big-endian.
        let nickname: Vec<u8> = "PKHEMU".encode_utf16().flat_map(u16::to_be_bytes).collect();
        assert!(contains(&colosseum_ram(&mut game), &nickname), "Colosseum didn't load the edited Pokémon");
        quit(game);
        assert_eq!(block_on(folder.read("gc/Colosseum.raw")).unwrap(), edited, "Colosseum replaced the edited card");
        as_on_a_new_device();
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    #[cfg(target_arch = "aarch64")]
    #[ignore = "needs Node and the app's npm packages"]
    fn pokemon_x_plays_from_the_placed_save_and_restarts_on_an_edit() {
        let _lock = lock_core();
        let (Some(rom), Some(save)) = (pokemon_x(), pokemon_x_save()) else { return };
        let root = std::env::temp_dir().join(format!("pkh-emu-emu-pokemon-x-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        let mut game = playing_pokemon_x(&root, rom, &save);
        continue_pokemon_x(&mut game);
        assert_eq!(flushed(&game, &root.join("3ds/X.sav")), save, "the game replaced its save");

        let dir = root.join("engine");
        std::fs::create_dir_all(&dir).unwrap();
        let (before, edited) = (dir.join("before.sav"), dir.join("edited.sav"));
        std::fs::write(&before, game.read_save().unwrap()).unwrap();
        let level = node("engine.mjs", &[before.as_ref()]).parse::<u8>().unwrap();
        node("engine.mjs", &[before.as_ref(), (level + 1).to_string().as_ref(), edited.as_ref()]);
        let edited = std::fs::read(&edited).unwrap();
        game.apply(&edited).unwrap();
        assert_eq!(flushed(&game, &root.join("3ds/X.sav")), edited);
        continue_pokemon_x(&mut game);

        let ram = azahar_ram(&game.core.serialize().unwrap());
        assert!(contains(&ram, &edited[X_PARTY]), "the game didn't load the edited Pokémon");
        assert!(!contains(&ram, &save[X_PARTY]), "the game still holds the Pokémon from before the edit");
        assert_eq!(flushed(&game, &root.join("3ds/X.sav")), edited);
        quit(game);
        let _ = std::fs::remove_dir_all(&root);
    }

    // Pokémon X ends main with a checksum for each block, and its RAM holds the checksums too.
    const X_CHECKSUMS: std::ops::Range<usize> = 0x65400..0x65600;

    fn save_pokemon_x(game: &mut Game) {
        let [a, down, x] = [1 << 8, 1 << 5, 1 << 9];
        for (button, wait) in [(x, 60), (down, 20), (down, 20), (a, 90), (a, 90), (a, 400)] {
            retro::set_input(button);
            game.play(6);
            retro::set_input(0);
            game.play(wait);
        }
    }

    #[test]
    #[cfg(target_arch = "aarch64")]
    fn a_pokemon_x_state_brings_back_the_game_and_the_save_from_before_an_in_game_save() {
        use save::three_ds::tests::{main_path, X};
        let _lock = lock_core();
        let (Some(rom), Some(save)) = (pokemon_x(), pokemon_x_save()) else { return };
        let root = std::env::temp_dir().join(format!("pkh-emu-emu-pokemon-x-state-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        let mut game = playing_pokemon_x(&root, rom, &save);
        continue_pokemon_x(&mut game);
        let (written, state_saved) = oneshot::channel();
        game.save_state(1, written);
        block_on(state_saved).unwrap().unwrap();

        save_pokemon_x(&mut game);
        let newer = flushed(&game, &root.join("3ds/X.sav"));
        assert_ne!(newer, save, "the game didn't save");
        let folder = GamesFolder::<tauri::Wry>::at(root.clone());
        let loaded = block_on(states::read(&folder, "3ds/X.3ds", 1, &game.core.info())).unwrap();
        game.load_slot(1, &loaded).unwrap();

        let ram = azahar_ram(&game.core.serialize().unwrap());
        let rows = X_CHECKSUMS.step_by(16).map(|start| start..start + 16);
        let changed: Vec<_> = rows.filter(|row| save[row.clone()] != newer[row.clone()]).collect();
        assert!(!changed.is_empty());
        assert!(changed.iter().all(|row| contains(&ram, &save[row.clone()])), "the game isn't the one from the state");
        assert!(
            changed.iter().all(|row| !contains(&ram, &newer[row.clone()])),
            "the game still holds its in-game save"
        );
        let azahar = retro::azahar_dir(&std::env::temp_dir());
        assert_eq!(std::fs::read(main_path(&azahar, X)).unwrap(), save);
        game.play(120);
        assert_eq!(flushed(&game, &root.join("3ds/X.sav")), save);
        quit(game);
        let _ = std::fs::remove_dir_all(&root);
    }

    fn presents(game: &mut Game) -> crate::vulkan::Frame {
        for _ in 0..600 {
            game.run_frame();
            if let Some(frame) = retro::vulkan_frame() {
                return frame;
            }
        }
        panic!("Azahar didn't hand over an image");
    }

    #[test]
    #[cfg(target_arch = "aarch64")]
    fn a_3ds_reset_or_state_load_leaves_no_frame_of_azahars_freed_image_to_draw() {
        let _lock = lock_core();
        let Some(rom) = pokemon_x() else { return };
        let clock = Clock::new(&rom, 0);
        let (core, watch) = load(rom, None, None, &clock, &std::env::temp_dir(), None).unwrap();
        let mut game = Game { platform: Platform::ThreeDs, clock, native: true, ..game(core, watch) };
        let log: Arc<std::sync::Mutex<ScreenLog>> = Arc::default();
        let mut screen: Box<dyn Screen> = Box::new(FakeScreen(log.clone()));
        let before_reset = presents(&mut game);
        let state = game.core.serialize().unwrap();

        game.core.reset();
        game.show(Some(&mut screen)).unwrap();

        assert!(!before_reset.current(), "the screen would redraw the image Azahar freed on the reset");
        assert!(retro::vulkan_frame().is_none(), "the handoff still names the image Azahar freed on the reset");
        assert!(log.lock().unwrap().shown.is_empty());

        let before_load = presents(&mut game);
        game.show(Some(&mut screen)).unwrap();
        assert_eq!(log.lock().unwrap().shown.len(), 1);
        assert!(game.core.unserialize(&state));
        game.show(Some(&mut screen)).unwrap();

        assert!(!before_load.current(), "the screen would redraw the image Azahar freed on the state load");
        assert!(retro::vulkan_frame().is_none(), "the handoff still names the image Azahar freed on the state load");
        assert_eq!(log.lock().unwrap().shown.len(), 1);
        assert!(presents(&mut game).current());
        quit(game);
    }

    const WRITE_AB_TO_C100: &str = "01AB00C1";

    fn code(text: &str, on: bool) -> Code {
        Code { id: text.into(), name: text.into(), code: text.into(), on, modified: 0 }
    }

    impl Emu {
        fn set_cheats(&self, path: &str, codes: Vec<Code>) {
            let (done, applied) = oneshot::channel();
            self.send(Command::SetCheats { path: path.into(), codes, done });
            block_on(applied).unwrap();
        }
    }

    fn work_ram(game: &mut Game, address: u32) -> u8 {
        game.core.read_memory(&[Range { address, length: 1 }]).unwrap()[0]
    }

    fn recorded_backups(game: &mut Game) -> Arc<std::sync::Mutex<Vec<(Reason, Vec<u8>)>>> {
        let backups = Arc::new(std::sync::Mutex::new(Vec::new()));
        let taken = backups.clone();
        game.back_up = Box::new(move |reason, save| {
            taken.lock().unwrap().push((reason, save.to_vec()));
            Ok(())
        });
        backups
    }

    #[test]
    fn a_code_writes_memory_until_turned_off() {
        let _lock = lock_core();
        let mut game = playing(counting_rom());
        let before = work_ram(&mut game, 0xC100);

        game.set_cheats(&[code(WRITE_AB_TO_C100, true)]);
        game.play(1);
        assert_eq!(work_ram(&mut game, 0xC100), 0xAB);

        game.set_cheats(&[code(WRITE_AB_TO_C100, false)]);
        game.core.write_memory(0xC100, &[before]);
        game.play(1);
        assert_eq!(work_ram(&mut game, 0xC100), before);
    }

    #[test]
    fn sets_the_codes_that_are_on_when_the_game_starts() {
        let _lock = lock_core();
        let (index, _) = temp_index("emu-cheats-start");
        let emu = Emu::start(std::env::temp_dir(), index, Arc::default(), Box::new(|_, _| {}), Box::new(|_| {}));
        let (writes, _) = tokio_mpsc::unbounded_channel();
        let (reply, result) = oneshot::channel();
        emu.send(Command::Play {
            folder: String::new(),
            path: "gb/Red.gb".into(),
            rom: counting_rom(),
            update: None,
            save: None,
            state: None,
            slot: None,
            clock: real_time(),
            cheats: vec![code(WRITE_AB_TO_C100, true)],
            cart: None,
            writes,
            back_up: Box::new(|_, _| Ok(())),
            mark_cheats: Box::new(|_| {}),
            mark_edited: Box::new(|| {}),
            writer: tauri::async_runtime::spawn(async {}),
            on_frame: Channel::new(|_| Ok(())),
            native: false,
            on_native_failed: Channel::new(|_| Ok(())),
            achievements: None,
            reply,
        });
        block_on(result).unwrap().unwrap();

        emu.run_frames(1);

        assert_eq!(emu.read_memory(0xC100, 1).unwrap(), [0xAB]);
        emu.stop();
    }

    #[test]
    fn sets_the_codes_of_the_running_game_only() {
        let _lock = lock_core();
        let (index, _) = temp_index("emu-cheats");
        let emu = Emu::start(std::env::temp_dir(), index, Arc::default(), Box::new(|_, _| {}), Box::new(|_| {}));
        emu.play("gb/Red.gb");
        emu.run_frames(1);
        let before = emu.read_memory(0xC100, 1).unwrap();

        emu.set_cheats("gb/Blue.gb", vec![code(WRITE_AB_TO_C100, true)]);
        emu.run_frames(1);
        assert_eq!(emu.read_memory(0xC100, 1).unwrap(), before);

        emu.set_cheats("gb/Red.gb", vec![code(WRITE_AB_TO_C100, true)]);
        emu.run_frames(1);
        assert_eq!(emu.read_memory(0xC100, 1).unwrap(), [0xAB]);
        emu.stop();
    }

    #[test]
    fn turning_a_code_on_backs_up_the_save_first() {
        let _lock = lock_core();
        let mut game = playing(counting_rom());
        let save = save_memory(&mut game.core);
        let backups = recorded_backups(&mut game);

        game.set_cheats(&[code(WRITE_AB_TO_C100, true), code("01CD00C1", false)]);
        game.set_cheats(&[code(WRITE_AB_TO_C100, true), code("01CD00C1", false)]);
        game.set_cheats(&[code(WRITE_AB_TO_C100, false), code("01CD00C1", false)]);

        assert_eq!(*backups.lock().unwrap(), [(Reason::Cheats, save)]);
    }

    #[test]
    fn turning_a_code_on_again_backs_up_only_a_save_that_changed() {
        let _lock = lock_core();
        let mut game = playing(counting_rom());
        let root = std::env::temp_dir().join(format!("pkh-emu-emu-cheats-backup-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        let folder = GamesFolder::<tauri::Wry>::at(root.clone());
        game.back_up = Box::new(move |reason, save| {
            let (slot, _) = save::Slot::new("gb/Game.sav".into(), Vec::new());
            block_on(crate::backups::take(&folder, "gb/Game.gb", &slot, reason, save, "2026-10-08_1200", None))
        });
        let on = || [code(WRITE_AB_TO_C100, true)];
        let off = || [code(WRITE_AB_TO_C100, false)];
        let cheats_backups = || {
            let names = std::fs::read_dir(root.join("gb/Game/backups")).unwrap();
            names.filter(|entry| entry.as_ref().unwrap().file_name().to_string_lossy().contains("_cheats")).count()
        };

        game.set_cheats(&on());
        game.set_cheats(&off());
        game.set_cheats(&on());
        assert_eq!(cheats_backups(), 1);

        game.set_cheats(&off());
        game.apply(&pattern(0x8000, 7)).unwrap();
        game.set_cheats(&on());
        assert_eq!(cheats_backups(), 2);
    }

    fn recorded_marks(game: &mut Game) -> Arc<std::sync::Mutex<Vec<Vec<u8>>>> {
        let marks = Arc::new(std::sync::Mutex::new(Vec::new()));
        let marked = marks.clone();
        game.mark_cheats = Box::new(move |save| marked.lock().unwrap().push(save.to_vec()));
        marks
    }

    #[test]
    fn marks_a_save_the_game_writes_while_codes_are_on() {
        let _lock = lock_core();
        let mut game = playing(boot_counting_rom());
        let marks = recorded_marks(&mut game);
        game.set_cheats(&[code(WRITE_AB_TO_C100, true)]);

        game.apply(&pattern(0x8000, 7)).unwrap();
        game.play(60);

        assert_eq!(*marks.lock().unwrap(), [save_memory(&mut game.core)]);
    }

    #[test]
    fn leaves_a_save_written_with_every_code_off_unmarked() {
        let _lock = lock_core();
        let mut game = playing(boot_counting_rom());
        let marks = recorded_marks(&mut game);
        game.set_cheats(&[code(WRITE_AB_TO_C100, false)]);

        game.apply(&pattern(0x8000, 7)).unwrap();
        game.play(60);

        assert!(!game.can_undo(), "the game didn't save");
        assert!(marks.lock().unwrap().is_empty());
    }

    fn recorded_edits(game: &mut Game) -> Arc<std::sync::atomic::AtomicUsize> {
        let edits = Arc::new(std::sync::atomic::AtomicUsize::new(0));
        let counted = edits.clone();
        game.mark_edited = Box::new(move || {
            counted.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
        });
        edits
    }

    #[test]
    fn marks_the_save_edited_on_an_edit_and_its_undo() {
        let _lock = lock_core();
        let mut game = playing(counting_rom());
        let edits = recorded_edits(&mut game);

        game.apply(&pattern(0x8000, 7)).unwrap();
        assert_eq!(edits.load(std::sync::atomic::Ordering::SeqCst), 1);
        game.undo().unwrap();

        assert_eq!(edits.load(std::sync::atomic::Ordering::SeqCst), 2);
    }

    #[test]
    fn marks_a_save_the_game_writes_with_codes_on_as_edited() {
        let _lock = lock_core();
        let mut game = playing(boot_counting_rom());
        game.set_cheats(&[code(WRITE_AB_TO_C100, true)]);
        game.apply(&pattern(0x8000, 7)).unwrap();
        let edits = recorded_edits(&mut game);

        game.play(60);

        assert_eq!(edits.load(std::sync::atomic::Ordering::SeqCst), 1);
    }

    fn in_hardcore(name: &str) -> Game {
        let fake = achievements::tests::FakeRetroAchievements::start();
        let (achievements, _, _) = achievements::tests::signed_in(&fake, name);
        let rom = counting_rom();
        let mut session = achievements.identify(&rom).unwrap().in_hardcore(true).start();
        let mut core = start_rom(rom, &pattern(0x8030, 1));
        achievements::tests::until_loaded(&mut core, &mut session);
        let mut game = game(core, save::Watch::new());
        game.achievements = Some(session);
        game.held_cheats = Some(Vec::new());
        game
    }

    fn hardcore(game: &Game) -> bool {
        game.achievements.as_ref().unwrap().hardcore()
    }

    #[test]
    fn a_hardcore_session_holds_its_codes_until_it_drops_to_softcore() {
        let _lock = lock_core();
        let mut game = in_hardcore("emu-hardcore-codes");
        let before = work_ram(&mut game, 0xC100);

        game.set_cheats(&[code(WRITE_AB_TO_C100, true)]);
        game.play(1);
        assert_eq!(work_ram(&mut game, 0xC100), before);
        assert!(hardcore(&game));

        game.leave_hardcore();
        game.play(1);

        assert_eq!(work_ram(&mut game, 0xC100), 0xAB);
        assert!(!hardcore(&game));
    }

    #[test]
    fn an_edit_drops_a_hardcore_session_to_softcore() {
        let _lock = lock_core();
        let mut game = in_hardcore("emu-hardcore-edit");

        game.apply(&pattern(0x8000, 7)).unwrap();

        assert!(!hardcore(&game));
    }

    #[test]
    fn passes_the_cores_messages_on() {
        let _lock = lock_core();
        let (index, _) = temp_index("emu-messages");
        let (sender, messages) = mpsc::channel();
        let sender = std::sync::Mutex::new(sender);
        let emu = Emu::start(
            std::env::temp_dir(),
            index,
            Arc::default(),
            Box::new(|_, _| {}),
            Box::new(move |message| sender.lock().unwrap().send(message).unwrap()),
        );
        retro::take_messages();

        retro::send_message(c"Cheat #0 isn't valid", 3000, 0, 0);
        emu.run_frames(0);

        let message = messages.recv_timeout(Duration::from_secs(1)).unwrap();
        assert_eq!(message, retro::Message { text: "Cheat #0 isn't valid".into(), duration_ms: 3000 });
    }

    const PLAYING: Pacing = Pacing { paused: false, speed: 1, steady: false, blend: false };

    struct FakeDisplay {
        refresh: Arc<std::sync::Mutex<Option<OnRefresh>>>,
        starts: Arc<std::sync::atomic::AtomicU32>,
        packets: Arc<std::sync::Mutex<Vec<Vec<u8>>>>,
        native_failures: Arc<std::sync::atomic::AtomicU32>,
        start: Instant,
        refreshes: u32,
    }

    impl FakeDisplay {
        // One at a time, as the loop takes refreshes that come together as one.
        fn refreshes(&mut self, emu: &Emu, count: u32) {
            for _ in 0..count {
                self.refreshes += 1;
                let on_refresh = self.refresh.lock().unwrap().clone().expect("the display is on");
                on_refresh(self.start + Duration::from_secs_f64(self.refreshes as f64 / 60.0));
                emu.run_frames(0);
            }
        }

        fn starts(&self) -> u32 {
            self.starts.load(std::sync::atomic::Ordering::Relaxed)
        }

        fn frames_played(&self) -> Vec<u32> {
            let packets = self.packets.lock().unwrap();
            packets.iter().map(|packet| u32::from_le_bytes(packet[0..4].try_into().unwrap())).collect()
        }
    }

    fn on_a_fake_display(name: &str) -> (Emu, FakeDisplay) {
        on_a_fake_display_with(name, Box::new(|| None), false)
    }

    fn on_a_fake_display_with(name: &str, screen: MakeScreen, native: bool) -> (Emu, FakeDisplay) {
        let (index, _) = temp_index(name);
        let refresh: Arc<std::sync::Mutex<Option<OnRefresh>>> = Arc::default();
        let starts: Arc<std::sync::atomic::AtomicU32> = Arc::default();
        let display: Display = {
            let (refresh, starts) = (refresh.clone(), starts.clone());
            Box::new(move |on_refresh| {
                starts.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
                *refresh.lock().unwrap() = Some(on_refresh);
                Ticker::idle()
            })
        };
        let emu = Emu::start_on(
            display,
            screen,
            std::env::temp_dir(),
            index,
            Arc::default(),
            Box::new(|_, _| {}),
            Box::new(|_| {}),
        );
        let packets: Arc<std::sync::Mutex<Vec<Vec<u8>>>> = Arc::default();
        let sent = packets.clone();
        let native_failures: Arc<std::sync::atomic::AtomicU32> = Arc::default();
        let failed = native_failures.clone();
        emu.play_showing(
            "gb/Red.gb",
            Channel::new(move |body| {
                if let InvokeResponseBody::Raw(packet) = body {
                    sent.lock().unwrap().push(packet);
                }
                Ok(())
            }),
            native,
            Channel::new(move |_| {
                failed.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
                Ok(())
            }),
        );
        let fake = FakeDisplay { refresh, starts, packets, native_failures, start: Instant::now(), refreshes: 0 };
        (emu, fake)
    }

    #[test]
    fn holds_the_game_until_its_screen_paces_it() {
        let _lock = lock_core();
        let (emu, display) = on_a_fake_display("emu-held");

        emu.run_frames(0);

        assert_eq!(display.starts(), 0);
        emu.stop();
    }

    #[test]
    fn runs_and_sends_a_frame_on_each_refresh_of_the_display() {
        let _lock = lock_core();
        let (emu, mut display) = on_a_fake_display("emu-refresh");
        emu.send(Command::Pace(PLAYING));
        emu.run_frames(0);

        display.refreshes(&emu, 3);

        assert_eq!(display.frames_played(), [1, 2, 3]);
        emu.stop();
    }

    #[test]
    fn runs_the_fast_forward_speed_in_frames_each_refresh() {
        let _lock = lock_core();
        let (emu, mut display) = on_a_fake_display("emu-fast-forward");
        emu.send(Command::Pace(Pacing { speed: 4, ..PLAYING }));
        emu.run_frames(0);

        display.refreshes(&emu, 2);

        assert_eq!(display.frames_played(), [4, 8]);
        emu.stop();
    }

    #[test]
    fn stops_following_the_display_while_paused() {
        let _lock = lock_core();
        let (emu, mut display) = on_a_fake_display("emu-paced-pause");
        emu.send(Command::Pace(PLAYING));
        emu.run_frames(0);

        emu.send(Command::Pace(Pacing { paused: true, ..PLAYING }));
        display.refreshes(&emu, 2);
        assert_eq!(display.frames_played(), Vec::<u32>::new());

        emu.send(Command::Pace(PLAYING));
        emu.run_frames(0);
        assert_eq!(display.starts(), 2);
        emu.stop();
    }

    #[test]
    fn steps_frames_while_paused() {
        let _lock = lock_core();
        let (emu, display) = on_a_fake_display("emu-step");

        emu.run_frames(2);

        assert_eq!(display.frames_played(), [2]);
        emu.stop();
    }

    #[test]
    fn packs_a_frame_behind_a_16_byte_header() {
        let packet = frame_packet(7, pace::Counts { skipped: 3, repeated: 5 }, (2, 1), &[0xF800, 0x001F]);

        assert_eq!(&packet[0..4], &7u32.to_le_bytes());
        assert_eq!(&packet[4..6], &2u16.to_le_bytes());
        assert_eq!(&packet[6..8], &1u16.to_le_bytes());
        assert_eq!(&packet[8..12], &3u32.to_le_bytes());
        assert_eq!(&packet[12..16], &5u32.to_le_bytes());
        assert_eq!(&packet[16..], &[0x00, 0xF8, 0x1F, 0x00]);
    }

    #[derive(Default)]
    struct ScreenLog {
        shown: Vec<(u32, u32)>,
        redraws: u32,
        layouts: u32,
        cleared: u32,
        failing: bool,
        windowless: bool,
    }

    struct FakeScreen(Arc<std::sync::Mutex<ScreenLog>>);

    impl Screen for FakeScreen {
        fn has_window(&self) -> bool {
            !self.0.lock().unwrap().windowless
        }

        fn show(&mut self, picture: Picture) -> Result<(), String> {
            let mut log = self.0.lock().unwrap();
            log.shown.push(picture.size());
            if log.failing {
                return Err("lost".into());
            }
            Ok(())
        }

        fn redraw(&mut self) -> Result<(), String> {
            self.0.lock().unwrap().redraws += 1;
            Ok(())
        }

        fn lay_out(&mut self, _layout: Layout) {
            self.0.lock().unwrap().layouts += 1;
        }

        fn lean(&mut self, _parallax: Vec<screen::Parallax>) {}

        fn window(&mut self, _change: WindowChange) -> Result<(), String> {
            Ok(())
        }

        fn clear(&mut self) {
            self.0.lock().unwrap().cleared += 1;
        }
    }

    fn on_a_native_screen(name: &str) -> (Emu, FakeDisplay, Arc<std::sync::Mutex<ScreenLog>>) {
        on_a_native_screen_asked(name, true)
    }

    fn on_a_native_screen_asked(name: &str, native: bool) -> (Emu, FakeDisplay, Arc<std::sync::Mutex<ScreenLog>>) {
        let log: Arc<std::sync::Mutex<ScreenLog>> = Arc::default();
        let screen = log.clone();
        let fake_screen: MakeScreen = Box::new(move || Some(Box::new(FakeScreen(screen)) as Box<dyn Screen>));
        let (emu, display) = on_a_fake_display_with(name, fake_screen, native);
        (emu, display, log)
    }

    fn layout() -> Layout {
        serde_json::from_str(
            r#"{"page":[0,0,0],"area":{"x":0,"y":0,"width":1,"height":1},"areaColor":[0,0,0],
                "canvas":{"x":0,"y":0},"border":0,"views":[],"look":null}"#,
        )
        .unwrap()
    }

    impl FakeDisplay {
        fn packet_sizes(&self) -> Vec<usize> {
            self.packets.lock().unwrap().iter().map(Vec::len).collect()
        }

        fn native_failures(&self) -> u32 {
            self.native_failures.load(std::sync::atomic::Ordering::Relaxed)
        }
    }

    #[test]
    fn sends_frames_without_pixels_when_the_native_screen_draws_them() {
        let _lock = lock_core();
        let (emu, mut display, log) = on_a_native_screen("emu-native");
        emu.send(Command::Pace(PLAYING));
        emu.run_frames(0);

        display.refreshes(&emu, 2);

        assert_eq!(log.lock().unwrap().shown, [(160, 144), (160, 144)]);
        assert_eq!(display.packet_sizes(), [16, 16]);
        emu.stop();
    }

    #[test]
    fn sends_frames_with_pixels_once_the_native_screen_fails() {
        let _lock = lock_core();
        let (emu, mut display, log) = on_a_native_screen("emu-native-fails");
        log.lock().unwrap().failing = true;
        emu.send(Command::Pace(PLAYING));
        emu.run_frames(0);

        display.refreshes(&emu, 2);

        assert_eq!(log.lock().unwrap().shown.len(), 1);
        assert_eq!(display.packet_sizes(), [16 + 160 * 144 * 2, 16 + 160 * 144 * 2]);
        emu.stop();
    }

    #[test]
    fn says_when_the_native_screen_fails() {
        let _lock = lock_core();
        let (emu, mut display, log) = on_a_native_screen("emu-native-fails-told");
        log.lock().unwrap().failing = true;
        emu.send(Command::Pace(PLAYING));
        emu.run_frames(0);

        display.refreshes(&emu, 2);

        assert_eq!(display.native_failures(), 1);
        emu.stop();
    }

    #[test]
    fn says_native_failed_when_asked_for_with_no_native_screen() {
        let _lock = lock_core();
        let (emu, display) = on_a_fake_display_with("emu-native-missing", Box::new(|| None), true);

        emu.run_frames(0);

        assert_eq!(display.native_failures(), 1);
        emu.stop();
    }

    #[test]
    fn draws_in_the_webview_when_the_player_picks_compatible() {
        let _lock = lock_core();
        let (emu, mut display, log) = on_a_native_screen_asked("emu-native-compatible", false);
        emu.send(Command::Pace(PLAYING));
        emu.run_frames(0);

        display.refreshes(&emu, 1);

        assert_eq!(log.lock().unwrap().shown.len(), 0);
        assert_eq!(display.packet_sizes(), [16 + 160 * 144 * 2]);
        assert_eq!(display.native_failures(), 0);
        emu.stop();
    }

    #[test]
    fn sends_frames_with_pixels_while_the_native_screen_has_no_window() {
        let _lock = lock_core();
        let (emu, mut display, log) = on_a_native_screen("emu-native-windowless");
        log.lock().unwrap().windowless = true;
        emu.send(Command::Pace(PLAYING));
        emu.run_frames(0);

        display.refreshes(&emu, 1);

        assert_eq!(log.lock().unwrap().shown.len(), 0);
        assert_eq!(display.packet_sizes(), [16 + 160 * 144 * 2]);
        emu.stop();
    }

    #[test]
    fn redraws_a_paused_game_when_the_layout_changes() {
        let _lock = lock_core();
        let (emu, _display, log) = on_a_native_screen("emu-native-layout");
        emu.run_frames(1);

        emu.send(Command::Screen(layout()));
        emu.run_frames(0);

        let drawn = log.lock().map(|log| (log.layouts, log.redraws)).unwrap();
        assert_eq!(drawn, (1, 1));
        emu.stop();
    }

    #[test]
    fn leaves_a_running_game_to_redraw_on_its_next_frame() {
        let _lock = lock_core();
        let (emu, _display, log) = on_a_native_screen("emu-native-running");
        emu.send(Command::Pace(PLAYING));

        emu.send(Command::Screen(layout()));
        emu.run_frames(0);

        let drawn = log.lock().map(|log| (log.layouts, log.redraws)).unwrap();
        assert_eq!(drawn, (1, 0));
        emu.stop();
    }

    #[test]
    fn forgets_the_last_frame_when_the_game_stops() {
        let _lock = lock_core();
        let (emu, _display, log) = on_a_native_screen("emu-native-stop");
        emu.run_frames(1);

        emu.stop();

        assert!(log.lock().unwrap().cleared >= 1);
    }
}
