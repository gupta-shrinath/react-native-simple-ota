import Foundation
import React

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
    if Bundle.main.path(forResource: "main", ofType: "jsbundle") != nil{
      storage.clearJSBundlePath()
    }
  }
  
  @objc
  func getBundleVersion() -> String? {
    return storage.getBundleVersion()
  }
  
  @objc
  func getCurrentBundlePath() -> String? {
    return ReactNativeSimpleOta.getJSBundleFile() ?? getDefaultJSBundlePath()
  }
  
  @objc func patch(_ currentBundlePath: String,
                   newBundlePath: String,
                   patchPath: String,
                   resolve: @escaping RCTPromiseResolveBlock,
                   reject: @escaping RCTPromiseRejectBlock) -> Void {
      let result = BSPatch.patch(currentBundlePath,
                                      otaBundlePath: newBundlePath,
                                      patchPath: patchPath)
      resolve(result)
  }

  func getDefaultJSBundlePath() -> String? {
    return Bundle.main.path(forResource: "main", ofType: "jsbundle")
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

