import os
import shutil

import setuptools

os.system('git clean -dfx')

package_folder = os.path.join(os.path.dirname(__file__), 'pvrhino')
os.mkdir(package_folder)

os.makedirs(os.path.join(package_folder, 'binding/python'))
shutil.copy(
    os.path.join(os.path.dirname(__file__), 'rhino.py'),
    os.path.join(package_folder, 'binding/python/rhino.py'))

platforms = ('beaglebone', 'linux', 'mac', 'raspberry-pi', 'windows')

os.mkdir(os.path.join(package_folder, 'lib'))
for platform in ('common',) + platforms:
    shutil.copytree(
        os.path.join(os.path.dirname(__file__), '../../lib', platform),
        os.path.join(package_folder, 'lib', platform))

os.makedirs(os.path.join(package_folder, 'resources/contexts'))
for platform in platforms:
    shutil.copytree(
        os.path.join(os.path.dirname(__file__), '../../resources/contexts', platform),
        os.path.join(package_folder, 'resources/contexts', platform))

os.makedirs(os.path.join(package_folder, 'resources/util/python'))
shutil.copy(
    os.path.join(os.path.dirname(__file__), '../../resources/util/python/__init__.py'),
    os.path.join(package_folder, 'resources/util/python'))
shutil.copy(
    os.path.join(os.path.dirname(__file__), '../../resources/util/python/util.py'),
    os.path.join(package_folder, 'resources/util/python'))

INIT_SCRIPT = """
from .binding.python.rhino import Rhino
from .resources.util.python import *


def create(context_path, library_path=None, model_path=None, sensitivity=0.5):
    \"""
    Factory method for Rhino Speech-to-Intent engine.

    :param context_path: Absolute path to file containing context parameters. A context represents the set of
    expressions (spoken commands), intents, and intent arguments (slots) within a domain of interest.
    :param library_path: Absolute path to Rhino's dynamic library.
    :param model_path: Absolute path to file containing model parameters.
    :param sensitivity: Inference sensitivity. It should be a number within [0, 1]. A higher sensitivity value results
    in fewer misses at the cost of (potentially) increasing the erroneous inference rate.
    :return: An instance of Rhino Speech-to-Intent engine.
    \"""

    if library_path is None:
        library_path = LIBRARY_PATH

    if model_path is None:
        model_path = MODEL_PATH

    return Rhino(library_path=library_path, model_path=model_path, context_path=context_path, sensitivity=sensitivity)
"""

with open(os.path.join(package_folder, '__init__.py'), 'w') as f:
    f.write(INIT_SCRIPT.strip('\n '))
    f.write('\n')

MANIFEST_IN = """
include LICENSE

include pvrhino/binding/python/rhino.py
include pvrhino/lib/common/rhino_params.pv
include pvrhino/lib/beaglebone/libpv_rhino.so
include pvrhino/lib/linux/x86_64/libpv_rhino.so
include pvrhino/lib/mac/x86_64/libpv_rhino.dylib
include pvrhino/lib/raspberry-pi/arm11/libpv_rhino.so
include pvrhino/lib/raspberry-pi/cortex-a7/libpv_rhino.so
include pvrhino/lib/raspberry-pi/cortex-a53/libpv_rhino.so
include pvrhino/lib/raspberry-pi/cortex-a72/libpv_rhino.so
include pvrhino/lib/windows/amd64/libpv_rhino.dll

recursive-include pvrhino/resources/contexts/beaglebone *
recursive-include pvrhino/resources/contexts/linux *
recursive-include pvrhino/resources/contexts/mac/ *
recursive-include pvrhino/resources/contexts/raspberry-pi *
recursive-include pvrhino/resources/contexts/windows *
recursive-include pvrhino/resources/util/python *
"""

with open(os.path.join(os.path.dirname(__file__), 'MANIFEST.in'), 'w') as f:
    f.write(MANIFEST_IN.strip('\n '))

LONG_DESCRIPTION = """
TODO
"""

setuptools.setup(
    name="pvrhino",
    version="1.3.0",
    author="Picovoice",
    author_email="hello@picovoice.ai",
    description="On-device Speech-to-Intent engine powered by deep learning.",
    long_description=LONG_DESCRIPTION,
    long_description_content_type="text/markdown",
    url="https://github.com/Picovoice/rhino",
    packages=["pvrhino"],
    install_requires=[
        "enum34==1.1.6",
        "numpy",
    ],
    include_package_data=True,
    classifiers=[
        "Development Status :: 5 - Production/Stable",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: Apache Software License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Topic :: Multimedia :: Sound/Audio :: Speech"
    ],
    python_requires='>=3',
)
