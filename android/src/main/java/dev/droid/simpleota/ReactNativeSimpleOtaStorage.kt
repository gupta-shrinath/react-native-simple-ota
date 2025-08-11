package dev.droid.simpleota

import android.content.Context
import android.content.SharedPreferences
import androidx.core.content.edit

class ReactNativeSimpleOtaStorage(val context: Context) {
  val sharedPreferenceNameKey = "ReactNativeSimpleOta"
  val bundlePathPreferenceKey = "dev.droid.simpleota.bundlePath"
  val bundleVersionPreferenceKey = "dev.droid.simpleota.bundleVersion"

  private val sharedPreferences: SharedPreferences =
    context.getSharedPreferences(sharedPreferenceNameKey, 0)

  fun setUpdate(bundleVersion: String, bundlePath: String) {
    sharedPreferences.edit(commit = true) {
      putString(bundleVersionPreferenceKey,bundleVersion)
      putString(bundlePathPreferenceKey, bundlePath)
    }
  }

  fun getBundleVersion(): String? {
    return sharedPreferences.getString(bundleVersionPreferenceKey, null)
  }

  fun getBundlePath(): String? {
    return sharedPreferences.getString(bundlePathPreferenceKey, null)
  }

  fun clearJSBundlePath() {
    sharedPreferences.edit(commit = true) {
      remove(bundlePathPreferenceKey)
      remove(bundleVersionPreferenceKey)
    }
  }
}
