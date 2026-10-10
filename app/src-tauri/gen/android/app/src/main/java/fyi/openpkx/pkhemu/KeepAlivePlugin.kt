package fyi.openpkx.pkhemu

import android.Manifest
import android.app.Activity
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import app.tauri.annotation.Command
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.Plugin

@TauriPlugin
class KeepAlivePlugin(private val activity: Activity) : Plugin(activity) {
  private var busy = false
  private var visible = true
  private var askedForNotifications = false

  @Command
  fun begin(invoke: Invoke) {
    busy = true
    if (visible) askForNotifications() else SyncService.start(activity.applicationContext)
    invoke.resolve()
  }

  @Command
  fun end(invoke: Invoke) {
    busy = false
    SyncService.stop()
    invoke.resolve()
  }

  @Command
  fun moveToBack(invoke: Invoke) {
    activity.runOnUiThread { activity.moveTaskToBack(true) }
    invoke.resolve()
  }

  override fun onResume() {
    visible = true
  }

  // Android 12+ only lets an app start a foreground service from the background just as it leaves the foreground,
  // so the service starts here rather than whenever sync runs.
  override fun onStop() {
    visible = false
    if (busy) SyncService.start(activity.applicationContext)
  }

  private fun askForNotifications() {
    if (Build.VERSION.SDK_INT < 33 || askedForNotifications) return
    askedForNotifications = true
    val permission = Manifest.permission.POST_NOTIFICATIONS
    if (ContextCompat.checkSelfPermission(activity, permission) == PackageManager.PERMISSION_GRANTED) return
    activity.runOnUiThread { ActivityCompat.requestPermissions(activity, arrayOf(permission), 0) }
  }
}
