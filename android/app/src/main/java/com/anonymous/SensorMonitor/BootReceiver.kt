package com.anonymous.SensorMonitor

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

/**
 * Launches app automatically after device boot (kiosk mode)
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            Log.d(TAG, "Boot completed - launching app")
            try {
                val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)?.apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                }
                launchIntent?.let { context.startActivity(it) }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to launch app on boot", e)
            }
        }
    }

    companion object {
        private const val TAG = "BootReceiver"
    }
}
