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
    """Python binding for Picovoice's Speech to Intent (a.k.a Rhino) library."""

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
        PicovoiceStatuses.INVALID_STATE: ValueError
    }

    class CRhino(Structure):
        pass

    def __init__(self, library_path, model_file_path, context_file_path):
        """
        Constructor.

        :param library_path: Absolute path to Rhino's dynamic library.
        :param model_file_path: Absolute path to Rhino's model parameter file.
        :param context_file_path: Absolute path to Rhino's context file.
        """

        if not os.path.exists(library_path):
            raise ValueError("couldn't find library path at '%s'" % library_path)

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

        self._frame_length = library.pv_rhino_frame_length()

        self._sample_rate = library.pv_sample_rate()

        self._version = library.pv_rhino_version()

    def process(self, pcm):
        """
        Processes a frame of audio.

        :param pcm: An array (or array-like) of consecutive audio samples. For more information regarding required audio
        properties (i.e. sample rate, number of channels, encoding, and number of samples per frame) please refer to
        'include/pv_rhino.h'.

        :return: A flag if the engine has finalized intent extraction.
        """

        assert len(pcm) == self.frame_length
        is_finalized = c_bool()
        status = self._process_func(self._handle, (c_short * len(pcm))(*pcm), byref(is_finalized))
        if status is not self.PicovoiceStatuses.SUCCESS:
            raise self._PICOVOICE_STATUS_TO_EXCEPTION[status]('Processing failed')

        return is_finalized.value

    def is_understood(self):
        """
        Indicates weather the engine understood the intent within speech command.

        :return: Flag indicating if the engine understood the intent.
        """

        is_understood = c_bool()
        status = self._is_understood_func(self._handle, byref(is_understood))
        if status is not self.PicovoiceStatuses.SUCCESS:
            raise self._PICOVOICE_STATUS_TO_EXCEPTION[status]('Processing failed')

        return is_understood.value

    def get_intent(self):
        """
        Retrieves the inferred intent.

        :return: Tuple of intent string and list of pairs of slots and their corresponding values.
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
            raise self._PICOVOICE_STATUS_TO_EXCEPTION[status]('Getting intent failed')

        slot_values = dict()
        for i in range(num_slots.value):
            slot_values[slots[i].decode('utf-8')] = values[i].decode('utf-8')

        return intent.value.decode('utf-8'), slot_values

    def reset(self):
        """Reset's the internal state of Speech to Intent engine."""

        status = self._reset_func(self._handle)
        if status is not self.PicovoiceStatuses.SUCCESS:
            raise self._PICOVOICE_STATUS_TO_EXCEPTION[status]('Reset failed')

    def delete(self):
        """Releases resources acquired by Rhino's library."""

        self._delete_func(self._handle)

    @property
    def frame_length(self):
        """Number of audio samples per frame expected by C library."""

        return self._frame_length

    @property
    def sample_rate(self):
        """Audio sample rate accepted by Rhino library."""

        return self._sample_rate

    @property
    def version(self):
        return self._version
