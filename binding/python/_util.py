#
# Copyright 2018-2026 Picovoice Inc.
#
# You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
# file accompanying this source.
#
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
# an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
# specific language governing permissions and limitations under the License.
#

import logging
import os
import platform as pf
import requests
import subprocess
from io import StringIO
from ruamel.yaml import YAML
from ruamel.yaml.error import YAMLError
from typing import Dict, List, Optional

log = logging.getLogger('RHN')
log.setLevel(logging.WARNING)


def _is_64bit():
    return '64bit' in pf.architecture()[0]


def _pv_linux_machine(machine):
    if machine == 'x86_64':
        return machine
    elif machine in ['aarch64', 'armv7l', 'armv6l']:
        arch_info = ('-' + machine) if _is_64bit() else ''
    else:
        raise NotImplementedError("Unsupported CPU architecture: `%s`" % machine)

    cpu_info = ''
    try:
        cpu_info = subprocess.check_output(['cat', '/proc/cpuinfo']).decode()
        cpu_part_list = [x for x in cpu_info.split('\n') if 'CPU part' in x]
        cpu_part = cpu_part_list[0].split(' ')[-1].lower()
    except Exception as error:
        raise RuntimeError("Failed to identify the CPU with '%s'\nCPU info: %s" % (error, cpu_info))

    if '0xb76' == cpu_part:
        return 'arm11'
    elif '0xd03' == cpu_part:
        return 'cortex-a53' + arch_info
    elif '0xd08' == cpu_part:
        return 'cortex-a72' + arch_info
    elif "0xd0b" == cpu_part:
        return "cortex-a76" + arch_info
    elif machine == 'armv7l':
        log.warning(
            'WARNING: Please be advised that this device (CPU part = %s) is not officially supported by Picovoice. '
            'Falling back to the armv6-based (Raspberry Pi Zero) library. This is not tested nor optimal.' % cpu_part)
        return 'arm11'
    else:
        raise NotImplementedError("Unsupported CPU: '%s'." % cpu_part)


def _pv_platform():
    pv_system = pf.system()
    if pv_system not in {'Darwin', 'Linux', 'Windows'}:
        raise ValueError("Unsupported system '%s'." % pv_system)

    if pv_system == 'Linux':
        pv_machine = _pv_linux_machine(pf.machine())
    else:
        pv_machine = pf.machine()

    return pv_system, pv_machine


PV_SYSTEM, PV_MACHINE = _pv_platform()

RASPBERRY_PI_MACHINES = {
    "arm11",
    "cortex-a53",
    "cortex-a72",
    "cortex-a76",
    "cortex-a53-aarch64",
    "cortex-a72-aarch64",
    "cortex-a76-aarch64"}


def pv_library_path(relative_path):
    if PV_SYSTEM == 'Darwin':
        if PV_MACHINE == 'x86_64':
            return os.path.join(os.path.dirname(__file__), relative_path, 'lib/mac/x86_64/libpv_rhino.dylib')
        elif PV_MACHINE == 'arm64':
            return os.path.join(os.path.dirname(__file__), relative_path, 'lib/mac/arm64/libpv_rhino.dylib')
    elif PV_SYSTEM == 'Linux':
        if PV_MACHINE == 'x86_64':
            return os.path.join(os.path.dirname(__file__), relative_path, 'lib/linux/x86_64/libpv_rhino.so')
        elif PV_MACHINE in RASPBERRY_PI_MACHINES:
            return os.path.join(
                os.path.dirname(__file__),
                relative_path,
                'lib/raspberry-pi/%s/libpv_rhino.so' % PV_MACHINE)
    elif PV_SYSTEM == 'Windows':
        if pf.machine().lower() == 'amd64':
            return os.path.join(os.path.dirname(__file__), relative_path, 'lib/windows/amd64/libpv_rhino.dll')
        elif pf.machine().lower() == 'arm64':
            return os.path.join(os.path.dirname(__file__), relative_path, 'lib/windows/arm64/libpv_rhino.dll')

    raise NotImplementedError("Unsupported platform ('%s', '%s').", PV_SYSTEM, PV_MACHINE)


def pv_model_path(relative_path):
    return os.path.join(os.path.dirname(__file__), relative_path, 'lib/common/rhino_params.pv')


PV_API_URL = "https://dev.api.console.pv-beta.net/"


def pv_get_platform():
    if PV_SYSTEM == 'Darwin':
        return 'mac'
    elif PV_SYSTEM == 'Linux':
        if PV_MACHINE == 'x86_64':
            return 'linux'
        elif PV_MACHINE in RASPBERRY_PI_MACHINES:
            return 'raspberry-pi'
    elif PV_SYSTEM == 'Windows':
        return 'windows'

    raise NotImplementedError("Unsupported platform ('%s', '%s').", PV_SYSTEM, PV_MACHINE)


def pv_train_model(
        access_key: str,
        output_path: str,
        language: str,
        yaml_content: str,
        slots: Optional[Dict[str, List[str]]] = None,
        platform: Optional[str] = None):

    if slots is not None:
        yaml = YAML()
        stream = StringIO()

        try:
            content = yaml.load(yaml_content)
        except YAMLError as e:
            if hasattr(e, "problem_mark"):
                raise ValueError(f"YAML error at line {e.problem_mark.line + 1}: {e.problem}") from e
            else:
                raise ValueError("Failed to parse yaml content.") from e

        if 'context' not in content and 'slots' not in content['context']:
            raise ValueError("Invalid value in slots field.")

        merged = dict()
        for s in (content['context']['slots'], slots):
            for key, value in s.items():
                merged[key] = merged.get(key, []) + value

        content['context']['slots'] = merged
        yaml.dump(content, stream)

        yaml_content = stream.getvalue()
        stream.close()

    if platform is None:
        platform = pv_get_platform()

    payload = {
        "platform": platform,
        "yaml_content": yaml_content
    }

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "x-api-key": access_key
    }

    url = f"{PV_API_URL}{language}/api/rhn"

    try:
        response = requests.post(url, json=payload, headers=headers, allow_redirects=True)
        response.raise_for_status()
    except requests.exceptions.HTTPError as e:
        raise RuntimeError(f"HTTP {e.response.status_code}: {e.response.text}") from e
    except requests.exceptions.RequestException as e:
        raise RuntimeError(f"Request failed: {e}") from e

    with open(output_path, 'wb') as f:
        f.write(response.content)
