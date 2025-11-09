package dev.droid.simpleota

import android.content.Context
import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.annotations.ReactModule
import dev.droid.simpleota.bsdiff.BsDiff
import java.io.File
import java.io.FileOutputStream

@ReactModule(name = ReactNativeSimpleOtaModule.NAME)
class ReactNativeSimpleOtaModule(reactContext: ReactApplicationContext) :
  NativeSimpleOtaSpec(reactContext) {

  private val storage =
    ReactNativeSimpleOtaStorage(reactContext.applicationContext)

  override fun setUpdate(bundleVersion: String?, bundlePath: String?) {
    if (bundlePath == null || bundleVersion == null) {
      return
    }
    val file = File(bundlePath)
    if (file.exists().not()) {
      return
    }
    storage.setUpdate(bundleVersion, bundlePath)
  }


  override fun getBundleVersion(): String? {
    return storage.getBundleVersion()
  }

  override fun getCurrentBundlePath(): String? {
    return getJSBundleFile(reactApplicationContext) ?: getDefaultJSBundlePath()
  }

  override fun patch(
    currentBundlePath: String?,
    newBundlePath: String?,
    patchPath: String?,
    promise: Promise?
  ) {
    if (currentBundlePath == null || newBundlePath == null || patchPath == null || promise == null) {
      return
    }
    val result = BsDiff.patch(currentBundlePath, newBundlePath, patchPath);
    promise.resolve(result == 0);
  }

  override fun rollbackToDefaultBundle() {
    val defaultJSBundleFilePath = "index.android.bundle"
    val assetManager = reactApplicationContext.applicationContext.assets
    val files = assetManager.list("") ?: return
    if (defaultJSBundleFilePath !in files) {
      return
    }
    storage.clearJSBundlePath()
  }

  private fun getDefaultJSBundlePath(): String? {
    val defaultJSBundleFileName = "index.android.bundle"
    val assetManager = reactApplicationContext.applicationContext.assets
    val files = assetManager.list("") ?: return null
    val defaultJSBundleFilePath = File(
      reactApplicationContext.applicationContext.filesDir,
      defaultJSBundleFileName
    )
    if (defaultJSBundleFileName !in files) {
      return null
    } else {
      assetManager.open(defaultJSBundleFileName).use { input ->
        FileOutputStream(defaultJSBundleFilePath).use { output ->
          input.copyTo(output)
        }
      }
    }

    return defaultJSBundleFilePath.absolutePath;
  }

  companion object {
    const val NAME = "ReactNativeSimpleOta"

    fun getJSBundleFile(context: Context): String? {
      val sharedPreferences = ReactNativeSimpleOtaStorage(context)
      val filePath = sharedPreferences.getBundlePath() ?: return null
      Log.d("ReactNativeSimpleOta", "BundlePath $filePath")
      if (File(filePath).exists().not()) {
        return null
      }
      return filePath
    }

  }
}
