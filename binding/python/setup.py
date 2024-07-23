import os
import shutil

import setuptools

os.system('git clean -dfx')

package_folder = os.path.join(os.path.dirname(__file__), 'pvrhino')
os.mkdir(package_folder)

shutil.copy(os.path.join(os.path.dirname(__file__), '../../LICENSE'), package_folder)

shutil.copy(os.path.join(os.path.dirname(__file__), '__init__.py'), os.path.join(package_folder, '__init__.py'))
shutil.copy(os.path.join(os.path.dirname(__file__), '_rhino.py'), os.path.join(package_folder, '_rhino.py'))
shutil.copy(os.path.join(os.path.dirname(__file__), '_factory.py'), os.path.join(package_folder, '_factory.py'))
shutil.copy(os.path.join(os.path.dirname(__file__), '_util.py'), os.path.join(package_folder, '_util.py'))

platforms = ('linux', 'mac', 'raspberry-pi', 'windows')

os.mkdir(os.path.join(package_folder, 'lib'))
for platform in ('common',) + platforms:
    shutil.copytree(
        os.path.join(os.path.dirname(__file__), '../../lib', platform),
        os.path.join(package_folder, 'lib', platform))

MANIFEST_IN = """
include pvrhino/LICENSE
include pvrhino/__init__.py
include pvrhino/_rhino.py
include pvrhino/_factory.py
include pvrhino/_util.py
include pvrhino/lib/common/rhino_params.pv
include pvrhino/lib/linux/x86_64/libpv_rhino.so
include pvrhino/lib/mac/x86_64/libpv_rhino.dylib
include pvrhino/lib/mac/arm64/libpv_rhino.dylib
recursive-include pvrhino/lib/raspberry-pi *
include pvrhino/lib/windows/amd64/libpv_rhino.dll
"""

with open(os.path.join(os.path.dirname(__file__), 'MANIFEST.in'), 'w') as f:
    f.write(MANIFEST_IN.strip('\n '))

with open(os.path.join(os.path.dirname(__file__), 'README.md'), 'r') as f:
    long_description = f.read()

setuptools.setup(
    name="pvrhino",
    version="3.0.3",
    author="Picovoice",
    author_email="hello@picovoice.ai",
    description="Rhino Speech-to-Intent engine.",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/Picovoice/rhino",
    packages=["pvrhino"],
    include_package_data=True,
    classifiers=[
        "Development Status :: 5 - Production/Stable",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: Apache Software License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Topic :: Multimedia :: Sound/Audio :: Speech"
    ],
    python_requires='>=3.8',
    keywords="Speech-to-Intent, voice commands, voice control, speech recognition, natural language understanding"
)
