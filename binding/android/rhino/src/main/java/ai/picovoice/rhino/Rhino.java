/*
 * Copyright 2018 Picovoice Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


package ai.picovoice.rhino;

import java.util.HashMap;
import java.util.Map;

/**
 * Binding for Picovoice's speech-to-intent engine (aka Rhino).
 * The object directly infers intent from speech commands within a given context of interest in
 * real-time. It processes incoming audio in consecutive frames (chunks) and at the end of each
 * frame indicates if the intent extraction is finalized. When finalized, the intent can be
 * retrieved as structured data in form of an intent string and pairs of slots and values
 * representing arguments (details) of intent. The number of samples per frame can be attained by
 * calling {@link #frameLength()}. The incoming audio needs to have a sample rate equal to
 * {@link #sampleRate()} and be 16-bit linearly-encoded. Furthermore, Rhino operates on single
 * channel audio.
 */
public class Rhino {
    static {
        System.loadLibrary("pv_rhino");
    }

    private final long object;

    /**
     * Constructor.
     * @param modelFilePath Absolute path to file containing model parameters.
     * @param contextFilePath  Absolute path to file containing context parameters. A context
     *                         represents the set of expressions (commands), intents, and intent
     *                         arguments (slots) within a domain of interest.
     * @throws RhinoException On failure.
     */
    public Rhino(String modelFilePath, String contextFilePath) throws RhinoException {
        try {
            object = init(modelFilePath, contextFilePath);
        } catch (Exception e) {
            throw new RhinoException(e);
        }
    }

    /**
     * Destructor. This is needs to be called explicitly as we do not rely on garbage collector.
     * @throws RhinoException On failure.
     */
    public void delete() throws RhinoException {
        try {
            delete(object);
        } catch (Exception e) {
            throw new RhinoException(e);
        }
    }

    /**
     * Processes a frame of audio and emits a flag indicating if the engine has finalized intent
     * extraction. When finalized, {@link #isUnderstood()} should be called to check if the command
     * was valid (is within context of interest).
     * @param pcm A frame of audio samples. The number of samples per frame can be attained by
     *            calling {@link #frameLength()}. The incoming audio needs to have a sample rate
     *            equal to {@link #sampleRate()} and be 16-bit linearly-encoded. Furthermore,
     *            Rhino operates on single channel audio.
     * @return Flag indicating whether the engine has finalized intent extraction.
     * @throws RhinoException On failure.
     */
    public boolean process(short[] pcm) throws RhinoException {
        try {
            return process(object, pcm) == 1;
        } catch (Exception e) {
            throw new RhinoException(e);
        }
    }

    /**
     * Indicates if the spoken command is valid, is within the domain of interest (context), and the
     * engine understood it.
     * @return Flag indicating if the spoken command is valid, is within the domain of interest
     * (context), and the engine understood it.
     * @throws RhinoException On failure.
     */
    public boolean isUnderstood() throws RhinoException {
        try {
            return isUnderstood(object) == 1;
        } catch (Exception e) {
            throw new RhinoException(e);
        }
    }

    /**
     * Getter for the intent inferred from spoken command. The intent is presented as an intent
     * string and pairs of slots and their values. It should be called only after intent extraction
     * is finalized and it is verified that the spoken command is valid and understood via calling
     * {@link #isUnderstood()}.
     * @return Inferred intent object.
     * @throws RhinoException On failure.
     */
    public RhinoIntent getIntent() throws RhinoException {
        final String intentPacked = getIntent(object);
        String[] parts = intentPacked.split(",");
        if (parts.length == 0) {
            throw new RhinoException(String.format("Failed to retrieve intent from %s", intentPacked));
        }

        Map<String, String> slots = new HashMap<>();
        for (int i = 1; i < parts.length; i++) {
            String[] slotAndValue = parts[i].split(":");
            if (slotAndValue.length != 2) {
                throw new RhinoException(String.format("Failed to retrieve intent from %s", intentPacked));
            }
            slots.put(slotAndValue[0], slotAndValue[1]);
        }

        return new RhinoIntent(parts[0], slots);
    }

    /**
     * Resets the internal state of the engine. It should be called before the engine can be used to
     * infer intent from a new stream of audio.
     * @throws RhinoException On failure.
     */
    public void reset() throws RhinoException {
        try {
            reset(object);
        } catch (Exception e) {
            throw new RhinoException(e);
        }
    }

    /**
     * Getter for expressions. Each expression maps a set of spoken phrases to an intent and
     * possibly a number of slots (intent arguments).
     * @return Expressions.
     * @throws RhinoException On failure.
     */
    public String getContextExpressions() throws RhinoException {
        try {
            return contextExpressions(object);
        } catch (Exception e) {
            throw new RhinoException(e);
        }
    }

    private native long init(String model_file_path, String context_file_path);

    private native long delete(long object);

    private native int process(long object, short[] pcm);

    private native int isUnderstood(long object);

    private native String getIntent(long object);

    private native boolean reset(long object);

    private native String contextExpressions(long object);

    /**
     * Getter for length (number of audio samples) per frame.
     * @return Frame length.
     */
    public native int frameLength();

    /**
     * Audio sample rate accepted by Picovoice.
     * @return Sample rate.
     */
    public native int sampleRate();

    /**
     * Getter for version string.
     * @return Version string.
     */
    public native String version();
}
