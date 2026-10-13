package fyi.openpkx.pkhemu

import android.app.Activity
import android.os.Build

fun installedByPlay(activity: Activity): Boolean {
  val packages = activity.packageManager
  val installer = if (Build.VERSION.SDK_INT >= 30) {
    packages.getInstallSourceInfo(activity.packageName).installingPackageName
  } else {
    @Suppress("DEPRECATION") packages.getInstallerPackageName(activity.packageName)
  }
  return installer == "com.android.vending"
}
