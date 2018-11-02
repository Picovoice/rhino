import os
from ctypes import *
from ctypes import util
from enum import Enum


class Rhino(object):
    class PicovoiceStatuses(Enum):
        """Status codes corresponding to 'pv_status_t' defined in 'include/picovoice.h'"""

        SUCCESS = 0
        OUT_OF_MEMORY = 1
        IO_ERROR = 2
        INVALID_ARGUMENT = 3
        STOP_ITERATION = 4
        KEY_ERROR = 5

    _PICOVOICE_STATUS_TO_EXCEPTION = {
        PicovoiceStatuses.OUT_OF_MEMORY: MemoryError,
        PicovoiceStatuses.IO_ERROR: IOError,
        PicovoiceStatuses.INVALID_ARGUMENT: ValueError,
        PicovoiceStatuses.STOP_ITERATION: StopIteration,
        PicovoiceStatuses.KEY_ERROR: KeyError
    }

    class CRhino(Structure):
        pass

    def __init__(self, library_path, model_file_path, context_file_path):
        self._libc = CDLL(util.find_library('c'))

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

        status = init_func(model_file_path.encode(), context_file_path.encode(), byref(self._handle))
        if status is not self.PicovoiceStatuses.SUCCESS:
            raise self._PICOVOICE_STATUS_TO_EXCEPTION[status]('Initialization failed')

        self._delete_func = library.pv_rhino_delete
        self._delete_func.argtypes = [POINTER(self.CRhino)]
        self._delete_func.restype = None

        self._process_func = library.pv_rhino_process
        self._process_func.argtypes = [POINTER(self.CRhino), POINTER(c_short), POINTER(c_bool)]
        self._process_func.restype = self.PicovoiceStatuses

        self._is_understood_func = library.pv_rhino_is_understood
        self._is_understood_func.argtypes = [POINTER(self.CRhino), POINTER(c_bool)]
        self._is_understood_func.restype = self.PicovoiceStatuses

        self._get_num_attributes_func = library.pv_rhino_get_num_attributes
        self._get_num_attributes_func.argtypes = [POINTER(self.CRhino), POINTER(c_int)]
        self._get_num_attributes_func.restype = self.PicovoiceStatuses

        self._get_attribute_func = library.pv_rhino_get_attribute
        self._get_attribute_func.argtypes = [POINTER(self.CRhino), c_int, POINTER(c_char_p)]
        self._get_attribute_func.restype = self.PicovoiceStatuses

        self._sample_rate = library.pv_sample_rate()

        self._frame_length = library.pv_rhino_frame_length()

        self._get_attribute_value_func = library.pv_rhino_get_attribute_value
        self._get_attribute_value_func.argtypes = [POINTER(self.CRhino), c_char_p, POINTER(c_char_p)]
        self._get_attribute_value_func.restype = self.PicovoiceStatuses

        self._reset_func = library.pv_rhino_reset
        self._reset_func.argtypes = [POINTER(self.CRhino)]
        self._reset_func.restype = self.PicovoiceStatuses

    @property
    def sample_rate(self):
        return self._sample_rate

    @property
    def frame_length(self):
        return self._frame_length

    def process(self, pcm):
        assert len(pcm) == self.frame_length
        is_finalized = c_bool()
        status = self._process_func(self._handle, (c_short * len(pcm))(*pcm), byref(is_finalized))
        if status is not self.PicovoiceStatuses.SUCCESS:
            raise self._PICOVOICE_STATUS_TO_EXCEPTION[status]('Processing failed')

        return is_finalized.value

    def is_understood(self):
        is_understood = c_bool()
        status = self._is_understood_func(self._handle, byref(is_understood))
        if status is not self.PicovoiceStatuses.SUCCESS:
            raise self._PICOVOICE_STATUS_TO_EXCEPTION[status]('Processing failed')

        return is_understood.value

    def get_attributes(self):
        num_attributes = c_int()
        status = self._get_num_attributes_func(self._handle, byref(num_attributes))

        if status is not self.PicovoiceStatuses.SUCCESS:
            raise self._PICOVOICE_STATUS_TO_EXCEPTION[status]('Getting number of attributes failed')

        attributes = []

        for i in range(num_attributes.value):
            attribute = c_char_p()
            status = self._get_attribute_func(self._handle, i, byref(attribute))

            if status is not self.PicovoiceStatuses.SUCCESS:
                raise self._PICOVOICE_STATUS_TO_EXCEPTION[status]('Getting attribute failed')

            attributes.append(attribute.value.decode('utf-8'))

        return set(attributes)

    def get_attribute_value(self, attribute):
        value = c_char_p()
        status = self._get_attribute_value_func(
            self._handle,
            create_string_buffer(attribute.encode('utf-8')),
            byref(value))

        if status is not self.PicovoiceStatuses.SUCCESS:
            raise self._PICOVOICE_STATUS_TO_EXCEPTION[status]('Getting attribute value failed')

        return value.value.decode('utf-8')

    def reset(self):
        status = self._reset_func(self._handle)

        if status is not self.PicovoiceStatuses.SUCCESS:
            raise self._PICOVOICE_STATUS_TO_EXCEPTION[status]('Reset failed')

    def delete(self):
        self._delete_func(self._handle)
