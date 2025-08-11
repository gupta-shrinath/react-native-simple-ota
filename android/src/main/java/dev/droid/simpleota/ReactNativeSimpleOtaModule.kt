package dev.droid.simpleota

import android.app.Application
import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.annotations.ReactModule
import java.io.File

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
    storage.setUpdate(bundleVersion,bundlePath)
  }


  override fun getBundleVersion(): String? {
    return storage.getBundleVersion()
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

  companion object {
    const val NAME = "ReactNativeSimpleOta"

    fun getJSBundleFile(context: Application): String? {
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
