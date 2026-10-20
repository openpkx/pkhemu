package fyi.openpkx.pkhemu

import android.app.Activity
import androidx.appcompat.app.AppCompatActivity
import app.tauri.annotation.Command
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import com.google.android.play.core.appupdate.AppUpdateInfo
import com.google.android.play.core.appupdate.AppUpdateManagerFactory
import com.google.android.play.core.appupdate.AppUpdateOptions
import com.google.android.play.core.install.InstallState
import com.google.android.play.core.install.InstallStateUpdatedListener
import com.google.android.play.core.install.model.AppUpdateType
import com.google.android.play.core.install.model.InstallStatus
import com.google.android.play.core.install.model.UpdateAvailability

@TauriPlugin
class AppUpdatePlugin(private val activity: Activity) : Plugin(activity), InstallStateUpdatedListener {
  private val manager = AppUpdateManagerFactory.create(activity)

  // Play only updates a copy it installed.
  private val fromPlay: Boolean
    get() = installedByPlay(activity)

  init {
    manager.registerListener(this)
  }

  override fun onDestroy(activity: AppCompatActivity) {
    manager.unregisterListener(this)
  }

  override fun onStateUpdate(state: InstallState) {
    when (state.installStatus()) {
      InstallStatus.PENDING, InstallStatus.DOWNLOADING -> trigger(
        "downloading",
        JSObject()
          .put("bytesDownloaded", state.bytesDownloaded())
          .put("totalBytesToDownload", state.totalBytesToDownload()),
      )
      InstallStatus.DOWNLOADED -> trigger("downloaded", JSObject())
      InstallStatus.CANCELED, InstallStatus.FAILED -> trigger("stopped", JSObject())
      else -> {}
    }
  }

  @Command
  fun check(invoke: Invoke) {
    if (!fromPlay) return invoke.resolve(JSObject().put("available", false).put("downloaded", false))
    info(invoke) { info ->
      val available = info.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE &&
        info.isUpdateTypeAllowed(AppUpdateType.FLEXIBLE)
      val answer = JSObject()
        .put("available", available)
        .put("downloaded", info.installStatus() == InstallStatus.DOWNLOADED)
        .put("downloading", info.installStatus() in listOf(InstallStatus.PENDING, InstallStatus.DOWNLOADING))
      if (available) answer.put("versionCode", info.availableVersionCode())
      invoke.resolve(answer)
    }
  }

  @Command
  fun start(invoke: Invoke) {
    if (!fromPlay) return invoke.reject(UNAVAILABLE)
    info(invoke) { info ->
      val options = AppUpdateOptions.newBuilder(AppUpdateType.FLEXIBLE).build()
      if (manager.startUpdateFlowForResult(info, activity, options, REQUEST_CODE)) invoke.resolve()
      else invoke.reject(UNAVAILABLE)
    }
  }

  @Command
  fun complete(invoke: Invoke) {
    manager.completeUpdate()
      .addOnSuccessListener { invoke.resolve() }
      .addOnFailureListener { invoke.reject(it.message ?: "Couldn't install the update") }
  }

  private fun info(invoke: Invoke, then: (AppUpdateInfo) -> Unit) {
    manager.appUpdateInfo
      .addOnSuccessListener(then)
      .addOnFailureListener { invoke.reject(it.message ?: "Couldn't ask Google Play for updates") }
  }

  private companion object {
    const val REQUEST_CODE = 405
    const val UNAVAILABLE = "No update is available"
  }
}
