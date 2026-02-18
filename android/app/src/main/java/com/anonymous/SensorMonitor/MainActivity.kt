package com.anonymous.SensorMonitor
import expo.modules.splashscreen.SplashScreenManager

import android.content.Intent
import android.os.Bundle
import android.os.Process

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

import expo.modules.ReactActivityDelegateWrapper

class MainActivity : ReactActivity() {

  override fun onCreate(savedInstanceState: Bundle?) {
    // Native crash handler: auto-restart app on crash
    Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
      android.util.Log.e("MainActivity", "Uncaught exception - restarting app", throwable)
      try {
        val intent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_CLEAR_TASK or Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED)
        }
        startActivity(intent)
      } catch (e: Exception) {
        android.util.Log.e("MainActivity", "Failed to restart", e)
      }
      Process.killProcess(Process.myPid())
      System.exit(1)
    }
    // Set the theme to AppTheme BEFORE onCreate to support
    // coloring the background, status bar, and navigation bar.
    // This is required for expo-splash-screen.
    // setTheme(R.style.AppTheme);
    // @generated begin expo-splashscreen - expo prebuild (DO NOT MODIFY) sync-f3ff59a738c56c9a6119210cb55f0b613eb8b6af
    SplashScreenManager.registerOnActivity(this)
    // @generated end expo-splashscreen
    super.onCreate(null)
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "main"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return ReactActivityDelegateWrapper(
          this,
          BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
          object : DefaultReactActivityDelegate(
              this,
              mainComponentName,
              fabricEnabled
          ){})
  }

  /**
    * Kiosk mode: ignore back button to prevent exiting app
    */
  @Deprecated("Deprecated in Java")
  override fun onBackPressed() {
    // Do nothing - prevent exit in kiosk mode
  }

  override fun invokeDefaultOnBackPressed() {
    // Do nothing - prevent exit in kiosk mode
  }
}
