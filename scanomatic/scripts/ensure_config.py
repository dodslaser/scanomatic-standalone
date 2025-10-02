from scanomatic.io.paths import Paths
from pathlib import Path
from shutil import copyfile

def ensure_config():
    paths = Paths()
    default_config = Path(paths.package_root) / "data" / "config"
    current_config = Path(paths.config)
    for path in default_config.glob("*"):
        if not (current_config / path.name).exists():
            copyfile(path, current_config / path.name)