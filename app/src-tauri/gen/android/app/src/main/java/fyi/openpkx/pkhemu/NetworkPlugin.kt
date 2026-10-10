package fyi.openpkx.pkhemu

import android.app.Activity
import android.net.ConnectivityManager
import app.tauri.annotation.Command
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin

@TauriPlugin
class NetworkPlugin(private val activity: Activity) : Plugin(activity) {
  @Command
  fun metered(invoke: Invoke) {
    val connectivity = activity.getSystemService(ConnectivityManager::class.java)
    invoke.resolve(JSObject().put("metered", connectivity.isActiveNetworkMetered))
  }
}
