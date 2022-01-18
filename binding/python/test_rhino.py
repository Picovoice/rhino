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

import struct
import sys
import unittest
import wave

from rhino import Rhino
from util import *


class RhinoTestCase(unittest.TestCase):
    @staticmethod
    def __append_language(s, language):
        if language == 'en':
            return s
        return '%s_%s' % (s, language)

    @staticmethod
    def __read_file(file_name, sample_rate):
        wav_file = wave.open(file_name, mode="rb")
        channels = wav_file.getnchannels()
        num_frames = wav_file.getnframes()

        if wav_file.getframerate() != sample_rate:
            raise ValueError(
                "Audio file should have a sample rate of %d, got %d" % (sample_rate, wav_file.getframerate()))

        samples = wav_file.readframes(num_frames)
        wav_file.close()

        frames = struct.unpack('h' * num_frames * channels, samples)

        if channels == 2:
            print("Picovoice processes single-channel audio but stereo file is provided. Processing left channel only.")

        return frames[::channels]

    @classmethod
    def __context_path(cls, context, language):
        system = platform.system()

        contexts_root = cls.__append_language('../../resources/contexts', language)

        if system == 'Darwin':
            return os.path.join(os.path.dirname(__file__), contexts_root, 'mac', '%s_mac.rhn' % context)
        elif system == 'Linux':
            if platform.machine() == 'x86_64':
                return os.path.join(os.path.dirname(__file__), contexts_root, 'linux', '%s_linux.rhn' % context)
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
                                        contexts_root, 'raspberry-pi', '%s_raspberry-pi.rhn' % context)
                elif '0xd07' == cpu_part:
                    return os.path.join(os.path.dirname(__file__),
                                        contexts_root, 'jetson', '%s_jetson.rhn' % context)
                elif '0xc08' == cpu_part:
                    return os.path.join(os.path.dirname(__file__),
                                        contexts_root, 'beaglebone', '%s_beaglebone.rhn' % context)
                else:
                    raise NotImplementedError("Unsupported CPU: '%s'." % cpu_part)
        elif system == 'Windows':
            return os.path.join(os.path.dirname(__file__), contexts_root, 'windows', '%s_windows.rhn' % context)
        else:
            raise ValueError("Unsupported system '%s'." % system)

    @classmethod
    def __pv_model_path_by_language(cls, relative, language):
        model_path_subdir = cls.__append_language('lib/common/rhino_params', language)
        model_path_subdir = '%s.pv' % model_path_subdir
        return os.path.join(os.path.dirname(__file__), relative, model_path_subdir)

    rhinos = None

    @classmethod
    def setUpClass(cls):
        _language_to_contexts = {
            'en': ['coffee_maker'],
            'es': ['iluminación_inteligente'],
            'de': ['beleuchtung']
        }

        cls.rhinos = dict()
        for language in _language_to_contexts:
            cls.rhinos[language] = dict()
            for context in _language_to_contexts[language]:
                cls.rhinos[language][context] = Rhino(
                    access_key=sys.argv[1],
                    library_path=pv_library_path('../..'),
                    model_path=cls.__pv_model_path_by_language('../..', language),
                    context_path=cls.__context_path(context, language)
                )

    @classmethod
    def tearDownClass(cls):
        if cls.rhinos is not None:
            for language in cls.rhinos:
                for context in cls.rhinos[language]:
                    cls.rhinos[language][context].delete()

    def run_rhino(self, language, audio_file_name, context, is_whithin_context, intent=None, slots=None):
        rhino = self.rhinos[language][context]

        audio = \
            self.__read_file(
                os.path.join(os.path.dirname(__file__), '../../resources/audio_samples/', audio_file_name),
                rhino.sample_rate)

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

            self.assertEqual(intent, inference.intent, "Incorrect intent.")

            self.assertEqual(slots, inference.slots, "Incorrect slots.")
        else:
            self.assertFalse(inference.is_understood, "Shouldn't be able to understand.")

    def test_within_context(self):
        self.run_rhino(
            language='en',
            audio_file_name='test_within_context.wav',
            context='coffee_maker',
            is_whithin_context=True,
            intent='orderBeverage',
            slots=dict(beverage='americano', numberOfShots='double shot', size='medium'))

    def test_out_of_context(self):
        self.run_rhino(
            language='en',
            audio_file_name='test_out_of_context.wav',
            context='coffee_maker',
            is_whithin_context=False)

    def test_within_context_es(self):
        self.run_rhino(
            language='es',
            audio_file_name='test_within_context_es.wav',
            context='iluminación_inteligente',
            is_whithin_context=True,
            intent='changeColor',
            slots=dict(location='habitación', color='rosado'))

    def test_out_of_context_es(self):
        self.run_rhino(
            language='es',
            audio_file_name='test_out_of_context_es.wav',
            context='iluminación_inteligente',
            is_whithin_context=False)

    def test_within_context_de(self):
        self.run_rhino(
            language='de',
            audio_file_name='test_within_context_de.wav',
            context='beleuchtung',
            is_whithin_context=True,
            intent='changeState',
            slots=dict(state='aus'))

    def test_out_of_context_de(self):
        self.run_rhino(
            language='de',
            audio_file_name='test_out_of_context_de.wav',
            context='beleuchtung',
            is_whithin_context=False
        )


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("usage: test_rhino.py ${ACCESS_KEY}")
        exit(1)

    unittest.main(argv=sys.argv[:1])
