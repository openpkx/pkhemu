use crate::audio::Audio;
use crate::backups::Reason;
use crate::cheats::{self, Code, Platform};
use crate::clock::Clock;
use crate::edit;
use crate::index::{self, Index, Session};
use crate::memory::Range;
use crate::pace::DisplayRate;
use crate::resume::{self, Resume};
use crate::retro::{self, Core, Frame};
use crate::rom::{Rom, StateName};
use crate::save;
use crate::states::{self, Loaded, Saved};
use crate::sync::InUse;
use crate::transfer_pak::{self, Cart};
use crate::writer::{StateChange, Write};
use std::path::{Path, PathBuf};
use std::sync::{mpsc, Arc};
use std::time::{Instant, SystemTime, UNIX_EPOCH};
use tauri::async_runtime::JoinHandle;
use tauri::ipc::{Channel, InvokeResponseBody};
use tokio::sync::{mpsc as tokio_mpsc, oneshot, watch};

const NO_GAME: &str = "no game is running";
const NO_SAVE_YET: &str = "no-save-yet";

pub type BackUp = Box<dyn FnMut(Reason, &[u8]) -> Result<(), String> + Send>;
pub type OnGame = Box<dyn Fn(Option<&str>) + Send>;
pub type OnMessage = Box<dyn Fn(retro::Message) + Send>;
pub type MarkCheats = Box<dyn FnMut(&[u8]) + Send>;

pub enum Command {
    Play {
        folder: String,
        path: String,
        rom: Rom,
        save: Option<Vec<u8>>,
        state: Option<Vec<u8>>,
        slot: Option<u8>,
        clock: Clock,
        cheats: Vec<Code>,
        cart: Option<Cart>,
        writes: tokio_mpsc::UnboundedSender<Write>,
        back_up: BackUp,
        mark_cheats: MarkCheats,
        writer: JoinHandle<()>,
        on_frame: Channel<InvokeResponseBody>,
        reply: oneshot::Sender<Result<f64, String>>,
    },
    SetCheats {
        path: String,
        codes: Vec<Code>,
        done: oneshot::Sender<()>,
    },
    RunFrames {
        count: u32,
        fast_forward: bool,
        blend: bool,
        input: u16,
        analog: [i16; 4],
        pointer: Option<[i16; 2]>,
        done: oneshot::Sender<()>,
    },
    PlayTimeSinceSave {
        reply: oneshot::Sender<Option<f64>>,
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
    Suspend,
    #[cfg_attr(desktop, allow(dead_code))]
    Pause {
        reply: oneshot::Sender<Option<Playing>>,
    },
    #[cfg_attr(desktop, allow(dead_code))]
    Resume,
    Stop {
        done: oneshot::Sender<(ResumeWrites, Option<Playing>)>,
    },
}

impl Command {
    // Reads and frames leave a paused game lent to sync. Anything that writes its files waits to take it back.
    fn takes_back(&self) -> bool {
        !matches!(
            self,
            Command::RunFrames { .. }
                | Command::PlayTimeSinceSave { .. }
                | Command::ReadSave { .. }
                | Command::ReadMemory { .. }
                | Command::CanUndoEdit { .. }
                | Command::CurrentSlot { .. }
                | Command::ForgetSlot { .. }
                | Command::Suspend
                | Command::Pause { .. }
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

pub struct Emu {
    tx: mpsc::Sender<Command>,
}

impl Emu {
    pub fn start(
        system_dir: PathBuf,
        index: Arc<Index>,
        in_use: Arc<InUse>,
        on_game: OnGame,
        on_message: OnMessage,
    ) -> Emu {
        let (tx, rx) = mpsc::channel();
        std::thread::Builder::new()
            .name("emu".into())
            .spawn(move || run(rx, system_dir, index, in_use, on_game, on_message))
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
    core: Core,
    clock: Clock,
    audio: Option<Audio>,
    on_frame: Channel<InvokeResponseBody>,
    seq: u32,
    watch: save::Watch,
    writes: tokio_mpsc::UnboundedSender<Write>,
    back_up: BackUp,
    cheats: Vec<String>,
    mark_cheats: MarkCheats,
    writer: JoinHandle<()>,
    undo: Option<edit::Undo>,
    slot: Option<u8>,
    session: Option<Session>,
    frames: u64,
    paused: bool,
    // Dropped after the core, whose last frame can still open the session's files.
    transfer_pak: Option<transfer_pak::Session>,
}

impl Game {
    fn run_frame(&mut self) {
        self.core.run_frame();
        self.frames += 1;
        let core = &mut self.core;
        let changed = self.watch.after_frame(|| {
            let [save_ram, rtc] = core.save_memory();
            [&*save_ram, &*rtc]
        });
        if let Some(file) = changed {
            self.saved(file);
        }
        if self.watch.due() {
            self.check_cart();
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
        }
        self.write(Write::Save(file));
    }

    fn set_cheats(&mut self, codes: &[Code]) {
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

    fn apply(&mut self, edited: &[u8]) -> Result<(), String> {
        let back_up = &mut self.back_up;
        let (undo, file) = edit::apply(&mut self.core, &mut self.watch, edited, |save| back_up(Reason::Edit, save))?;
        self.undo = Some(undo);
        self.write(Write::Save(file));
        Ok(())
    }

    fn undo(&mut self) -> Result<(), String> {
        let undo = self.undo.take().ok_or("there's no edit to undo")?;
        let file = edit::undo(&mut self.core, &mut self.watch, undo)?;
        self.write(Write::Save(file));
        Ok(())
    }

    fn moment(&mut self) -> Result<Saved, String> {
        self.check_save();
        let state = self.core.serialize().ok_or("the core couldn't save its state")?;
        let [save_ram, rtc] = self.core.save_memory();
        let save = [&*save_ram, &*rtc].concat();
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
        let mut before = self.moment()?;
        before.info.slot = self.slot;
        let fps = self.core.av().timing.fps;
        let frames_since_save = loaded.info.play_since_save.map(|seconds| (seconds * fps).round() as u64);
        let back_up = &mut self.back_up;
        let file = states::load(&mut self.core, &self.clock, &mut self.watch, loaded, frames_since_save, &before, |save| {
            back_up(Reason::Load, save)
        })?;
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

    fn forget_slot(&mut self, slot: u8) {
        if self.slot == Some(slot) {
            self.slot = None;
        }
    }

    fn check_save(&mut self) {
        let [save_ram, rtc] = self.core.save_memory();
        if let Some(file) = self.watch.check([save_ram, rtc]) {
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
        if let Some(session) = &self.session {
            if let Err(e) = session.record(self.frames, index::now()) {
                eprintln!("recording play time: {e}");
            }
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
        let (removed, _) = oneshot::channel();
        self.write(Write::State(StateChange::Remove { name: StateName::BeforeLoad, removed }));
        self.writer
    }
}

fn run(
    rx: mpsc::Receiver<Command>,
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

    while let Ok(command) = rx.recv() {
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
                save,
                state,
                slot,
                clock,
                cheats,
                cart,
                writes,
                back_up,
                mark_cheats,
                writer,
                on_frame,
                reply,
            } => {
                quit_running(&mut game, &mut last_quit);
                let platform = Platform::of_rom(&rom);
                let loaded =
                    cart.map(|cart| transfer_pak::Session::start(cart, &rom)).transpose().and_then(|session| {
                        let files = session.as_ref().map(transfer_pak::Session::files);
                        load(rom, save, state, &clock, &system_dir, files).map(|(core, watch)| (core, watch, session))
                    });
                on_game(loaded.as_ref().ok().map(|_| path.as_str()));
                let _ = reply.send(loaded.map(|(mut core, watch, transfer_pak)| {
                    let cheats = cheats::on_codes(platform, &cheats);
                    if !cheats.is_empty() {
                        core.set_cheats(&cheats);
                    }
                    let fps = core.av().timing.fps;
                    let audio = Audio::open(core.av().timing.sample_rate)
                        .inspect_err(|e| eprintln!("audio: {e}"))
                        .ok();
                    let session = index
                        .start_session(&path, fps, index::now())
                        .inspect_err(|e| eprintln!("recording play time: {e}"))
                        .ok();
                    game = Some(Game {
                        folder,
                        path,
                        platform,
                        core,
                        clock,
                        audio,
                        on_frame,
                        seq: 0,
                        watch,
                        writes,
                        back_up,
                        cheats,
                        mark_cheats,
                        writer,
                        undo: None,
                        slot,
                        session,
                        frames: 0,
                        paused: false,
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
            Command::RunFrames { count, fast_forward, blend, input, analog, pointer, done } => {
                if let Some(game) = game.as_mut().filter(|game| !game.paused) {
                    if fast_forward {
                        game.core.blend(blend);
                    }
                    retro::set_input(input);
                    retro::set_analog(analog);
                    retro::set_pointer(pointer);
                    let fps = game.core.av().timing.fps;
                    for _ in 0..count {
                        if !fast_forward {
                            rate.tick(Instant::now());
                        }
                        game.run_frame();
                        game.core.drain_audio(&mut samples);
                        if let Some(audio) = &mut game.audio {
                            if fast_forward {
                                audio.fill_with_silence();
                            } else {
                                audio.push(&samples, rate.speed(fps));
                            }
                        }
                        samples.clear();
                    }
                    if let Some(packet) = game.core.take_frame(|frame| frame_packet(game.seq, frame, epoch_ms())) {
                        game.seq = game.seq.wrapping_add(1);
                        let _ = game.on_frame.send(InvokeResponseBody::Raw(packet));
                    }
                }
                let _ = done.send(());
            }
            Command::PlayTimeSinceSave { reply } => {
                let _ = reply.send(
                    game.as_ref().map(Game::play_time_since_save),
                );
            }
            Command::ReadSave { reply } => {
                let _ = reply.send(running(&mut game)
                    .and_then(|game| edit::read(&mut game.core).ok_or_else(|| NO_SAVE_YET.into())));
            }
            Command::ReadMemory { ranges, reply } => {
                let _ = reply.send(running(&mut game).and_then(|game| game.core.read_memory(&ranges)));
            }
            Command::ApplyEdit { edited, reply } => {
                let _ = reply.send(running(&mut game).and_then(|game| game.apply(&edited)));
            }
            Command::UndoEdit { reply } => {
                let _ = reply.send(running(&mut game).and_then(Game::undo));
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
                let _ = reply.send(running(&mut game).and_then(|game| game.load_state(Some(slot), &loaded, Some(kept))));
            }
            Command::UndoLoadState { loaded, removed, reply } => {
                let _ = reply.send(running(&mut game).and_then(|game| game.undo_load_state(&loaded, removed)));
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
            Command::Stop { done } => {
                let stopped = game.as_ref().map(Game::playing);
                quit_running(&mut game, &mut last_quit);
                on_game(None);
                let _ = done.send((last_quit.clone(), stopped));
            }
        }
        for message in retro::take_messages() {
            on_message(message);
        }
    }
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

fn quit_running(game: &mut Option<Game>, last_quit: &mut ResumeWrites) {
    if let Some(game) = game.take() {
        *last_quit = ResumeWrites::after(game.quit());
    }
}

fn running(game: &mut Option<Game>) -> Result<&mut Game, String> {
    game.as_mut().ok_or_else(|| NO_GAME.into())
}

fn epoch_ms() -> f64 {
    SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs_f64() * 1000.0
}

fn frame_packet(seq: u32, frame: &Frame, emitted_at: f64) -> Vec<u8> {
    let mut packet = Vec::with_capacity(16 + frame.pixels.len() * 2);
    packet.extend_from_slice(&seq.to_le_bytes());
    packet.extend_from_slice(&(frame.width as u16).to_le_bytes());
    packet.extend_from_slice(&(frame.height as u16).to_le_bytes());
    packet.extend_from_slice(&emitted_at.to_le_bytes());
    for pixel in &frame.pixels {
        packet.extend_from_slice(&pixel.to_le_bytes());
    }
    packet
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::games_folder::GamesFolder;
    use crate::index::{temp_index, PlayHistory};
    use crate::clock;
    use crate::test_games::{
        boot_counting_rom, clock_rom, clock_save, counting_rom, days_on_the_clock, heartgold, lock_core, pattern,
        stadium,
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
            core,
            audio: None,
            on_frame: Channel::new(|_| Ok(())),
            seq: 0,
            watch,
            clock: real_time(),
            writes,
            back_up: Box::new(|_, _| Ok(())),
            cheats: Vec::new(),
            mark_cheats: Box::new(|_| {}),
            writer: tauri::async_runtime::spawn(async {}),
            undo: None,
            slot: None,
            session: None,
            frames: 0,
            paused: false,
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

    fn quit(game: Game) {
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
            self.play_with(String::new(), path, counting_rom(), writes, writer)
        }

        pub(crate) fn play_into(&self, root: &Path) {
            let (writes, queued) = tokio_mpsc::unbounded_channel();
            let folder = GamesFolder::<tauri::Wry>::at(root.to_path_buf());
            let writer = tauri::async_runtime::spawn(async move {
                let (slot, _) = save::open(&folder, "gb/Game.gb").await.unwrap();
                writer::write_all(&folder, "gb/Game.gb", &slot, queued).await
            });
            self.play_with(root.display().to_string(), "gb/Game.gb", boot_counting_rom(), writes, writer);
        }

        fn play_with(
            &self,
            folder: String,
            path: &str,
            rom: Rom,
            writes: tokio_mpsc::UnboundedSender<Write>,
            writer: JoinHandle<()>,
        ) -> f64 {
            let (reply, result) = oneshot::channel();
            self.send(Command::Play {
                folder,
                path: path.into(),
                rom,
                save: None,
                state: None,
                slot: None,
                clock: real_time(),
                cheats: Vec::new(),
                cart: None,
                writes,
                back_up: Box::new(|_, _| Ok(())),
                mark_cheats: Box::new(|_| {}),
                writer,
                on_frame: Channel::new(|_| Ok(())),
                reply,
            });
            block_on(result).unwrap().unwrap()
        }

        pub(crate) fn run_frames(&self, count: u32) {
            let (done, finished) = oneshot::channel();
            self.send(Command::RunFrames {
                count,
                fast_forward: false,
                blend: false,
                input: 0,
                analog: [0; 4],
                pointer: None,
                done,
            });
            block_on(finished).unwrap();
        }

        pub(crate) fn stop(&self) {
            self.stopping().recv().unwrap();
        }

        pub(crate) fn pause(&self) -> Option<Playing> {
            let (reply, paused) = oneshot::channel();
            self.send(Command::Pause { reply });
            block_on(paused).unwrap()
        }

        fn running_frames(&self, count: u32) -> oneshot::Receiver<()> {
            let (done, finished) = oneshot::channel();
            self.send(Command::RunFrames {
                count,
                fast_forward: false,
                blend: false,
                input: 0,
                analog: [0; 4],
                pointer: None,
                done,
            });
            finished
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
            Box::new(move |path| playing.playing(path)),
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
        let again = Rom { name: rom.name.clone(), bytes: rom.bytes.clone() };
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
        let cart = Cart { dir, rom: gb_rom, save: None, slot, back_up: Box::new(|_, _| Ok(())) };
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
        let again = Rom { name: stadium.name.clone(), bytes: stadium.bytes.clone() };
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
    fn pausing_with_no_game_running_lends_nothing() {
        let (index, _) = temp_index("emu-pause-idle");
        let emu = Emu::start(std::env::temp_dir(), index, Arc::default(), Box::new(|_| {}), Box::new(|_| {}));

        assert_eq!(emu.pause(), None);
    }

    #[test]
    fn records_a_session_from_start_to_quit() {
        let _lock = lock_core();
        let (index, _) = temp_index("emu-quit");
        let emu = Emu::start(std::env::temp_dir(), index.clone(), Arc::default(), Box::new(|_| {}), Box::new(|_| {}));

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
        let emu = Emu::start(std::env::temp_dir(), index.clone(), Arc::default(), Box::new(|_| {}), Box::new(|_| {}));

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
        let emu = Emu::start(std::env::temp_dir(), index.clone(), Arc::default(), Box::new(|_| {}), Box::new(|_| {}));

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
        let emu = Emu::start(std::env::temp_dir(), index, Arc::default(), Box::new(|_| {}), Box::new(|_| {}));
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
        let emu = Emu::start(std::env::temp_dir(), index, Arc::default(), Box::new(|_| {}), Box::new(|_| {}));

        assert!(emu.stopping().recv_timeout(Duration::from_secs(1)).is_ok());
    }

    #[test]
    fn reads_the_same_memory_until_more_frames_run() {
        let _lock = lock_core();
        let (index, _) = temp_index("emu-read-memory");
        let emu = Emu::start(std::env::temp_dir(), index, Arc::default(), Box::new(|_| {}), Box::new(|_| {}));
        emu.play("gb/Red.gb");
        emu.run_frames(1);

        let first = emu.read_memory(0xC000, 1).unwrap();
        assert_eq!(emu.read_memory(0xC000, 1).unwrap(), first);
        emu.run_frames(1);
        assert_ne!(emu.read_memory(0xC000, 1).unwrap(), first);
        emu.stop();
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
            Box::new(move |path| sender.lock().unwrap().send(path.map(String::from)).unwrap()),
            Box::new(|_| {}),
        );

        emu.play("gb/Red.gb");
        emu.stop();

        assert_eq!(games.try_iter().collect::<Vec<_>>(), [Some("gb/Red.gb".into()), None]);
    }

    #[test]
    fn reading_memory_with_no_game_running_fails() {
        let (index, _) = temp_index("emu-read-memory-idle");
        let emu = Emu::start(std::env::temp_dir(), index, Arc::default(), Box::new(|_| {}), Box::new(|_| {}));

        assert_eq!(emu.read_memory(0xC000, 1), Err(NO_GAME.into()));
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
        let (game, states) = writing_to("resume-core", start_rom(counting_rom(), &pattern(0x8030, 1)), save::Watch::new());

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
        let (game, states) = writing_to("no-slot", start_rom(counting_rom(), &pattern(0x8030, 1)), save::Watch::new());

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
        let emu = Emu::start(std::env::temp_dir(), index, Arc::default(), Box::new(|_| {}), Box::new(|_| {}));
        let (writes, _) = tokio_mpsc::unbounded_channel();
        let (reply, result) = oneshot::channel();
        emu.send(Command::Play {
            folder: String::new(),
            path: "gb/Red.gb".into(),
            rom: counting_rom(),
            save: None,
            state: None,
            slot: None,
            clock: real_time(),
            cheats: vec![code(WRITE_AB_TO_C100, true)],
            cart: None,
            writes,
            back_up: Box::new(|_, _| Ok(())),
            mark_cheats: Box::new(|_| {}),
            writer: tauri::async_runtime::spawn(async {}),
            on_frame: Channel::new(|_| Ok(())),
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
        let emu = Emu::start(std::env::temp_dir(), index, Arc::default(), Box::new(|_| {}), Box::new(|_| {}));
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
            Box::new(|_| {}),
            Box::new(move |message| sender.lock().unwrap().send(message).unwrap()),
        );
        retro::take_messages();

        retro::send_message(c"Cheat #0 isn't valid", 3000, 0, 0);
        emu.run_frames(0);

        let message = messages.recv_timeout(Duration::from_secs(1)).unwrap();
        assert_eq!(message, retro::Message { text: "Cheat #0 isn't valid".into(), duration_ms: 3000 });
    }

    #[test]
    fn packs_a_frame_behind_a_16_byte_header() {
        let frame = Frame {
            width: 2,
            height: 1,
            pixels: vec![0xF800, 0x001F],
            fresh: true,
        };

        let packet = frame_packet(7, &frame, 1234.5);

        assert_eq!(&packet[0..4], &7u32.to_le_bytes());
        assert_eq!(&packet[4..6], &2u16.to_le_bytes());
        assert_eq!(&packet[6..8], &1u16.to_le_bytes());
        assert_eq!(&packet[8..16], &1234.5f64.to_le_bytes());
        assert_eq!(&packet[16..], &[0x00, 0xF8, 0x1F, 0x00]);
    }
}
