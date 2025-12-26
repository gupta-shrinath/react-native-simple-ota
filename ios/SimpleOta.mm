#import "SimpleOta.h"

@interface RCT_EXTERN_MODULE(ReactNativeSimpleOta, NSObject)

RCT_EXTERN_METHOD(setUpdate:(NSString *)bundleVersion bundlePath:(NSString *)bundlePath)
RCT_EXTERN_METHOD(rollbackToDefaultBundle)
RCT_EXTERN_METHOD(getBundleVersion)
RCT_EXTERN_METHOD(getCurrentBundlePath)
RCT_EXTERN_METHOD(patch:(NSString *)currentBundlePath
                  newBundlePath:(NSString *)newBundlePath
                  patchPath:(NSString *)patchPath
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

@end
