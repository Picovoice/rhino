#
# Copyright 2018-2023 Picovoice Inc.
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

from _rhino import Rhino, RhinoError
from test_util import *

within_context_parameters, out_of_context_parameters = load_test_data()


class RhinoTestCase(unittest.TestCase):

    @staticmethod
    def _process_file_helper(rhino: Rhino, audio_file: str, max_process_count: int = -1) -> bool:
        processed = 0

        audio = read_wav_file(
            audio_file,
            rhino.sample_rate)

        is_finalized = False
        for i in range(len(audio) // rhino.frame_length):
            frame = audio[i * rhino.frame_length:(i + 1) * rhino.frame_length]
            is_finalized = rhino.process(frame)
            if is_finalized:
                break
            if max_process_count != -1 and processed >= max_process_count:
                break
            processed += 1

        return is_finalized

    def run_rhino(self, language, context_name, is_within_context, intent=None, slots=None):
        relative_path = '../..'

        rhino = Rhino(
            access_key=sys.argv[1],
            library_path=pv_library_path(relative_path),
            model_path=get_model_path_by_language(relative_path, language),
            context_path=get_context_path_by_language(relative_path, context_name, language)
        )

        audio_file = get_audio_file_by_language(relative_path, language, is_within_context)
        is_finalized = self._process_file_helper(rhino, audio_file)

        self.assertTrue(is_finalized, "Failed to finalize.")

        inference = rhino.get_inference()
        rhino.delete()

        if is_within_context:
            self.assertTrue(inference.is_understood, "Couldn't understand.")

            self.assertEqual(intent, inference.intent, "Incorrect intent.")

            self.assertEqual(slots, inference.slots, "Incorrect slots.")
        else:
            self.assertFalse(inference.is_understood, "Shouldn't be able to understand.")

    @parameterized.expand(within_context_parameters)
    def test_within_context(self, language, context_name, is_within_context, intent, slots):
        self.run_rhino(
            language=language,
            context_name=context_name,
            is_within_context=is_within_context,
            intent=intent,
            slots=slots)

    @parameterized.expand(out_of_context_parameters)
    def test_out_of_context(self, language, context_name):
        self.run_rhino(
            language=language,
            context_name=context_name,
            is_within_context=False)

    def test_reset(self):
        relative_path = '../..'

        rhino = Rhino(
            access_key=sys.argv[1],
            library_path=pv_library_path(relative_path),
            model_path=get_model_path_by_language(relative_path, 'en'),
            context_path=get_context_path_by_language(relative_path, 'coffee_maker', 'en')
        )
        audio_file = get_audio_file_by_language(relative_path, 'en', True)

        is_finalized = self._process_file_helper(rhino, audio_file, 15)
        self.assertFalse(is_finalized)

        rhino.reset()
        is_finalized = self._process_file_helper(rhino, audio_file)
        self.assertTrue(is_finalized)

        inference = rhino.get_inference()
        self.assertTrue(inference.is_understood)

    def test_message_stack(self):
        relative_path = '../..'

        error = None
        try:
            _ = Rhino(
                access_key='invalid',
                library_path=pv_library_path(relative_path),
                model_path=get_model_path_by_language(relative_path, 'en'),
                context_path=get_context_path_by_language(relative_path, 'smart_lighting', 'en'))
        except RhinoError as e:
            error = e.message_stack

        self.assertIsNotNone(error)
        self.assertGreater(len(error), 0)

        try:
            _ = Rhino(
                access_key='invalid',
                library_path=pv_library_path(relative_path),
                model_path=get_model_path_by_language(relative_path, 'en'),
                context_path=get_context_path_by_language(relative_path, 'smart_lighting', 'en'))
        except RhinoError as e:
            self.assertEqual(len(error), len(e.message_stack))
            self.assertListEqual(list(error), list(e.message_stack))

    def test_process_message_stack(self):
        relative_path = '../..'

        r = Rhino(
            access_key=sys.argv[1],
            library_path=pv_library_path(relative_path),
            model_path=get_model_path_by_language(relative_path, 'en'),
            context_path=get_context_path_by_language(relative_path, 'smart_lighting', 'en'))
        test_pcm = [0] * r.frame_length

        address = r._handle
        r._handle = None

        try:
            res = r.process(test_pcm)
            self.assertTrue(res)
        except RhinoError as e:
            self.assertGreater(len(e.message_stack), 0)
            self.assertLess(len(e.message_stack), 8)

        r._handle = address


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("usage: test_rhino.py ${ACCESS_KEY}")
        exit(1)

    unittest.main(argv=sys.argv[:1])
