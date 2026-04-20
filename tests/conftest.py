import pytest
import numpy as np

@pytest.fixture(autouse=True)
def setup_environment():
    np.random.seed(42)
    yield
