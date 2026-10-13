use serde::{Deserialize, Serialize};
use tauri::ipc::{Channel, InvokeResponseBody};
use tauri::plugin::mobile::{ErrorResponse, PluginInvokeError};
use tauri::plugin::{Builder, PluginHandle, TauriPlugin};
use tauri::{Manager, Runtime};

tauri::ios_plugin_binding!(init_plugin_pkhemu_ios);

pub type ScreenShown = extern "C" fn(layer: *mut std::ffi::c_void, width: i32, height: i32);
pub type ScreenGone = extern "C" fn();

extern "C" {
    fn pkhemu_ios_replay_launch_urls();
    fn pkhemu_ios_watch_game_screen(shown: ScreenShown, gone: ScreenGone);
}

/// Hands over the game screen's CAEAGLLayer and its size in pixels while a game plays, and takes it back on gone.
/// Gone runs on the main thread, and the layer goes once it returns.
pub fn watch_game_screen(shown: ScreenShown, gone: ScreenGone) {
    unsafe { pkhemu_ios_watch_game_screen(shown, gone) };
}

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    unsafe { pkhemu_ios_replay_launch_urls() };
    Builder::new("pkhemu-ios")
        .setup(|app, api| {
            app.manage(PkhemuIos(api.register_ios_plugin(init_plugin_pkhemu_ios)?));
            Ok(())
        })
        .build()
}

pub struct PkhemuIos<R: Runtime>(PluginHandle<R>);

impl<R: Runtime> Clone for PkhemuIos<R> {
    fn clone(&self) -> Self {
        Self(self.0.clone())
    }
}

pub trait PkhemuIosExt<R: Runtime> {
    fn pkhemu_ios(&self) -> &PkhemuIos<R>;
}

impl<R: Runtime, T: Manager<R>> PkhemuIosExt<R> for T {
    fn pkhemu_ios(&self) -> &PkhemuIos<R> {
        self.state::<PkhemuIos<R>>().inner()
    }
}

#[derive(Deserialize)]
pub struct Folder {
    pub path: String,
    pub name: String,
}

#[derive(Deserialize)]
struct Picked {
    folder: Option<Folder>,
}

#[derive(Serialize)]
struct ReadArgs<'a> {
    path: &'a str,
}

#[derive(Deserialize)]
struct Started {
    id: Option<String>,
}

#[derive(Serialize)]
struct StopArgs<'a> {
    id: &'a str,
}

#[derive(Serialize)]
struct DownloadArgs<'a> {
    paths: &'a [String],
}

#[derive(Serialize)]
struct ShareArgs<'a> {
    paths: &'a [String],
}

#[derive(Serialize)]
struct WatchAudioArgs {
    events: Channel<serde_json::Value>,
}

#[derive(Serialize)]
struct SilentModeArgs {
    on: bool,
}

#[derive(Serialize)]
struct GameScreenArgs {
    playing: bool,
}

#[derive(Clone, Copy, Debug, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum AudioEvent {
    /// The sound stopped for a call, an alarm or unplugged headphones.
    Pause,
    /// The audio session is active again, and the stream that played before has stopped for good.
    Restart,
}

fn message(error: PluginInvokeError) -> String {
    match error {
        PluginInvokeError::InvokeRejected(ErrorResponse { message: Some(message), .. }) => message,
        error => error.to_string(),
    }
}

impl<R: Runtime> PkhemuIos<R> {
    pub async fn pick_folder(&self) -> Result<Option<Folder>, String> {
        let picked: Picked = self.0.run_mobile_plugin_async("pickFolder", ()).await.map_err(message)?;
        Ok(picked.folder)
    }

    /// Opens access to a path inside a folder the player picked, and returns the id that ends it.
    /// Returns None for a path outside every picked folder, which needs no access.
    pub async fn start_reading(&self, path: &str) -> Result<Option<String>, String> {
        let started: Started =
            self.0.run_mobile_plugin_async("startReading", ReadArgs { path }).await.map_err(message)?;
        Ok(started.id)
    }

    /// Starts downloading iCloud files that aren't on the device, inside folders the player picked.
    pub async fn download(&self, paths: &[String]) -> Result<(), String> {
        if paths.is_empty() {
            return Ok(());
        }
        self.0.run_mobile_plugin_async("download", DownloadArgs { paths }).await.map_err(message)
    }

    /// Opens the share sheet for files in the app's container, and returns once it closes.
    pub async fn share(&self, paths: &[String]) -> Result<(), String> {
        self.0.run_mobile_plugin_async("share", ShareArgs { paths }).await.map_err(message)
    }

    /// Activates the audio session and reports what happens to it from then on.
    pub fn watch_audio(&self, on_event: impl Fn(AudioEvent) + Send + Sync + 'static) -> Result<(), String> {
        let events = Channel::new(move |body| {
            if let InvokeResponseBody::Json(json) = body {
                match serde_json::from_str(&json) {
                    Ok(event) => on_event(event),
                    Err(e) => eprintln!("audio session event {json}: {e}"),
                }
            }
            Ok(())
        });
        self.0.run_mobile_plugin("watchAudio", WatchAudioArgs { events }).map_err(message)
    }

    /// Plays sound with the silent switch on, or mutes it there.
    pub fn play_in_silent_mode(&self, on: bool) -> Result<(), String> {
        self.0.run_mobile_plugin("setPlayInSilentMode", SilentModeArgs { on }).map_err(message)
    }

    /// Shows the game screen under the webview while a game plays, and hides it after.
    pub fn set_game_screen_playing(&self, playing: bool) -> Result<(), String> {
        self.0.run_mobile_plugin("setGameScreenPlaying", GameScreenArgs { playing }).map_err(message)
    }

    pub fn stop_reading(&self, id: &str) {
        if let Err(e) = self.0.run_mobile_plugin::<()>("stopReading", StopArgs { id }) {
            eprintln!("stopping access to a picked folder: {}", message(e));
        }
    }
}
