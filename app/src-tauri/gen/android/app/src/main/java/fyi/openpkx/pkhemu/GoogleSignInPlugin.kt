package fyi.openpkx.pkhemu

import android.accounts.Account
import android.app.Activity
import androidx.activity.result.ActivityResult
import androidx.activity.result.IntentSenderRequest
import app.tauri.annotation.ActivityCallback
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import com.google.android.gms.auth.api.identity.AuthorizationRequest
import com.google.android.gms.auth.api.identity.AuthorizationResult
import com.google.android.gms.auth.api.identity.ClearTokenRequest
import com.google.android.gms.auth.api.identity.Identity
import com.google.android.gms.auth.api.identity.RevokeAccessRequest
import com.google.android.gms.common.api.Scope

@InvokeArg
class AuthorizeArgs {
  var interactive: Boolean = false
  var scopes: List<String> = emptyList()
}

@InvokeArg
class ClearTokenArgs {
  lateinit var token: String
}

@InvokeArg
class RevokeAccessArgs {
  lateinit var account: String
  var scopes: List<String> = emptyList()
}

private const val SIGN_IN_AGAIN = "signInAgain"

// Google matches this app by its package name and signing certificate, so it needs no client ID.
@TauriPlugin
class GoogleSignInPlugin(private val activity: Activity) : Plugin(activity) {
  private val client get() = Identity.getAuthorizationClient(activity)

  @Command
  fun authorize(invoke: Invoke) {
    val args = invoke.parseArgs(AuthorizeArgs::class.java)
    val request = AuthorizationRequest.builder().setRequestedScopes(args.scopes.map { Scope(it) }).build()
    client.authorize(request)
      .addOnSuccessListener { result ->
        val intent = result.pendingIntent
        when {
          !result.hasResolution() -> resolve(invoke, result, args.scopes)
          !args.interactive || intent == null -> invoke.reject("Sign in to Google Drive again", SIGN_IN_AGAIN)
          else -> startIntentSenderForResult(invoke, IntentSenderRequest.Builder(intent.intentSender).build(), "authorized")
        }
      }
      .addOnFailureListener { invoke.reject(it.message ?: "Google sign-in failed") }
  }

  @ActivityCallback
  fun authorized(invoke: Invoke, result: ActivityResult) {
    if (result.resultCode != Activity.RESULT_OK) {
      invoke.reject("Google sign-in was cancelled")
      return
    }
    try {
      val args = invoke.parseArgs(AuthorizeArgs::class.java)
      resolve(invoke, client.getAuthorizationResultFromIntent(result.data), args.scopes)
    } catch (e: Exception) {
      invoke.reject(e.message ?: "Google sign-in failed")
    }
  }

  private fun resolve(invoke: Invoke, result: AuthorizationResult, scopes: List<String>) {
    val token = result.accessToken
    if (token == null) {
      invoke.reject("Google sent no access token")
      return
    }
    // Google answers `email` with its full URL.
    val granted = result.grantedScopes
    if (!scopes.all { it in granted || "https://www.googleapis.com/auth/userinfo.$it" in granted }) {
      invoke.reject("pkhemu needs access to its folder in your Google Drive. Sign in again and allow it.", SIGN_IN_AGAIN)
      return
    }
    invoke.resolve(JSObject().put("token", token))
  }

  @Command
  fun clearToken(invoke: Invoke) {
    val args = invoke.parseArgs(ClearTokenArgs::class.java)
    client.clearToken(ClearTokenRequest.builder().setToken(args.token).build())
      .addOnSuccessListener { invoke.resolve() }
      .addOnFailureListener { invoke.reject(it.message ?: "Couldn't clear the Google token") }
  }

  @Command
  fun revokeAccess(invoke: Invoke) {
    val args = invoke.parseArgs(RevokeAccessArgs::class.java)
    val request = RevokeAccessRequest.builder()
      .setAccount(Account(args.account, "com.google"))
      .setScopes(args.scopes.map { Scope(it) })
      .build()
    client.revokeAccess(request)
      .addOnSuccessListener { invoke.resolve() }
      .addOnFailureListener { invoke.reject(it.message ?: "Couldn't revoke Google Drive access") }
  }
}
