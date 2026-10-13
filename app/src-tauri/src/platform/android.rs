use tauri::{AppHandle, Builder, Manager, RunEvent, Runtime, WindowEvent};
use tokio::sync::oneshot;

use crate::emu::{Command, Emu};
use crate::{app_update, import, keep_alive, plus, sync};

pub fn plugins<R: Runtime>(builder: Builder<R>) -> Builder<R> {
    builder
        .plugin(tauri_plugin_android_fs::init())
        .plugin(sync::google_sign_in())
        .plugin(sync::browser_sign_in())
        .plugin(sync::network())
        .plugin(plus::platform::plugin())
        .plugin(app_update::platform::plugin())
        .plugin(keep_alive::platform::plugin())
        .plugin(import::platform::plugin())
}

pub fn on_event<R: Runtime>(app: &AppHandle<R>, event: RunEvent) {
    match event {
        RunEvent::WindowEvent { event: WindowEvent::Focused(false), .. } => app.state::<Emu>().send(Command::Suspend),
        RunEvent::WindowEvent { event: WindowEvent::Suspended, .. } => pause_and_sync(app),
        RunEvent::WindowEvent { event: WindowEvent::Resumed, .. } => app.state::<Emu>().send(Command::Resume),
        RunEvent::Exit => {
            let finished = tauri::async_runtime::block_on(crate::stop_game(&app.state()));
            if let Err(e) = finished {
                eprintln!("saving on exit: {e}");
            }
        }
        _ => {}
    }
}

fn pause_and_sync<R: Runtime>(app: &AppHandle<R>) {
    if !app.state::<sync::Syncer>().in_use.any_playing() {
        return;
    }
    // Android only lets the service start as the app leaves the foreground, before the game's files are written.
    keep_alive::begin(app);
    let (reply, paused) = oneshot::channel();
    app.state::<Emu>().send(Command::Pause { reply });
    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        if let Ok(Some(game)) = paused.await {
            if let Err(e) = sync::queue_game(app.clone(), game).await {
                eprintln!("syncing the paused game: {e}");
            }
        }
        keep_alive::end(&app);
    });
}
