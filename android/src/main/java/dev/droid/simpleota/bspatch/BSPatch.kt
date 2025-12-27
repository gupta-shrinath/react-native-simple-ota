package dev.droid.simpleota.bspatch

object BSPatch {
  init {
    System.loadLibrary("react-native-simple-ota")
  }

  // Native function defined in your JNI C++ file
  external fun patch(currentBundlePath: String, otaBundlePath: String, patchPath: String): Int
}
