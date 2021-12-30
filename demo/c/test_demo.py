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

import json
import logging
import os
import platform
import subprocess
import sys
import unittest

from pvrhino import util

class PorcupineDemoTestCase(unittest.TestCase):
    @staticmethod
    def __append_language(s, language):
        if language == 'en':
            return s
        return f'{s}_{language}'

    @classmethod
    def setUpClass(cls):
        cls.__ENVIRONMENT = cls.__get_environemnt()

    def setUp(self):
        self.command = ["./build/rhino_demo_file",
                    "-l", util.pv_library_path('.'),
                    "-m", util.pv_model_path('.'),
                    "-c", "",
                    "-t", "0.5",
                    "-w", "",
                    "-a", sys.argv[1]]

    def __check_rhino_output(self, output, is_within_context, expectedIntent = None, expectedSlots = None):
        lines = output.split('\n')[1:-2]
        
        is_understood = False
        for line in lines:
            if 'is_understood' in line:
                is_understood = 'true' in line
                break
                
        self.assertEqual(is_understood, is_within_context)

        if not is_within_context:
            return

        for key in expectedSlots:
            has_match = False
            for line in lines:
                if key in line:
                    if expectedSlots[key] in line:
                        has_match = True
                        break
            self.assertTrue(has_match)

    def test_within_context(self):
        self.command[6] = self.__pv_context_path("en", "coffee_maker")
        self.command[10] = self.__pv_audio_path("test_within_context.wav")

        run_demo = subprocess.run(self.command, capture_output=True, text=True)
        self.assertEqual(run_demo.returncode, 0)

        expectedIntent = 'orderBeverage'
        expectedSlots = dict(beverage='americano', numberOfShots='double shot', size='medium')
        self.__check_rhino_output(run_demo.stdout, True, expectedIntent, expectedSlots)

    def test_out_of_context(self):
        self.command[6] = self.__pv_context_path("en", "coffee_maker")
        self.command[10] = self.__pv_audio_path("test_out_of_context.wav")

        run_demo = subprocess.run(self.command, capture_output=True, text=True)
        self.assertEqual(run_demo.returncode, 0)

        self.__check_rhino_output(run_demo.stdout, False)

    def test_within_context_de(self):
        language = "de"
        self.command[4] = self.__pv_model_path(language)
        self.command[6] = self.__pv_context_path(language, "beleuchtung")
        self.command[10] = self.__pv_audio_path("test_within_context_de.wav")

        run_demo = subprocess.run(self.command, capture_output=True, text=True)
        self.assertEqual(run_demo.returncode, 0)

        expectedIntent = 'changeState'
        expectedSlots = dict(state='aus')
        self.__check_rhino_output(run_demo.stdout, True, expectedIntent, expectedSlots)

    def test_out_of_context_de(self):
        language = "de"
        self.command[4] = self.__pv_model_path(language)
        self.command[6] = self.__pv_context_path(language, "beleuchtung")
        self.command[10] = self.__pv_audio_path("test_out_of_context_de.wav")

        run_demo = subprocess.run(self.command, capture_output=True, text=True)
        self.assertEqual(run_demo.returncode, 0)

        self.__check_rhino_output(run_demo.stdout, False)

    def test_within_context_es(self):
        language = "es"
        self.command[4] = self.__pv_model_path(language)
        self.command[6] = self.__pv_context_path(language, "luz")
        self.command[10] = self.__pv_audio_path("test_within_context_es.wav")

        run_demo = subprocess.run(self.command, capture_output=True, text=True)
        self.assertEqual(run_demo.returncode, 0)

        expectedIntent = 'changeColor'
        expectedSlots = dict(location='habitación', color='rosado')
        self.__check_rhino_output(run_demo.stdout, True, expectedIntent, expectedSlots)

    def test_out_of_context_es(self):
        language = "es"
        self.command[4] = self.__pv_model_path(language)
        self.command[6] = self.__pv_context_path(language, "luz")
        self.command[10] = self.__pv_audio_path("test_out_of_context_es.wav")

        run_demo = subprocess.run(self.command, capture_output=True, text=True)
        self.assertEqual(run_demo.returncode, 0)

        self.__check_rhino_output(run_demo.stdout, False)   

    def test_within_context_fr(self):
        language = "fr"
        self.command[4] = self.__pv_model_path(language)
        self.command[6] = self.__pv_context_path(language, "éclairage_intelligent")
        self.command[10] = self.__pv_audio_path("test_within_context_fr.wav")

        run_demo = subprocess.run(self.command, capture_output=True, text=True)
        self.assertEqual(run_demo.returncode, 0)

        expectedIntent = 'changeColor'
        expectedSlots = dict(color='violet')
        self.__check_rhino_output(run_demo.stdout, True, expectedIntent, expectedSlots)

    def test_out_of_context_fr(self):
        language = "fr"
        self.command[4] = self.__pv_model_path(language)
        self.command[6] = self.__pv_context_path(language, "éclairage_intelligent")
        self.command[10] = self.__pv_audio_path("test_out_of_context_fr.wav")

        run_demo = subprocess.run(self.command, capture_output=True, text=True)
        self.assertEqual(run_demo.returncode, 0)

        self.__check_rhino_output(run_demo.stdout, False)                 

    @staticmethod
    def __get_environemnt():
        system = platform.system()
        if system == 'Darwin':
            return 'mac'
        elif system == 'Windows':
            return 'windows'
        elif system == 'Linux':
            if platform.machine() == 'x86_64':
                return 'linux'
            else:
                cpu_info = ''
                try:
                    cpu_info = subprocess.check_output(['cat', '/proc/cpuinfo']).decode()
                    cpu_part_list = [x for x in cpu_info.split('\n') if 'CPU part' in x]
                    cpu_part = cpu_part_list[0].split(' ')[-1].lower()
                except Exception as error:
                    raise RuntimeError("Failed to identify the CPU with '%s'\nCPU info: %s" % (error, cpu_info))

                if '0xb76' == cpu_part or '0xc07' == cpu_part or '0xd03' == cpu_part or '0xd08' == cpu_part:
                    return 'raspberry-pi'
                elif '0xd07' == cpu_part:
                    return 'jetson'
                elif '0xc08' == cpu_part:
                    return 'beaglebone'
                else:
                    raise NotImplementedError("Unsupported CPU: '%s'." % cpu_part)
        else:
            raise ValueError("Unsupported system '%s'." % system)

    @classmethod
    def __pv_model_path(cls, language):
        model_file = cls.__append_language('rhino_params', language)
        return os.path.join(
            os.path.dirname(__file__),
            f'../../lib/common/{model_file}.pv')

    @classmethod
    def __pv_context_path(cls, language, context):
        contexts = cls.__append_language('contexts', language)
        return os.path.join(
            os.path.dirname(__file__),
            f'../../resources/{contexts}/{cls.__ENVIRONMENT}/{context}_{cls.__ENVIRONMENT}.rhn')

    @classmethod
    def __pv_audio_path(cls, audio_file_name):
        return os.path.join(
            os.path.dirname(__file__),
            f'../../resources/audio_samples/{audio_file_name}')      


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("usage: test_porcupine.py ${AccessKey}")
        exit(1)

    unittest.main(argv=sys.argv[:1])
