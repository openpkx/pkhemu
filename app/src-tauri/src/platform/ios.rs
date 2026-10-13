use std::future::Future;
use std::time::Duration;

use tauri::{AppHandle, Builder, Manager, RunEvent, Runtime, Url, WindowEvent};
use tokio::sync::oneshot;

use crate::emu::{Command, Emu, Playing};
use crate::sync;

mod ios_first_responder;
mod ios_safe_area;

const EXIT_WAIT: Duration = Duration::from_secs(5);

pub fn plugins<R: Runtime>(builder: Builder<R>) -> Builder<R> {
    builder
        .plugin(tauri_plugin_pkhemu_ios::init())
        .plugin(tauri_plugin_haptics::init())
        .plugin(ios_safe_area::init())
        .plugin(ios_first_responder::init())
        .plugin(crate::system_bars::platform::init())
}

pub fn on_event<R: Runtime>(app: &AppHandle<R>, event: RunEvent) {
    match event {
        RunEvent::Opened { urls } => crate::import::opened(app, files(urls)),
        // Suspended and Resumed don't come in pairs on iOS (tao#1307), and Focused does.
        RunEvent::WindowEvent { event: WindowEvent::Focused(false), .. } => pause(app),
        RunEvent::WindowEvent { event: WindowEvent::Focused(true), .. } => app.state::<Emu>().send(Command::Resume),
        RunEvent::Exit => {
            let sync = |game| sync::queue_game(app.clone(), game);
            tauri::async_runtime::block_on(stop_and_sync(&app.state(), sync));
        }
        _ => {}
    }
}

fn files(urls: Vec<Url>) -> Vec<String> {
    urls.into_iter().filter(|url| url.scheme() == "file").map(String::from).collect()
}

fn pause<R: Runtime>(app: &AppHandle<R>) {
    let (reply, _) = oneshot::channel();
    app.state::<Emu>().send(Command::Pause { reply });
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn opens_only_file_urls() {
        let urls = ["file:///Inbox/Emerald.gba", "pkhemu://open", "https://example.com/Emerald.sav"];
        let files = files(urls.map(|url| Url::parse(url).unwrap()).to_vec());

        assert_eq!(files, vec!["file:///Inbox/Emerald.gba"]);
    }
}
