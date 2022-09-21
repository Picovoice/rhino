/*
    Copyright 2018-2022 Picovoice Inc.
    You may not use this file except in compliance with the license. A copy of the license is
    located in the "LICENSE" file accompanying this source.
    Unless required by applicable law or agreed to in writing, software distributed under the
    License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
    express or implied. See the License for the specific language governing permissions and
    limitations under the License.
*/


package ai.picovoice.rhino;

import android.content.Context;
import android.content.res.Resources;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;

/**
 * Android binding for Rhino Speech-to-Intent engine. It directly infers the user's intent from
 * spoken commands in real-time. Rhino processes incoming audio in consecutive frames and indicates
 * if the inference is finalized. When finalized, the inferred intent can be retrieved as structured
 * data in the form of an intent string and pairs of slots and values. The number of samples per
 * frame can be attained by calling {@link #getFrameLength()} . The incoming audio needs to have a
 * sample rate equal to {@link #getSampleRate()}  and be 16-bit linearly-encoded. Rhino operates on
 * single-channel audio.
 */
public class Rhino {

    private static String DEFAULT_MODEL_PATH;
    private static boolean isExtracted;

    static {
        System.loadLibrary("pv_rhino");
    }

    private long handle;
    private boolean isFinalized;

    /**
     * Constructor.
     *
     * @param accessKey           AccessKey obtained from Picovoice Console (https://console.picovoice.ai/).
     * @param modelPath           Absolute path to the file containing model parameters.
     * @param contextPath         Absolute path to file containing context parameters. A context represents
     *                            the set of expressions (spoken commands), intents, and intent arguments
     *                            (slots) within a domain of interest.
     * @param sensitivity         Inference sensitivity. It should be a number within [0, 1]. A higher
     *                            sensitivity value results in fewer misses at the cost of (potentially)
     *                            increasing the erroneous inference rate.
     * @param endpointDurationSec Endpoint duration in seconds. An endpoint is a chunk of silence at the end of an
     *                            utterance that marks the end of spoken command. It should be a positive number within [0.5, 5]. A lower endpoint
     *                            duration reduces delay and improves responsiveness. A higher endpoint duration assures Rhino doesn't return inference
     *                            preemptively in case the user pauses before finishing the request.
     * @param requireEndpoint     If set to `true`, Rhino requires an endpoint (a chunk of silence) after the spoken command.
     *                            If set to `false`, Rhino tries to detect silence, but if it cannot, it still will provide inference regardless. Set
     *                            to `false` only if operating in an environment with overlapping speech (e.g. people talking in the background).
     *
     * @throws RhinoException if there is an error while initializing Rhino.
     */
    private Rhino(String accessKey,
                  String modelPath,
                  String contextPath,
                  float sensitivity,
                  float endpointDurationSec,
                  boolean requireEndpoint) throws RhinoException{
        handle = RhinoNative.init(
                accessKey,
                modelPath,
                contextPath,
                sensitivity,
                endpointDurationSec,
                requireEndpoint);
    }

    /**
     * Releases resources acquired by Rhino.
     */
    public void delete() {
        if (handle != 0) {
            RhinoNative.delete(handle);
            handle = 0;
        }
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
        if (handle == 0) {
            throw new RhinoInvalidStateException("Attempted to call Rhino process after delete.");
        }
        if (pcm == null) {
            throw new RhinoInvalidArgumentException("Passed null frame to Rhino process.");
        }

        if (pcm.length != getFrameLength()) {
            throw new RhinoInvalidArgumentException(
                    String.format("Rhino process requires frames of length %d. " +
                            "Received frame of size %d.", getFrameLength(), pcm.length));
        }

        isFinalized = RhinoNative.process(handle, pcm);
        return isFinalized;
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
        if (handle == 0) {
            throw new RhinoInvalidStateException("Attempted to call Rhino getInference after delete.");
        }

        if (!isFinalized) {
            throw new RhinoInvalidStateException("getInference called before Rhino had finalized. " +
                    "Call getInference only after process has returned true");
        }
        return RhinoNative.getInference(handle);
    }

    /**
     * Getter for context information.
     *
     * @return Context information.
     */
    public String getContextInformation() throws RhinoException {
        if (handle == 0) {
            throw new RhinoInvalidStateException("Attempted to call Rhino getContextInformation after delete.");
        }

        return RhinoNative.getContextInfo(handle);
    }

    /**
     * Getter for number of audio samples per frame.
     *
     * @return Number of audio samples per frame.
     */
    public int getFrameLength() {
        return RhinoNative.getFrameLength();
    }

    /**
     * Getter for audio sample rate accepted by Picovoice.
     *
     * @return Audio sample rate accepted by Picovoice.
     */
    public int getSampleRate() {
        return RhinoNative.getSampleRate();
    }

    /**
     * Getter for version.
     *
     * @return Version.
     */
    public String getVersion() {
        return RhinoNative.getVersion();
    }

    /**
     * Builder for creating an instance of Rhino with a mixture of default arguments
     */
    public static class Builder {
        private String accessKey = null;
        private String modelPath = null;
        private String contextPath = null;
        private float sensitivity = 0.5f;
        private float endpointDurationSec = 1.0f;
        private boolean requireEndpoint = true;

        public Builder setAccessKey(String accessKey) {
            this.accessKey = accessKey;
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

        public Builder setEndpointDurationSec(float endpointDurationSec) {
            this.endpointDurationSec = endpointDurationSec;
            return this;
        }

        public Builder setRequireEndpoint(boolean requireEndpoint) {
            this.requireEndpoint = requireEndpoint;
            return this;
        }

        private void extractPackageResources(Context context) throws RhinoIOException {
            final Resources resources = context.getResources();

            try {
                DEFAULT_MODEL_PATH = extractResource(context,
                        resources.openRawResource(R.raw.rhino_params),
                        resources.getResourceEntryName(R.raw.rhino_params) + ".pv");

                isExtracted = true;
            } catch (IOException ex) {
                throw new RhinoIOException(ex);
            }
        }

        private String extractResource(Context context, InputStream srcFileStream, String dstFilename) throws IOException {
            InputStream is = new BufferedInputStream(srcFileStream, 256);
            OutputStream os = new BufferedOutputStream(context.openFileOutput(dstFilename, Context.MODE_PRIVATE), 256);
            int r;
            while ((r = is.read()) != -1) {
                os.write(r);
            }
            os.flush();

            is.close();
            os.close();
            return new File(context.getFilesDir(), dstFilename).getAbsolutePath();
        }

        /**
         * Validates properties and creates an instance of the Rhino Speech-To-Intent engine
         *
         * @param context Android app context (for extracting Rhino resources)
         * @return An instance of Rhino Speech-To-Intent engine
         * @throws RhinoException if there is an error while initializing Rhino.
         */
        public Rhino build(Context context) throws RhinoException {

            if (!isExtracted) {
                extractPackageResources(context);
            }

            if (accessKey == null || accessKey.equals("")) {
                throw new RhinoInvalidArgumentException("No AccessKey provided to Rhino.");
            }

            if (modelPath == null) {
                modelPath = DEFAULT_MODEL_PATH;
            } else {
                File modelFile = new File(modelPath);
                String modelFilename = modelFile.getName();
                if (!modelFile.exists() && !modelFilename.equals("")) {
                    try {
                        modelPath = extractResource(context,
                                context.getAssets().open(modelPath),
                                modelFilename);
                    } catch (IOException ex) {
                        throw new RhinoIOException(ex);
                    }
                }
            }

            if (this.contextPath == null) {
                throw new RhinoInvalidArgumentException("No context file (.rhn) was provided.");
            }

            File contextFile = new File(contextPath);
            String contextFilename = contextFile.getName();
            if (!contextFile.exists() && !contextFilename.equals("")) {
                try {
                    contextPath = extractResource(context,
                            context.getAssets().open(contextPath),
                            contextFilename);
                } catch (IOException ex) {
                    throw new RhinoIOException(ex);
                }
            }

            if (sensitivity < 0 || sensitivity > 1) {
                throw new RhinoInvalidArgumentException("Sensitivity value should be within [0, 1].");
            }

            if (endpointDurationSec < 0.5 || endpointDurationSec > 5.0) {
                throw new RhinoInvalidArgumentException("Endpoint duration should be within [0.5, 5.0].");
            }

            return new Rhino(
                    accessKey,
                    modelPath,
                    contextPath,
                    sensitivity,
                    endpointDurationSec,
                    requireEndpoint);
        }
    }
}
