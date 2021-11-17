/*
    Copyright 2018-2021 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is
    located in the "LICENSE" file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the
    License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
    express or implied. See the License for the specific language governing permissions and
    limitations under the License.
*/

package ai.picovoice.rhino;

import java.io.File;
import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;


/**
 * Java binding for Rhino Speech-to-Intent engine. It directly infers the user's intent from
 * spoken commands in real-time. Rhino processes incoming audio in consecutive frames and indicates
 * if the inference is finalized. When finalized, the inferred intent can be retrieved as structured
 * data in the form of an intent string and pairs of slots and values. The number of samples per
 * frame can be attained by calling {@link #getFrameLength()} . The incoming audio needs to have a
 * sample rate equal to {@link #getSampleRate()}  and be 16-bit linearly-encoded. Rhino operates on
 * single-channel audio.
 */

public class Rhino {

    private final long libraryHandle;

    public static final String LIBRARY_PATH;
    public static final String MODEL_PATH;

    static {
        LIBRARY_PATH = Utils.getPackagedLibraryPath();
        MODEL_PATH = Utils.getPackagedModelPath();
    }

    /**
     * Constructor.
     *
     * @param accessKey     AccessKey obtained from Picovoice Console.
     * @param libraryPath Absolute path to the native Rhino library.
     * @param modelPath   Absolute path to the file containing model parameters.
     * @param contextPath Absolute path to file containing context parameters. A context represents
     *                    the set of expressions (spoken commands), intents, and intent arguments
     *                    (slots) within a domain of interest.
     * @param sensitivity Inference sensitivity. It should be a number within [0, 1]. A higher
     *                    sensitivity value results in fewer misses at the cost of (potentially)
     *                    increasing the erroneous inference rate.
     * @param requireEndpoint If set to `true`, Rhino requires an endpoint (chunk of silence) before finishing inference.
     * @throws RhinoException if there is an error while initializing Rhino.
     */
    public Rhino(String accessKey, String libraryPath, String modelPath, String contextPath, float sensitivity, boolean requireEndpoint) throws RhinoException {

        try {
            System.load(libraryPath);
        } catch (Exception exception) {
            throw new RhinoException(exception);
        }
        libraryHandle = init(accessKey, modelPath, contextPath, sensitivity, requireEndpoint);
    }

    /**
     * Releases resources acquired by Rhino.
     */
    public void delete() {
        delete(libraryHandle);
    }

    /**
     * Processes a frame of audio and emits a flag indicating if the inference is finalized. When
     * finalized, {@link #getInference()} should be called to retrieve the intent and slots, if the
     * spoken command is considered valid.
     *
     * @param pcm A frame of audio samples. The number of samples per frame can be attained by
     *            calling {@link #getFrameLength()}. The incoming audio needs to have a sample rate
     *            equal to {@link #getSampleRate()} and be 16-bit linearly-encoded. Furthermore,
     *            Rhino operates on single channel audio.
     * @return Flag indicating whether the engine has finalized intent extraction.
     * @throws RhinoException if there is an error while processing the audio frame.
     */
    public boolean process(short[] pcm) throws RhinoException {
        return process(libraryHandle, pcm);
    }

    /**
     * Gets inference result from Rhino. If the spoken command was understood, it includes the
     * specific intent name that was inferred, and (if applicable) slot keys and specific slot
     * values. Should only be called after the process function returns true, otherwise Rhino has
     * not yet reached an inference conclusion.
     *
     * @return The result of inference as a {@link RhinoInference} object.
     * @throws RhinoException if inference retrieval fails.
     */
    public RhinoInference getInference() throws RhinoException {
        try {
            final boolean isUnderstood = isUnderstood(libraryHandle);

            RhinoInference inference;

            if (isUnderstood) {
                final String intentPacked = getIntent(libraryHandle);
                String[] parts = intentPacked.split(",");
                if (parts.length == 0) {
                    throw new RhinoException(String.format("Failed to retrieve intent from '%s'.", intentPacked));
                }

                Map<String, String> slots = new LinkedHashMap<>();
                for (int i = 1; i < parts.length; i++) {
                    String[] slotAndValue = parts[i].split(":");
                    if (slotAndValue.length != 2) {
                        throw new RhinoException(String.format("Failed to retrieve intent from '%s'.", intentPacked));
                    }
                    slots.put(slotAndValue[0], slotAndValue[1]);
                }

                inference = new RhinoInference(true, parts[0], slots);
            } else {
                inference = new RhinoInference(false, null, null);
            }

            reset(libraryHandle);

            return inference;
        } catch (Exception e) {
            throw new RhinoException(e);
        }
    }

    /**
     * Getter for context information.
     *
     * @return Context information.
     */
    public String getContextInformation() {
        return getContextInfo(libraryHandle);
    }

    /**
     * Getter for number of audio samples per frame.
     *
     * @return Number of audio samples per frame.
     */
    public native int getFrameLength();

    /**
     * Getter for audio sample rate accepted by Picovoice.
     *
     * @return Audio sample rate accepted by Picovoice.
     */
    public native int getSampleRate();

    /**
     * Getter for version.
     *
     * @return Version.
     */
    public native String getVersion();

    private native long init(String accessKey, String modelPath, String contextPath, float sensitivity, boolean requireEndpoint);

    private native void delete(long object);

    private native boolean process(long object, short[] pcm);

    private native boolean isUnderstood(long object);

    private native String getIntent(long object);

    private native boolean reset(long object);

    private native String getContextInfo(long object);

    /**
     * Builder for creating an instance of Rhino with a mixture of default arguments
     */
    public static class Builder {

        private String accessKey = null;
        private String libraryPath = null;
        private String modelPath = null;
        private String contextPath = null;
        private float sensitivity = 0.5f;
        private boolean requireEndpoint = false;

        public Builder setAccessKey(String accessKey) {
            this.accessKey = accessKey;
            return this;
        }

        public Builder setLibraryPath(String libraryPath) {
            this.libraryPath = libraryPath;
            return this;
        }

        public Builder setModelPath(String modelPath) {
            this.modelPath = modelPath;
            return this;
        }

        public Builder setContextPath(String contextPath) {
            this.contextPath = contextPath;
            return this;
        }

        public Builder setSensitivity(float sensitivity) {
            this.sensitivity = sensitivity;
            return this;
        }

        public Builder setRequireEndpoint(boolean requireEndpoint) {
            this.requireEndpoint = requireEndpoint;
            return this;
        }
        /**
         * Validates properties and creates an instance of the Rhino Speech-to-Intent engine.
         *
         * @return An instance of Rhino wake word engine
         * @throws RhinoException if there is an error while initializing Rhino.
         */
        public Rhino build() throws RhinoException {

            if (!Utils.isEnvironmentSupported()) {
                throw new RhinoRuntimeException("Could not initialize Rhino. " +
                        "Execution environment not currently supported by Rhino Java.");
            }

            if (accessKey == null) {
                throw new RhinoInvalidArgumentException("AccessKey is required for Rhino initialization.");
            }

            if (libraryPath == null) {
                if (Utils.isResourcesAvailable()) {
                    libraryPath = LIBRARY_PATH;
                } else {
                    throw new RhinoInvalidArgumentException("Default library unavailable. Please " +
                            "provide a native Rhino library path (-l <library_path>).");
                }
                if (!new File(libraryPath).exists()) {
                    throw new RhinoException(String.format("Couldn't find library file at " +
                            "'%s'", libraryPath));
                }
            }

            if (modelPath == null) {
                if (Utils.isResourcesAvailable()) {
                    modelPath = MODEL_PATH;
                } else {
                    throw new RhinoInvalidArgumentException("Default model unavailable. Please provide a " +
                            "valid Rhino model path (-m <model_path>).");
                }
                if (!new File(modelPath).exists()) {
                    throw new RhinoException(String.format("Couldn't find model file at " +
                            "'%s'", modelPath));
                }
            }

            if (contextPath == null) {
                throw new RhinoInvalidArgumentException("No context file provided");
            }

            if (!new File(contextPath).exists()) {
                throw new RhinoException(new IOException(String.format("Couldn't find context file at " +
                        "'%s'", contextPath)));
            }

            if (sensitivity < 0 || sensitivity > 1) {
                throw new RhinoException(new IllegalArgumentException("Sensitivity value should be within [0, 1]."));
            }

            return new Rhino(accessKey, libraryPath, modelPath, contextPath, sensitivity, requireEndpoint);
        }
    }
}
