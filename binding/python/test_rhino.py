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

from parameterized import parameterized

from rhino import Rhino
from test_util import *
from util import *

WITHIN_CONTEXT_PARAMETERS = [
    ['en', 'coffee_maker', True, 'orderBeverage',
     dict(beverage='americano', numberOfShots='double shot', size='medium')],
    ['es', 'iluminación_inteligente', True, 'changeColor', dict(location='habitación', color='rosado')],
    ['de', 'beleuchtung', True, 'changeState', dict(state='aus')],
    ['fr', 'éclairage_intelligent', True, 'changeColor', dict(color='violet')],
    ['it', 'illuminazione', True, 'spegnereLuce', dict(luogo='bagno')],
    ['ja', 'sumāto_shōmei', True, '色変更', dict(色='青')],
    ['ko', 'seumateu_jomyeong', True, 'changeColor', dict(color='파란색')],
    ['pt', 'luz_inteligente', True, 'ligueLuz', dict(lugar='cozinha')],
]

OUT_OF_CONTEXT_PARAMETERS = [
    ['en', 'coffee_maker'],
    ['es', 'iluminación_inteligente'],
    ['de', 'beleuchtung'],
    ['fr', 'éclairage_intelligent'],
    ['it', 'illuminazione'],
    ['ja', 'sumāto_shōmei'],
    ['ko', 'seumateu_jomyeong'],
    ['pt', 'luz_inteligente'],
]


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

    @parameterized.expand(WITHIN_CONTEXT_PARAMETERS)
    def test_within_context(self, language, context_name, is_within_context, intent, slots):
        self.run_rhino(
            language=language,
            context_name=context_name,
            is_within_context=is_within_context,
            intent=intent,
            slots=slots)

    @parameterized.expand(OUT_OF_CONTEXT_PARAMETERS)
    def test_out_of_context(self, language, context_name):
        self.run_rhino(
            language=language,
            context_name=context_name,
            is_within_context=False)


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("usage: test_rhino.py ${ACCESS_KEY}")
        exit(1)

    unittest.main(argv=sys.argv[:1])
