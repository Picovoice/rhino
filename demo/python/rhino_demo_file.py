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

    parser.add_argument('--input_audio_path', help='absolute path to input audio file', required=True)

    parser.add_argument('--context_path', help="absolute path to context file", required=True)

    parser.add_argument('--library_path', help="absolute path to dynamic library", default=pvrhino.LIBRARY_PATH)

    parser.add_argument('--model_path', help='absolute path to model file', default=pvrhino.MODEL_PATH)

    parser.add_argument('--sensitivity', help='inference sensitivity.', default=0.5)

    args = parser.parse_args()

    rhino = pvrhino.create(
        library_path=args.library_path,
        model_path=args.model_path,
        context_path=args.context_path,
        sensitivity=args.sensitivity)

    audio, sample_rate = soundfile.read(args.input_audio_path, dtype='int16')
    if sample_rate != rhino.sample_rate:
        raise ValueError("input audio file should have a sample rate of %d. got %d" % (rhino.sample_rate, sample_rate))

    num_frames = len(audio) // rhino.frame_length
    for i in range(num_frames):
        frame = audio[i * rhino.frame_length:(i + 1) * rhino.frame_length]
        is_finalized = rhino.process(frame)
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
            break

    rhino.delete()


if __name__ == '__main__':
    main()
