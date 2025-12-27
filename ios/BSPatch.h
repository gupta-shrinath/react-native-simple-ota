#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface BSPatch : NSObject

+ (int)patch:(NSString *)currentBundlePath
    otaBundlePath:(NSString *)otaBundlePath
        patchPath:(NSString *)patchPath;

@end

// Keep the C function here ONLY if you need it globally,
// otherwise, the class method above is better for Swift.
#ifdef __cplusplus
extern "C" {
#endif
int patch(const char *current, const char *ota, const char *patch);
#ifdef __cplusplus
}
#endif

NS_ASSUME_NONNULL_END
