/*
    Copyright 2018-2020 Picovoice Inc.
    You may not use this file except in compliance with the license. A copy of the license is
    located in the "LICENSE" file accompanying this source.
    Unless required by applicable law or agreed to in writing, software distributed under the
    License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
    express or implied. See the License for the specific language governing permissions and
    limitations under the License.
*/


package ai.picovoice.rhino;

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
    static {
        System.loadLibrary("pv_rhino");
    }

    private final long handle;

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
    public Rhino(String modelPath, String contextPath, float sensitivity) throws RhinoException {
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
        delete(handle);
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
        try {
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
}
