#
# Copyright 2018 Picovoice Inc.
#
# You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
# file accompanying this source.
#
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
# an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
# specific language governing permissions and limitations under the License.
#

import os
from ctypes import *
from enum import Enum


class Rhino(object):
    """Python binding for Picovoice's Speech-to-Intent (Rhino) engine."""

    class PicovoiceStatuses(Enum):
        """Status codes corresponding to 'pv_status_t' defined in 'include/picovoice.h'"""

        SUCCESS = 0
        OUT_OF_MEMORY = 1
        IO_ERROR = 2
        INVALID_ARGUMENT = 3
        STOP_ITERATION = 4
        KEY_ERROR = 5
        INVALID_STATE = 6

    _PICOVOICE_STATUS_TO_EXCEPTION = {
        PicovoiceStatuses.OUT_OF_MEMORY: MemoryError,
        PicovoiceStatuses.IO_ERROR: IOError,
        PicovoiceStatuses.INVALID_ARGUMENT: ValueError,
        PicovoiceStatuses.STOP_ITERATION: StopIteration,
        PicovoiceStatuses.KEY_ERROR: KeyError,
        PicovoiceStatuses.INVALID_STATE: RuntimeError
    }

    class CRhino(Structure):
        pass

    def __init__(self, library_path, model_path, context_path, sensitivity=0.5):
        """
        Constructor.

        :param library_path: Absolute path to Rhino's dynamic library.
        :param model_path: Absolute path to file containing model parameters.
        :param context_path: Absolute path to file containing context parameters. A context represents the set of
        expressions (commands), intents, and intent arguments (slots) within a domain of interest.
        :param sensitivity: Sensitivity for inference. It should be a floating-point number within [0, 1]. A higher
        sensitivity value results in fewer inference misses at the cost of potentially increasing the erroneous
        inference rate.
        """

        if not os.path.exists(library_path):
            raise IOError("couldn't find Rhino's library at '%s'" % library_path)

        library = cdll.LoadLibrary(library_path)

        if not os.path.exists(model_path):
            raise IOError("couldn't find model file at '%s'" % model_path)

        if not os.path.exists(context_path):
            raise IOError("couldn't find context file at '%s'" % context_path)

        init_func = library.pv_rhino_init
        init_func.argtypes = [c_char_p, c_char_p, c_float, POINTER(POINTER(self.CRhino))]
        init_func.restype = self.PicovoiceStatuses

        self._handle = POINTER(self.CRhino)()

        status = init_func(
            model_path.encode('utf-8'),
            context_path.encode('utf-8'),
            sensitivity,
            byref(self._handle))
        if status is not self.PicovoiceStatuses.SUCCESS:
            raise self._PICOVOICE_STATUS_TO_EXCEPTION[status]('initialization failed')

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
            raise self._PICOVOICE_STATUS_TO_EXCEPTION[status]('retrieving context information failed')

        self._context_info = context_info.value.decode('utf-8')

        version_func = library.pv_rhino_version
        version_func.argtypes = []
        version_func.restype = c_char_p
        self._version = version_func().decode('utf-8')

        self._frame_length = library.pv_rhino_frame_length()

        self._sample_rate = library.pv_sample_rate()

    def delete(self):
        """Releases resources acquired by Rhino's library."""

        self._delete_func(self._handle)

    def process(self, pcm):
        """
        Processes a frame of audio and emits a flag indicating if intent inference is finalized. When finalized,
        '.is_understood()' should be called to check if the spoken command is considered valid.

        :param pcm: A frame of audio samples. The number of samples per frame can be attained by calling
        '.frame_length'. The incoming audio needs to have a sample rate equal to '.sample_rate' and be 16-bit
        linearly-encoded. Furthermore, Rhino operates on single channel audio.

        :return: Flag indicating if intent inference is finalized.
        """

        if len(pcm) != self.frame_length:
            raise ValueError("invalid frame length")

        is_finalized = c_bool()
        status = self._process_func(self._handle, (c_short * len(pcm))(*pcm), byref(is_finalized))
        if status is not self.PicovoiceStatuses.SUCCESS:
            raise self._PICOVOICE_STATUS_TO_EXCEPTION[status]()

        return is_finalized.value

    def is_understood(self):
        """
        Indicates if the spoken command is valid, is within the domain of interest (context), and the engine understood
        it.
        """

        is_understood = c_bool()
        status = self._is_understood_func(self._handle, byref(is_understood))
        if status is not self.PicovoiceStatuses.SUCCESS:
            raise self._PICOVOICE_STATUS_TO_EXCEPTION[status]()

        return is_understood.value

    def get_intent(self):
        """
         Getter for the intent. The intent is presented as an intent string and a dictionary mapping slots to their
         values. It should be called only after intent extraction is finalized and it is verified that the spoken
         command is understood via calling '.is_understood()'.

        :return: Tuple of intent string and slot/value dictionary.
        """

        intent = c_char_p()
        num_slots = c_int()
        slots = POINTER(c_char_p)()
        values = POINTER(c_char_p)()
        status = self._get_intent_func(
            self._handle,
            byref(intent),
            byref(num_slots),
            byref(slots),
            byref(values))
        if status is not self.PicovoiceStatuses.SUCCESS:
            raise self._PICOVOICE_STATUS_TO_EXCEPTION[status]()

        slot_values = dict()
        for i in range(num_slots.value):
            slot_values[slots[i].decode('utf-8')] = values[i].decode('utf-8')

        status = self._free_slots_and_values_func(self._handle, slots, values)
        if status is not self.PicovoiceStatuses.SUCCESS:
            raise self._PICOVOICE_STATUS_TO_EXCEPTION[status]()

        return intent.value.decode('utf-8'), slot_values

    def reset(self):
        """
        Resets the internal state of the engine. It should be called before the engine can be used to infer intent from
        a new stream of audio.
        """

        status = self._reset_func(self._handle)
        if status is not self.PicovoiceStatuses.SUCCESS:
            raise self._PICOVOICE_STATUS_TO_EXCEPTION[status]()

    @property
    def context_info(self):
        """Getter for context information."""

        return self._context_info

    @property
    def version(self):
        """Getter for version."""

        return self._version

    @property
    def frame_length(self):
        """Getter for number of audio samples per frame."""

        return self._frame_length

    @property
    def sample_rate(self):
        """Audio sample rate accepted by Picovoice."""

        return self._sample_rate
