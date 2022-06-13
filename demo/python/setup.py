import os
import shutil

import setuptools

os.system('git clean -dfx')

package_folder = os.path.join(os.path.dirname(__file__), 'pvrhinodemo')
os.mkdir(package_folder)

shutil.copy(os.path.join(os.path.dirname(__file__), '../../LICENSE'), package_folder)

shutil.copy(
    os.path.join(os.path.dirname(__file__), 'rhino_demo_file.py'),
    os.path.join(package_folder, 'rhino_demo_file.py'))

shutil.copy(
    os.path.join(os.path.dirname(__file__), 'rhino_demo_mic.py'),
    os.path.join(package_folder, 'rhino_demo_mic.py'))

with open(os.path.join(os.path.dirname(__file__), 'MANIFEST.in'), 'w') as f:
    f.write('include pvrhinodemo/LICENSE')
    f.write('include pvrhinodemo/rhino_demo_file.py')
    f.write('include pvrhinodemo/rhino_demo_mic.py')

with open(os.path.join(os.path.dirname(__file__), 'README.md'), 'r') as f:
    long_description = f.read()

setuptools.setup(
    name="pvrhinodemo",
    version="2.1.4",
    author="Picovoice",
    author_email="hello@picovoice.ai",
    description="Rhino Speech-to-Intent engine demos.",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/Picovoice/rhino",
    packages=["pvrhinodemo"],
    install_requires=["pvrhino==2.1.3", "pvrecorder==1.1.0"],
    include_package_data=True,
    classifiers=[
        "Development Status :: 5 - Production/Stable",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: Apache Software License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Topic :: Multimedia :: Sound/Audio :: Speech"
    ],
    entry_points=dict(
        console_scripts=[
            'rhino_demo_file=pvrhinodemo.rhino_demo_file:main',
            'rhino_demo_mic=pvrhinodemo.rhino_demo_mic:main',
        ],
    ),
    python_requires='>=3.5',
    keywords="Speech-to-Intent, voice commands, voice control, speech recognition, natural language understanding"
)
