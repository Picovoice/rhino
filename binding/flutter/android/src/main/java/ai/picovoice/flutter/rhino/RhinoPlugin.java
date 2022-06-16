//
// Copyright 2021-2022 Picovoice Inc.
//
// You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
// file accompanying this source.
//
// Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
// an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
// specific language governing permissions and limitations under the License.
//

package ai.picovoice.flutter.rhino;

import android.content.Context;

import androidx.annotation.NonNull;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

import ai.picovoice.rhino.*;
import io.flutter.embedding.engine.plugins.FlutterPlugin;
import io.flutter.plugin.common.MethodCall;
import io.flutter.plugin.common.MethodChannel;
import io.flutter.plugin.common.MethodChannel.MethodCallHandler;
import io.flutter.plugin.common.MethodChannel.Result;

public class RhinoPlugin implements FlutterPlugin, MethodCallHandler {

  private enum Method {
    CREATE,
    PROCESS,
    DELETE
  }

  private Context flutterContext;
  private MethodChannel channel;
  private final Map<String, Rhino> rhinoPool = new HashMap<>();

  @Override
  public void onAttachedToEngine(@NonNull FlutterPluginBinding flutterPluginBinding) {
    flutterContext = flutterPluginBinding.getApplicationContext();
    channel = new MethodChannel(flutterPluginBinding.getBinaryMessenger(), "rhino");
    channel.setMethodCallHandler(this);
  }

  @Override
  public void onMethodCall(@NonNull MethodCall call, @NonNull Result result) {
    Method method;
    try {
      method = Method.valueOf(call.method.toUpperCase());
    } catch (IllegalArgumentException e) {
      result.error(
              RhinoRuntimeException.class.getSimpleName(),
              String.format("Rhino method '%s' is not a valid function", call.method),
              null);
      return;
    }

    switch (method) {
      case CREATE:
        try {
          String accessKey = call.argument("accessKey");
          String modelPath = call.argument("modelPath");
          String contextPath = call.argument("contextPath");
          Double sensitivity = call.argument("sensitivity");
          Double endpointDurationSec = call.argument("endpointDurationSec");
          Boolean requireEndpoint = call.argument("requireEndpoint");

          Rhino.Builder rhinoBuilder = new Rhino.Builder()
                  .setAccessKey(accessKey)
                  .setModelPath(modelPath)
                  .setContextPath(contextPath);

          if (sensitivity != null) {
            rhinoBuilder.setSensitivity(sensitivity.floatValue());
          }

          if (endpointDurationSec != null) {
            rhinoBuilder.setEndpointDurationSec(endpointDurationSec.floatValue());
          }

          if (requireEndpoint != null) {
            rhinoBuilder.setRequireEndpoint(requireEndpoint);
          }

          Rhino rhino = rhinoBuilder.build(flutterContext);
          rhinoPool.put(String.valueOf(System.identityHashCode(rhino)), rhino);

          Map<String, Object> param = new HashMap<>();
          param.put("handle", String.valueOf(System.identityHashCode(rhino)));
          param.put("contextInfo", rhino.getContextInformation());
          param.put("frameLength", rhino.getFrameLength());
          param.put("sampleRate", rhino.getSampleRate());
          param.put("version", rhino.getVersion());

          result.success(param);
        } catch (RhinoException e) {
          result.error(e.getClass().getSimpleName(), e.getMessage(), null);
        } catch (Exception e) {
          result.error(RhinoException.class.getSimpleName(), e.getMessage(), null);
        }
        break;
      case PROCESS:
        try {
          String handle = call.argument("handle");
          ArrayList<Integer> pcmList = call.argument("frame");

          if (!rhinoPool.containsKey(handle)) {
            result.error(
                    RhinoInvalidStateException.class.getSimpleName(),
                    "Invalid rhino handle provided to native module",
                    null);
            return;
          }

          short[] pcm = null;
          if (pcmList != null) {
            pcm = new short[pcmList.size()];
            for (int i = 0; i < pcmList.size(); i++) {
              pcm[i] = pcmList.get(i).shortValue();
            }
          }

          Rhino rhino = rhinoPool.get(handle);
          boolean isFinalized = rhino.process(pcm);

          Map<String, Object> param = new HashMap<>();
          param.put("isFinalized", isFinalized);

          if (isFinalized) {
            RhinoInference inference = rhino.getInference();
            param.put("isUnderstood", inference.getIsUnderstood());

            if (inference.getIsUnderstood()) {
              param.put("intent", inference.getIntent());
              param.put("slots", inference.getSlots());
            }
          }

          result.success(param);
        } catch (RhinoException e) {
          result.error(
                  e.getClass().getSimpleName(),
                  e.getMessage(),
                  null);
        }
        break;
      case DELETE:
        String handle = call.argument("handle");

        if (!rhinoPool.containsKey(handle)) {
          result.error(
                  RhinoInvalidArgumentException.class.getSimpleName(),
                  "Invalid Rhino handle provided to native module.",
                  null);
          return;
        }

        Rhino rhino = rhinoPool.get(handle);
        rhino.delete();
        rhinoPool.remove(handle);

        result.success(null);
        break;
    }
  }

  @Override
  public void onDetachedFromEngine(@NonNull FlutterPluginBinding binding) {
    channel.setMethodCallHandler(null);
  }
}
