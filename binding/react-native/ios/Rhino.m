//
// Copyright 2020 Picovoice Inc.
//
// You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
// file accompanying this source.
//
// Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
// an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
// specific language governing permissions and limitations under the License.
//

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(PvRhino, NSObject)

RCT_EXTERN_METHOD(create: (NSString *)accessKey
                  modelPath: (NSString *)modelPath
                  contextPath: (NSString *)contextPath
                  sensitivity: (float)sensitivity
                  endpointDurationSec: (float)endpointDurationSec
                  requireEndpoint: (BOOL)requireEndpoint
                  resolver: (RCTPromiseResolveBlock)resolve
                  rejecter: (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(delete: (NSString *)handle)

RCT_EXTERN_METHOD(process: (NSString *)handle
                  pcm:(NSArray<NSNumber>)pcm
                  resolver: (RCTPromiseResolveBlock)resolve
                  rejecter: (RCTPromiseRejectBlock)reject)

+ (BOOL)requiresMainQueueSetup
{
    return YES;
}

@end
