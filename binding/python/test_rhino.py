#
# Copyright 2018-2022 Picovoice Inc.
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

from rhino import Rhino
from test_util import *
from util import *


class RhinoTestCase(unittest.TestCase):

    def run_rhino(self, language, context_name, is_within_context, intent=None, slots=None):
        relative_path = '../..'

        rhino = Rhino(
            access_key=sys.argv[1],
            library_path=pv_library_path(relative_path),
            model_path=get_model_path_by_language(relative_path, language),
            context_path=get_context_path_by_language(relative_path, context_name, language)
        )

        audio_file = get_audio_file_by_language(relative_path, language, is_within_context)
        audio = read_wav_file(
            audio_file,
            rhino.sample_rate)

        is_finalized = False
        for i in range(len(audio) // rhino.frame_length):
            frame = audio[i * rhino.frame_length:(i + 1) * rhino.frame_length]
            is_finalized = rhino.process(frame)
            if is_finalized:
                break

        self.assertTrue(is_finalized, "Failed to finalize.")

        inference = rhino.get_inference()
        rhino.delete()

        if is_within_context:
            self.assertTrue(inference.is_understood, "Couldn't understand.")

            self.assertEqual(intent, inference.intent, "Incorrect intent.")

            self.assertEqual(slots, inference.slots, "Incorrect slots.")
        else:
            self.assertFalse(inference.is_understood, "Shouldn't be able to understand.")

    def test_within_context(self):
        self.run_rhino(
            language='en',
            context_name='coffee_maker',
            is_within_context=True,
            intent='orderBeverage',
            slots=dict(beverage='americano', numberOfShots='double shot', size='medium'))

    def test_out_of_context(self):
        self.run_rhino(
            language='en',
            context_name='coffee_maker',
            is_within_context=False)

    def test_within_context_es(self):
        self.run_rhino(
            language='es',
            context_name='iluminación_inteligente',
            is_within_context=True,
            intent='changeColor',
            slots=dict(location='habitación', color='rosado'))

    def test_out_of_context_es(self):
        self.run_rhino(
            language='es',
            context_name='iluminación_inteligente',
            is_within_context=False)

    def test_within_context_de(self):
        self.run_rhino(
            language='de',
            context_name='beleuchtung',
            is_within_context=True,
            intent='changeState',
            slots=dict(state='aus'))

    def test_out_of_context_de(self):
        self.run_rhino(
            language='de',
            context_name='beleuchtung',
            is_within_context=False
        )


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("usage: test_rhino.py ${ACCESS_KEY}")
        exit(1)

    unittest.main(argv=sys.argv[:1])
