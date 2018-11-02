import argparse
import os
import struct
import sys
from threading import Thread

import numpy as np
import pyaudio
import soundfile


def _abs_path(rel_path):
    return os.path.join(os.path.dirname(__file__), '../..', rel_path)


sys.path.append(_abs_path('binding/python'))
sys.path.append(_abs_path('resources/porcupine/binding/python'))


from porcupine import Porcupine
from rhino import Rhino


class RhinoDemo(Thread):
    def __init__(
            self,
            rhino_library_path,
            rhino_model_file_path,
            rhino_context_file_path,
            porcupine_library_path,
            porcupine_model_file_path,
            porcupine_keyword_file_path,
            porcupine_sensitivity,
            input_device_index=None,
            output_path=None):

        super(RhinoDemo, self).__init__()

        self._rhino_library_path = rhino_library_path
        self._rhino_model_file_path = rhino_model_file_path
        self._rhino_context_file_path = rhino_context_file_path

        self._porcupine_library_path = porcupine_library_path
        self._porcupine_model_file_path = porcupine_model_file_path
        self._porcupine_keyword_file_path = porcupine_keyword_file_path
        self._porcupine_sensitivity = porcupine_sensitivity

        self._input_device_index = input_device_index

        self._output_path = output_path
        if self._output_path is not None:
            self._recorded_frames = []

    def run(self):
        rhino = None
        porcupine = None
        pa = None
        audio_stream = None

        wake_phrase_detected = False
        intent_extraction_is_finalized = False

        try:
            porcupine = Porcupine(
                library_path=self._porcupine_library_path,
                model_file_path=self._porcupine_model_file_path,
                keyword_file_paths=[self._porcupine_keyword_file_path],
                sensitivities=[self._porcupine_sensitivity])

            rhino = Rhino(
                library_path=self._rhino_library_path,
                model_file_path=self._rhino_model_file_path,
                context_file_path=self._rhino_context_file_path)

            pa = pyaudio.PyAudio()
            audio_stream = pa.open(
                rate=porcupine.sample_rate,
                channels=1,
                format=pyaudio.paInt16,
                input=True,
                frames_per_buffer=porcupine.frame_length,
                input_device_index=self._input_device_index)

            while True:
                pcm = audio_stream.read(porcupine.frame_length)
                pcm = struct.unpack_from("h" * porcupine.frame_length, pcm)

                if self._output_path is not None:
                    self._recorded_frames.append(pcm)

                if not wake_phrase_detected:
                    wake_phrase_detected = porcupine.process(pcm)
                    if wake_phrase_detected:
                        print('detected wake phrase')
                elif not intent_extraction_is_finalized:
                    intent_extraction_is_finalized = rhino.process(pcm)

                if intent_extraction_is_finalized:
                    if rhino.is_understood():
                        for attribute in rhino.get_attributes():
                            print('%s: %s' % (attribute, rhino.get_attribute_value(attribute)))

                    else:
                        print("didn't understand the command")

                    rhino.reset()
                    wake_phrase_detected = False
                    intent_extraction_is_finalized = False

        except KeyboardInterrupt:
            print('stopping ...')
        finally:
            if porcupine is not None:
                porcupine.delete()

            if rhino is not None:
                rhino.delete()

            if audio_stream is not None:
                audio_stream.close()

            if pa is not None:
                pa.terminate()

            if self._output_path is not None and len(self._recorded_frames) > 0:
                recorded_audio = np.concatenate(self._recorded_frames, axis=0).astype(np.int16)

                soundfile.write(self._output_path, recorded_audio, samplerate=porcupine.sample_rate, subtype='PCM_16')

    _AUDIO_DEVICE_INFO_KEYS = ['index', 'name', 'defaultSampleRate', 'maxInputChannels']

    @classmethod
    def show_audio_devices_info(cls):
        """ Provides information regarding different audio devices available. """

        pa = pyaudio.PyAudio()

        for i in range(pa.get_device_count()):
            info = pa.get_device_info_by_index(i)
            print(', '.join("'%s': '%s'" % (k, str(info[k])) for k in cls._AUDIO_DEVICE_INFO_KEYS))

        pa.terminate()


if __name__ == '__main__':
    parser = argparse.ArgumentParser()

    parser.add_argument(
        '--rhino_library_path',
        help="absolute path to Rhino's dynamic library",
        type=str,
        default=_abs_path('lib/linux/x86_64/libpv_rhino.so'))

    parser.add_argument(
        '--rhino_model_file_path',
        help="absolute path to Rhino's model file path",
        type=str,
        default=_abs_path('lib/common/rhino_params.pv'))

    parser.add_argument('--rhino_context_file_path', help="absolute path to Rhino's context file", type=str)

    parser.add_argument(
        '--porcupine_library_path',
        help="absolute path to Porcupine's dynamic library",
        type=str,
        default=_abs_path('resources/porcupine/lib/linux/x86_64/libpv_porcupine.so'))

    parser.add_argument(
        '--porcupine_model_file_path',
        help="absolute path to Porcupine's model parameter file",
        type=str,
        default=_abs_path('resources/porcupine/lib/common/porcupine_params.pv'))

    parser.add_argument('--porcupine_keyword_file_path', help='absolute path to porcupine keyword file', type=str)

    parser.add_argument('--porcupine_sensitivity', help="Porcupine's detection sensitivity [0, 1]", default=0.5)

    parser.add_argument('--input_audio_device_index', help='index of input audio device', type=int, default=None)

    parser.add_argument(
        '--output_path',
        help='absolute path to where recorded audio will be stored. If not set, it will be bypassed.',
        type=str,
        default=None)

    parser.add_argument('--show_audio_devices_info', action='store_true')

    args = parser.parse_args()

    if args.show_audio_devices_info:
        RhinoDemo.show_audio_devices_info()
    else:
        RhinoDemo(
            rhino_library_path=args.rhino_library_path,
            rhino_model_file_path=args.rhino_model_file_path,
            rhino_context_file_path=args.rhino_context_file_path,
            porcupine_library_path=args.porcupine_library_path,
            porcupine_model_file_path=args.porcupine_model_file_path,
            porcupine_keyword_file_path=args.porcupine_keyword_file_path,
            porcupine_sensitivity=args.porcupine_sensitivity,
            input_device_index=args.input_audio_device_index,
            output_path=args.output_path).run()
