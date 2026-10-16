use std::future::Future;
use std::time::Duration;

use tauri::{AppHandle, Builder, Manager, RunEvent, Runtime, WindowEvent};
use tokio::sync::oneshot;

use crate::emu::{Command, Emu, Playing};
use crate::sync;

mod ios_controller_buttons;
mod ios_first_responder;
mod ios_safe_area;

const EXIT_WAIT: Duration = Duration::from_secs(5);
const SLEEP_WAIT: Duration = Duration::from_secs(2);

pub fn plugins<R: Runtime>(builder: Builder<R>) -> Builder<R> {
    builder
        .plugin(tauri_plugin_pkhemu_ios::init())
        .plugin(tauri_plugin_haptics::init())
        .plugin(ios_safe_area::init())
        .plugin(ios_first_responder::init())
        .plugin(ios_controller_buttons::init())
        .plugin(crate::system_bars::platform::init())
}

pub fn on_event<R: Runtime>(app: &AppHandle<R>, event: RunEvent) {
    match event {
        RunEvent::Opened { urls } => crate::import::opened_urls(app, urls),
        // Suspended and Resumed don't come in pairs on iOS (tao#1307), and Focused does.
        RunEvent::WindowEvent { event: WindowEvent::Focused(false), .. } => sleep(app),
        RunEvent::WindowEvent { event: WindowEvent::Focused(true), .. } => app.state::<Emu>().send(Command::Wake),
        RunEvent::Exit => {
            let sync = |game| sync::queue_game(app.clone(), game);
            tauri::async_runtime::block_on(stop_and_sync(&app.state(), sync));
        }
        _ => {}
    }
}

// iOS kills an app that calls OpenGL in the background, so the game's last OpenGL calls happen before it gets there.
fn sleep<R: Runtime>(app: &AppHandle<R>) {
    let (done, slept) = oneshot::channel();
    app.state::<Emu>().send(Command::Sleep { done });
    let _ = tauri::async_runtime::block_on(async { tokio::time::timeout(SLEEP_WAIT, slept).await });
}

pub(crate) async fn stop_and_sync<F, Fut>(emu: &Emu, sync: F)
where
    F: FnOnce(Playing) -> Fut,
    Fut: Future,
{
    match crate::stop_playing(emu).await {
        Ok(Some(game)) => {
            let _ = tokio::time::timeout(EXIT_WAIT, sync(game)).await;
        }
        Ok(None) => {}
        Err(e) => eprintln!("saving on exit: {e}"),
    }
}
