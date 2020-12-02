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

import unittest

import soundfile
from rhino import Rhino
from util import *


class RhinoTestCase(unittest.TestCase):
    @staticmethod
    def _context_path():
        system = platform.system()

        if system == 'Darwin':
            return os.path.join(os.path.dirname(__file__), '../../resources/contexts/mac/coffee_maker_mac.rhn')
        elif system == 'Linux':
            if platform.machine() == 'x86_64':
                return os.path.join(os.path.dirname(__file__), '../../resources/contexts/linux/coffee_maker_linux.rhn')
            else:
                cpu_info = subprocess.check_output(['cat', '/proc/cpuinfo']).decode()
                hardware_info = [x for x in cpu_info.split('\n') if 'Hardware' in x][0]

                if 'BCM' in hardware_info:
                    return os.path.join(
                        os.path.dirname(__file__),
                        '../../resources/contexts/raspberry-pi/coffee_maker_raspberry-pi.rhn')
                elif 'AM33' in hardware_info:
                    return os.path.join(
                        os.path.dirname(__file__),
                        '../../resources/contexts/beaglebone/coffee_maker_beaglebone.rhn')
                else:
                    raise NotImplementedError('Unsupported CPU.')
        elif system == 'Windows':
            return os.path.join(os.path.dirname(__file__), '../../resources/contexts/windows/coffee_maker_windows.rhn')
        else:
            raise ValueError("Unsupported system '%s'." % system)

    rhino = None

    @classmethod
    def setUpClass(cls):
        cls.rhino = Rhino(
            library_path=pv_library_path('../..'),
            model_path=pv_model_path('../..'),
            context_path=cls._context_path())

    @classmethod
    def tearDownClass(cls):
        if cls.rhino is not None:
            cls.rhino.delete()

    def test_within_context(self):
        audio, sample_rate = \
            soundfile.read(
                os.path.join(os.path.dirname(__file__), '../../resources/audio_samples/test_within_context.wav'),
                dtype='int16')
        assert sample_rate == self.rhino.sample_rate

        is_finalized = False
        for i in range(len(audio) // self.rhino.frame_length):
            frame = audio[i * self.rhino.frame_length:(i + 1) * self.rhino.frame_length]
            is_finalized = self.rhino.process(frame)
            if is_finalized:
                break

        self.assertTrue(is_finalized, "Failed to finalize.")

        inference = self.rhino.get_inference()

        self.assertTrue(inference.is_understood, "Couldn't understand.")

        self.assertEqual('orderBeverage', inference.intent, "Incorrect intent.")

        expected_slot_values = dict(beverage='americano', numberOfShots='double shot', size='medium')
        self.assertEqual(inference.slots, expected_slot_values, "Incorrect slots.")

    def test_out_of_context(self):
        audio, sample_rate = \
            soundfile.read(
                os.path.join(os.path.dirname(__file__), '../../resources/audio_samples/test_out_of_context.wav'),
                dtype='int16')
        assert sample_rate == self.rhino.sample_rate

        is_finalized = False
        for i in range(len(audio) // self.rhino.frame_length):
            frame = audio[i * self.rhino.frame_length:(i + 1) * self.rhino.frame_length]
            is_finalized = self.rhino.process(frame)
            if is_finalized:
                break

        self.assertTrue(is_finalized, "Failed to finalize.")

        self.assertFalse(self.rhino.get_inference().is_understood, "Shouldn't be able to understand.")


if __name__ == '__main__':
    unittest.main()
