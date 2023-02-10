#
# Copyright 2022-2023 Picovoice Inc.
#
# You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
# file accompanying this source.
#
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
# an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
# specific language governing permissions and limitations under the License.
#

import json
import struct
import wave

from util import *


def load_test_data():
    data_file_path = os.path.join(os.path.dirname(__file__), "../../resources/test/test_data.json")
    with open(data_file_path, encoding="utf8") as data_file:
        json_test_data = data_file.read()
    test_data = json.loads(json_test_data)['tests']

    within_context_parameters = [
        (t['language'], t['context_name'], True, t['inference']['intent'], t['inference']['slots'])
        for t in test_data['within_context']]
    out_of_context_parameters = [
        (t['language'], t['context_name']) for t in test_data['out_of_context']]

    return within_context_parameters, out_of_context_parameters


def _append_language(s, language):
    if language == 'en':
        return s
    return "%s_%s" % (s, language)


def read_wav_file(file_name, sample_rate):
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


def pv_context_platform():
    if PV_SYSTEM == 'Darwin':
        return 'mac'
    elif PV_SYSTEM == 'Linux':
        if PV_MACHINE == 'x86_64':
            return 'linux'
        elif PV_MACHINE in JETSON_MACHINES:
            return 'jetson'
        elif PV_MACHINE in RASPBERRY_PI_MACHINES:
            return 'raspberry-pi'
        elif PV_MACHINE == 'beaglebone':
            return 'beaglebone'
    elif PV_SYSTEM == 'Windows':
        return 'windows'

    raise NotImplementedError('Unsupported platform')


def get_context_path_by_language(relative, context, language):
    context_platform = pv_context_platform()
    contexts_root = _append_language('resources/contexts', language)
    return os.path.join(
        os.path.dirname(__file__),
        relative,
        contexts_root,
        context_platform,
        '%s_%s.rhn' % (context, context_platform))


def get_model_path_by_language(relative, language):
    model_path_subdir = _append_language('lib/common/rhino_params', language)
    return os.path.join(
        os.path.dirname(__file__),
        relative,
        '%s.pv' % model_path_subdir)


def get_audio_file_by_language(relative, language, is_within_context):
    if is_within_context:
        audio_file_name = "%s.wav" % _append_language('test_within_context', language)
    else:
        audio_file_name = "%s.wav" % _append_language('test_out_of_context', language)

    return os.path.join(
        os.path.dirname(__file__),
        relative,
        'resources/audio_samples',
        audio_file_name)
