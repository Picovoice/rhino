import os
import shutil

import setuptools

package_folder = os.path.join(os.path.dirname(__file__), 'pvrhino')

if os.path.exists(package_folder):
    shutil.rmtree(package_folder)
os.mkdir(package_folder)

os.mkdir(os.path.join(package_folder, 'lib'))
for platform in ('beaglebone', 'common', 'linux', 'mac', 'raspberry-pi', 'windows'):
    shutil.copytree(
        os.path.join(os.path.dirname(__file__), '../../lib', platform),
        os.path.join(package_folder, 'lib', platform))

os.makedirs(os.path.join(package_folder, 'resources/contexts'))
for platform in ('beaglebone', 'linux', 'mac', 'raspberry-pi', 'windows'):
    shutil.copytree(
        os.path.join(os.path.dirname(__file__), '../../resources/contexts', platform),
        os.path.join(package_folder, 'resources/contexts', platform))

os.makedirs(os.path.join(package_folder, 'resources/util'))
shutil.copytree(
    os.path.join(os.path.dirname(__file__), '../../resources/util/python'),
    os.path.join(package_folder, 'resources/util/python'))

os.makedirs(os.path.join(package_folder, 'binding/python'))
shutil.copy(os.path.join(os.path.dirname(__file__), 'rhino.py'),
            os.path.join(package_folder, 'binding/python/rhino.py'))

INIT_SCRIPT = """
from .binding.python.rhino import Rhino
from .resources.util.python import *


def create(library_path=None, model_path=None, context_path=None, context=None):
    \"""
    Factory method for Rhino

    :param library_path: Absolute path to Rhino's dynamic library.
    :param model_path: Absolute path to file containing model parameters.
    :param context_path: Absolute path to file containing context parameters. A context represents the set of
    expressions (spoken commands), intents, and intent arguments (slots) within a domain of interest.
    :param context: The context to be used by Rhino. List of default contexts can be retrieved via 'pvrhino.CONTEXTS'
    :return: An instance of Rhino Speech-to-Intent engine.
    \"""

    if library_path is None:
        library_path = LIBRARY_PATH

    if model_path is None:
        model_path = MODEL_PATH

    if context_path is None:
        if context is None:
            raise ValueError("'context' or 'context_path' must be set")
        if context not in CONTEXTS:
            raise ValueError(
                "context '%s' is not available by default. default contexts are :\\n%s" % (context, ', '.join(CONTEXTS)))
        context_path = CONTEXT_PATHS[context]

    return Rhino(library_path=library_path, model_path=model_path, context_path=context_path)

"""

with open(os.path.join(package_folder, '__init__.py'), 'w') as f:
    f.write(INIT_SCRIPT)

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

recursive-include pvrhino/resources/contexts/beaglebone *
recursive-include pvrhino/resources/contexts/linux *
recursive-include pvrhino/resources/contexts/mac/ *
recursive-include pvrhino/resources/contexts/raspberry-pi *
recursive-include pvrhino/resources/util/python *

global-exclude README.md
global-exclude __pycache__
"""

with open(os.path.join(os.path.dirname(__file__), 'MANIFEST.in'), 'w') as f:
    f.write(MANIFEST_IN)

LONG_DESCRIPTION = ""

for x in ('build', 'dist', 'pvrhino.egg-info'):
    x_path = os.path.join(os.path.dirname(__file__), x)
    if os.path.isdir(x_path):
        shutil.rmtree(x_path)

setuptools.setup(
    name="pvrhino",
    version="1.3.0",
    author="Picovoice",
    author_email="hello@picovoice.ai",
    description="On-device speech-to-intent engine powered by deep learning.",
    long_description=LONG_DESCRIPTION,
    long_description_content_type="text/markdown",
    url="https://github.com/Picovoice/rhino",
    # package_dir={"pvrhino": ""},
    packages=["pvrhino"],
    install_requires=[
        "enum34==1.1.6",
        "numpy",
    ],
    include_package_data=True,
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: Apache Software License",
        "Operating System :: OS Independent",
    ],
    python_requires='>=3',
)
