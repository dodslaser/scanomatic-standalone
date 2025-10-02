#! /usr/bin/env python3.9
import sys
from argparse import ArgumentParser
from time import sleep

import psutil
import setproctitle

from scanomatic.io.logger import get_logger
from scanomatic.ui_server import ui_server

_logger = get_logger("Scan-o-Matic launcher")


def get_proc_name(proc):

    try:
        return proc.name()
    except TypeError:
        return proc.name

def main():
    parser = ArgumentParser(description="""Scan-o-Matic""")

    parser.add_argument(
        "--kill",
        default=False,
        dest="kill",
        action='store_true',
        help="Kill any running Scan-o-Matic server or UI Server before launching",  # noqa: E501
    )

    parser.add_argument(
        "--no-launch",
        default=False,
        dest="no_launch",
        action='store_true',
        help="Scan-o-Matic will not be launched (usable with --kill).",
    )

    parser.add_argument(
        "--port",
        type=int,
        dest="port",
        help="Manual override of default port",
    )

    parser.add_argument(
        '--host',
        type=str,
        dest="host",
        help="Manually setting host address of server",
    )

    parser.add_argument(
        "--no-browser",
        dest="browser",
        default=True,
        action='store_false',
        help="Open url to Scan-o-Matic in new tab (default True)",
    )

    parser.add_argument(
        "--debug",
        dest="debug",
        default=False,
        action='store_true',
        help=(
            "Run in debug-mode. This makes the app vunerable and insecure and "
            "should be used behind firewall and never on a production system "
            "that has real data in it."
        )
    )

    parser.add_argument(
        "--service-relaunch",
        dest="relaunch",
        default=False,
        action='store_true',
        help="Shortcut for `--kill --no-browser` and ensuring `--no-launch` is not set.",  # noqa: E501
    )

    args = parser.parse_args()

    if args.relaunch:
        _logger.info("Invoking `--kill --no-launch --no_browser`")
        args.kill = True
        args.no_launch = False
        args.browser = False

    if args.kill:
        procs = (
            p for p in psutil.process_iter()
            if get_proc_name(p) in ["SoM Server", "SoM UI Server"]
        )
        for proc in procs:
            _logger.info(
                f"Killing process '{proc.name()}' with pid {proc.pid}",
            )
            proc.kill()

    if args.no_launch:
        _logger.info("Not launching...Done!")
        sys.exit()

    setproctitle.setproctitle("SoM UI Server")
    _logger.info("Waiting 1 second before launch... please hold.")
    sleep(1)
    _logger.info("Launching...")
    ui_server.launch(
        args.host,
        args.port,
        args.debug,
        open_browser_url=args.browser)

if __name__ == "__main__":
    main()
