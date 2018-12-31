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

public class Rhino {
    public class RhinoIntent {
        final private String intent;
        final private Map<String, String> slots;

        public RhinoIntent(String intent, Map<String, String> slots) {
            this.intent = intent;
            this.slots = slots;
        }

        public String getIntent() {
            return intent;
        }

        public Map<String, String> getSlots() {
            return slots;
        }
    }

    private final long object;

    static {
        System.loadLibrary("pv_rhino");
    }

    public Rhino(String model_file_path, String context_file_path) throws RhinoException {
        try {
            object = init(model_file_path, context_file_path);
        } catch (Exception e) {
            throw new RhinoException(e);
        }
    }

    public void delete() throws RhinoException {
        try {
            delete(object);
        } catch (Exception e) {
            throw new RhinoException(e);
        }
    }

    public boolean process(short[] pcm) throws RhinoException {
        try {
            return process(object, pcm) == 1;
        } catch (Exception e) {
            throw new RhinoException(e);
        }
    }

    public boolean isUnderstood() throws RhinoException {
        try {
            return is_understood(object) == 1;
        } catch (Exception e) {
            throw new RhinoException(e);
        }
    }

    public RhinoIntent getIntent() throws RhinoException {
        final String intentPacked = get_intent(object);
        String[] parts = intentPacked.split(",");
        if (parts.length == 0) {
            throw new RhinoException("could not retrieve intent");
        }

        Map<String, String> slots = new HashMap<>();
        for (int i = 1; i < parts.length; i++) {
            String[] slotValue = parts[i].split(":");
            if (slotValue.length != 2) {
                throw new RhinoException("count not retrieve intent");
            }
            slots.put(slotValue[0], slotValue[1]);
        }

        return new RhinoIntent(parts[0], slots);
    }

    public void reset() throws RhinoException {
        try {
            reset(object);
        } catch (Exception e) {
            throw new RhinoException(e);
        }
    }

    public String contextExpressions() throws RhinoException {
        try {
            return context_expressions(object);
        } catch (Exception e) {
            throw new RhinoException(e);
        }
    }

    public int frameLength() {
        return frame_length();
    }

    public int sampleRate() {
        return sample_rate();
    }

    private native long init(String model_file_path, String context_file_path);

    private native long delete(long object);

    private native int process(long object, short[] pcm);

    private native int is_understood(long object);

    private native String get_intent(long object);

    private native boolean reset(long object);

    private native String context_expressions(long object);

    private native int frame_length();

    private native int sample_rate();
}
