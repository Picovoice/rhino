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

import os
import platform
import subprocess


def _pv_linux_machine(machine):
    if machine == 'x86_64':
        return machine
    elif machine == 'aarch64':
        arch_info = '-' + machine
    else:
        arch_info = ''

    cpu_info = subprocess.check_output(['lscpu']).decode()
    model_info = [x for x in cpu_info.split('\n') if 'Model name' in x][0].split(' ')[-1]

    if 'ARM1176' == model_info: 
        return 'arm11' + arch_info
    elif 'Cortex-A7' == model_info:
        return 'cortex-a7' + arch_info
    elif 'Cortex-A53' == model_info:
        return 'cortex-a53' + arch_info
    elif 'Cortex-A57' == model_info:
        return 'cortex-a57' + arch_info
    elif 'Cortex-A72' == model_info:
        return 'cortex-a72' + arch_info
    elif 'Cortex-A8' == model_info:
        return 'beaglebone' + arch_info
    else:
        raise NotImplementedError('Unsupported CPU.')


def _pv_platform():
    pv_system = platform.system()
    if pv_system not in {'Darwin', 'Linux', 'Windows'}:
        raise ValueError("Unsupported system '%s'." % pv_system)

    if pv_system == 'Linux':
        pv_machine = _pv_linux_machine(platform.machine())
    else:
        pv_machine = platform.machine()

    return pv_system, pv_machine


_PV_SYSTEM, _PV_MACHINE = _pv_platform()

_RASPBERRY_PI_MACHINES = {'arm11', 'cortex-a7', 'cortex-a53', 'cortex-a72', 'cortex-a53-aarch64', 'cortex-a72-aarch64'}
_JETSON_MACHINES = {'cortex-a57-aarch64'}


def pv_library_path(relative_path):
    if _PV_SYSTEM == 'Darwin':
        return os.path.join(os.path.dirname(__file__), relative_path, 'lib/mac/x86_64/libpv_rhino.dylib')
    elif _PV_SYSTEM == 'Linux':
        if _PV_MACHINE == 'x86_64':
            return os.path.join(os.path.dirname(__file__), relative_path, 'lib/linux/x86_64/libpv_rhino.so')
        elif _PV_MACHINE in _JETSON_MACHINES:
            return os.path.join(
                os.path.dirname(__file__),
                relative_path,
                'lib/jetson/%s/libpv_rhino.so' % _PV_MACHINE)
        elif _PV_MACHINE in _RASPBERRY_PI_MACHINES:
            return os.path.join(
                os.path.dirname(__file__),
                relative_path,
                'lib/raspberry-pi/%s/libpv_rhino.so' % _PV_MACHINE)
        elif _PV_MACHINE == 'beaglebone':
            return os.path.join(os.path.dirname(__file__), relative_path, 'lib/beaglebone/libpv_rhino.so')
    elif _PV_SYSTEM == 'Windows':
        return os.path.join(os.path.dirname(__file__), relative_path, 'lib/windows/amd64/libpv_rhino.dll')

    raise NotImplementedError('Unsupported platform.')


def pv_model_path(relative_path):
    return os.path.join(os.path.dirname(__file__), relative_path, 'lib/common/rhino_params.pv')

