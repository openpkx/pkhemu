use std::sync::Mutex;
use tauri::plugin::{Builder, PluginHandle, TauriPlugin};
use tauri::{AppHandle, Manager, RunEvent, Runtime};

#[derive(Default)]
struct State {
    holds: usize,
    leaving: bool,
}

struct KeepAlive<R: Runtime> {
    plugin: PluginHandle<R>,
    state: Mutex<State>,
}

pub fn plugin<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("keep-alive")
        .setup(|app, api| {
            let plugin = api.register_android_plugin("fyi.openpkx.pkhemu", "KeepAlivePlugin")?;
            app.manage(KeepAlive { plugin, state: Mutex::new(State::default()) });
            Ok(())
        })
        .on_event(|app, event| {
            let RunEvent::ExitRequested { code, api, .. } = event else { return };
            let Some(keep_alive) = app.try_state::<KeepAlive<R>>() else { return };
            let mut state = keep_alive.state.lock().unwrap_or_else(|e| e.into_inner());
            if state.holds == 0 {
                return;
            }
            api.prevent_exit();
            match code {
                // Swiping the app away from recent apps destroys its only window, and Tauri then exits the process.
                None => state.leaving = true,
                // Back on the library exits. Going to the background instead leaves sync running.
                Some(_) => {
                    drop(state);
                    run(&keep_alive.plugin, "moveToBack");
                }
            }
        })
        .build()
}

pub fn set<R: Runtime>(app: &AppHandle<R>, busy: bool) {
    let Some(keep_alive) = app.try_state::<KeepAlive<R>>() else { return };
    let leaving = {
        let mut state = keep_alive.state.lock().unwrap_or_else(|e| e.into_inner());
        let was_busy = state.holds > 0;
        state.holds = if busy { state.holds + 1 } else { state.holds.saturating_sub(1) };
        if was_busy == (state.holds > 0) {
            return;
        }
        state.leaving
    };
    // Without a window, the plugin can't reach Kotlin and panics. Exiting stops the service anyway.
    if !leaving {
        run(&keep_alive.plugin, if busy { "begin" } else { "end" });
    } else if !busy {
        app.exit(0);
    }
}

fn run<R: Runtime>(plugin: &PluginHandle<R>, command: &str) {
    if let Err(e) = plugin.run_mobile_plugin::<serde_json::Value>(command, ()) {
        eprintln!("keeping the app alive: {e}");
    }
}
