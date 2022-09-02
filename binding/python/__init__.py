#
# Copyright 2020-2022 Picovoice Inc.
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


def create(
        access_key,
        context_path,
        library_path=None,
        model_path=None,
        sensitivity=0.5,
        endpoint_duration_sec=1.,
        require_endpoint=True):
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
    :param endpoint_duration_sec: Endpoint duration in seconds. An endpoint is a chunk of silence at the end of an
    utterance that marks the end of spoken command. It should be a positive number within [0.5, 5]. A lower endpoint
    duration reduces delay and improves responsiveness. A higher endpoint duration assures Rhino doesn't return
    inference preemptively in case the user pauses before finishing the request.
    :param require_endpoint: If set to `True`, Rhino requires an endpoint (a chunk of silence) after the spoken command.
    If set to `False`, Rhino tries to detect silence, but if it cannot, it still will provide inference regardless.
    Set to `False` only if operating in an environment with overlapping speech (e.g. people talking in the
    background).
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
        endpoint_duration_sec=endpoint_duration_sec,
        require_endpoint=require_endpoint)
