package fyi.openpkx.pkhemu

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
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
    val notification = notification(percent)
    val type = if (Build.VERSION.SDK_INT >= 29) ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC else 0
    ServiceCompat.startForeground(this, NOTIFICATION, notification, type)
    running = this
    handler.removeCallbacksAndMessages(null)
    handler.postDelayed({ stopSelf() }, TIMEOUT_MS)
    // Sync may have ended between startForegroundService and here.
    if (!wanted) stopSelf()
    return START_NOT_STICKY
  }

  private fun notification(percent: Int?): Notification {
    val open = PendingIntent.getActivity(
      this,
      0,
      packageManager.getLaunchIntentForPackage(packageName),
      PendingIntent.FLAG_IMMUTABLE,
    )
    val builder = NotificationCompat.Builder(this, CHANNEL)
      .setSmallIcon(R.drawable.ic_sync)
      .setContentTitle(getString(R.string.sync_notification))
      .setContentIntent(open)
      .setOngoing(true)
      .setSilent(true)
    if (stopping) {
      return builder.setContentText(getString(R.string.sync_stopping)).build()
    }
    val stop = PendingIntent.getBroadcast(
      this,
      1,
      Intent(this, SyncStopReceiver::class.java),
      PendingIntent.FLAG_IMMUTABLE,
    )
    builder.addAction(R.drawable.ic_stop, getString(R.string.sync_stop), stop)
    if (percent != null) {
      builder.setProgress(100, percent, false).setContentText("$percent%")
    } else {
      builder.setProgress(0, 0, true)
    }
    return builder.build()
  }

  override fun onTimeout(startId: Int, fgsType: Int) {
    stopSelf()
  }

  override fun onDestroy() {
    running = null
    handler.removeCallbacksAndMessages(null)
    // A progress update posted between stopSelf and here would leave the notification behind.
    getSystemService(NotificationManager::class.java).cancel(NOTIFICATION)
  }

  companion object {
    private const val CHANNEL = "sync"
    private const val NOTIFICATION = 1
    // A stuck sync shouldn't hold the process and its notification forever.
    private const val TIMEOUT_MS = 60L * 60 * 1000
    private val handler = Handler(Looper.getMainLooper())
    @Volatile private var wanted = false
    @Volatile private var running: SyncService? = null
    @Volatile private var percent: Int? = null
    @Volatile private var stopping = false

    fun start(context: Context) {
      wanted = true
      stopping = false
      try {
        ContextCompat.startForegroundService(context, Intent(context, SyncService::class.java))
      } catch (e: IllegalStateException) {
        Log.w("SyncService", "starting the sync service", e)
      }
    }

    fun progress(context: Context, percent: Int?) {
      this.percent = percent
      repost(context)
    }

    fun stopping(context: Context) {
      stopping = true
      repost(context)
    }

    private fun repost(context: Context) {
      val notifications = context.getSystemService(NotificationManager::class.java)
      handler.post {
        val service = running
        if (wanted && service != null) notifications.notify(NOTIFICATION, service.notification(percent))
      }
    }

    // Stopping a service before it calls startForeground crashes the app, so a service still starting stops itself.
    fun stop() {
      wanted = false
      percent = null
      stopping = false
      handler.post { if (!wanted) running?.stopSelf() }
    }
  }
}

class SyncStopReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    NativeSync.stop()
    SyncService.stopping(context)
  }
}

object NativeSync {
  @JvmStatic external fun stop()
}
