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

import pvrhino


def read_file(file_name, sample_rate):
    wav_file = wave.open(file_name, mode="rb")
    channels = wav_file.getnchannels()
    num_frames = wav_file.getnframes()

    if wav_file.getframerate() != sample_rate:
        raise ValueError("Audio file should have a sample rate of %d. got %d" % (sample_rate, wav_file.getframerate()))

    samples = wav_file.readframes(num_frames)
    wav_file.close()

    frames = struct.unpack('h' * num_frames * channels, samples)

    if channels == 2:
        print("Picovoice processes single-channel audio but stereo file is provided. Processing left channel only.")

    return frames[::channels]


def main():
    parser = argparse.ArgumentParser()

    parser.add_argument('--input_audio_path', help='Absolute path to input audio file.',
                        required=True)

    parser.add_argument('--access_key',
                        help='AccessKey obtained from Picovoice Console (https://picovoice.ai/console/)',
                        required=True)

    parser.add_argument('--context_path', help="Absolute path to context file.", required=True)

    parser.add_argument('--library_path', help='Absolute path to dynamic library.', default=pvrhino.LIBRARY_PATH)

    parser.add_argument(
        '--model_path',
        help='Absolute path to the file containing model parameters.',
        default=pvrhino.MODEL_PATH)

    parser.add_argument(
        '--sensitivity',
        help="Inference sensitivity. It should be a number within [0, 1]. A higher sensitivity value results in " +
             "fewer misses at the cost of (potentially) increasing the erroneous inference rate.",
        type=float,
        default=0.5)

    parser.add_argument(
        '--require_endpoint',
        help="If set to `False`, Rhino does not require an endpoint (chunk of silence) before finishing inference.",
        default='True',
        choices=['True', 'False'])

    args = parser.parse_args()

    if args.require_endpoint.lower() == 'false':
        require_endpoint = False
    else:
        require_endpoint = True

    try:
        rhino = pvrhino.create(
            access_key=args.access_key,
            library_path=args.library_path,
            model_path=args.model_path,
            context_path=args.context_path,
            sensitivity=args.sensitivity,
            require_endpoint=require_endpoint)
    except pvrhino.RhinoInvalidArgumentError as e:
        print(f"One or more arguments provided to Rhino is invalid: {args}")
        print(f"If all other arguments seem valid, ensure that '{args.access_key}' is a valid AccessKey")
        raise e
    except pvrhino.RhinoActivationError as e:
        print("AccessKey activation error")
        raise e
    except pvrhino.RhinoActivationLimitError as e:
        print(f"AccessKey '{args.access_key}' has reached it's temporary device limit")
        raise e
    except pvrhino.RhinoActivationRefusedError as e:
        print(f"AccessKey '{args.access_key}' refused")
        raise e
    except pvrhino.RhinoActivationThrottledError as e:
        print(f"AccessKey '{args.access_key}' has been throttled")
        raise e
    except pvrhino.RhinoError as e:
        print(f"Failed to initialize Rhino")
        raise e

    audio = read_file(args.input_audio_path, rhino.sample_rate)

    num_frames = len(audio) // rhino.frame_length
    for i in range(num_frames):
        frame = audio[i * rhino.frame_length:(i + 1) * rhino.frame_length]
        is_finalized = rhino.process(frame)
        if is_finalized:
            inference = rhino.get_inference()
            if inference.is_understood:
                print('{')
                print("  intent : '%s'" % inference.intent)
                print('  slots : {')
                for slot, value in inference.slots.items():
                    print("    %s : '%s'" % (slot, value))
                print('  }')
                print('}')
            else:
                print("Didn't understand the command.")
            break

    rhino.delete()


if __name__ == '__main__':
    main()
