#import "SimpleOta.h"

@interface RCT_EXTERN_MODULE(ReactNativeSimpleOta, NSObject)

RCT_EXTERN_METHOD(setUpdate:(NSString *)bundleVersion bundlePath:(NSString *)bundlePath)
RCT_EXTERN_METHOD(rollbackToDefaultBundle)
RCT_EXTERN_METHOD(getBundleVersion)

@end
