#import <React/RCTBridgeModule.h>

// Objective-C bridge registration for VetoSyncModule (Swift class)
// Exposes binary blocklist file writing to React Native.
@interface RCT_EXTERN_MODULE(VetoSyncModule, NSObject)

RCT_EXTERN_METHOD(
  writeBinaryBlocklist:(NSString *)base64Data
  labelsJson:(NSString *)labelsJson
  resolver:(RCTPromiseResolveBlock)resolver
  rejecter:(RCTPromiseRejectBlock)rejecter
)

RCT_EXTERN_METHOD(
  getSyncStatus:(RCTPromiseResolveBlock)resolver
  rejecter:(RCTPromiseRejectBlock)rejecter
)

@end
