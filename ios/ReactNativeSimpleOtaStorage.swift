import Foundation

class ReactNativeSimpleOtaStorage {
  
  private let bundlePathKey = "dev.droid.simpleota.bundlePath"
  private let bundleVersionKey = "dev.droid.simpleota.bundleVersion"
  private let userDefaults = UserDefaults.standard
  
  func setUpdate(bundleVersion: String, bundlePath: String) {
    print("ReactNativeSimpleOta setUpdate \(bundleVersion) \(bundlePath)")
    userDefaults.set(bundleVersion, forKey: bundleVersionKey)
    userDefaults.set(bundlePath, forKey: bundlePathKey)
  }
  
  func getBundlePath() -> String? {
    return userDefaults.string(forKey: bundlePathKey)
  }
  
  func getBundleVersion() -> String? {
    return userDefaults.string(forKey: bundleVersionKey)
  }
  
  func clearJSBundlePath() {
    userDefaults.removeObject(forKey: bundlePathKey)
    userDefaults.removeObject(forKey: bundleVersionKey)
  }
}
