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

import java.util.Map;

/**
 * Class that contains inference results returned from Rhino.
 */
public class RhinoInference {
    private final boolean isUnderstood;
    private final String intent;
    private final Map<String, String> slots;

    RhinoInference(boolean isUnderstood, String intent, Map<String, String> slots) {
        this.isUnderstood = isUnderstood;
        this.intent = intent;
        this.slots = slots;
    }

    public boolean getIsUnderstood() {
        return isUnderstood;
    }

    public String getIntent() {
        return intent;
    }

    public Map<String, String> getSlots() {
        return slots;
    }
}
