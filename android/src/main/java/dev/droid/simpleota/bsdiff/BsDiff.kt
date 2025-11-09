package dev.droid.simpleota.bsdiff

object BsDiff {
  init {
    // Load your compiled .so library (from CMake)
    System.loadLibrary("react-native-simple-ota") // or "bsdiff" — match your CMake target name
  }

  // Native function defined in your JNI C++ file
  external fun patch(currentBundlePath: String, otaBundlePath: String, patchPath: String): Int
}
