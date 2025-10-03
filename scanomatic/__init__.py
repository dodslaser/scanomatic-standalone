#!/usr/bin/env python3.9
"""Part of analysis work-flow that holds a grid arrays"""

import os
from pathlib import Path

from . import (
    data_processing,
    generics,
    image_analysis,
    io,
    models,
    qc,
    server,
    ui_server,
    util,
    scripts,
)

ROOT = Path(__file__).parent.absolute()

__author__ = "Martin Zackrisson"
__copyright__ = "Swedish copyright laws apply"
__credits__ = ["Martin Zackrisson", "Mats Kvarnstroem", "Andreas Skyman", ""]
__license__ = "GPL v3.0"
__version__ = "v3.0.0"
__maintainer__ = "Martin Zackrisson"
__status__ = "Development"
__all__ = [
    "data_processing",
    "generics",
    "image_analysis",
    "io",
    "models",
    "qc",
    "server",
    "ui_server",
    "util",
    "scripts"
]

__branch = "dev"


def get_version() -> str:
    return __version__


def get_branch() -> str:
    return __branch
