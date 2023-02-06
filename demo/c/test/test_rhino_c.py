#
# Copyright 2023 Picovoice Inc.
#
# You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
# file accompanying this source.
#
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
# an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
# specific language governing permissions and limitations under the License.
#

import os.path
import subprocess
import sys
import unittest

from parameterized import parameterized

from test_util import *

within_context_parameters, out_of_context_parameters = load_test_data()


class RhinoCTestCase(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls._access_key = sys.argv[1]
        cls._platform = sys.argv[2]
        cls._arch = "" if len(sys.argv) != 4 else sys.argv[3]
        cls._root_dir = os.path.join(os.path.dirname(__file__), "../../..")

    def _get_library_file(self):
        return os.path.join(
            self._root_dir,
            "lib",
            self._platform,
            self._arch,
            "libpv_rhino." + get_lib_ext(self._platform)
        )

    def _get_model_path_by_language(self, language):
        model_path_subdir = append_language('lib/common/rhino_params', language)
        return os.path.join(self._root_dir, '%s.pv' % model_path_subdir)

    def _get_context_path_by_language(self, language, context):
        context_files_root = append_language('resources/contexts', language)
        context_files_dir = os.path.join(
            self._root_dir,
            context_files_root,
            self._platform)

        return os.path.join(context_files_dir, "%s_%s.rhn" % (context, self._platform))

    def _get_audio_file_by_language(self, language, audio_file_name):
        return os.path.join(
            self._root_dir,
            'resources/audio_samples',
            "%s.wav" % append_language(audio_file_name, language))

    def run_rhino(self, language, context, audio_file_name, is_understood=False, intent=None, slots=None):
        args = [
            os.path.join(os.path.dirname(__file__), "../build/rhino_demo_file"),
            "-a", self._access_key,
            "-l", self._get_library_file(),
            "-m", self._get_model_path_by_language(language),
            "-c", self._get_context_path_by_language(language, context),
            "-t", "0.5",
            "-w", self._get_audio_file_by_language(language, audio_file_name)
        ]
        process = subprocess.Popen(args, stderr=subprocess.PIPE, stdout=subprocess.PIPE)
        stdout, stderr = process.communicate()
        self.assertEqual(process.poll(), 0)
        self.assertEqual(stderr.decode('utf-8'), '')

        understood_str = "'is_understood' : '%s'" % str(is_understood).lower()
        self.assertTrue(understood_str in stdout.decode('utf-8'))

        if intent is not None:
            intent_str = "'intent' : '%s'" % intent
            self.assertTrue(intent_str in stdout.decode('utf-8'))

        if slots is not None:
            for key, value in slots.items():
                slot_str = "'%s' : '%s'" % (key, value)
                self.assertTrue(slot_str in stdout.decode('utf-8'))

    @parameterized.expand(within_context_parameters)
    def test_within_context(self, language, context, intent, slots):
        self.run_rhino(
            language=language,
            context=context,
            audio_file_name="test_within_context",
            is_understood=True,
            intent=intent,
            slots=slots)

    @parameterized.expand(out_of_context_parameters)
    def test_out_of_context(self, language, context):
        self.run_rhino(
            language=language,
            context=context,
            audio_file_name="test_out_of_context")

if __name__ == '__main__':
    if len(sys.argv) < 3 or len(sys.argv) > 4:
        print("usage: test_rhino_c.py ${AccessKey} ${Platform} [${Arch}]")
        exit(1)
    unittest.main(argv=sys.argv[:1])
