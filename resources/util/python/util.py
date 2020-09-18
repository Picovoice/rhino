import os
import platform
import subprocess


def _pv_linux_machine(machine):
    if machine == 'x86_64':
        return machine

    cpu_info = subprocess.check_output(['cat', '/proc/cpuinfo']).decode()

    hardware_info = [x for x in cpu_info.split('\n') if 'Hardware' in x][0]
    model_info = [x for x in cpu_info.split('\n') if 'model name' in x][0]

    if 'BCM' in hardware_info:
        if 'rev 7' in model_info:
            return 'arm11'
        elif 'rev 5' in model_info:
            return 'cortex-a7'
        elif 'rev 4' in model_info:
            return 'cortex-a53'
        elif 'rev 3' in model_info:
            return 'cortex-a72'
    elif 'AM33' in hardware_info:
        return 'beaglebone'
    else:
        raise NotImplementedError('unsupported CPU:\n%s' % cpu_info)


def _pv_platform():
    pv_system = platform.system()
    if pv_system not in {'Darwin', 'Linux', 'Windows'}:
        raise ValueError("unsupported system '%s'" % pv_system)

    if pv_system == 'Linux':
        pv_machine = _pv_linux_machine(platform.machine())
    else:
        pv_machine = platform.machine()

    return pv_system, pv_machine


_PV_SYSTEM, _PV_MACHINE = _pv_platform()

_RASPBERRY_PI_MACHINES = {'arm11', 'cortex-a7', 'cortex-a53', 'cortex-a72'}


def _library_path():
    if _PV_SYSTEM == 'Darwin':
        return os.path.join(os.path.dirname(__file__), '../../../lib/mac/x86_64/libpv_rhino.dylib')
    elif _PV_SYSTEM == 'Linux':
        if _PV_MACHINE == 'x86_64':
            return os.path.join(os.path.dirname(__file__), '../../../lib/linux/x86_64/libpv_rhino.so')
        elif _PV_MACHINE in _RASPBERRY_PI_MACHINES:
            return os.path.join(os.path.dirname(__file__), '../../../lib/raspberry-pi/%s/libpv_rhino.so' % _PV_MACHINE)
        elif _PV_MACHINE == 'beaglebone':
            return os.path.join(os.path.dirname(__file__), '../../../lib/beaglebone/libpv_rhino.so')
    elif _PV_SYSTEM == 'Windows':
        return os.path.join(os.path.dirname(__file__), '../../../lib/windows/amd64/libpv_rhino.dll')

    raise NotImplementedError('unsupported platform')


LIBRARY_PATH = _library_path()

MODEL_PATH = os.path.join(os.path.dirname(__file__), '../../../lib/common/rhino_params.pv')


def _context_files_subdir():
    if _PV_SYSTEM == 'Darwin':
        return 'mac'
    elif _PV_SYSTEM == 'Linux':
        if _PV_MACHINE == 'x86_64':
            return 'linux'
        elif _PV_MACHINE in _RASPBERRY_PI_MACHINES:
            return 'raspberry-pi'
        elif _PV_MACHINE == 'beaglebone':
            return 'beaglebone'
    elif _PV_SYSTEM == 'Windows':
        return 'windows'

    raise NotImplementedError('unsupported platform')


def _context_file_paths():
    context_files_dir = \
        os.path.join(os.path.dirname(__file__), '../../../resources/contexts/%s' % _context_files_subdir())

    res = dict()
    for x in os.listdir(context_files_dir):
        res[x.rsplit('_', maxsplit=1)[0]] = os.path.join(context_files_dir, x)

    return res


CONTEXT_PATHS = _context_file_paths()

CONTEXTS = CONTEXT_PATHS.keys()
