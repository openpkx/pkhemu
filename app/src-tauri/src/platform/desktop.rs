use std::future::Future;
use std::time::Duration;

use tauri::{AppHandle, Builder, Manager, RunEvent, Runtime, WindowEvent};

use crate::emu::{Command, Emu, Playing};
use crate::sync;

const EXIT_WAIT: Duration = Duration::from_secs(5);

pub fn plugins<R: Runtime>(builder: Builder<R>) -> Builder<R> {
    builder
}

pub fn on_event<R: Runtime>(app: &AppHandle<R>, event: RunEvent) {
    match event {
        #[cfg(target_os = "macos")]
        RunEvent::Opened { urls } => crate::import::opened_urls(app, urls),
        RunEvent::WindowEvent { event: WindowEvent::Focused(false), .. } => app.state::<Emu>().send(Command::Suspend),
        // Cmd+Q on a Mac skips ExitRequested and ends here, so this is where the game gets its last upload.
        RunEvent::Exit => {
            let sync = |game| sync::queue_game(app.clone(), game);
            tauri::async_runtime::block_on(stop_and_sync(&app.state(), sync));
        }
        _ => {}
    }
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
