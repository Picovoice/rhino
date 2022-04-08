#
# Copyright 2022 Picovoice Inc.
#
# You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
# file accompanying this source.
#
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
# an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
# specific language governing permissions and limitations under the License.
#

import sys
import time
import unittest

from rhino import Rhino
from test_util import *
from util import *


class RhinoPerformanceTestCase(unittest.TestCase):

    ACCESS_KEY = sys.argv[1]
    NUM_TEST_ITERATIONS = int(sys.argv[2])
    PERFORMANCE_THRESHOLD_SEC = float(sys.argv[3])

    def test_performance(self):
        relative_path = '../..'
        language = 'en'
        context_name = 'coffee_maker'

        rhino = Rhino(
            access_key=sys.argv[1],
            library_path=pv_library_path(relative_path),
            model_path=get_model_path_by_language(relative_path, language),
            context_path=get_context_path_by_language(relative_path, context_name, language)
        )

        audio_file = get_audio_file_by_language(relative_path, language, True)
        audio = read_wav_file(
            audio_file,
            rhino.sample_rate)

        perf_results = []
        for i in range(self.NUM_TEST_ITERATIONS):
            proc_time = 0
            for j in range(len(audio) // rhino.frame_length):
                frame = audio[j * rhino.frame_length:(j + 1) * rhino.frame_length]
                start = time.time()
                rhino.process(frame)
                proc_time += time.time() - start

            if i > 0:
                perf_results.append(proc_time)

        rhino.delete()

        avg_perf = sum(perf_results) / self.NUM_TEST_ITERATIONS
        print("Average performance: %s" % avg_perf)
        self.assertLess(avg_perf, self.PERFORMANCE_THRESHOLD_SEC)


if __name__ == '__main__':
    if len(sys.argv) != 4:
        print("usage: test_rhino_perf.py ${ACCESS_KEY} ${NUM_TEST_INTERVALS} ${PERFORMANCE_THRESHOLD_SEC}")
        exit(1)

    unittest.main(argv=sys.argv[:1])
