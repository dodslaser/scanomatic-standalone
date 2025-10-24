import numpy as np

from scanomatic.io.logger import get_logger
from scanomatic.io.pickler import safe_open

_LOGGER = get_logger("Numpy IO")

def resilient_numpy_load(path: str, **kwargs):
    allow_pickle = kwargs.pop('allow_pickle', True)
    fix_imports  = kwargs.pop('fix_imports', True)
    encoding = kwargs.pop('encoding', 'ASCII')
    try:
        with safe_open(path) as fh:
            return np.load(fh, allow_pickle=allow_pickle, fix_imports=fix_imports, encoding=encoding, **kwargs,)
    except Exception:
        _LOGGER.warning("Numpy file '%s' could not be loaded with ASCII encoding, trying 'bytes'", path)
        with safe_open(path) as fh:
            return np.load(fh, allow_pickle=allow_pickle, fix_imports=fix_imports, encoding='bytes', **kwargs,)


