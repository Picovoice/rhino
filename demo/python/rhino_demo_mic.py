#
# Copyright 2018-2021 Picovoice Inc.
#
# You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
# file accompanying this source.
#
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
# an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
# specific language governing permissions and limitations under the License.
#

import argparse
import struct
import wave
from threading import Thread

import pvrhino
from pvrecorder import PvRecorder


class RhinoDemo(Thread):
    """
    Microphone Demo for Rhino Speech-to-Intent engine. It creates an input audio stream from a microphone, monitors
    it, and extracts the intent from the speech command. It optionally saves the recorded audio into a file for further
    debugging.
    """

    def __init__(
            self,
            access_key,
            library_path,
            model_path,
            context_path,
            endpoint_duration_sec,
            require_endpoint,
            audio_device_index=None,
            output_path=None):
        """
        Constructor.

        :param access_key: AccessKey obtained from Picovoice Console (https://console.picovoice.ai/).
        :param library_path: Absolute path to Rhino's dynamic library.
        :param model_path: Absolute path to file containing model parameters.
        :param context_path: Absolute path to file containing context model (file with `.rhn` extension). A context
        represents the set of expressions (spoken commands), intents, and intent arguments (slots) within a domain of
        interest.
        :param endpoint_duration_sec: Endpoint duration in seconds. An endpoint is a chunk of silence at the end of an
        utterance that marks the end of spoken command. It should be a positive number within [0.5, 5]. A lower endpoint
        duration reduces delay and improves responsiveness. A higher endpoint duration assures Rhino doesn't return
        inference preemptively in case the user pauses before finishing the request.
        require_endpoint: If set to `True`, Rhino requires an endpoint (a chunk of silence) after the spoken command.
        If set to `False`, Rhino tries to detect silence, but if it cannot, it still will provide inference regardless.
        Set to `False` only if operating in an environment with overlapping speech (e.g. people talking in the
        background).
        :param audio_device_index: Optional argument. If provided, audio is recorded from this input device. Otherwise,
        the default audio input device is used.
        :param output_path: If provided recorded audio will be stored in this location at the end of the run.
        """

        super(RhinoDemo, self).__init__()

        self._access_key = access_key
        self._library_path = library_path
        self._model_path = model_path
        self._context_path = context_path
        self._endpoint_duration_sec = endpoint_duration_sec
        self._require_endpoint = require_endpoint
        self._audio_device_index = audio_device_index

        self._output_path = output_path

    def run(self):
        """
         Creates an input audio stream, instantiates an instance of Rhino object, and infers the intent from spoken
         commands.
         """

        rhino = None
        recorder = None
        wav_file = None

        try:
            rhino = pvrhino.create(
                access_key=self._access_key,
                library_path=self._library_path,
                model_path=self._model_path,
                context_path=self._context_path,
                endpoint_duration_sec=self._endpoint_duration_sec,
                require_endpoint=self._require_endpoint)

            recorder = PvRecorder(device_index=self._audio_device_index, frame_length=rhino.frame_length)
            recorder.start()

            if self._output_path is not None:
                wav_file = wave.open(self._output_path, "w")
                wav_file.setparams((1, 2, 16000, 512, "NONE", "NONE"))

            print(rhino.context_info)
            print()

            print("Using device: %s" % recorder.selected_device)
            print("Listening...")
            print()

            while True:
                pcm = recorder.read()

                if wav_file is not None:
                    wav_file.writeframes(struct.pack("h" * len(pcm), *pcm))

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
        except pvrhino.RhinoInvalidArgumentError as e:
            args = (
                self._access_key,
                self._library_path,
                self._model_path,
                self._context_path,
                self._require_endpoint
            )
            print("One or more arguments provided to Rhino is invalid: ", args)
            print("If all other arguments seem valid, ensure that '%s' is a valid AccessKey" % self._access_key)
            raise e
        except pvrhino.RhinoActivationError as e:
            print("AccessKey activation error")
            raise e
        except pvrhino.RhinoActivationLimitError as e:
            print("AccessKey '%s' has reached it's temporary device limit" % self._access_key)
            raise e
        except pvrhino.RhinoActivationRefusedError as e:
            print("AccessKey '%s' refused" % self._access_key)
            raise e
        except pvrhino.RhinoActivationThrottledError as e:
            print("AccessKey '%s' has been throttled" % self._access_key)
            raise e
        except pvrhino.RhinoError as e:
            print("Failed to initialize Rhino")
            raise e
        except KeyboardInterrupt:
            print('Stopping ...')

        finally:
            if recorder is not None:
                recorder.delete()

            if rhino is not None:
                rhino.delete()

            if wav_file is not None:
                wav_file.close()

    @classmethod
    def show_audio_devices(cls):
        devices = PvRecorder.get_audio_devices()

        for i in range(len(devices)):
            print("index: %d, device name: %s" % (i, devices[i]))


def main():
    parser = argparse.ArgumentParser()

    parser.add_argument('--access_key',
                        help='AccessKey obtained from Picovoice Console (https://console.picovoice.ai/)',
                        required=True)

    parser.add_argument('--context_path', help="Absolute path to context file.", required=True)

    parser.add_argument('--library_path', help="Absolute path to dynamic library.", default=pvrhino.LIBRARY_PATH)

    parser.add_argument(
        '--model_path',
        help="Absolute path to the file containing model parameters.",
        default=pvrhino.MODEL_PATH)

    parser.add_argument(
        '--sensitivity',
        help="Inference sensitivity. It should be a number within [0, 1]. A higher sensitivity value results in " +
             "fewer misses at the cost of (potentially) increasing the erroneous inference rate.",
        type=float,
        default=0.5)

    parser.add_argument(
        '--endpoint_duration_sec',
        help="Endpoint duration in seconds. An endpoint is a chunk of silence at the end of an utterance that marks "
             "the end of spoken command. It should be a positive number within [0.5, 5]. A lower endpoint duration "
             "reduces delay and improves responsiveness. A higher endpoint duration assures Rhino doesn't return "
             "inference preemptively in case the user pauses before finishing the request.",
        type=float,
        default=1.)

    parser.add_argument(
        '--require_endpoint',
        help="If set to `True`, Rhino requires an endpoint (a chunk of silence) after the spoken command. If set to "
             "`False`, Rhino tries to detect silence, but if it cannot, it still will provide inference regardless. "
             "Set to `False` only if operating in an environment with overlapping speech (e.g. people talking in the "
             "background).",
        default='True',
        choices=['True', 'False'])

    parser.add_argument('--audio_device_index', help='Index of input audio device.', type=int, default=-1)

    parser.add_argument('--output_path', help='Absolute path to recorded audio for debugging.', default=None)

    parser.add_argument('--show_audio_devices', action='store_true')

    args = parser.parse_args()

    if args.require_endpoint.lower() == 'false':
        require_endpoint = False
    else:
        require_endpoint = True

    if args.show_audio_devices:
        RhinoDemo.show_audio_devices()
    else:
        if not args.context_path:
            raise ValueError('Missing path to context file')

        RhinoDemo(
            access_key=args.access_key,
            library_path=args.library_path,
            model_path=args.model_path,
            context_path=args.context_path,
            endpoint_duration_sec=args.endpoint_duration_sec,
            require_endpoint=require_endpoint,
            audio_device_index=args.audio_device_index,
            output_path=args.output_path).run()


if __name__ == '__main__':
    main()
