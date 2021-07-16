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

import android.content.Context;
import android.content.res.Resources;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.Map;

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

    /**
     * Constructor.
     *
     * @param modelPath   Absolute path to the file containing model parameters.
     * @param contextPath Absolute path to file containing context parameters. A context represents
     *                    the set of expressions (spoken commands), intents, and intent arguments
     *                    (slots) within a domain of interest.
     * @param sensitivity Inference sensitivity. It should be a number within [0, 1]. A higher
     *                    sensitivity value results in fewer misses at the cost of (potentially)
     *                    increasing the erroneous inference rate.
     * @throws RhinoException if there is an error while initializing Rhino.
     */
    private Rhino(String modelPath, String contextPath, float sensitivity) throws RhinoException {
        try {
            handle = init(modelPath, contextPath, sensitivity);
        } catch (Exception e) {
            throw new RhinoException(e);
        }
    }

    /**
     * Releases resources acquired by Rhino.
     */
    public void delete() {
        if (handle != 0) {
            delete(handle);
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
            throw new RhinoException(
                    new IllegalStateException("Attempted to call Rhino process after delete."));
        }
        if (pcm == null) {
            throw new RhinoException(
                    new IllegalArgumentException("Passed null frame to Rhino process."));
        }

        if (pcm.length != getFrameLength()) {
            throw new RhinoException(
                    new IllegalArgumentException(
                            String.format("Rhino process requires frames of length %d. " +
                                    "Received frame of size %d.", getFrameLength(), pcm.length)));
        }

        try {
            return process(handle, pcm);
        } catch (Exception e) {
            throw new RhinoException(e);
        }
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

        final boolean isUnderstood = isUnderstood(handle);

        RhinoInference inference;

        if (isUnderstood) {
            final String intentPacked = getIntent(handle);
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

        reset(handle);

        return inference;
    }

    /**
     * Getter for context information.
     *
     * @return Context information.
     */
    public String getContextInformation() {
        return getContextInfo(handle);
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

    private native long init(String modelPath, String contextPath, float sensitivity);

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

        private String modelPath = null;
        private String contextPath = null;
        private float sensitivity = 0.5f;

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

        private void extractPackageResources(Context context) throws RhinoException {
            final Resources resources = context.getResources();

            try {

                DEFAULT_MODEL_PATH = extractResource(context,
                        resources.openRawResource(R.raw.rhino_params),
                        resources.getResourceEntryName(R.raw.rhino_params) + ".pv");

                isExtracted = true;
            } catch (IOException ex) {
                throw new RhinoException(ex);
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
                        throw new RhinoException(ex);
                    }
                }
            }

            if (this.contextPath == null) {
                throw new RhinoException(new IllegalArgumentException("No context file (.rhn) was provided."));
            }

            File contextFile = new File(contextPath);
            String contextFilename = contextFile.getName();
            if (!contextFile.exists() && !contextFilename.equals("")) {
                try {
                    contextPath = extractResource(context,
                            context.getAssets().open(contextPath),
                            contextFilename);
                } catch (IOException ex) {
                    throw new RhinoException(ex);
                }
            }

            if (sensitivity < 0 || sensitivity > 1) {
                throw new RhinoException(new IllegalArgumentException("Sensitivity value should be within [0, 1]."));
            }

            return new Rhino(modelPath, contextPath, sensitivity);
        }
    }
}
