mod achievements;
mod app_update;
mod audio;
mod backups;
mod box_art;
mod cheats;
mod clock;
mod edit;
mod edited;
mod emu;
mod entitlements;
mod export;
mod files;
mod frame_time;
mod game_art;
mod game_cube;
mod games_folder;
mod gl;
mod import;
mod index;
mod keep_alive;
mod kept_copies;
mod memory;
mod pace;
#[cfg(any(sideload, test))]
mod pairing_file;
mod patch;
mod patching;
#[cfg_attr(target_os = "android", path = "platform/android.rs")]
#[cfg_attr(target_os = "ios", path = "platform/ios.rs")]
#[cfg_attr(desktop, path = "platform/desktop.rs")]
mod platform;
mod plus;
mod pokemon_file;
mod resample;
mod resume;
mod retro;
mod rom;
mod save;
mod screen;
mod skins;
mod states;
mod sync;
mod system_bars;
#[cfg(test)]
mod test_games;
mod three_ds;
mod transfer_pak;
mod vulkan;
mod writer;

use backups::Reason;
use clock::Clock;
use emu::{Command, Emu, Pacing, Playing};
use games_folder::GamesFolder;
use index::Index;
use memory::Range;
use rom::StateName;
use game_art::GameArt;
use serde::{Deserialize, Serialize};
use std::io::Seek;
use std::sync::Arc;
use tauri::ipc::{Channel, InvokeBody, InvokeResponseBody, Request, Response};
use tauri::{AppHandle, Emitter, Manager, Runtime, State};
use tokio::sync::{mpsc, oneshot};

#[tauri::command]
async fn three_ds_renderer() -> &'static str {
    retro::three_ds_renderer()
}

#[tauri::command]
async fn play<R: Runtime>(
    app: AppHandle<R>,
    emu: State<'_, Emu>,
    index: State<'_, Arc<Index>>,
    folder: String,
    path: String,
    resume: bool,
    hardcore: bool,
    clock_offset: i64,
    async_shaders: bool,
    resolution: u32,
    on_frame: Channel<InvokeResponseBody>,
    on_step: Channel<String>,
    native: bool,
    on_native_failed: Channel<()>,
) -> Result<f64, String> {
    stop_game(&emu).await?;
    retro::set_async_shaders(async_shaders);
    retro::set_resolution(resolution);
    let in_use = app.state::<sync::Syncer>().in_use.clone();
    let cart = transfer_pak::cart(&GamesFolder::open(&app, &folder), &path)
        .await
        .inspect_err(|e| eprintln!("the Transfer Pak: {e}"))
        .ok()
        .flatten();
    in_use.start_playing(&path, cart.as_deref()).await;
    let started = start_game(
        app,
        emu,
        index,
        folder,
        path,
        cart,
        resume,
        hardcore,
        clock_offset,
        on_frame,
        on_step,
        native,
        on_native_failed,
    )
    .await;
    if started.is_err() {
        in_use.playing(None, None);
    }
    started
}

async fn start_game<R: Runtime>(
    app: AppHandle<R>,
    emu: State<'_, Emu>,
    index: State<'_, Arc<Index>>,
    folder: String,
    path: String,
    cart: Option<String>,
    resume: bool,
    hardcore: bool,
    clock_offset: i64,
    on_frame: Channel<InvokeResponseBody>,
    on_step: Channel<String>,
    native: bool,
    on_native_failed: Channel<()>,
) -> Result<f64, String> {
    let games = GamesFolder::open(&app, &folder);
    let _ = on_step.send("rom".into());
    let rom = match retro::needs_path(cheats::Platform::of_path(&path)?.into())? {
        true => rom::Rom::at(&path, games.open_for_core(&path).await?),
        false => rom::unpack(&path, games.read(&path).await?)?,
    };
    let mut update = None;
    if let Some(file) = rom.file.as_ref().filter(|_| rom::is_3ds(&path)) {
        let mut open = &file.open;
        three_ds::title_id(&mut open).map_err(|refused| refused.message(&rom::game_name(&path)))?;
        open.rewind().map_err(|e| format!("{path}: {e}"))?;
        let update_path = three_ds::update::path(&path);
        if games.has_file(&update_path).await {
            update = Some(games.open_file(&update_path).await?);
        }
    }
    let clock = Clock::new(&rom, clock_offset);
    let cheats = cheats::read(&games, &path).await.unwrap_or_else(|e| {
        eprintln!("{e}");
        Vec::new()
    });
    let cheats_on = !cheats::on_codes(cheats::Platform::of_rom(&rom), &cheats).is_empty();
    let _ = on_step.send("save".into());
    let (slot, save) = save::open(&games, &path).await?;
    let running = retro::core_info_for(rom.system())?;
    let (state, state_slot, kept_in) =
        starting_point(&games, &path, resume, &running, &slot, save.as_deref().unwrap_or_default()).await?;
    let hardcore = hardcore && state.is_none();
    if let Err(e) = states::remove(&games, &path, StateName::BeforeLoad).await {
        eprintln!("{e}");
    }
    if let Some(save) = &save {
        let _ = on_step.send("backup".into());
        if let Err(e) = back_up_at_start(&games, &path, &slot, save, cheats_on && !hardcore).await {
            eprintln!("backing up {path}: {e}");
        }
    }
    let cart = match cart {
        Some(gb) => transfer_pak_cart(&app, &folder, gb).await.inspect_err(|e| eprintln!("the Transfer Pak: {e}")).ok(),
        None => None,
    };
    let mark_cheats = mark_cheats(index.inner().clone(), path.clone(), slot.clone());
    let back_up = {
        let (app, folder, path, slot) = (app.clone(), folder.clone(), path.clone(), slot.clone());
        move |reason: Reason, save: &[u8]| {
            let games = GamesFolder::open(&app, &folder);
            tauri::async_runtime::block_on(backups::take(&games, &path, &slot, reason, save, &backups::now(), None))
        }
    };

    let mark_edited = {
        let (app, folder, path) = (app.clone(), folder.clone(), path.clone());
        move || {
            let games = GamesFolder::open(&app, &folder);
            if let Err(e) = tauri::async_runtime::block_on(edited::mark(&games, &path)) {
                eprintln!("marking the save edited: {e}");
            }
        }
    };
    let achievements = app.state::<achievements::Achievements>().identify(&rom).map(|load| load.in_hardcore(hardcore));
    let notify = app.clone();
    let (writes, queued) = mpsc::unbounded_channel();
    let writer = {
        let (path, folder) = (path.clone(), folder.clone());
        tauri::async_runtime::spawn(async move {
            writer::write_all(&GamesFolder::open(&app, &folder), &path, &slot, queued).await;
        })
    };

    let (reply, result) = oneshot::channel();
    let _ = on_step.send("core".into());
    emu.send(Command::Play {
        folder,
        path,
        rom,
        update,
        save,
        state,
        slot: state_slot,
        clock,
        cheats,
        cart,
        writes,
        back_up: Box::new(back_up),
        mark_cheats,
        mark_edited: Box::new(mark_edited),
        writer,
        on_frame,
        native,
        on_native_failed,
        achievements,
        reply,
    });
    let fps = result.await.map_err(|e| e.to_string())??;
    if let Some(kept_in) = kept_in {
        let text = format!(
            "Your resume point is from a different version of pkhemu, so the game started from its last save. \
             The resume point is in slot {kept_in}. Load it on the device that made it."
        );
        let _ = notify.emit("core-message", retro::Message { text, duration_ms: 6000 });
    }
    Ok(fps)
}

async fn transfer_pak_cart<R: Runtime>(
    app: &AppHandle<R>,
    folder: &str,
    gb: String,
) -> Result<transfer_pak::Cart, String> {
    let games = GamesFolder::open(app, folder);
    let rom = rom::unpack(&gb, games.read(&gb).await?)?;
    let (slot, save) = save::open(&games, &gb).await?;
    let back_up = {
        let (app, folder, gb, slot) = (app.clone(), folder.to_owned(), gb.clone(), slot.clone());
        move |reason: Reason, save: &[u8]| {
            let games = GamesFolder::open(&app, &folder);
            tauri::async_runtime::block_on(backups::take(&games, &gb, &slot, reason, save, &backups::now(), None))
        }
    };
    let dir = files::cache_dir(app, "transfer-pak")?;
    Ok(transfer_pak::Cart { path: gb, dir, rom, save, slot, back_up: Box::new(back_up) })
}

async fn back_up_at_start<R: Runtime>(
    games: &GamesFolder<'_, R>,
    path: &str,
    slot: &save::Slot,
    save: &[u8],
    cheats_on: bool,
) -> Result<(), String> {
    let reason = if cheats_on { Reason::Cheats } else { Reason::Start };
    backups::take(games, path, slot, reason, save, &backups::now(), None).await
}

fn mark_cheats(index: Arc<Index>, path: String, slot: save::Slot) -> emu::MarkCheats {
    Box::new(move |save| {
        for (_, file) in slot.files(save) {
            if let Err(e) = index.mark_save_had_cheats(&path, &game_art::sha1_of(&file)) {
                eprintln!("marking a save written with cheats: {e}");
            }
        }
    })
}

async fn starting_point<R: Runtime>(
    games: &GamesFolder<'_, R>,
    path: &str,
    resume: bool,
    running: &retro::CoreInfo,
    save_slot: &save::Slot,
    save: &[u8],
) -> Result<(Option<Vec<u8>>, Option<u8>, Option<u8>), String> {
    if !resume {
        return Ok((None, None, None));
    }
    Ok(match resume::read(games, path, running).await? {
        Some((state, slot)) => (Some(state), slot, None),
        None => (None, None, Some(resume::keep_in_slot(games, path, save_slot, save).await?)),
    })
}

fn running_core(path: &str) -> Result<retro::CoreInfo, String> {
    retro::core_info_for(cheats::Platform::of_path(path)?.into())
}

pub(crate) async fn stop_game(emu: &Emu) -> Result<(), String> {
    stop_playing(emu).await.map(drop)
}

async fn stop_playing(emu: &Emu) -> Result<Option<Playing>, String> {
    let (done, stopped) = oneshot::channel();
    emu.send(Command::Stop { done });
    let (writes, game) = stopped.await.map_err(|e| e.to_string())?;
    writes.finished().await?;
    Ok(game)
}

#[tauri::command]
async fn has_resume_state<R: Runtime>(
    app: AppHandle<R>,
    emu: State<'_, Emu>,
    folder: String,
    path: String,
) -> Result<bool, String> {
    // Quitting writes the resume state, so a game reopened straight away waits for that write.
    stop_game(&emu).await?;
    Ok(GamesFolder::open(&app, &folder).has_file(&rom::resume_path(&path)).await)
}

#[tauri::command]
async fn resume_preview<R: Runtime>(
    app: AppHandle<R>,
    emu: State<'_, Emu>,
    folder: String,
    path: String,
) -> Result<Option<resume::Preview>, String> {
    stop_game(&emu).await?;
    Ok(resume::preview(&GamesFolder::open(&app, &folder), &path).await)
}

#[tauri::command]
async fn resume_screenshot<R: Runtime>(
    app: AppHandle<R>,
    emu: State<'_, Emu>,
    folder: String,
    path: String,
) -> Result<Option<Vec<u8>>, String> {
    stop_game(&emu).await?;
    Ok(resume::screenshot_file(&GamesFolder::open(&app, &folder), &path).await)
}

// Unlike resume_screenshot, leaves a running game alone, so a game still writing its resume state shows the one before.
#[tauri::command]
async fn last_screenshot<R: Runtime>(app: AppHandle<R>, folder: String, path: String) -> Option<Vec<u8>> {
    resume::screenshot_file(&GamesFolder::open(&app, &folder), &path).await
}

#[tauri::command]
async fn resume_info<R: Runtime>(
    app: AppHandle<R>,
    emu: State<'_, Emu>,
    folder: String,
    path: String,
) -> Result<Option<resume::Info>, String> {
    stop_game(&emu).await?;
    Ok(resume::info(&GamesFolder::open(&app, &folder), &path).await)
}

#[tauri::command]
async fn read_save_file<R: Runtime>(
    app: AppHandle<R>,
    emu: State<'_, Emu>,
    folder: String,
    path: String,
) -> Result<Option<save::SaveFile>, String> {
    stop_game(&emu).await?;
    save::read_file(&GamesFolder::open(&app, &folder), &path).await
}

#[tauri::command]
async fn read_save_files<R: Runtime>(
    app: AppHandle<R>,
    emu: State<'_, Emu>,
    folder: String,
    path: String,
) -> Result<Vec<save::Exported>, String> {
    stop_game(&emu).await?;
    save::exported(&GamesFolder::open(&app, &folder), &path).await
}

#[tauri::command]
async fn stop(emu: State<'_, Emu>) -> Result<(), String> {
    stop_game(&emu).await
}

#[tauri::command]
async fn play_time_since_save(emu: State<'_, Emu>) -> Result<Option<f64>, String> {
    let (reply, result) = oneshot::channel();
    emu.send(Command::PlayTimeSinceSave { reply });
    result.await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn paused_screenshot(emu: State<'_, Emu>) -> Result<Option<Vec<u8>>, String> {
    let (reply, result) = oneshot::channel();
    emu.send(Command::Screenshot { reply });
    result.await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn pace(emu: State<'_, Emu>, pacing: Pacing) -> Result<(), String> {
    emu.send(Command::Pace(pacing));
    Ok(())
}

#[tauri::command]
async fn set_screen(emu: State<'_, Emu>, layout: screen::Layout) -> Result<(), String> {
    emu.send(Command::Screen(layout));
    Ok(())
}

#[tauri::command]
async fn set_parallax(emu: State<'_, Emu>, parallax: Vec<screen::Parallax>) -> Result<(), String> {
    emu.send(Command::Parallax(parallax));
    Ok(())
}

#[tauri::command]
async fn step(emu: State<'_, Emu>, frames: u32) -> Result<(), String> {
    let (done, finished) = oneshot::channel();
    emu.send(Command::Step { frames, done });
    finished.await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn set_input(input: u16, analog: [i16; 4], triggers: [i16; 2], pointer: Option<[i16; 2]>) {
    retro::set_input(input);
    retro::set_analog(analog);
    retro::set_triggers(triggers);
    retro::set_pointer(pointer);
}

#[tauri::command]
async fn read_save(emu: State<'_, Emu>) -> Result<Response, String> {
    let (reply, result) = oneshot::channel();
    emu.send(Command::ReadSave { reply });
    result.await.map_err(|e| e.to_string())?.map(Response::new)
}

#[tauri::command]
async fn read_memory(emu: State<'_, Emu>, ranges: Vec<Range>) -> Result<Response, String> {
    let (reply, result) = oneshot::channel();
    emu.send(Command::ReadMemory { ranges, reply });
    result.await.map_err(|e| e.to_string())?.map(Response::new)
}

#[tauri::command]
async fn apply_edit(emu: State<'_, Emu>, request: Request<'_>) -> Result<(), String> {
    let (reply, result) = oneshot::channel();
    emu.send(Command::ApplyEdit { edited: bytes(request.body())?, reply });
    result.await.map_err(|e| e.to_string())?
}

// Android's webview can't read request bodies, so Tauri sends the bytes as a JSON array there.
pub(crate) fn bytes(body: &InvokeBody) -> Result<Vec<u8>, String> {
    match body {
        InvokeBody::Raw(bytes) => Ok(bytes.clone()),
        InvokeBody::Json(json) => {
            Vec::<u8>::deserialize(json).map_err(|e| format!("send the body as bytes: {e}"))
        }
    }
}

#[tauri::command]
async fn apply_edit_to_file<R: Runtime>(
    app: AppHandle<R>,
    emu: State<'_, Emu>,
    folder: String,
    path: String,
    edited: Vec<u8>,
) -> Result<(), String> {
    stop_game(&emu).await?;
    edit::apply_file(&GamesFolder::open(&app, &folder), &path, &edited, &backups::now()).await
}

#[tauri::command]
async fn write_transfer<R: Runtime>(
    app: AppHandle<R>,
    emu: State<'_, Emu>,
    folder: String,
    destination: edit::TransferWrite,
    source: edit::TransferWrite,
) -> Result<(), String> {
    stop_game(&emu).await?;
    edit::write_transfer(&GamesFolder::open(&app, &folder), &destination, &source, &backups::now()).await
}

#[tauri::command]
async fn leave_hardcore(emu: State<'_, Emu>) -> Result<(), String> {
    let (done, left) = oneshot::channel();
    emu.send(Command::LeaveHardcore { done });
    left.await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn undo_edit(emu: State<'_, Emu>) -> Result<(), String> {
    let (reply, result) = oneshot::channel();
    emu.send(Command::UndoEdit { reply });
    result.await.map_err(|e| e.to_string())?
}

#[tauri::command]
async fn list_backups<R: Runtime>(
    app: AppHandle<R>,
    emu: State<'_, Emu>,
    folder: String,
    path: String,
) -> Result<Vec<backups::Listed>, String> {
    // A game just quit may still be writing the save it backed up.
    stop_game(&emu).await?;
    backups::list(&GamesFolder::open(&app, &folder), &path).await
}

#[tauri::command]
async fn read_backup<R: Runtime>(app: AppHandle<R>, folder: String, path: String, name: String) -> Result<Response, String> {
    backups::read(&GamesFolder::open(&app, &folder), &path, &name).await.map(Response::new)
}

#[tauri::command]
async fn restore_backup<R: Runtime>(
    app: AppHandle<R>,
    emu: State<'_, Emu>,
    folder: String,
    path: String,
    name: String,
    keep: usize,
) -> Result<(), String> {
    stop_game(&emu).await?;
    backups::restore(&GamesFolder::open(&app, &folder), &path, &name, &backups::now(), keep).await
}

#[tauri::command]
async fn delete_backup<R: Runtime>(app: AppHandle<R>, folder: String, path: String, name: String) -> Result<(), String> {
    backups::remove(&GamesFolder::open(&app, &folder), &path, &name).await
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct States {
    current: Option<u8>,
    slots: Vec<states::Listed>,
    can_undo_load: bool,
}

#[tauri::command]
async fn list_states<R: Runtime>(app: AppHandle<R>, emu: State<'_, Emu>, folder: String, path: String) -> Result<States, String> {
    let (reply, current) = oneshot::channel();
    emu.send(Command::CurrentSlot { reply });
    let current = current.await.map_err(|e| e.to_string())?;
    let games = GamesFolder::open(&app, &folder);
    Ok(States {
        current,
        // Without the DS core on this device its games can't be played, so their slots are listed as they are.
        slots: states::list(&games, &path, running_core(&path).ok().as_ref()).await,
        can_undo_load: states::has(&games, &path, StateName::BeforeLoad).await,
    })
}

#[tauri::command]
async fn state_screenshot<R: Runtime>(app: AppHandle<R>, folder: String, path: String, slot: u8) -> Result<Option<Vec<u8>>, String> {
    Ok(states::screenshot(&GamesFolder::open(&app, &folder), &path, states::check(slot)?).await)
}

#[tauri::command]
async fn save_state(emu: State<'_, Emu>, slot: u8) -> Result<(), String> {
    let (reply, result) = oneshot::channel();
    emu.send(Command::SaveState { slot: states::check(slot)?, reply });
    result.await.map_err(|e| e.to_string())?
}

#[tauri::command]
async fn load_state<R: Runtime>(app: AppHandle<R>, emu: State<'_, Emu>, folder: String, path: String, slot: u8) -> Result<(), String> {
    let slot = states::check(slot)?;
    let loaded = states::read(&GamesFolder::open(&app, &folder), &path, slot, &running_core(&path)?).await.map_err(|e| {
        eprintln!("{e}");
        states::REJECTED.to_string()
    })?;
    let (reply, result) = oneshot::channel();
    let (kept, before_load) = oneshot::channel();
    emu.send(Command::LoadState { slot, loaded, kept, reply });
    result.await.map_err(|e| e.to_string())??;
    if let Ok(Err(e)) = before_load.await {
        eprintln!("{e}");
    }
    Ok(())
}

#[tauri::command]
async fn undo_load_state<R: Runtime>(app: AppHandle<R>, emu: State<'_, Emu>, folder: String, path: String) -> Result<(), String> {
    let games = GamesFolder::open(&app, &folder);
    let loaded = states::read(&games, &path, StateName::BeforeLoad, &running_core(&path)?).await.map_err(|e| {
        eprintln!("{e}");
        states::REJECTED.to_string()
    })?;
    let (reply, result) = oneshot::channel();
    let (removed, before_load) = oneshot::channel();
    emu.send(Command::UndoLoadState { loaded, removed, reply });
    result.await.map_err(|e| e.to_string())??;
    if let Ok(Err(e)) = before_load.await {
        eprintln!("{e}");
    }
    Ok(())
}

#[tauri::command]
async fn delete_state<R: Runtime>(app: AppHandle<R>, emu: State<'_, Emu>, folder: String, path: String, slot: u8) -> Result<(), String> {
    let slot = states::check(slot)?;
    // Forgetting first stops a running game from writing the slot back into resume.json as it suspends.
    let (done, forgotten) = oneshot::channel();
    emu.send(Command::ForgetSlot { slot, done });
    forgotten.await.map_err(|e| e.to_string())?;
    states::delete(&GamesFolder::open(&app, &folder), &path, slot).await
}

#[tauri::command]
async fn can_undo_edit(emu: State<'_, Emu>) -> Result<bool, String> {
    let (reply, result) = oneshot::channel();
    emu.send(Command::CanUndoEdit { reply });
    result.await.map_err(|e| e.to_string())
}

// Approving the JIT pool can keep the debugger busy for a while.
#[tauri::command]
async fn jit_on() -> Result<bool, String> {
    tauri::async_runtime::spawn_blocking(retro::jit_on).await.map_err(|e| e.to_string())
}

#[tauri::command]
fn jit_enable<R: Runtime>(app: AppHandle<R>) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    let url = retro::enable_jit_url().ok_or("JIT can't be turned on in this build")?;
    app.opener().open_url(url, None::<&str>).map_err(|e| e.to_string())
}

#[cfg(sideload)]
#[tauri::command]
fn jit_helper() -> retro::JitHelper {
    retro::jit_helper()
}

#[cfg(sideload)]
#[tauri::command]
async fn jit_turn_on<R: Runtime>(app: AppHandle<R>) -> Result<bool, String> {
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let pairing_file = std::fs::read(pairing_file::path(&data_dir)).map_err(|_| "Import a pairing file first.")?;
    tauri::async_runtime::spawn_blocking(move || retro::turn_on_jit_with_helper(pairing_file))
        .await
        .map_err(|e| e.to_string())?
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Tauri's mobile dev server proxy builds a reqwest client without a TLS provider of its own.
    let _ = rustls::crypto::ring::default_provider().install_default();
    platform::plugins(tauri::Builder::default())
        .manage(import::Opened::default())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_persisted_scope::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .setup(|app| {
            let data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&data_dir)?;
            // StikDebug can launch the app attached, and its script waits until the app sets JIT up and lets it go.
            std::thread::spawn(retro::jit_on);
            if let Ok(cache_dir) = app.path().app_cache_dir() {
                std::thread::spawn(move || files::remove_old_sprites(&cache_dir));
            }
            let index = Arc::new(Index::open(&data_dir.join("index.sqlite")));
            let art = Arc::new(GameArt::start(data_dir.join("rom-art"), index.clone(), game_art::AppHost(app.handle().clone())));
            let in_use = Arc::new(sync::InUse::default());
            let emu_in_use = in_use.clone();
            let on_game = {
                let (art, in_use) = (art.clone(), in_use.clone());
                Box::new(move |path: Option<&str>, cart: Option<&str>| {
                    in_use.playing(path, cart);
                    art.playing(path.map(String::from))
                })
            };
            let on_plus = {
                let app = app.handle().clone();
                Box::new(move |status: &plus::Status| {
                    let _ = app.emit("plus-status", status);
                })
            };
            let build = plus::Build::current();
            let plus = Arc::new(plus::Plus::new(&data_dir, build, plus::store(app.handle(), build), on_plus));
            app.manage(sync::Syncer::new(&data_dir, in_use, plus.clone()));
            app.manage(plus);
            sync::reconnect(app.handle());
            let on_message = {
                let app = app.handle().clone();
                Box::new(move |message: retro::Message| {
                    let _ = app.emit("core-message", message);
                })
            };
            let on_event = {
                let app = app.handle().clone();
                Box::new(move |event: achievements::Event| {
                    let _ = app.emit("retro-achievements", event);
                })
            };
            app.manage(achievements::for_app(app.handle(), &data_dir, on_event));
            app.manage(Emu::start(data_dir.join("system"), index.clone(), emu_in_use, on_game, on_message));
            audio::platform::watch(app.handle());
            app.manage(art);
            app.manage(index);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            three_ds_renderer,
            play,
            has_resume_state,
            resume_preview,
            resume_screenshot,
            resume_info,
            read_save_file,
            read_save_files,
            pace,
            set_screen,
            set_parallax,
            screen::platform::screen_set_playing,
            step,
            set_input,
            stop,
            play_time_since_save,
            paused_screenshot,
            last_screenshot,
            read_save,
            read_memory,
            apply_edit,
            apply_edit_to_file,
            write_transfer,
            undo_edit,
            leave_hardcore,
            edited::edited_mark,
            edited::settle_edited_mark,
            list_backups,
            read_backup,
            restore_backup,
            delete_backup,
            can_undo_edit,
            list_states,
            state_screenshot,
            save_state,
            load_state,
            undo_load_state,
            delete_state,
            cheats::list_cheats,
            cheats::add_cheat,
            cheats::edit_cheat,
            cheats::delete_cheat,
            cheats::toggle_cheat,
            transfer_pak::transfer_pak,
            transfer_pak::choose_transfer_pak,
            index::play_history,
            index::recently_played,
            index::save_summary,
            index::keep_save_summary,
            kept_copies::kept_copies,
            kept_copies::keep_copies,
            skins::skins,
            skins::choose_skin,
            index::save_had_cheats,
            games_folder::platform::games_folder_pick,
            games_folder::platform::games_folder_make,
            games_folder::platform::games_folder_find,
            games_folder::games_folder_keep,
            games_folder::games_folder_exists,
            games_folder::games_folder_create_dir,
            games_folder::games_folder_read_dir,
            games_folder::games_folder_open,
            import::import_pick,
            import::import_opened,
            import::import_pick_folder,
            import::import_scan,
            import::import_sha1s,
            import::import_title_ids,
            import::import_rom,
            import::three_ds_update,
            import::import_demo,
            import::import_existing_save,
            import::import_save,
            pokemon_file::platform::pokemon_file_pick,
            patching::patch_pick,
            patching::patch_dropped,
            patching::patch_bases,
            patching::patch_base_build,
            patching::rom_game_name,
            patching::patch_check_name,
            patching::patch_rom,
            game_art::game_art_scan,
            game_art::game_art_image,
            game_art::game_art_manifest,
            game_art::game_art_sha1,
            game_art::game_art_status,
            game_art::game_art_lenders,
            game_art::game_art_reextract,
            game_art::game_art_reextract_all,
            game_art::game_art_progress,
            box_art::box_art_read,
            box_art::box_art_write,
            box_art::box_art_listing_read,
            box_art::box_art_listing_write,
            box_art::box_art_download,
            box_art::box_art_chosen,
            box_art::box_art_choose,
            box_art::box_art_choose_url,
            box_art::box_art_choose_file,
            box_art::box_art_choose_none,
            box_art::box_art_use_default,
            export::export_share,
            export::export_share_files,
            sync::sync_game,
            sync::sync_all,
            sync::sync_conflicts,
            sync::sync_resolve,
            sync::sync_cloud_save,
            sync::sync_cloud_screenshot,
            sync::sync_available,
            sync::sync_account,
            sync::sync_sign_in,
            sync::sync_sign_out,
            sync::sync_last_synced,
            sync::sync_games_last_synced,
            sync::sync_mobile_data,
            sync::sync_set_mobile_data,
            sync::sync_cloud_games,
            sync::sync_download_rom,
            sync::sync_mobile_download_size,
            sync::sync_remove_from_device,
            sync::delete_game,
            plus::plus_status,
            entitlements::missing_memory_entitlements,
            plus::plus_buy,
            plus::plus_restore,
            jit_on,
            jit_enable,
            #[cfg(sideload)]
            jit_helper,
            #[cfg(sideload)]
            jit_turn_on,
            #[cfg(sideload)]
            pairing_file::commands::jit_pairing_file,
            #[cfg(sideload)]
            pairing_file::commands::jit_pairing_file_import,
            #[cfg(sideload)]
            pairing_file::commands::jit_pairing_file_remove,
            achievements::retro_achievements_turn,
            achievements::retro_achievements_account,
            achievements::retro_achievements_sign_in,
            achievements::retro_achievements_sign_out,
            achievements::retro_achievements_badge,
            achievements::retro_achievements_playing,
            achievements::retro_achievements_game,
            achievements::retro_achievements_create_account,
            achievements::retro_achievements_summary,
            achievements::retro_achievements_open_profile,
            app_update::platform::app_update_check,
            app_update::platform::app_update_start,
            app_update::platform::app_update_complete,
            audio::platform::audio_play_in_silent_mode,
            system_bars::platform::system_bars_set_hidden,
            system_bars::platform::system_bars_set_light,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(platform::on_event);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_raw_bytes() {
        assert_eq!(bytes(&InvokeBody::Raw(vec![1, 2, 255])), Ok(vec![1, 2, 255]));
    }

    #[test]
    fn reads_bytes_sent_as_a_json_array() {
        assert_eq!(bytes(&InvokeBody::Json(serde_json::Value::from(vec![1, 2, 255]))), Ok(vec![1, 2, 255]));
    }

    fn resumable(name: &str) -> GamesFolder<'static, tauri::Wry> {
        let root = std::env::temp_dir().join(format!("pkh-emu-lib-{name}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        let games = GamesFolder::at(root);
        tauri::async_runtime::block_on(async {
            games.write("gb/Red/states/resume.state", b"state").await.unwrap();
            games.write("gb/Red/states/resume.json", br#"{"playSinceSave":null,"slot":3}"#).await.unwrap();
        });
        games
    }

    fn start(
        games: &GamesFolder<'_, tauri::Wry>,
        resume: bool,
    ) -> Result<(Option<Vec<u8>>, Option<u8>, Option<u8>), String> {
        let (slot, _) = save::Slot::new("gb/Red.sav".into(), Vec::new());
        tauri::async_runtime::block_on(starting_point(games, "gb/Red.gb", resume, &retro::core_info(), &slot, b"save"))
    }

    #[test]
    fn resumes_from_the_slot_it_was_playing_from() {
        let games = resumable("resume-slot");

        assert_eq!(start(&games, true), Ok((Some(b"state".to_vec()), Some(3), None)));
    }

    #[test]
    fn starts_from_the_save_when_another_core_version_wrote_the_resume_state() {
        let games = resumable("resume-other-version");
        let json = br#"{"playSinceSave":null,"slot":3,"core":"mGBA","coreVersion":"0.0.1"}"#;
        tauri::async_runtime::block_on(games.write("gb/Red/states/resume.json", json)).unwrap();

        assert_eq!(start(&games, true), Ok((None, None, Some(1))));
        assert_eq!(tauri::async_runtime::block_on(games.read("gb/Red/states/slot-1.state")).unwrap(), b"state");
        assert!(!tauri::async_runtime::block_on(games.has_file("gb/Red/states/resume.state")));
    }

    #[test]
    fn starts_from_no_slot() {
        let games = resumable("start-slot");

        assert_eq!(start(&games, false), Ok((None, None, None)));
    }

    fn backed_up_at_start(name: &str, cheats_on: bool) -> Vec<String> {
        let games = resumable(name);
        let (slot, _) = save::Slot::new("gb/Red.sav".into(), Vec::new());
        tauri::async_runtime::block_on(back_up_at_start(&games, "gb/Red.gb", &slot, b"save", cheats_on)).unwrap();
        let backups = tauri::async_runtime::block_on(backups::list(&games, "gb/Red.gb")).unwrap();
        let reason = |backup| serde_json::to_value(backup).unwrap()["reason"].as_str().unwrap().to_owned();
        backups.into_iter().map(reason).collect()
    }

    #[test]
    fn starting_a_game_with_a_code_on_takes_a_cheats_backup() {
        assert_eq!(backed_up_at_start("start-cheats", true), ["cheats"]);
        assert_eq!(backed_up_at_start("start-plain", false), ["start"]);
    }

    #[test]
    fn marks_the_sha1_of_the_save_file_with_its_footer() {
        let (index, _) = index::temp_index("mark-cheats");
        let footer = [vec![7; 0x7A - 16], b"|-DESMUME SAVE-|".to_vec()].concat();
        let (slot, _) = save::Slot::new("nds/HeartGold.dsv".into(), [b"old".as_slice(), &footer].concat());

        mark_cheats(index.clone(), "nds/HeartGold.nds".into(), slot)(b"save");

        let file = [b"save".as_slice(), &footer].concat();
        assert_eq!(index.save_had_cheats("nds/HeartGold.nds", &game_art::sha1_of(&file)), Ok(true));
        assert_eq!(index.save_had_cheats("nds/HeartGold.nds", &game_art::sha1_of(b"save")), Ok(false));
    }

    #[test]
    fn marks_the_sha1_of_each_file_of_an_n64_save() {
        let (index, _) = index::temp_index("mark-cheats-n64");
        let games = GamesFolder::<tauri::Wry>::at(std::env::temp_dir().join("pkh-emu-mark-cheats-n64"));
        let (slot, _) = tauri::async_runtime::block_on(save::open(&games, "n64/Stadium.z64")).unwrap();
        let save = save::tests::stadium_memory();

        mark_cheats(index.clone(), "n64/Stadium.z64".into(), slot)(&save);

        assert_eq!(index.save_had_cheats("n64/Stadium.z64", &game_art::sha1_of(&save[0x28800..])), Ok(true));
        assert_eq!(index.save_had_cheats("n64/Stadium.z64", &game_art::sha1_of(&save)), Ok(false));
    }

    #[test]
    fn refuses_json_that_is_not_bytes() {
        assert!(bytes(&InvokeBody::Json(serde_json::Value::from(vec![1, 256]))).is_err());
    }
}
