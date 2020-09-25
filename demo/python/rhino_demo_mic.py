#
# Copyright 2018-2020 Picovoice Inc.
#
# You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
# file accompanying this source.
#
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
# an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
# specific language governing permissions and limitations under the License.
#

import argparse
import os
import struct
from threading import Thread

import numpy as np
import pvrhino
import pyaudio
import soundfile


class RhinoDemo(Thread):
    """
    Demo class for Speech-to-Intent (aka Rhino) library. It creates an input audio stream from a microphone, monitors
    it, and upon detecting the specified wake phrase extracts the intent from the speech command that follows. Wake word
    detection is done using Porcupine's wake word detection engine (https://github.com/Picovoice/Porcupine).
    """

    def __init__(self, library_path, model_path, context_path, input_device_index=None, output_path=None):
        """
        Constructor.

        :param library_path: Absolute path to dynamic library.
        :param model_path: Absolute path to model file.
        :param context_path: Absolute path to context file.
        :param input_device_index: If provided, audio is recorded from this input device. Otherwise, the default audio
        input device is used.
        :param output_path: If provided recorded audio will be stored in this location at the end of the run.
        """

        super(RhinoDemo, self).__init__()

        self._library_path = library_path
        self._model_path = model_path
        self._context_path = context_path

        self._input_device_index = input_device_index

        self._output_path = output_path
        if self._output_path is not None:
            self._recorded_frames = list()

    def run(self):
        """
         Creates an input audio stream, initializes wake word detection (Porcupine) and speech to intent (Rhino)
         engines, and monitors the audio stream for occurrences of the wake word and then infers the intent from speech
         command that follows.
         """

        rhino = None
        pa = None
        audio_stream = None

        try:
            rhino = pvrhino.create(
                library_path=self._library_path,
                model_path=self._model_path,
                context_path=self._context_path)

            print()
            print('****************************** context ******************************')
            print(rhino.context_info)
            print('*********************************************************************')
            print()

            pa = pyaudio.PyAudio()

            audio_stream = pa.open(
                rate=rhino.sample_rate,
                channels=1,
                format=pyaudio.paInt16,
                input=True,
                frames_per_buffer=rhino.frame_length,
                input_device_index=self._input_device_index)

            while True:
                pcm = audio_stream.read(rhino.frame_length)
                pcm = struct.unpack_from("h" * rhino.frame_length, pcm)

                if self._output_path is not None:
                    self._recorded_frames.append(pcm)

                is_finalized = rhino.process(pcm)
                if is_finalized:
                    if rhino.is_understood():
                        intent, slot_values = rhino.get_intent()
                        print('{')
                        print("  intent : '%s'" % intent)
                        print('  slots : {')
                        for slot, value in slot_values.items():
                            print("    %s : '%s'" % (slot, value))
                        print('  }')
                        print('}')
                    else:
                        print("didn't understand the command")

                    rhino.reset()

        except KeyboardInterrupt:
            print('stopping ...')

        finally:
            if audio_stream is not None:
                audio_stream.close()

            if pa is not None:
                pa.terminate()

            if rhino is not None:
                rhino.delete()

            if self._output_path is not None and len(self._recorded_frames) > 0:
                recorded_audio = np.concatenate(self._recorded_frames, axis=0).astype(np.int16)
                soundfile.write(
                    os.path.expanduser(self._output_path),
                    recorded_audio,
                    samplerate=rhino.sample_rate,
                    subtype='PCM_16')

    _AUDIO_DEVICE_INFO_KEYS = ['index', 'name', 'defaultSampleRate', 'maxInputChannels']

    @classmethod
    def show_audio_devices_info(cls):
        """ Provides information regarding different audio devices available. """

        pa = pyaudio.PyAudio()

        for i in range(pa.get_device_count()):
            info = pa.get_device_info_by_index(i)
            print(', '.join("'%s': '%s'" % (k, str(info[k])) for k in cls._AUDIO_DEVICE_INFO_KEYS))

        pa.terminate()


def main():
    parser = argparse.ArgumentParser()

    parser.add_argument('--library_path', default=pvrhino.LIBRARY_PATH, help="absolute path to dynamic library")

    parser.add_argument('--model_path', default=pvrhino.MODEL_PATH, help="absolute path to model file")

    parser.add_argument('--context_path', help="absolute path to context file")

    parser.add_argument('--input_device_index', help='index of input audio device', type=int, default=None)

    parser.add_argument(
        '--output_path',
        help='absolute path to where recorded audio will be stored. If not set, it will be bypassed.',
        default=None)

    parser.add_argument('--show_audio_devices_info', action='store_true')

    args = parser.parse_args()

    if args.show_audio_devices_info:
        RhinoDemo.show_audio_devices_info()
    else:
        if not args.context_path:
            raise ValueError('missing path to rhino context file')

        RhinoDemo(
            library_path=args.library_path,
            model_path=args.model_path,
            context_path=args.context_path,
            input_device_index=args.input_device_index,
            output_path=args.output_path).run()


if __name__ == '__main__':
    main()
