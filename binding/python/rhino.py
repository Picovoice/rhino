#
# Copyright 2018 Picovoice Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#

import os
from ctypes import *
from enum import Enum


class Rhino(object):
    """Python binding for Picovoice's Speech to Intent (a.k.a Rhino) engine."""

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

    def __init__(self, library_path, model_file_path, context_file_path):
        """
        Constructor.

        :param library_path: Absolute path to Rhino's dynamic library.
        :param model_file_path: Absolute path to file containing model parameters.
        :param context_file_path: Absolute path to file containing context parameters. A context represents the set of
        expressions (commands), intents, and intent arguments (slots) within a domain of interest.
        """

        if not os.path.exists(library_path):
            raise ValueError("couldn't find library at '%s'" % library_path)

        library = cdll.LoadLibrary(library_path)

        if not os.path.exists(model_file_path):
            raise ValueError("couldn't find model file at '%s'" % model_file_path)

        if not os.path.exists(context_file_path):
            raise ValueError("couldn't find context file at '%s'" % context_file_path)

        init_func = library.pv_rhino_init
        init_func.argtypes = [c_char_p, c_char_p, POINTER(POINTER(self.CRhino))]
        init_func.restype = self.PicovoiceStatuses

        self._handle = POINTER(self.CRhino)()

        status = init_func(model_file_path.encode('utf-8'), context_file_path.encode('utf-8'), byref(self._handle))
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

        self._reset_func = library.pv_rhino_reset
        self._reset_func.argtypes = [POINTER(self.CRhino)]
        self._reset_func.restype = self.PicovoiceStatuses

        context_expressions_func = library.pv_rhino_context_expressions
        context_expressions_func.argtypes = [POINTER(self.CRhino), POINTER(c_char_p)]
        context_expressions_func.restype = self.PicovoiceStatuses

        expressions = c_char_p()
        status = context_expressions_func(self._handle, byref(expressions))
        if status is not self.PicovoiceStatuses.SUCCESS:
            raise self._PICOVOICE_STATUS_TO_EXCEPTION[status]('getting expressions failed')

        self._context_expressions = expressions.value.decode('utf-8')

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
        Processes a frame of audio and emits a flag indicating if the engine has finalized intent extraction. When
        finalized, 'self.is_understood()' should be called to check if the command was valid
        (is within context of interest).

        :param pcm: A frame of audio samples. The number of samples per frame can be attained by calling
        'self.frame_length'. The incoming audio needs to have a sample rate equal to 'self.sample_rate' and be 16-bit
        linearly-encoded. Furthermore, Rhino operates on single channel audio.

        :return: Flag indicating whether the engine has finalized intent extraction.
        """

        if len(pcm) != self.frame_length:
            raise ValueError("invalid frame length")

        is_finalized = c_bool()
        status = self._process_func(self._handle, (c_short * len(pcm))(*pcm), byref(is_finalized))
        if status is not self.PicovoiceStatuses.SUCCESS:
            raise self._PICOVOICE_STATUS_TO_EXCEPTION[status]('processing failed')

        return is_finalized.value

    def is_understood(self):
        """
        Indicates if the spoken command is valid, is within the domain of interest (context), and the engine understood
        it.

        :return: Flag indicating if the spoken command is valid, is within the domain of interest (context), and the
        engine understood it.
        """

        is_understood = c_bool()
        status = self._is_understood_func(self._handle, byref(is_understood))
        if status is not self.PicovoiceStatuses.SUCCESS:
            raise self._PICOVOICE_STATUS_TO_EXCEPTION[status]('failed to verify if the spoken command is understood')

        return is_understood.value

    def get_intent(self):
        """
         Getter for the intent inferred from spoken command. The intent is presented as an intent string and a
         dictionary mapping slots to their values. It should be called only after intent extraction is finalized and it
         is verified that the spoken command is valid and understood via calling 'self.is_understood()'.

        :return: Tuple of intent string and slot dictionary.
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
            raise self._PICOVOICE_STATUS_TO_EXCEPTION[status]('getting intent failed')

        slot_values = dict()
        for i in range(num_slots.value):
            slot_values[slots[i].decode('utf-8')] = values[i].decode('utf-8')

        return intent.value.decode('utf-8'), slot_values

    def reset(self):
        """
        Resets the internal state of the engine. It should be called before the engine can be used to infer intent from
        a new stream of audio.
        """

        status = self._reset_func(self._handle)
        if status is not self.PicovoiceStatuses.SUCCESS:
            raise self._PICOVOICE_STATUS_TO_EXCEPTION[status]('reset failed')

    @property
    def context_expressions(self):
        """
        Getter for expressions. Each expression maps a set of spoken phrases to an intent and possibly a number of slots
        (intent arguments).
        """

        return self._context_expressions

    @property
    def version(self):
        """Getter for version string."""

        return self._version

    @property
    def frame_length(self):
        """Getter for length (number of audio samples) per frame."""

        return self._frame_length

    @property
    def sample_rate(self):
        """Audio sample rate accepted by Picovoice."""

        return self._sample_rate
