#
# Copyright 2020-2021 Picovoice Inc.
#
# You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
# file accompanying this source.
#
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
# an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
# specific language governing permissions and limitations under the License.
#

from .rhino import Rhino
from .rhino import RhinoError
from .rhino import RhinoMemoryError
from .rhino import RhinoIOError
from .rhino import RhinoInvalidArgumentError
from .rhino import RhinoStopIterationError
from .rhino import RhinoKeyError
from .rhino import RhinoInvalidStateError
from .rhino import RhinoRuntimeError
from .rhino import RhinoActivationError
from .rhino import RhinoActivationLimitError
from .rhino import RhinoActivationThrottledError
from .rhino import RhinoActivationRefusedError
from .util import *

LIBRARY_PATH = pv_library_path('')

MODEL_PATH = pv_model_path('')


def create(access_key, context_path, library_path=None, model_path=None, sensitivity=0.5, require_endpoint=True):
    """
    Factory method for Rhino Speech-to-Intent engine.

    :param access_key: AccessKey obtained from Picovoice Console (https://console.picovoice.ai/).
    :param context_path: Absolute path to file containing context model (file with `.rhn` extension. A context
    represents the set of expressions (spoken commands), intents, and intent arguments (slots) within a domain of
    interest.
    :param library_path: Absolute path to Rhino's dynamic library. If not set it will be set to the default
    location.
    :param model_path: Absolute path to the file containing model parameters. If not set it will be set to the default
    location.
    :param sensitivity: Inference sensitivity. It should be a number within [0, 1]. A higher sensitivity value
    results in fewer misses at the cost of (potentially) increasing the erroneous inference rate.
    :param require_endpoint If set to `False`, Rhino does not require an endpoint (chunk of silence) before
        finishing inference.
    :return An instance of Rhino Speech-to-Intent engine.
    """

    if library_path is None:
        library_path = LIBRARY_PATH

    if model_path is None:
        model_path = MODEL_PATH

    return Rhino(
        access_key=access_key,
        library_path=library_path,
        model_path=model_path,
        context_path=context_path,
        sensitivity=sensitivity,
        require_endpoint=require_endpoint)
