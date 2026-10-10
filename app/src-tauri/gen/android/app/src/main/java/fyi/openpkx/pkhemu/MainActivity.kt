package fyi.openpkx.pkhemu

import android.content.Intent
import android.content.res.Configuration
import android.graphics.Color
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Bundle
import android.view.HapticFeedbackConstants
import android.view.View
import android.view.ViewGroup
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.activity.enableEdgeToEdge
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.core.view.updateLayoutParams

class MainActivity : TauriActivity() {
  private val gravity by lazy { Gravity() }

  override fun onCreate(savedInstanceState: Bundle?) {
    // Tauri can't give a second activity in the same process a webview. That happens when sync kept the process alive
    // after the player swiped the app away, so start a new process. Its launch sync picks up the rest. The exit comes
    // before super.onCreate, so Tauri starts nothing for this activity.
    if (windowGone) {
      startActivity(Intent.makeRestartActivityTask(componentName))
      Runtime.getRuntime().exit(0)
    }
    enableEdgeToEdge()
    // enableEdgeToEdge picks icons for the device theme, but the splash is violet in both.
    WindowCompat.getInsetsController(window, window.decorView).run {
      isAppearanceLightStatusBars = false
      isAppearanceLightNavigationBars = false
    }
    super.onCreate(savedInstanceState)
  }

  override fun onResume() {
    super.onResume()
    gravity.resume()
  }

  override fun onPause() {
    super.onPause()
    gravity.pause()
  }

  override fun onDestroy() {
    super.onDestroy()
    if (!isChangingConfigurations) windowGone = true
  }

  override fun onWebViewCreate(webView: WebView) {
    val light = (resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) != Configuration.UI_MODE_NIGHT_YES
    webView.addJavascriptInterface(SystemBars(webView, light), "androidSystemBars")
    webView.addJavascriptInterface(Haptics(webView), "androidHaptics")
    webView.addJavascriptInterface(gravity, "androidGravity")
    ViewCompat.setOnApplyWindowInsetsListener(webView) { view, insets ->
      val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
      val allBars = insets.getInsetsIgnoringVisibility(WindowInsetsCompat.Type.systemBars())
      val cutout = insets.getInsets(WindowInsetsCompat.Type.displayCutout())
      // Where a bar is hidden the game goes full screen, even under a cutout on that edge.
      fun margin(bar: Int, barIfShown: Int, cut: Int) = if (bar == 0 && barIfShown > 0) 0 else maxOf(bar, cut)
      // WebView draws under its own padding, so inset it with margins instead.
      view.updateLayoutParams<ViewGroup.MarginLayoutParams> {
        setMargins(
          margin(bars.left, allBars.left, cutout.left),
          margin(bars.top, allBars.top, cutout.top),
          margin(bars.right, allBars.right, cutout.right),
          margin(bars.bottom, allBars.bottom, cutout.bottom),
        )
      }
      insets
    }
    // Gamepad keys only reach the WebView once it has focus, which otherwise takes a first touch.
    webView.post { webView.requestFocus() }
  }

  private companion object {
    var windowGone = false
    const val SAMPLING_PERIOD_US = 33_333
    const val SPLASH_COLOR = 0xFF6D4AFF.toInt()
  }

  private fun windowColor(light: Boolean) = if (light) Color.WHITE else 0xFF0E0B1C.toInt()

  inner class SystemBars(private val webView: WebView, private var light: Boolean) {
    private var splash = true

    init {
      update()
    }

    @JavascriptInterface
    fun setHidden(hidden: Boolean) = runOnUiThread {
      val controller = WindowCompat.getInsetsController(window, window.decorView)
      controller.systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
      if (hidden) controller.hide(WindowInsetsCompat.Type.systemBars())
      else controller.show(WindowInsetsCompat.Type.systemBars())
    }

    // The WebView sits inside margins, so the window background shows behind the bars.
    @JavascriptInterface
    fun setLight(light: Boolean) = runOnUiThread {
      this.light = light
      update()
    }

    // Until the web splash is gone the bars stay on its violet, as the system splash left them.
    @JavascriptInterface
    fun splashHidden() = runOnUiThread {
      splash = false
      update()
    }

    private fun update() {
      val controller = WindowCompat.getInsetsController(window, window.decorView)
      controller.isAppearanceLightStatusBars = light && !splash
      controller.isAppearanceLightNavigationBars = light && !splash
      val color = if (splash) SPLASH_COLOR else windowColor(light)
      window.decorView.setBackgroundColor(color)
      webView.setBackgroundColor(color)
    }
  }

  class Haptics(private val view: View) {
    @JavascriptInterface
    fun tap() {
      view.post { view.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY) }
    }
  }

  // read() runs on every frame while the game's JS thread waits on it, so each reading is formatted once when it arrives.
  // start and stop go through the UI thread to stay in order with onPause and onResume.
  inner class Gravity : SensorEventListener {
    private val sensors = getSystemService(SENSOR_SERVICE) as SensorManager
    private val sensor: Sensor? = sensors.getDefaultSensor(Sensor.TYPE_GRAVITY)
    private var wanted = false
    private var resumed = false
    @Volatile private var latest: String? = null

    @JavascriptInterface
    fun start() = runOnUiThread {
      wanted = true
      listen()
    }

    @JavascriptInterface
    fun stop() = runOnUiThread {
      wanted = false
      unlisten()
    }

    @JavascriptInterface
    fun read(): String? = latest

    fun resume() {
      resumed = true
      listen()
    }

    fun pause() {
      resumed = false
      unlisten()
    }

    private fun listen() {
      if (wanted && resumed && sensor != null) sensors.registerListener(this, sensor, SAMPLING_PERIOD_US)
    }

    private fun unlisten() {
      sensors.unregisterListener(this)
      latest = null
    }

    override fun onSensorChanged(event: SensorEvent) {
      val (x, y, z) = event.values
      latest = "$x,$y,$z"
    }

    override fun onAccuracyChanged(sensor: Sensor, accuracy: Int) {}
  }
}
