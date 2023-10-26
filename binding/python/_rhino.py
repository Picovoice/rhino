#
# Copyright 2018-2023 Picovoice Inc.
#
# You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
# file accompanying this source.
#
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
# an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
# specific language governing permissions and limitations under the License.
#
import os
from collections import namedtuple
from ctypes import *
from enum import Enum
from typing import Sequence


class RhinoError(Exception):
    def __init__(self, message: str = '', message_stack: Sequence[str] = None):
        super().__init__(message)

        self._message = message
        self._message_stack = list() if message_stack is None else message_stack

    def __str__(self):
        message = self._message
        if len(self._message_stack) > 0:
            message += ':'
            for i in range(len(self._message_stack)):
                message += '\n  [%d] %s' % (i, self._message_stack[i])
        return message

    @property
    def message(self) -> str:
        return self._message

    @property
    def message_stack(self) -> Sequence[str]:
        return self._message_stack


class RhinoMemoryError(RhinoError):
    pass


class RhinoIOError(RhinoError):
    pass


class RhinoInvalidArgumentError(RhinoError):
    pass


class RhinoStopIterationError(RhinoError):
    pass


class RhinoKeyError(RhinoError):
    pass


class RhinoInvalidStateError(RhinoError):
    pass


class RhinoRuntimeError(RhinoError):
    pass


class RhinoActivationError(RhinoError):
    pass


class RhinoActivationLimitError(RhinoError):
    pass


class RhinoActivationThrottledError(RhinoError):
    pass


class RhinoActivationRefusedError(RhinoError):
    pass


Inference = namedtuple('Inference', ['is_understood', 'intent', 'slots'])
Inference.__doc__ = """"\
Immutable object with `.is_understood`, `.intent` , and `.slots` getters.

:param is_understood: Indicates whether the intent was understood by Rhino.
:param intent: Name of intent that was inferred
:param slots: Dictionary of the slot keys and values extracted from the utterance.
"""


class Rhino(object):
    """
    Python binding for Rhino Speech-to-Intent engine. It directly infers the user's intent from spoken commands in
    real-time. Rhino processes incoming audio in consecutive frames and indicates if the inference is finalized. When
    finalized, the inferred intent can be retrieved as structured data in the form of an intent string and pairs of
    slots and values. The number of samples per frame can be attained by calling `.frame_length`. The incoming audio
    needs to have a sample rate equal to `.sample_rate` and be 16-bit linearly-encoded. Rhino operates on single-channel
    audio.
    """

    class PicovoiceStatuses(Enum):
        SUCCESS = 0
        OUT_OF_MEMORY = 1
        IO_ERROR = 2
        INVALID_ARGUMENT = 3
        STOP_ITERATION = 4
        KEY_ERROR = 5
        INVALID_STATE = 6
        RUNTIME_ERROR = 7
        ACTIVATION_ERROR = 8
        ACTIVATION_LIMIT_REACHED = 9
        ACTIVATION_THROTTLED = 10
        ACTIVATION_REFUSED = 11

    _PICOVOICE_STATUS_TO_EXCEPTION = {
        PicovoiceStatuses.OUT_OF_MEMORY: RhinoMemoryError,
        PicovoiceStatuses.IO_ERROR: RhinoIOError,
        PicovoiceStatuses.INVALID_ARGUMENT: RhinoInvalidArgumentError,
        PicovoiceStatuses.STOP_ITERATION: RhinoStopIterationError,
        PicovoiceStatuses.KEY_ERROR: RhinoKeyError,
        PicovoiceStatuses.INVALID_STATE: RhinoInvalidStateError,
        PicovoiceStatuses.RUNTIME_ERROR: RhinoRuntimeError,
        PicovoiceStatuses.ACTIVATION_ERROR: RhinoActivationError,
        PicovoiceStatuses.ACTIVATION_LIMIT_REACHED: RhinoActivationLimitError,
        PicovoiceStatuses.ACTIVATION_THROTTLED: RhinoActivationThrottledError,
        PicovoiceStatuses.ACTIVATION_REFUSED: RhinoActivationRefusedError
    }

    class CRhino(Structure):
        pass

    def __init__(
            self,
            access_key: str,
            library_path: str,
            model_path: str,
            context_path: str,
            sensitivity: float = 0.5,
            endpoint_duration_sec: float = 1.,
            require_endpoint: bool = True):

        """
        Constructor.

        :param access_key: AccessKey obtained from Picovoice Console (https://console.picovoice.ai/).
        :param library_path: Absolute path to Rhino's dynamic library.
        :param model_path: Absolute path to file containing model parameters.
        :param context_path: Absolute path to file containing context parameters. A context represents the set of
        expressions (spoken commands), intents, and intent arguments (slots) within a domain of interest.
        :param sensitivity: Inference sensitivity. It should be a number within [0, 1]. A higher sensitivity value
        results in fewer misses at the cost of (potentially) increasing the erroneous inference rate.
        :param endpoint_duration_sec: Endpoint duration in seconds. An endpoint is a chunk of silence at the end of an
        utterance that marks the end of spoken command. It should be a positive number within [0.5, 5]. A lower endpoint
        duration reduces delay and improves responsiveness. A higher endpoint duration assures Rhino doesn't return
        inference preemptively in case the user pauses before finishing the request.
        require_endpoint: If set to `True`, Rhino requires an endpoint (a chunk of silence) after the spoken command.
        If set to `False`, Rhino tries to detect silence, but if it cannot, it still will provide inference regardless.
        Set to `False` only if operating in an environment with overlapping speech (e.g. people talking in the
        background).
        """

        if not access_key:
            raise ValueError("access_key should be a non-empty string.")

        if not os.path.exists(library_path):
            raise IOError("Couldn't find Rhino's dynamic library at '%s'." % library_path)

        library = cdll.LoadLibrary(library_path)

        if not os.path.exists(model_path):
            raise IOError("Couldn't find model file at '%s'." % model_path)

        if not os.path.exists(context_path):
            raise IOError("Couldn't find context file at '%s'." % context_path)

        if not 0 <= sensitivity <= 1:
            raise ValueError("Sensitivity should be within [0, 1].")

        if not 0.5 <= endpoint_duration_sec <= 5.:
            raise ValueError("Endpoint duration should be within [0.5, 5]")

        set_sdk_func = library.pv_set_sdk
        set_sdk_func.argtypes = [c_char_p]
        set_sdk_func.restype = None

        set_sdk_func('python'.encode('utf-8'))

        self._get_error_stack_func = library.pv_get_error_stack
        self._get_error_stack_func.argtypes = [POINTER(POINTER(c_char_p)), POINTER(c_int)]
        self._get_error_stack_func.restype = self.PicovoiceStatuses

        self._free_error_stack_func = library.pv_free_error_stack
        self._free_error_stack_func.argtypes = [POINTER(c_char_p)]
        self._free_error_stack_func.restype = None

        set_sdk_func('python'.encode('utf-8'))

        init_func = library.pv_rhino_init
        init_func.argtypes = [
            c_char_p,
            c_char_p,
            c_char_p,
            c_float,
            c_float,
            c_bool,
            POINTER(POINTER(self.CRhino))]
        init_func.restype = self.PicovoiceStatuses

        self._handle = POINTER(self.CRhino)()

        status = init_func(
            access_key.encode('utf-8'),
            model_path.encode('utf-8'),
            context_path.encode('utf-8'),
            sensitivity,
            endpoint_duration_sec,
            require_endpoint,
            byref(self._handle))
        if status is not self.PicovoiceStatuses.SUCCESS:
            raise self._PICOVOICE_STATUS_TO_EXCEPTION[status](
                message='Initialization failed',
                message_stack=self._get_error_stack())

        self._delete_func = library.pv_rhino_delete
        self._delete_func.argtypes = [POINTER(self.CRhino)]
        self._delete_func.restype = None

        self._process_func = library.pv_rhino_process
        self._process_func.argtypes = [POINTER(self.CRhino), POINTER(c_short), POINTER(c_bool)]
        self._process_func.restype = self.PicovoiceStatuses

        self._is_understood_func = library.pv_rhino_is_understood
        self._is_understood_func.argtypes = [POINTER(self.CRhino), POINTER(c_bool)]
        self._is_understood_func.restype = self.PicovoiceStatuses

        self._get_intent_func = library.pv_rhino_get_intent
        self._get_intent_func.argtypes = [
            POINTER(self.CRhino),
            POINTER(c_char_p),
            POINTER(c_int),
            POINTER(POINTER(c_char_p)),
            POINTER(POINTER(c_char_p))]
        self._get_intent_func.restype = self.PicovoiceStatuses

        self._free_slots_and_values_func = library.pv_rhino_free_slots_and_values
        self._free_slots_and_values_func.argtypes = [POINTER(self.CRhino), POINTER(c_char_p), POINTER(c_char_p)]
        self._free_slots_and_values_func.restype = self.PicovoiceStatuses

        self._reset_func = library.pv_rhino_reset
        self._reset_func.argtypes = [POINTER(self.CRhino)]
        self._reset_func.restype = self.PicovoiceStatuses

        context_info_func = library.pv_rhino_context_info
        context_info_func.argtypes = [POINTER(self.CRhino), POINTER(c_char_p)]
        context_info_func.restype = self.PicovoiceStatuses

        context_info = c_char_p()
        status = context_info_func(self._handle, byref(context_info))
        if status is not self.PicovoiceStatuses.SUCCESS:
            raise self._PICOVOICE_STATUS_TO_EXCEPTION[status](
                message='Failed to get context info',
                message_stack=self._get_error_stack())

        self._context_info = context_info.value.decode('utf-8')

        version_func = library.pv_rhino_version
        version_func.argtypes = []
        version_func.restype = c_char_p
        self._version = version_func().decode('utf-8')

        self._frame_length = library.pv_rhino_frame_length()

        self._sample_rate = library.pv_sample_rate()

    def delete(self):
        """Releases resources acquired."""

        self._delete_func(self._handle)

    def process(self, pcm: Sequence[int]) -> bool:
        """
        Processes a frame of audio and emits a flag indicating if the inference is finalized. When finalized,
        `.get_inference()` should be called to retrieve the intent and slots, if the spoken command is considered valid.

        :param pcm: A frame of audio samples. The number of samples per frame can be attained by calling
        `.frame_length`. The incoming audio needs to have a sample rate equal to `.sample_rate` and be 16-bit
        linearly-encoded. Rhino operates on single-channel audio.
        :return: Flag indicating if the inference is finalized.
        """

        if len(pcm) != self.frame_length:
            raise ValueError("Invalid frame length. expected %d but received %d" % (self.frame_length, len(pcm)))

        is_finalized = c_bool()
        status = self._process_func(self._handle, (c_short * len(pcm))(*pcm), byref(is_finalized))
        if status is not self.PicovoiceStatuses.SUCCESS:
            raise self._PICOVOICE_STATUS_TO_EXCEPTION[status](
                message='Processing failed',
                message_stack=self._get_error_stack())

        return is_finalized.value

    def reset(self) -> None:
        """
        Resets the internal state of Rhino. It should be called before the engine can be used to infer intent from a new
        stream of audio.
        """
        status = self._reset_func(self._handle)
        if status is not self.PicovoiceStatuses.SUCCESS:
            raise self._PICOVOICE_STATUS_TO_EXCEPTION[status](
                message='Processing failed',
                message_stack=self._get_error_stack())

    def get_inference(self) -> Inference:
        """
         Gets inference results from Rhino. If the spoken command was understood, it includes the specific intent name
         that was inferred, and (if applicable) slot keys and specific slot values. Should only be called after the
         process function returns true, otherwise Rhino has not yet reached an inference conclusion.
         :return Inference object with `.is_understood`, `.intent` , and `.slots` getters.
        """

        is_understood = c_bool()
        status = self._is_understood_func(self._handle, byref(is_understood))
        if status is not self.PicovoiceStatuses.SUCCESS:
            raise self._PICOVOICE_STATUS_TO_EXCEPTION[status](
                message='Failed to get inference',
                message_stack=self._get_error_stack())
        is_understood = is_understood.value

        if is_understood:
            intent = c_char_p()
            num_slots = c_int()
            slot_keys = POINTER(c_char_p)()
            slot_values = POINTER(c_char_p)()
            status = self._get_intent_func(
                self._handle,
                byref(intent),
                byref(num_slots),
                byref(slot_keys),
                byref(slot_values))
            if status is not self.PicovoiceStatuses.SUCCESS:
                raise self._PICOVOICE_STATUS_TO_EXCEPTION[status](
                    message='Failed to get intent',
                    message_stack=self._get_error_stack())

            intent = intent.value.decode('utf-8')

            slots = dict()
            for i in range(num_slots.value):
                slots[slot_keys[i].decode('utf-8')] = slot_values[i].decode('utf-8')

            status = self._free_slots_and_values_func(self._handle, slot_keys, slot_values)
            if status is not self.PicovoiceStatuses.SUCCESS:
                raise self._PICOVOICE_STATUS_TO_EXCEPTION[status](
                    message='Failed to clear resources',
                    message_stack=self._get_error_stack())
        else:
            intent = None
            slots = dict()

        status = self._reset_func(self._handle)
        if status is not self.PicovoiceStatuses.SUCCESS:
            raise self._PICOVOICE_STATUS_TO_EXCEPTION[status](
                message='Reset failed',
                message_stack=self._get_error_stack())

        return Inference(is_understood=is_understood, intent=intent, slots=slots)

    @property
    def context_info(self) -> str:
        """Context information."""

        return self._context_info

    @property
    def version(self) -> str:
        """Version."""

        return self._version

    @property
    def frame_length(self) -> int:
        """Number of audio samples per frame."""

        return self._frame_length

    @property
    def sample_rate(self) -> int:
        """Audio sample rate accepted by Picovoice."""

        return self._sample_rate

    def _get_error_stack(self) -> Sequence[str]:
        message_stack_ref = POINTER(c_char_p)()
        message_stack_depth = c_int()
        status = self._get_error_stack_func(byref(message_stack_ref), byref(message_stack_depth))
        if status is not self.PicovoiceStatuses.SUCCESS:
            raise self._PICOVOICE_STATUS_TO_EXCEPTION[status](message='Unable to get Rhino error state')

        message_stack = list()
        for i in range(message_stack_depth.value):
            message_stack.append(message_stack_ref[i].decode('utf-8'))

        self._free_error_stack_func(message_stack_ref)

        return message_stack


__all__ = [
    'Rhino',
    'Inference',
    'RhinoError',
    'RhinoMemoryError',
    'RhinoIOError',
    'RhinoInvalidArgumentError',
    'RhinoStopIterationError',
    'RhinoKeyError',
    'RhinoInvalidStateError',
    'RhinoRuntimeError',
    'RhinoActivationError',
    'RhinoActivationLimitError',
    'RhinoActivationThrottledError',
    'RhinoActivationRefusedError',
]
