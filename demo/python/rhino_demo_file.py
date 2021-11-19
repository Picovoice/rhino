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

import pvrhino
import soundfile


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

    rhino = pvrhino.create(
        access_key=args.access_key,
        library_path=args.library_path,
        model_path=args.model_path,
        context_path=args.context_path,
        sensitivity=args.sensitivity,
        require_endpoint=require_endpoint)

    audio, sample_rate = soundfile.read(args.input_audio_path, dtype='int16')
    if audio.ndim == 2:
        print("Picovoice processes single-channel audio but stereo file is provided. Processing left channel only.")
        audio = audio[0, :]
    if sample_rate != rhino.sample_rate:
        raise ValueError("Audio file should have a sample rate of %d. got %d" % (rhino.sample_rate, sample_rate))

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
