import Foundation

@objc(ReactNativeSimpleOta)
public class ReactNativeSimpleOta: NSObject {
  
  private let storage = ReactNativeSimpleOtaStorage()
  
  @objc
  func setUpdate(_ bundleVersion: String, bundlePath: String) {
    let fileManager = FileManager.default
    guard fileManager.fileExists(atPath: bundlePath) else {
      return
    }
    storage.setUpdate(bundleVersion: bundleVersion, bundlePath: bundlePath)
  }
  
  @objc
  func rollbackToDefaultBundle() {
    if let resourcePath = Bundle.main.path(forResource: "main", ofType: "jsbundle") {
      storage.clearJSBundlePath()
    }
  }
  
  @objc
  func getBundleVersion() -> String? {
    return storage.getBundleVersion()
  }
  
  public static func getJSBundleFile() -> String? {
    let storage = ReactNativeSimpleOtaStorage()
    guard let filePath = storage.getBundlePath(),
          FileManager.default.fileExists(atPath: filePath) else {
      return nil
    }
    print("ReactNativeSimpleOta: BundlePath \(filePath)")
    return filePath
  }
}

