package ai.picovoice.rhino;

import java.util.Map;

/**
 * Data object representing an inferred intent from spoken command.
 */
public class RhinoIntent {
    final private String intent;
    final private Map<String, String> slots;

    /**
     * Constructor.
     * @param intent Intent.
     * @param slots Intent slots (arguments).
     */
    RhinoIntent(String intent, Map<String, String> slots) {
        this.intent = intent;
        this.slots = slots;
    }

    /**
     * Getter for intent.
     * @return Intent.
     */
    public String getIntent() {
        return intent;
    }

    /**
     * Getter for intent slots (arguments).
     * @return slots.
     */
    public Map<String, String> getSlots() {
        return slots;
    }
}
