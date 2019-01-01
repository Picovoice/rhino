package ai.picovoice.rhinodemo;

import java.util.Map;

public interface RhinoCallback {
    void run(boolean isUnderstood, String intent, Map<String, String> slots);
}
