#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(PvRhino, NSObject)

RCT_EXTERN_METHOD(create: (NSString *)modelPath
                  contextPath: (NSString *)contextPath
                  sensitivity: (float)sensitivity
                  resolver: (RCTPromiseResolveBlock)resolve 
                  rejecter: (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(delete: (NSString *)handle)

RCT_EXTERN_METHOD(process: (NSString *)handle 
                  pcm:(NSArray<NSNumber>)pcm 
                  resolver: (RCTPromiseResolveBlock)resolve 
                  rejecter: (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getInference: (NSString *)handle
                  resolver: (RCTPromiseResolveBlock)resolve
                  rejecter: (RCTPromiseRejectBlock)reject)

@end
