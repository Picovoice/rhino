import setuptools
import shutil
import os

LONG_DESCRIPTION = \
    """
    #[Rhino](https://github.com/Picovoice/rhino).   
    It supports Linux (x86_64), Mac, Raspberry Pi (Zero, 1, 2, 3), and BeagleBone.
    ## Installation
    ```bash
    pip install pvrhino
    ```
    If it fails to install PyAudio, you can do the following for Debian/Ubuntu as referenced in the installation guide
    of [PyAudio](https://people.csail.mit.edu/hubert/pyaudio/). 
    Install PyAudio  
    ```bash
    sudo apt-get install python-pyaudio python3-pyaudio
    ```
    If the above fails then first run the following
    ```bash
    sudo apt-get install portaudio19-dev
    sudo apt-get install python-all-dev python3-all-dev
    ```
    ## Usage
    ### Realtime Demo
    Make sure you have a working microphone connected to your device first. From commandline type the following
    ```bash
    pvrhino_mic
    ```
    Then start with "Hey Pico" and order coffee. The demo infers intent from spoken commands in the context of a coffee maker 
    and initializes the Porcupine engine to detect the wake phrase _Hey Pico_. When the wake phrase is detected, 
    Rhino starts processing the followup spoken command and prints out the inferred intent and slot values to the console.
    
    In order to get more information about using demos, run them with '--help' argument or look into their GitHub page
    [here](https://github.com/Picovoice/rhino/tree/master/demo/python).
    ### Rhino Class
    
    You can create an instance of Rhino engine for use within your application using the factory method provided below.
    ```python
    import pvrhino
    pvrhino.create(context_file_path=...)
    ```
    If the `context_file_path` is not provided, the default context is the coffee maker.
    """

for x in ('build', 'dist', 'pvrhino.egg-info'):
    x_path = os.path.join(os.path.dirname(__file__), x)
    if os.path.isdir(x_path):
        shutil.rmtree(x_path)

setuptools.setup(
    name="pvrhino",
    version="1.0.0",
    author="Picovoice",
    author_email="hello@picovoice.ai",
    description="On-device speech-to-text engine powered by deep learning.",
    long_description=LONG_DESCRIPTION,
    long_description_content_type="text/markdown",
    url="https://github.com/Picovoice/rhino",
    package_dir={"pvrhino": ""},
    packages=["pvrhino"],
    install_requires=[
        "pysoundfile>=0.9.0",
        "enum34==1.1.6",
        "numpy",
        "pyaudio",
    ],
    include_package_data=True,
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: Apache Software License",
        "Operating System :: OS Independent",
    ],
    entry_points=dict(
        console_scripts=[
            'pvrhino_mic=pvrhino.demo.python.rhino_demo:main'
        ],
    ),
    python_requires='>=3',
)
