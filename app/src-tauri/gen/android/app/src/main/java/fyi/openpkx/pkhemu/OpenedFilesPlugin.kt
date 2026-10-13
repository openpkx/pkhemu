package fyi.openpkx.pkhemu

import android.app.Activity
import android.content.ContentResolver
import android.content.Intent
import android.net.Uri
import android.webkit.WebView
import androidx.core.content.IntentCompat
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Channel
import app.tauri.plugin.Invoke
import app.tauri.plugin.Plugin

@InvokeArg
class WatchArgs {
  lateinit var channel: Channel
}

@TauriPlugin
class OpenedFilesPlugin(private val activity: Activity) : Plugin(activity) {
  private var channel: Channel? = null
  private val held = mutableListOf<String>()

  override fun load(webView: WebView) {
    handle(activity.intent)
  }

  override fun onNewIntent(intent: Intent) {
    handle(intent)
  }

  @Command
  fun watch(invoke: Invoke) {
    val channel = invoke.parseArgs(WatchArgs::class.java).channel
    val waiting = synchronized(this) {
      this.channel = channel
      held.toList().also { held.clear() }
    }
    invoke.resolve()
    if (waiting.isNotEmpty()) channel.sendObject(waiting)
  }

  private fun handle(intent: Intent?) {
    if (intent == null || intent.flags and Intent.FLAG_ACTIVITY_LAUNCHED_FROM_HISTORY != 0) return
    val uris = uris(intent)
    if (uris.isEmpty()) return
    // The activity keeps its intent when it's recreated, so this stops the files importing again.
    intent.data = null
    intent.removeExtra(Intent.EXTRA_STREAM)
    intent.clipData = null
    val channel = synchronized(this) {
      if (channel == null) held.addAll(uris)
      channel
    }
    channel?.sendObject(uris)
  }

  private fun uris(intent: Intent): List<String> {
    val uris = mutableListOf<Uri>()
    when (intent.action) {
      Intent.ACTION_VIEW -> intent.data?.let(uris::add)
      Intent.ACTION_SEND -> IntentCompat.getParcelableExtra(intent, Intent.EXTRA_STREAM, Uri::class.java)?.let(uris::add)
      Intent.ACTION_SEND_MULTIPLE ->
        IntentCompat.getParcelableArrayListExtra(intent, Intent.EXTRA_STREAM, Uri::class.java)?.let(uris::addAll)
      else -> return emptyList()
    }
    intent.clipData?.let { clip -> (0 until clip.itemCount).mapNotNullTo(uris) { clip.getItemAt(it).uri } }
    return uris.filter { it.scheme == ContentResolver.SCHEME_CONTENT }.map(Uri::toString).distinct()
  }
}
