/*
    Copyright 2018-2023 Picovoice Inc.
    You may not use this file except in compliance with the license. A copy of the license is
    located in the "LICENSE" file accompanying this source.
    Unless required by applicable law or agreed to in writing, software distributed under the
    License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
    express or implied. See the License for the specific language governing permissions and
    limitations under the License.
*/

package ai.picovoice.rhino;

import android.content.Context;
import android.util.Log;

import ai.picovoice.android.voiceprocessor.VoiceProcessor;
import ai.picovoice.android.voiceprocessor.VoiceProcessorErrorListener;
import ai.picovoice.android.voiceprocessor.VoiceProcessorException;
import ai.picovoice.android.voiceprocessor.VoiceProcessorFrameListener;

/**
 * High-level Android binding for Rhino Speech-to-Intent engine. It handles recording audio from
 * microphone, processes it in real-time using Rhino, and notifies the client when an intent is
 * inferred from the spoken command. For detailed information about Rhino refer to ${@link Rhino}.
 */
public class RhinoManager {
    private final Rhino rhino;
    private final VoiceProcessor voiceProcessor;
    private final VoiceProcessorFrameListener vpFrameListener;
    private final VoiceProcessorErrorListener vpErrorListener;

    private boolean isFinalized;
    private boolean isListening;

    /**
     * Private constructor.
     *
     * @param rhino         Absolute path to the file containing model parameters.
     * @param callback      It is invoked upon completion of intent inference.
     * @param errorCallback A callback that reports errors encountered while processing audio.
     */
    private RhinoManager(
            final Rhino rhino,
            final RhinoManagerCallback callback,
            final RhinoManagerErrorCallback errorCallback) {

        this.rhino = rhino;
        this.voiceProcessor = VoiceProcessor.getInstance();
        this.vpFrameListener = new VoiceProcessorFrameListener() {
            @Override
            public void onFrame(short[] frame) {
                try {
                    isFinalized = rhino.process(frame);
                    if (isFinalized) {
                        final RhinoInference inference = rhino.getInference();
                        callback.invoke(inference);
                        stop();
                    }
                } catch (RhinoException e) {
                    if (errorCallback != null) {
                        errorCallback.invoke(e);
                    } else {
                        Log.e("RhinoManager", e.toString());
                    }
                }
            }
        };
        this.vpErrorListener = new VoiceProcessorErrorListener() {
            @Override
            public void onError(VoiceProcessorException error) {
                if (errorCallback != null) {
                    errorCallback.invoke(new RhinoException(error));
                } else {
                    Log.e("RhinoManager", error.toString());
                }
            }
        };
    }

    /**
     * Stops recording audio.
     */
    private void stop() throws RhinoException {
        voiceProcessor.removeErrorListener(vpErrorListener);
        voiceProcessor.removeFrameListener(vpFrameListener);
        if (voiceProcessor.getNumFrameListeners() == 0) {
            try {
                voiceProcessor.stop();
            } catch (VoiceProcessorException e) {
                throw new RhinoException(e);
            }
        }
        isListening = false;
    }

    /**
     * Start recording audio from the microphone and infers the user's intent from the spoken
     * command. Once the inference is finalized it will invoke the user provided callback and
     * terminates recording audio.
     */
    public void process() throws RhinoException {
        if (isListening) {
            return;
        }

        this.voiceProcessor.addFrameListener(vpFrameListener);
        this.voiceProcessor.addErrorListener(vpErrorListener);

        try {
            voiceProcessor.start(rhino.getFrameLength(), rhino.getSampleRate());
        } catch (VoiceProcessorException e) {
            throw new RhinoException(e);
        }
        isListening = true;
    }

    /**
     * Releases resources acquired by Rhino. It should be called when disposing the object.
     */
    public void delete() {
        rhino.delete();
    }

    /**
     * Getter for version.
     *
     * @return Version.
     */
    public String getVersion() {
        return rhino.getVersion();
    }

    /**
     * Getter for Rhino context information.
     *
     * @return Context information.
     */
    public String getContextInformation() throws RhinoException {
        return rhino.getContextInformation();
    }

    /**
     * Builder for creating an instance of RhinoManager with a mixture of default arguments.
     */
    public static class Builder {

        private String accessKey = null;
        private String modelPath = null;
        private String contextPath = null;
        private float sensitivity = 0.5f;
        private float endpointDurationSec = 1.0f;
        private boolean requireEndpoint = true;
        private RhinoManagerErrorCallback errorCallback = null;

        public RhinoManager.Builder setAccessKey(String accessKey) {
            this.accessKey = accessKey;
            return this;
        }

        public RhinoManager.Builder setModelPath(String modelPath) {
            this.modelPath = modelPath;
            return this;
        }

        public RhinoManager.Builder setContextPath(String contextPath) {
            this.contextPath = contextPath;
            return this;
        }

        public RhinoManager.Builder setSensitivity(float sensitivity) {
            this.sensitivity = sensitivity;
            return this;
        }

        public RhinoManager.Builder setEndpointDurationSec(float endpointDurationSec) {
            this.endpointDurationSec = endpointDurationSec;
            return this;
        }

        public RhinoManager.Builder setRequireEndpoint(boolean requireEndpoint) {
            this.requireEndpoint = requireEndpoint;
            return this;
        }

        public RhinoManager.Builder setErrorCallback(RhinoManagerErrorCallback errorCallback) {
            this.errorCallback = errorCallback;
            return this;
        }

        /**
         * Creates an instance of RhinoManager.
         *
         * @param context  Android app context (for extracting Rhino resources)
         * @param callback A callback function that is invoked upon intent inference.
         * @return A RhinoManager instance
         * @throws RhinoException if there is an error while initializing Rhino.
         */
        public RhinoManager build(
                Context context,
                RhinoManagerCallback callback) throws RhinoException {
            Rhino rhino = new Rhino.Builder()
                    .setAccessKey(accessKey)
                    .setModelPath(modelPath)
                    .setContextPath(contextPath)
                    .setSensitivity(sensitivity)
                    .setEndpointDurationSec(endpointDurationSec)
                    .setRequireEndpoint(requireEndpoint)
                    .build(context);
            return new RhinoManager(rhino, callback, errorCallback);
        }
    }
}
