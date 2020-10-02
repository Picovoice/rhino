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
    Microphone Demo for Rhino Speech-to-Intent engine. It creates an input audio stream from a microphone, monitors
    it, and extracts the intent from the speech command. It optionally saves the recorded audio into a file for further
    debugging.
    """

    def __init__(self, library_path, model_path, context_path, audio_device_index=None, output_path=None):
        """
        Constructor.

        :param library_path: Absolute path to Rhino's dynamic library.
        :param model_path: Absolute path to file containing model parameters.
        :param context_path: Absolute path to file containing context model (file with `.rhn` extension). A context
        represents the set of expressions (spoken commands), intents, and intent arguments (slots) within a domain of
        interest.
        :param audio_device_index: Optional argument. If provided, audio is recorded from this input device. Otherwise,
        the default audio input device is used.
        :param output_path: If provided recorded audio will be stored in this location at the end of the run.
        """

        super(RhinoDemo, self).__init__()

        self._library_path = library_path
        self._model_path = model_path
        self._context_path = context_path

        self._audio_device_index = audio_device_index

        self._output_path = output_path
        if self._output_path is not None:
            self._recorded_frames = list()

    def run(self):
        """
         Creates an input audio stream, instantiates an instance of Rhino object, and infers the intent from spoken
         commands.
         """

        rhino = None
        pa = None
        audio_stream = None

        try:
            rhino = pvrhino.create(
                library_path=self._library_path,
                model_path=self._model_path,
                context_path=self._context_path)

            pa = pyaudio.PyAudio()

            audio_stream = pa.open(
                rate=rhino.sample_rate,
                channels=1,
                format=pyaudio.paInt16,
                input=True,
                frames_per_buffer=rhino.frame_length,
                input_device_index=self._audio_device_index)

            print(rhino.context_info)
            print()

            while True:
                pcm = audio_stream.read(rhino.frame_length)
                pcm = struct.unpack_from("h" * rhino.frame_length, pcm)

                if self._output_path is not None:
                    self._recorded_frames.append(pcm)

                is_finalized = rhino.process(pcm)
                if is_finalized:
                    inference = rhino.get_inference()
                    if inference.is_understood:
                        print('{')
                        print("  intent : '%s'" % inference.intent)
                        print('  slots : {')
                        for slot, value in inference.slots.items():
                            print("    %s : '%s'" % (slot, value))
                        print('  }')
                        print('}\n')
                    else:
                        print("Didn't understand the command.\n")

        except KeyboardInterrupt:
            print('Stopping ...')

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

    @classmethod
    def show_audio_devices(cls):
        fields = ('index', 'name', 'defaultSampleRate', 'maxInputChannels')

        pa = pyaudio.PyAudio()

        for i in range(pa.get_device_count()):
            info = pa.get_device_info_by_index(i)
            print(', '.join("'%s': '%s'" % (k, str(info[k])) for k in fields))

        pa.terminate()


def main():
    parser = argparse.ArgumentParser()

    parser.add_argument('--context_path', help="Absolute path to context file.")

    parser.add_argument('--library_path', help="Absolute path to dynamic library.", default=pvrhino.LIBRARY_PATH)

    parser.add_argument(
        '--model_path',
        help="Absolute path to the file containing model parameters.",
        default=pvrhino.MODEL_PATH)

    parser.add_argument('--audio_device_index', help='Index of input audio device.', type=int, default=None)

    parser.add_argument('--output_path', help='Absolute path to recorded audio for debugging.', default=None)

    parser.add_argument('--show_audio_devices', action='store_true')

    args = parser.parse_args()

    if args.show_audio_devices:
        RhinoDemo.show_audio_devices()
    else:
        if not args.context_path:
            raise ValueError('Missing path to context file')

        RhinoDemo(
            library_path=args.library_path,
            model_path=args.model_path,
            context_path=args.context_path,
            audio_device_index=args.audio_device_index,
            output_path=args.output_path).run()


if __name__ == '__main__':
    main()
