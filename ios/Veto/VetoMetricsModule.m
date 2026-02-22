#import <React/RCTBridgeModule.h>

// Objective-C bridge registration for VetoMetricsModule (Swift class)
// This file is required to expose the Swift module to React Native's bridge.
@interface RCT_EXTERN_MODULE(VetoMetricsModule, NSObject)

RCT_EXTERN_METHOD(
  addAuditLogEntry:(NSString *)phoneNumber
  type:(NSString *)type
  action:(NSString *)action
  label:(NSString *)label
  resolver:(RCTPromiseResolveBlock)resolver
  rejecter:(RCTPromiseRejectBlock)rejecter
)

RCT_EXTERN_METHOD(
  getMetrics:(RCTPromiseResolveBlock)resolver
  rejecter:(RCTPromiseRejectBlock)rejecter
)

RCT_EXTERN_METHOD(
  resetMetrics:(RCTPromiseResolveBlock)resolver
  rejecter:(RCTPromiseRejectBlock)rejecter
)

@end
