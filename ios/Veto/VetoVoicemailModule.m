#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(VetoVoicemailModule, NSObject)

RCT_EXTERN_METHOD(transcribeAndClassify:(NSString *)audioFileURL
                  resolver:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

RCT_EXTERN_METHOD(requestSpeechPermission:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

RCT_EXTERN_METHOD(saveScreenedCall:(NSDictionary *)callData
                  resolver:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

RCT_EXTERN_METHOD(getScreenedCalls:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

RCT_EXTERN_METHOD(markCallHandled:(NSString *)callId
                  action:(NSString *)action
                  resolver:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

RCT_EXTERN_METHOD(deleteScreenedCall:(NSString *)callId
                  resolver:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

@end
