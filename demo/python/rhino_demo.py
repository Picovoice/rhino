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
    """
    Demo class for Speech to Intent (aka Rhino) library. It creates an input audio stream from a microphone, monitors
    it, and upon detecting the specified wake phrase extracts the intent from the speech command that follows. Wake word
    detection is done using Porcupine's wake word detection engine (https://github.com/Picovoice/Porcupine).
    """

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
        """
        Constructor.

        :param rhino_library_path: Absolute path to Rhino's dynamic library.
        :param rhino_model_file_path: Absolute path to Rhino's model parameter file.
        :param rhino_context_file_path: Absolute path to Rhino's context file that defines the context of commands.
        :param porcupine_library_path: Absolute path to Porcupine's dynamic library.
        :param porcupine_model_file_path: Absolute path to Porcupine's model parameter file.
        :param porcupine_keyword_file_path: Absolute path to Porcupine's keyword file for wake phrase.
        :param porcupine_sensitivity: Porcupine's detection sensitivity.
        :param input_device_index: Optional argument. If provided, audio is recorded from this input device. Otherwise,
        the default audio input device is used.
        :param output_path: If provided recorded audio will be stored in this location at the end of the run.
        """

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
        """
         Creates an input audio stream, initializes wake word detection (Porcupine) and speech to intent (Rhino)
         engines, and monitors the audio stream for occurrences of the wake word and then infers the intent from speech
         command that follows.
         """

        porcupine = None
        rhino = None
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
            print(rhino.context_expressions)

            pa = pyaudio.PyAudio()

            audio_stream = pa.open(
                rate=porcupine.sample_rate,
                channels=1,
                format=pyaudio.paInt16,
                input=True,
                frames_per_buffer=porcupine.frame_length,
                input_device_index=self._input_device_index)

            # NOTE: This is true now and will be correct possibly forever. If it changes the logic below need to change.
            assert porcupine.frame_length == rhino.frame_length

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
                else:
                    if rhino.is_understood():
                        intent, slot_values = rhino.get_intent()
                        print('intent: %s' % intent)
                        print('---')
                        for slot, value in slot_values.items():
                            print('%s: %s' % (slot, value))
                        print()
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

    parser.add_argument('--rhino_library_path', help="absolute path to Rhino's dynamic library")

    parser.add_argument('--rhino_model_file_path', help="absolute path to Rhino's model file path")

    parser.add_argument('--rhino_context_file_path', help="absolute path to Rhino's context file", type=str)

    parser.add_argument('--porcupine_library_path', help="absolute path to Porcupine's dynamic library")

    parser.add_argument('--porcupine_model_file_path', help="absolute path to Porcupine's model parameter file")

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
