import glob
import os
from collections.abc import Sequence
from contextlib import contextmanager, suppress
from typing import Optional

import matplotlib
import numpy as np
from matplotlib import pyplot as plt

from scanomatic.image_analysis.image_basics import load_image_to_numpy
from scanomatic.io import jsonizer, legacy
from scanomatic.io.logger import get_logger
from scanomatic.io.numpy import resilient_numpy_load
from scanomatic.io.paths import Paths
from scanomatic.models.compile_project_model import CompileImageAnalysisModel
from scanomatic.models.factories.compile_project_factory import CompileImageAnalysisFactory
from matplotlib import pyplot as plt

_logger = get_logger("Analysis Utils")


@contextmanager
def matplotlib_backend(backend: str):
    current_backend = matplotlib.get_backend()
    matplotlib.use(backend)
    try:
        yield
    finally:
        matplotlib.use(current_backend)


def produce_grid_images(
    plates: Sequence[int],
    path: str = ".",
    image: Optional[str] = None,
    mark_position: tuple[int, int] = (-1, 0),
    compilation: Optional[str] = None,
):
    for plate in plates:
        produce_grid_image(
            plate=plate,
            path=path,
            image=image,
            mark_position=mark_position,
            compilation=compilation,
        )


def produce_grid_image(
    plate: int,
    path: str=".",
    image: Optional[str] = None,
    mark_position: tuple[int, int] = (-1, 0),
    compilation: Optional[str] = None,
):
    plate = plate + 1
    project_path = os.path.join(os.path.dirname(os.path.abspath(path)))

    if compilation is None:
        for compilation_pattern in (
            Paths().project_compilation_pattern,
            Paths().project_compilation_from_scanning_pattern,
            Paths().project_compilation_from_scanning_pattern_old,
        ):
            pattern = os.path.join(os.path.dirname(os.path.abspath(path)), compilation_pattern.format("*"))
            with suppress(IndexError):
                compilation = glob.glob(pattern)[0]
                break
        else:
            raise ValueError("There are no compilations in the parent directory")

    elif not os.path.isfile(compilation):
        raise ValueError(f"There's no compilation at {compilation}")

    _logger.info("Using '%s' to produce grid images", os.path.basename(compilation))

    compilation_list: list[CompileImageAnalysisModel] = (  # ty: ignore[invalid-assignment]
        jsonizer.load(compilation) or
        legacy.load(compilation, CompileImageAnalysisFactory)
    )

    if image is None:
        image_path = compilation_list[-1].image.path
        all_plates = compilation_list[-1].fixture.plates
    else:
        try:
            compilation_data = next(
                c for c in compilation_list
                if os.path.basename(c.image.path) == os.path.basename(image)
            )
        except StopIteration:
            raise ValueError(f"Image '{image}' not found in compilation")
        else:
            image_path = compilation_data.image.path
            all_plates = compilation_data.fixture.plates

    try:
        plate_data = next(p for p in all_plates if p.index == plate)
    except StopIteration:
        raise ValueError(f"Plate '{plate}' not found in compilation")

    for image_path in (image_path, os.path.join(project_path, os.path.basename(image_path))):
        with suppress(IOError):
            image_data = load_image_to_numpy(image_path, dtype=np.uint8)
            break
    else:
        raise ValueError("Image doesn't exist, can't show gridding")

    _logger.info("Producing grid image for plate '%s'", plate)


    plate_image = image_data[plate_data.y1: plate_data.y2, plate_data.x1: plate_data.x2]
    grid_path = os.path.join(path, Paths().grid_pattern.format(plate))
    try:
        grid = resilient_numpy_load(grid_path)
    except IOError:
        _logger.warning("Could not find any grid: %s", grid_path)
        grid = None

    output_path = Paths().experiment_grid_image_pattern.format(plate)
    make_grid_im(plate_image, grid, os.path.join(path, output_path), marked_position=mark_position)



def make_grid(im: np.ndarray, grid_plot: plt.Axes, grid: np.ndarray, marked_position: tuple[int, int]):
    x, y = 0, 1
    for row in range(grid.shape[1]):
        grid_plot.plot(grid[x, row, :], -grid[y, row, :] + im.shape[y], 'r-')

    for col in range(grid.shape[2]):
        grid_plot.plot(grid[x, :, col], -grid[y, :, col] + im.shape[y], 'r-')

    grid_plot.plot(
        grid[x, marked_position[0], marked_position[1]],
        grid[y, marked_position[0], marked_position[1]] +
        im.shape[y],
        'o', alpha=0.75, ms=10, mfc='none', mec='blue', mew=1,
    )

def make_grid_im(im: np.ndarray, grid: Optional[np.ndarray], save_grid_name: str, marked_position: tuple[int, int] = (-1, 0)):

    with matplotlib_backend("Svg"):
        grid_image = plt.figure()
        grid_plot = grid_image.add_subplot(111)
        grid_plot.imshow(im.T, cmap=plt.cm.gray)

        if grid is not None:
            make_grid(im, grid_plot, grid, marked_position)

        ax = grid_image.gca()
        ax.set_xlim(0, im.shape[0])
        ax.set_ylim(0, im.shape[1])
        ax.get_xaxis().set_visible(False)
        ax.get_yaxis().set_visible(False)

        grid_image.savefig(
            save_grid_name,
            pad_inches=0.01,
            format='svg',
            bbox_inches='tight')
