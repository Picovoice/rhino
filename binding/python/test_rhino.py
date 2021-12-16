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

import sys
import unittest

import soundfile

from rhino import Rhino
from util import *

def _append_language(dir, language):
    if language == 'en':
        return dir
    return dir + '_' + language

def _context_path(language, context):
    system = platform.system()

    contexts_root = _append_language('../../resources/contexts', language)

    if system == 'Darwin':
        return os.path.join(os.path.dirname(__file__), contexts_root, 'mac', context+'_mac.rhn')
    elif system == 'Linux':
        if platform.machine() == 'x86_64':
            return os.path.join(os.path.dirname(__file__), contexts_root, 'linux', context+'_linux.rhn')
        else:
            cpu_info = ''
            try:
                cpu_info = subprocess.check_output(['cat', '/proc/cpuinfo']).decode()
                cpu_part_list = [x for x in cpu_info.split('\n') if 'CPU part' in x]
                cpu_part = cpu_part_list[0].split(' ')[-1].lower()
            except Exception as error:
                raise RuntimeError("Failed to identify the CPU with '%s'\nCPU info: %s" % (error, cpu_info))

            if '0xb76' == cpu_part or '0xc07' == cpu_part or '0xd03' == cpu_part or '0xd08' == cpu_part:
                return os.path.join(os.path.dirname(__file__),
                                    contexts_root, 'raspberry-pi', context+'_raspberry-pi.rhn')
            elif '0xd07' == cpu_part:
                return os.path.join(os.path.dirname(__file__),
                                    contexts_root, 'jetson', context+'_jetson.rhn')
            elif '0xc08' == cpu_part:
                return os.path.join(os.path.dirname(__file__),
                                    contexts_root, 'beaglebone', context+'_beaglebone.rhn')    
            else:
                raise NotImplementedError("Unsupported CPU: '%s'." % cpu_part)
    elif system == 'Windows':
        return os.path.join(os.path.dirname(__file__), contexts_root, 'windows', context+'_windows.rhn')
    else:
        raise ValueError("Unsupported system '%s'." % system)

def _pv_model_path_by_language(relative, language):
    model_path_subdir = _append_language('lib/common/rhino_params', language) + '.pv'
    return os.path.join(os.path.dirname(__file__), relative, model_path_subdir)

class RhinoTestCase(unittest.TestCase):
    rhinos = None

    @classmethod
    def setUpClass(cls):
        _language_to_contexts = {
            'en' : ['coffee_maker'],
            # 'es' : ['luz'],
            # 'fr' : ['éclairage_intelligent'],
            'de' : ['beleuchtung']
        }

        cls.rhinos = {}
        for language in _language_to_contexts:
            cls.rhinos[language] = {}
            for context in _language_to_contexts[language]:
                cls.rhinos[language][context] = Rhino(
                    access_key=sys.argv[1],
                    library_path=pv_library_path('../..'),
                    model_path=_pv_model_path_by_language('../..', language),
                    context_path=_context_path(language, context)
                )

    @classmethod
    def tearDownClass(cls):
        if cls.rhinos is not None:
            for language in cls.rhinos:
                for context in cls.rhinos[language]:
                    cls.rhinos[language][context].delete()

    def run_rhino(self, language, context, audio_file_name, is_whithin_context, expected_intent = None, expected_slot_values = None):
        rhino = self.rhinos[language][context]

        audio, sample_rate = \
            soundfile.read(
                os.path.join(os.path.dirname(__file__), '../../resources/audio_samples/', audio_file_name),
                dtype='int16')
        assert sample_rate == rhino.sample_rate

        is_finalized = False
        for i in range(len(audio) // rhino.frame_length):
            frame = audio[i * rhino.frame_length:(i + 1) * rhino.frame_length]
            is_finalized = rhino.process(frame)
            if is_finalized:
                break

        self.assertTrue(is_finalized, "Failed to finalize.")

        inference = rhino.get_inference()

        if is_whithin_context:
            self.assertTrue(inference.is_understood, "Couldn't understand.")

            self.assertEqual(expected_intent, inference.intent, "Incorrect intent.")

            self.assertEqual(expected_slot_values, inference.slots, "Incorrect slots.")
        else:
            self.assertFalse(inference.is_understood, "Shouldn't be able to understand.")

    def test_within_context_en(self):
        self.run_rhino(language = 'en',
            context = 'coffee_maker',
            audio_file_name = 'test_within_context.wav',
            is_whithin_context = True,
            expected_intent = 'orderBeverage',
            expected_slot_values = dict(beverage='americano', numberOfShots='double shot', size='medium'))

    def test_out_of_context_en(self):
        self.run_rhino(language = 'en',
            context = 'coffee_maker',
            audio_file_name = 'test_out_of_context.wav',
            is_whithin_context = False)

    # def test_within_context_de(self):
    #     self.run_rhino(language = 'de',
    #         context = 'beleuchtung',
    #         audio_file_name = 'test_within_context_de.wav',
    #         is_whithin_context = True,
    #         expected_intent = 'orderBeverage',
    #         expected_slot_values = dict(beverage='americano', numberOfShots='double shot', size='medium'))


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("usage: test_rhino.py ${ACCESS_KEY}")
        exit(1)

    unittest.main(argv=sys.argv[:1])
