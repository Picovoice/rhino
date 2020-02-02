#
# Copyright 2018 Picovoice Inc.
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
import sys

import soundfile


def _abs_path(rel_path):
    return os.path.join(os.path.dirname(__file__), '../..', rel_path)


sys.path.append(_abs_path('binding/python'))
sys.path.append(_abs_path('resources/util/python'))

from rhino import Rhino
from util import *


def main():
    parser = argparse.ArgumentParser()

    parser.add_argument(
        '--input_audio_file_path',
        help='absolute path to input audio file',
        required=True)

    parser.add_argument(
        '--context_file_path',
        help="absolute path to Rhino's context file",
        required=True)

    parser.add_argument(
        '--library_path',
        help="absolute path to dynamic library",
        default=RHINO_LIBRARY_PATH)

    parser.add_argument(
        '--model_file_path',
        help='absolute path to model parameter file',
        default=RHINO_MODEL_FILE_PATH)

    args = parser.parse_args()

    rhino = Rhino(
        library_path=args.library_path,
        model_path=args.model_file_path,
        context_path=args.context_file_path)

    audio, sample_rate = soundfile.read(args.input_audio_file_path, dtype='int16')
    assert sample_rate == rhino.sample_rate

    num_frames = len(audio) // rhino.frame_length
    for i in range(num_frames):
        frame = audio[i * rhino.frame_length:(i + 1) * rhino.frame_length]
        is_finalized = rhino.process(frame)
        if is_finalized:
            if rhino.is_understood():
                intent, slot_values = rhino.get_intent()
                print()
                print('intent : %s' % intent)
                for slot, value in slot_values.items():
                    print('%s: %s' % (slot, value))
            else:
                print("didn't understand the command")
            break

    rhino.delete()


if __name__ == '__main__':
    main()
