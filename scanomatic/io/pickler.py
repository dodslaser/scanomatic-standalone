import os
import pickle
from contextlib import contextmanager
from typing import IO


@contextmanager
def safe_open(path):
    fh = None
    try:
        fh = SafeProxyFileObject(path, _RefactoringPhases())
        yield fh
    finally:
        if fh is not None:
            fh.close()


def safe_unpickle(file):
    with safe_open(file) as fh:
        return pickle.load(fh)


class _RefactoringPhases:
    def __init__(self):
        """Rewrites pickled data to match refactorings"""
        self._next = None

    def __call__(self, line: bytes, fh: IO):
        """
        Args:
            line (str): A pickled line
        """
        if self._next is None:
            if line.endswith(
                b"scanomatic.data_processing.curve_phase_phenotypes",
            ):
                tell = fh.tell()
                _next = fh.readline()
                fh.seek(tell)

                if _next.startswith(b'VectorPhenotypes'):
                    return (
                        line[:-49]
                        + b"scanomatic.data_processing.phases.features"
                    )
                elif _next.startswith(b'CurvePhasePhenotypes'):
                    return (
                        line[:-49]
                        + b"scanomatic.data_processing.phases.analysis"
                    )
                elif _next.startswith(b'CurvePhases'):
                    return (
                        line[:-49]
                        + b"scanomatic.data_processing.phases.segmentation"
                    )
                elif _next.startswith(b'CurvePhaseMetaPhenotypes'):
                    return (
                        line[:-49]
                        + b"scanomatic.data_processing.phases.features"
                    )
            return line
        else:
            ret = self._next
            self._next = None
            return ret


class SafeProxyFileObject:

    def __init__(self, name, *validation_functions):
        self.__dict__["__file"] = open(name, 'rb')
        self.__dict__["__validation_functions"] = validation_functions

    def close(self):
        return self.__dict__['__file'].close()

    def readline(self):
        line = self.__dict__['__file'].readline().rstrip(b"\r\n")
        for validation_func in self.__dict__['__validation_functions']:
            line = validation_func(line, self.__dict__['__file'])
        return line + b"\n"

    def readlines(self):
        def yielder():
            size = os.fstat(self.fileno()).st_size
            while size != self.tell():
                yield self.readline()
        return [line for line in yielder()]

    def __getattr__(self, item):
        return getattr(self.__dict__['__file'], item)
