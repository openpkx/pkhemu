package fyi.openpkx.pkhemu

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat

class SyncService : Service() {
  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val channel = NotificationChannel(CHANNEL, getString(R.string.sync_channel), NotificationManager.IMPORTANCE_LOW)
    getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    val open = PendingIntent.getActivity(
      this,
      0,
      packageManager.getLaunchIntentForPackage(packageName),
      PendingIntent.FLAG_IMMUTABLE,
    )
    val notification = NotificationCompat.Builder(this, CHANNEL)
      .setSmallIcon(R.drawable.ic_sync)
      .setContentTitle(getString(R.string.sync_notification))
      .setContentIntent(open)
      .setOngoing(true)
      .setSilent(true)
      .build()
    val type = if (Build.VERSION.SDK_INT >= 29) ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC else 0
    ServiceCompat.startForeground(this, NOTIFICATION, notification, type)
    running = this
    handler.removeCallbacksAndMessages(null)
    handler.postDelayed({ stopSelf() }, TIMEOUT_MS)
    // Sync may have ended between startForegroundService and here.
    if (!wanted) stopSelf()
    return START_NOT_STICKY
  }

  override fun onTimeout(startId: Int, fgsType: Int) {
    stopSelf()
  }

  override fun onDestroy() {
    running = null
    handler.removeCallbacksAndMessages(null)
  }

  companion object {
    private const val CHANNEL = "sync"
    private const val NOTIFICATION = 1
    // A stuck sync shouldn't hold the process and its notification forever.
    private const val TIMEOUT_MS = 60L * 60 * 1000
    private val handler = Handler(Looper.getMainLooper())
    @Volatile private var wanted = false
    @Volatile private var running: SyncService? = null

    fun start(context: Context) {
      wanted = true
      try {
        ContextCompat.startForegroundService(context, Intent(context, SyncService::class.java))
      } catch (e: IllegalStateException) {
        Log.w("SyncService", "starting the sync service", e)
      }
    }

    // Stopping a service before it calls startForeground crashes the app, so a service still starting stops itself.
    fun stop() {
      wanted = false
      handler.post { if (!wanted) running?.stopSelf() }
    }
  }
}
