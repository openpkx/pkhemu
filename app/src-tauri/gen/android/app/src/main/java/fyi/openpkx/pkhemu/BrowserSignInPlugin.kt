package fyi.openpkx.pkhemu

import android.app.Activity
import android.content.Intent
import android.net.Uri
import androidx.appcompat.app.AppCompatActivity
import androidx.browser.customtabs.CustomTabsIntent
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin

@InvokeArg
class OpenArgs {
  lateinit var url: String
  lateinit var redirect: String
}

// The cloud sends the Custom Tab to the redirect, which AndroidManifest.xml routes back to MainActivity.
@TauriPlugin
class BrowserSignInPlugin(private val activity: Activity) : Plugin(activity) {
  private var pending: Invoke? = null
  private var redirect = ""
  private var left = false

  @Command
  fun open(invoke: Invoke) {
    val args = invoke.parseArgs(OpenArgs::class.java)
    pending?.reject("Sign-in started again")
    pending = invoke
    redirect = args.redirect
    left = false
    CustomTabsIntent.Builder().build().launchUrl(activity, Uri.parse(args.url))
  }

  override fun onNewIntent(intent: Intent) {
    val url = intent.data?.toString() ?: return
    val invoke = pending ?: return
    if (!url.startsWith(redirect)) return
    pending = null
    invoke.resolve(JSObject().put("url", url))
  }

  override fun onPause(activity: AppCompatActivity) {
    if (pending != null) left = true
  }

  // Android delivers the redirect before this, so coming back without it means the player closed the tab.
  override fun onResume(activity: AppCompatActivity) {
    val invoke = pending ?: return
    if (!left) return
    pending = null
    invoke.reject("Sign-in was cancelled")
  }
}
