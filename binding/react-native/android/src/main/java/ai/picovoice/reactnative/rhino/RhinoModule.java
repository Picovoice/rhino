/*
    Copyright 2020-2022 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is
    located in the "LICENSE" file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the
    License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
    express or implied. See the License for the specific language governing permissions and
    limitations under the License.
*/

package ai.picovoice.reactnative.rhino;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.WritableMap;

import java.io.File;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

import ai.picovoice.rhino.*;


public class RhinoModule extends ReactContextBaseJavaModule {

  private static final String LOG_TAG = "PvRhino";

  private final ReactApplicationContext reactContext;
  private final Map<String, Rhino> rhinoPool = new HashMap<String, Rhino>();

  public RhinoModule(ReactApplicationContext reactContext) {
    super(reactContext);
    this.reactContext = reactContext;
  }

  @Override
  public String getName() {
    return "PvRhino";
  }

  @ReactMethod
  public void create(
    String accessKey,
    String modelPath,
    String contextPath,
    Float sensitivity,
    Float endpointDurationSec,
    Boolean requireEndpoint,
    Promise promise
  ) {
    try {
      Rhino rhino = new Rhino.Builder()
                      .setAccessKey(accessKey)
                      .setModelPath(modelPath)
                      .setContextPath(contextPath)
                      .setSensitivity(sensitivity)
                      .setRequireEndpoint(requireEndpoint)
                      .setEndpointDurationSec(endpointDurationSec)
                      .build(reactContext);
      String handle = String.valueOf(System.identityHashCode(rhino));
      rhinoPool.put(handle, rhino);

      WritableMap paramMap = Arguments.createMap();
      paramMap.putString("handle", handle);
      paramMap.putInt("frameLength", rhino.getFrameLength());
      paramMap.putInt("sampleRate", rhino.getSampleRate());
      paramMap.putString("version", rhino.getVersion());
      paramMap.putString("contextInfo", rhino.getContextInformation());
      promise.resolve(paramMap);
    } catch (RhinoException e) {
      promise.reject(e.getClass().getSimpleName(), e.getMessage());
    } catch (Exception e) {
      promise.reject(RhinoException.class.getSimpleName(), e.getMessage());
    }
  }

  @ReactMethod
  public void delete(String handle) {
    if (rhinoPool.containsKey(handle)) {
      rhinoPool.get(handle).delete();
      rhinoPool.remove(handle);
    }
  }

  @ReactMethod
  public void process(String handle, ReadableArray pcmArray, Promise promise) {
    try {
      if (!rhinoPool.containsKey(handle)) {
        promise.reject(
          RhinoInvalidStateException.class.getSimpleName(),
          "Invalid Rhino handle provided to native module.");
        return;
      }

      Rhino rhino = rhinoPool.get(handle);

      ArrayList<Object> pcmArrayList = pcmArray.toArrayList();
      short[] buffer = new short[pcmArray.size()];
      for (int i = 0; i < pcmArray.size(); i++) {
        buffer[i] = ((Number) pcmArrayList.get(i)).shortValue();
      }

      boolean isFinalized = rhino.process(buffer);

      WritableMap inferenceMap = Arguments.createMap();
      inferenceMap.putBoolean("isFinalized", isFinalized);

      if(!isFinalized){
        promise.resolve(inferenceMap);
        return;
      }

      RhinoInference inference = rhino.getInference();
      boolean isUnderstood = inference.getIsUnderstood();
      inferenceMap.putBoolean("isUnderstood", isUnderstood);

      if(!isUnderstood){
        promise.resolve(inferenceMap);
        return;
      }

      inferenceMap.putString("intent", inference.getIntent());
      final Map<String, String> slots = inference.getSlots();
      WritableMap slotMap = Arguments.createMap();
      for (Map.Entry<String, String> slot : slots.entrySet()) {
        slotMap.putString(slot.getKey(), slot.getValue());
      }
      inferenceMap.putMap("slots", slotMap);
      promise.resolve(inferenceMap);

    } catch (RhinoException e) {
      promise.reject(e.getClass().getSimpleName(), e.getMessage());
    }
  }
}
