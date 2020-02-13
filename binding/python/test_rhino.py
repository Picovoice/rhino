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

import os
import sys
import unittest

import soundfile
from rhino import Rhino

sys.path.append(os.path.join(os.path.dirname(__file__), '../../resources/util/python'))

from util import *


class RhinoTestCase(unittest.TestCase):
    rhino = None

    @classmethod
    def setUpClass(cls):
        cls.rhino = Rhino(
            library_path=RHINO_LIBRARY_PATH,
            model_path=RHINO_MODEL_FILE_PATH,
            context_path=CONTEXT_FILE_PATHS['coffee_maker'])

    @classmethod
    def tearDownClass(cls):
        if cls.rhino is not None:
            cls.rhino.delete()

    def tearDown(self):
        self.rhino.reset()

    def test_within_context(self):
        audio, sample_rate = \
            soundfile.read(self._abs_path('resources/audio_samples/test_within_context.wav'), dtype='int16')
        assert sample_rate == self.rhino.sample_rate

        num_frames = len(audio) // self.rhino.frame_length

        is_finalized = False
        for i in range(num_frames):
            frame = audio[i * self.rhino.frame_length:(i + 1) * self.rhino.frame_length]
            is_finalized = self.rhino.process(frame)
            if is_finalized:
                break

        self.assertTrue(is_finalized, "couldn't finalize")

        self.assertTrue(self.rhino.is_understood(), "couldn't understand")

        intent, slot_values = self.rhino.get_intent()

        self.assertEqual('orderDrink', intent, "incorrect intent")

        expected_slot_values = dict(
            sugarAmount='some sugar',
            milkAmount='lots of milk',
            coffeeDrink='americano',
            numberOfShots='double shot',
            size='medium')
        self.assertEqual(slot_values, expected_slot_values, "incorrect slot values")

    def test_out_of_context(self):
        audio, sample_rate = \
            soundfile.read(self._abs_path('resources/audio_samples/test_out_of_context.wav'), dtype='int16')
        assert sample_rate == self.rhino.sample_rate

        num_frames = len(audio) // self.rhino.frame_length

        is_finalized = False
        for i in range(num_frames):
            frame = audio[i * self.rhino.frame_length:(i + 1) * self.rhino.frame_length]
            is_finalized = self.rhino.process(frame)
            if is_finalized:
                break

        self.assertTrue(is_finalized, "couldn't finalize")

        self.assertFalse(self.rhino.is_understood(), "shouldn't be able to understand")

    def test_context_info(self):
        self.assertIsInstance(self.rhino.context_info, str)

    def test_version(self):
        self.assertIsInstance(self.rhino.version, str)

    @staticmethod
    def _abs_path(rel_path):
        return os.path.join(os.path.dirname(__file__), '../..', rel_path)


if __name__ == '__main__':
    unittest.main()
