package ai.picovoice.rhinodemoservice;

import ai.picovoice.rhino.RhinoIntent;

public interface PorcupineRhinoCallback {
    void run(boolean isWakeWordDetected, boolean isUnderstood, final RhinoIntent intent);
}
