/*
    Copyright 2020 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is
    located in the "LICENSE" file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the
    License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
    express or implied. See the License for the specific language governing permissions and
    limitations under the License.
*/

package ai.picovoice.reactnative.rhino;

import android.content.res.Resources;
import android.util.Log;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.WritableMap;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

import ai.picovoice.rhino.Rhino;
import ai.picovoice.rhino.RhinoException;
import ai.picovoice.rhino.RhinoInference;

public class RhinoState{
  public Rhino handle;
  public boolean isFinalized;
  public boolean needsReset;

  public RhinoState(Rhino handle){
    this.handle = handle;
    this.isFinalized = false;
    this.needsReset = false;
  }
}

public class RhinoModule extends ReactContextBaseJavaModule {

  private static final String LOG_TAG = "PvRhino";

  private final ReactApplicationContext reactContext;
  private final Map<String, Rhino> rhinoPool = new HashMap<String, Rhino>();

  public RhinoModule(ReactApplicationContext reactContext) {
    super(reactContext);
    this.reactContext = reactContext;

    try {
      copyResourceFiles();
    } catch (IOException e) {
      Log.e(LOG_TAG, e.toString());
    }
  }

  @Override
  public String getName() {
    return "PvRhino";
  }

  @Override
  public Map<String, Object> getConstants() {

    // default model file
    final File resourceDirectory = reactContext.getFilesDir();
    final Map<String, Object> constants = new HashMap<>();
    constants.put("DEFAULT_MODEL_PATH", new File(resourceDirectory, "rhino_params.pv").getAbsolutePath());

    return constants;
  }

  @ReactMethod
  public void create(String modelPath, String contextPath, Float sensitivity, Promise promise) {

    try {
      Rhino rhino = new Rhino(modelPath, contextPath, sensitivity.floatValue());
      String rhinoKey = String.valueOf(System.identityHashCode(rhino));
      rhinoPool.put(rhinoKey, new RhinoState(rhino));

      WritableMap paramMap = Arguments.createMap();
      paramMap.putString("handle", String.valueOf(System.identityHashCode(rhino)));
      paramMap.putInt("frameLength", rhino.getFrameLength());
      paramMap.putInt("sampleRate", rhino.getSampleRate());
      paramMap.putString("version", rhino.getVersion());
      paramMap.putString("contextInfo", rhino.getContextInformation());
      promise.resolve(paramMap);
    } catch (RhinoException e) {
      promise.reject(e.toString());
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
        promise.reject("Invalid Rhino handle provided to native module.");
        return;
      }

      RhinoState rhino = rhinoPool.get(handle);
      WritableMap inferenceMap = Arguments.createMap();  
      if(rhino.needsReset){
        inferenceMap.putMap("isFinalized", false);
      }

      ArrayList<Object> pcmArrayList = pcmArray.toArrayList();
      short[] buffer = new short[pcmArray.size()];
      for (int i = 0; i < pcmArray.size(); i++) {
        buffer[i] = ((Number) pcmArrayList.get(i)).shortValue();
      }

      boolean isFinalized = rhino.process(buffer);      
      inferenceMap.putMap("isFinalized", isFinalized);

      if(!isFinalized){        
        promise.resolve(inferenceMap);
        return;
      }
      else{
        rhino.needsReset = true;
      }

      // update rhino
      rhinoPool.put(handle, rhino);

      RhinoInference inference = rhino.getInference();      
      boolean isUnderstood = inference.getIsUnderstood()
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
      promise.reject(e.toString());
    }
  }

  @ReactMethod
  public void reset(String handle) {
    if (rhinoPool.containsKey(handle)) {
      RhinoState rhino = rhinoPool.get(handle);
      rhino.isFinalized = false;
      rhino.needsReset = false;      
      rhinoPool.put(handle, rhino);
    }
  }

  private void copyResourceFiles() throws IOException {
    final Resources resources = reactContext.getResources();

    copyResourceFile(
      R.raw.rhino_params,
      resources.getResourceEntryName(R.raw.rhino_params) + ".pv");
  }

  private void copyResourceFile(int resourceId, String filename) throws IOException {
    final Resources resources = reactContext.getResources();
    try (
      InputStream is = new BufferedInputStream(resources.openRawResource(resourceId), 256);
      OutputStream os = new BufferedOutputStream(reactContext.openFileOutput(filename, ReactApplicationContext.MODE_PRIVATE), 256)
    ) {
      int r;
      while ((r = is.read()) != -1) {
        os.write(r);
      }
      os.flush();
    }
  }
}
