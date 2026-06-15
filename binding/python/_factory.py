#
# Copyright 2023-2026 Picovoice Inc.
#
# You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
# file accompanying this source.
#
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
# an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
# specific language governing permissions and limitations under the License.
#

from ._rhino import Rhino, RhinoError, list_hardware_devices
from ._util import *


def create(
        access_key: str,
        context_path: str,
        library_path: Optional[str] = None,
        model_path: Optional[str] = None,
        device: Optional[str] = None,
        sensitivity: float = 0.5,
        endpoint_duration_sec: float = 1.,
        require_endpoint: bool = True) -> Rhino:
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
    :param device: String representation of the device (e.g., CPU or GPU) to use. If set to `best`, the most
    suitable device is selected automatically. If set to `gpu`, the engine uses the first available GPU device.
    To select a specific GPU device, set this argument to `gpu:${GPU_INDEX}`, where `${GPU_INDEX}` is the index
    of the target GPU. If set to`cpu`, the engine will run on the CPU with the default number of threads. To
    specify the number of threads, set this argument to `cpu:${NUM_THREADS}`, where `${NUM_THREADS}` is the
    desired number of threads.
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
        library_path = pv_library_path('')

    if model_path is None:
        model_path = pv_model_path('')

    if device is None:
        device = "best"

    return Rhino(
        access_key=access_key,
        library_path=library_path,
        model_path=model_path,
        device=device,
        context_path=context_path,
        sensitivity=sensitivity,
        endpoint_duration_sec=endpoint_duration_sec,
        require_endpoint=require_endpoint)


def available_devices(library_path: Optional[str] = None) -> Sequence[str]:
    """
    Lists all available devices that Rhino can use for inference. Each entry in the list can be the `device` argument
    of `.create` factory method or `Rhino` constructor.
    :param library_path: Absolute path to Rhino's dynamic library. If not set it will be set to the default location.
    :return: List of all available devices that Rhino can use for inference.
    """

    if library_path is None:
        library_path = pv_library_path('')

    return list_hardware_devices(library_path=library_path)


def train_context_from_dynamic_slots(
        access_key: str,
        output_path: str,
        language: str,
        context_path: str,
        slots: Dict[str, Set[str]],
        platform: Optional[str] = None) -> None:
    """
    Trains a model using a Rhino content (.rhn) file with additional slot values.

    :param access_key: AccessKey obtained from Picovoice Console (https://console.picovoice.ai/).
    :param output_path: Absolute path to file where the trained model will be saved.
    :param language: Two character language code for the model (i.e 'en', 'fr').
    Check https://picovoice.ai/docs/model-api/rhino/ for supported languages.
    :param context_path: Absolute path to file containing context model (file with `.rhn` extension).
    :param slots: Dictionary mapping existing slot names to additional slot values to merge into the YAML's
    `context.slots` section. Each value must be a non-empty set of strings, and none of the
    provided values may already exist in the corresponding slot of the original context.
    :param platform: Target platform for the trained model. If None, the default(current) platform is used.
    Check https://picovoice.ai/docs/model-api/rhino/ for supported platforms.
    """

    try:
        rhino = create(access_key, context_path)
        yaml_content = rhino.context_info
        rhino.delete()
    except RhinoError as e:
        raise RuntimeError(f"Failed to initialize Rhino for context info with: {str(e)}")

    pv_train_model(
        access_key=access_key,
        output_path=output_path,
        language=language,
        yaml_content=yaml_content,
        slots=slots,
        platform=platform)


def train_context_from_yaml(
        access_key: str,
        output_path: str,
        language: str,
        yaml_path: str,
        platform: Optional[str] = None) -> None:
    """
    Trains a model using a YAML configuration file.

    :param access_key: AccessKey obtained from Picovoice Console (https://console.picovoice.ai/).
    :param output_path: Absolute path to file where the trained model will be saved.
    :param language: Two character language code for the model (i.e 'en', 'fr').
    Check https://picovoice.ai/docs/model-api/rhino/ for supported languages.
    :param yaml_path: Absolute path to the YAML configuration file.
    :param platform: Target platform for the trained model. If None, the default(current) platform is used.
    Check https://picovoice.ai/docs/model-api/rhino/ for supported platforms.
    """

    if not os.path.exists(yaml_path):
        raise IOError("Couldn't find yaml file at '%s'." % yaml_path)

    with open(yaml_path) as f:
        yaml_content = f.read()

    pv_train_model(
        access_key=access_key,
        output_path=output_path,
        language=language,
        yaml_content=yaml_content,
        platform=platform)


__all__ = [
    'available_devices',
    'create',
    'train_context_from_dynamic_slots',
    'train_context_from_yaml',
]
