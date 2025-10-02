#!/usr/bin/env python3.9
"""Scan-o-Matic Server"""
__author__ = "Martin Zackrisson"
__copyright__ = "Swedish copyright laws apply"
__credits__ = ["Martin Zackrisson"]
__license__ = "GPL v3.0"
__version__ = "0.9991"
__maintainer__ = "Martin Zackrisson"
__email__ = "martin.zackrisson@gu.se"
__status__ = "Development"
import os
import sys

import psutil
from scanomatic.io.logger import get_logger
import setproctitle

import scanomatic.server.interface_builder as interface_builder

_LOGGER = get_logger("Scan-o-Matic server launcher")

def main():
    _LOGGER.info("Launching RPC Server")
    setproctitle.setproctitle("SoM {0}".format("Server"))
    basename = os.path.basename(sys.argv[0])[:15]

    procs = (
        psutil.get_process_list
        if hasattr(psutil, "get_process_list")
        else psutil.process_iter
    )

    for p in procs():
        try:
            if isinstance(p.name, str):
                name = p.name
            else:
                name = p.name()

            if isinstance(p.pid, int):
                pid = p.pid
            else:
                pid = p.pid()

            if (name.startswith(basename) and
                    os.getpid() != pid):

                _LOGGER.critical(
                    "There is already a Scan-o-Matic server running, " +
                    "request refused!",
                )
                sys.exit(9)

        except psutil.NoSuchProcess:
            pass

    _LOGGER.info("Building interface")
    interface_builder.InterfaceBuilder()

if __name__ == "__main__":
    main()