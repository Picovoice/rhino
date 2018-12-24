# Prerequisites

Python 3.5 or higher is required to use the binding and run its accompanying unit tests.

The unit test uses [PySoundFile](https://pypi.python.org/pypi/PySoundFile) for reading audio test files. It can be
installed using

```bash
pip install pysoundfile
```

# Running Unit Tests

Using command line (from the root of the repository)

```bash
python binding/python/test_rhino.py
```

# Binding Class

Rhino's Python binding uses [ctypes](https://docs.python.org/3.5/library/ctypes.html) to access Rhino's C
library. For an example usage refer to [Rhino demo application](/demo/python/rhino_demo.py).
