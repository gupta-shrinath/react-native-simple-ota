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
      
      // Call the Objective-C class method using Swift dot notation.
      // Ensure the argument labels match your BSPatch.h definition.
      let result = BSPatch.bsdiffPatch(currentBundlePath,
                                      otaBundlePath: newBundlePath,
                                      patchPath: patchPath)
      
      // Handle the result based on your bsdiff implementation (usually 0 is success)
      if result == 0 {
          resolve(true)
      } else {
          let error = NSError(domain: "BSPatchError", code: Int(result), userInfo: nil)
          reject("patch_failed", "Failed to apply patch with code \(result)", error)
      }
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

