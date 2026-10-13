use tauri::{AppHandle, Emitter, Manager, Runtime};
use tauri_plugin_pkhemu_ios::{AudioEvent, PkhemuIosExt};

use crate::emu::{Command, Emu};

pub fn watch<R: Runtime>(app: &AppHandle<R>) {
    let handle = app.clone();
    let watched = app.pkhemu_ios().watch_audio(move |event| match event {
        AudioEvent::Pause => {
            let _ = handle.emit("pause-game", ());
        }
        AudioEvent::Restart => handle.state::<Emu>().send(Command::RestartAudio),
    });
    if let Err(e) = watched {
        eprintln!("watching the audio session: {e}");
    }
}

#[tauri::command]
pub fn audio_play_in_silent_mode<R: Runtime>(app: AppHandle<R>, on: bool) -> Result<(), String> {
    app.pkhemu_ios().play_in_silent_mode(on)
}
