import pickle
from configparser import ConfigParser
from enum import Enum
from typing import Any, Union

from scanomatic.generics.abstract_model_factory import AbstractModelFactory, _SectionsLink
from scanomatic.generics.model import Model
from scanomatic.io.logger import get_logger
from scanomatic.io.pickler import safe_open

_LOGGER = get_logger("Legacy Model Loader")


def deserialize(value: str, dtype: Union[type, tuple], config: ConfigParser) -> Any:
    if dtype is int:
        # NOTE: Handle float strings that should be ints
        return dtype(float(value))

    if dtype in (float, str, bool):
        return dtype(value)

    if isinstance(dtype, type) and issubclass(dtype, Enum):
        return dtype[value]

    while isinstance(value, str):
        # NOTE: Unpickle multiple times to handle nested pickling
        try:
            value = pickle.loads(value.encode())
        except Exception:
            break

    if isinstance(dtype, tuple) and dtype[0] is tuple:
        dtype = dtype[1] if len(dtype) == 2 else dtype[1:]
        values = tuple(deserialize(v, dtype, config) for v in value)
        return values

    if isinstance(value, _SectionsLink):
        return _load_data(config, value._section_name, value._subfactory)

    return value

def _load_data(
    config: ConfigParser,
    section: str,
    factory: AbstractModelFactory,
) -> Model:
    data = {
        key: deserialize(value, factory.STORE_SECTION_SERIALIZERS.get(key), config)
        for key, value in config[section].items()
    }
    config.remove_section(section)
    return factory.create(**data)


def _load_n(path: str, factory: AbstractModelFactory, n: int) -> Union[list[Model], None]:
    config = ConfigParser()
    try:
        with safe_open(path) as f:
            config.read_string(b"".join(f.readlines()).decode())
        models = []
        while config.sections() and (n := n-1) != -1:
            models.append(_load_data(config, config.sections()[0], factory))
    except IOError as exc:
        _LOGGER.warning(f"Attempted to load legacy model from '{path}', but failed: {exc}")
        return None

    return models

def load(path: str, factory: AbstractModelFactory) -> Union[list[Model], None]:
    return _load_n(path, factory, n=-1)

def load_first(path: str, factory: AbstractModelFactory) -> Union[Model, None]:
    model = _load_n(path, factory, n=1)
    return model[0] if model else None