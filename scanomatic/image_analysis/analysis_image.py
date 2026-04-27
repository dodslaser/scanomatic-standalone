from functools import partial
import os
from subprocess import call
from threading import Thread
from time import sleep
from contextlib import suppress
import numpy as np

from scanomatic.io.first_pass_results import CompilationResults
from scanomatic.io.logger import get_logger
from scanomatic.io.paths import Paths
from scanomatic.models.analysis_model import (
    IMAGE_ROTATIONS,
    AnalysisFeatures,
    AnalysisModel
)
from scanomatic.models.compile_project_model import CompileImageAnalysisModel
from scanomatic.models.factories.analysis_factories import (
    AnalysisFeaturesFactory
)
from scanomatic.util.analysis import produce_grid_image

from . import grid_array
from .grayscale import get_grayscale
from .image_basics import load_image_to_numpy
from .grayscale_detection import is_valid_grayscale


def _get_init_features(
    grid_arrays: dict[int, grid_array.GridArray],
) -> AnalysisFeatures:
    size = (max(grid_arrays.keys()) + 1) if grid_arrays else 0
    return AnalysisFeaturesFactory.create(
        shape=(size,),
        data=tuple(grid_arrays[i].features if i in grid_arrays else None for i in range(size)),
        index=0,
    )


class ProjectImage:
    def __init__(
        self,
        analysis_model: AnalysisModel,
        first_pass_results: CompilationResults,
    ):
        """
        :param analysis_model: The model
        :param first_pass_results: The results of project compilation
        """

        self._analysis_model = analysis_model
        self._first_pass_results = first_pass_results

        self._logger = get_logger("Analysis Image")

        self._im_loaded = False
        self.im = None
        self._im_path_as_requested = None

        self._grid_arrays = self._new_grid_arrays
        self._plate_image_inclusion = self.image_inclusions

        self.features = _get_init_features(self._grid_arrays)

    @property
    def active_plates(self):
        return len(self._grid_arrays)

    def __getitem__(self, key):

        return self._grid_arrays[key]

    @property
    def _new_grid_arrays(self) -> dict[int, grid_array.GridArray]:
        grid_arrays = {}

        for index, pinning in enumerate(self._analysis_model.pinning_matrices):
            if not pinning:
                self._logger.info("Plate %s not analysed because lacks pinning", index)
                continue
            elif not self._plate_is_analysed(index):
                self._logger.info("Plate %s not analysed because suppressing non-focal positions", index)
                continue

            grid_arrays[index] = grid_array.GridArray(index, pinning, self._analysis_model)

        return grid_arrays

    @property
    def image_inclusions(self):
        all_images = set(self._first_pass_results.keys())
        highest_index = 0 if not all_images else max(all_images)

        if self._analysis_model.plate_image_inclusion is None:
            self._logger.info("No plate specific image inclusion assumes all plate included for images %s", all_images)
            return {k: all_images for k in self._grid_arrays}


        ret = {}
        platewise_len = len(self._analysis_model.plate_image_inclusion)

        # FIXME: This call to `max` looks broken
        for i in range(max(list(self._grid_arrays.keys()), platewise_len)):
            if i not in self._grid_arrays or i < 0 or i >= platewise_len:
                if platewise_len > i > 0:
                    if self._analysis_model.plate_image_inclusion[i] is not None:
                        self._logger.warning("There's a image selection for plate index %s, but this plate does not exist", i)
                else:
                    self._logger.warning("Plate index %s has no instructions for inclusion of images, assuming all included", i)
                    ret[i] = all_images
                continue

            ret[i] = set()
            instruction = self._analysis_model.plate_image_inclusion[i]
            instruction = [
                [val.strip() for val in part.strip().split("-")]
                for part in instruction.split(",")
            ]

            if not all(len(part) == 2 for part in instruction):
                self._logger.error("Malformed plate inclusion settings: '%s'. Plate excluded from analysis", self._analysis_model.plate_image_inclusion[i])
                continue

            try:
                instruction = [(int(start or 0), int(end or highest_index) + 1) for start, end in instruction]
            except ValueError:
                self._logger.error("Plate inclusion setting contains non-ints '%s'. Plate excluded from analysis", instruction)
                continue
            else:
                for start, end in instruction:
                    ret[i].update(list(range(start, end)))

        return ret

    def _plate_is_analysed(self, index) -> bool:
        return (
            not self._analysis_model.suppress_non_focal
            or index == self._analysis_model.focus_position[0]
        )

    def _get_index_for_gridding(self):
        if self._analysis_model.grid_images:
            pos = max(self._analysis_model.grid_images)
            if pos >= len(self._first_pass_results):
                pos = self._first_pass_results.last_index
        else:

            pos = self._first_pass_results.last_index

        return pos

    def set_grid(self):
        """Sets grids if same index for everyone"""

        if self._analysis_model.plate_image_inclusion is not None:
            # This should be true because it is alright,
            # gridding will be fixed during analysis instead
            return True

        image_model = self._first_pass_results[self._get_index_for_gridding()]

        return self.set_grid_plates(
            list(self._grid_arrays.keys()),
            image_model,
        )

    def set_grid_plates(self, plate_indices, image_model):
        if image_model is None:
            self._logger.critical("No image model to grid on")
            return False

        self.load_image(image_model.image.path)

        if not self._im_loaded:
            self._logger.warning("No gridding done for plates %s because image not loaded.", plate_indices)
            return True

        self._logger.info("Setting grids for plates %s using image index %s", plate_indices, image_model.image.index)

        callback = partial(
            produce_grid_image,
            path=self._analysis_model.output_directory,
            compilation=self._analysis_model.compilation,
        )
        grid_jobs = []
        for index in plate_indices:
            try:
                plate_model = next(model for model in image_model.fixture.plates if model.index == index)
            except StopIteration:
                self._logger.error("No plate model found with index %s", index)
                continue

            if (im := self.get_im_section(plate_model)) is None:
                self._logger.error("Plate model %s could not be used to slice image", plate_model)
                continue

            try:
                offset = self._analysis_model.grid_model.gridding_offsets[index]  # ty: ignore[not-subscriptable]
            except (IndexError, AttributeError, TypeError):
                job = Thread(
                    target=self._grid_arrays[index].detect_grid,
                    args=(im,),
                    kwargs={'analysis_directory': self._analysis_model.output_directory}
                )
                job.start()
                grid_jobs.append((job, index))
            else:
                if (reference_folder := self._analysis_model.grid_model.reference_grid_folder):
                    output_dir = os.path.dirname(self._analysis_model.output_directory)
                    reference_folder = os.path.join(output_dir, reference_folder)
                else:
                    reference_folder = self._analysis_model.output_directory

                if self._grid_arrays[index].set_grid(
                    im,
                    analysis_directory=(self._analysis_model.output_directory),
                    offset=offset,
                    grid=os.path.join(reference_folder, Paths().grid_pattern.format(index + 1)),
                ):
                    grid_jobs.append((None, index))
                else:
                    self._logger.error("Could not use previous gridding with offset %s for plate %s", offset, index)

        for job, index in grid_jobs:
            if job is not None:
                job.join()
            Thread(target=callback, kwargs={'plate': index}).start()
        return True

    def load_image(self, path, try_alternative_path=True):
        if path == self._im_path_as_requested:
            self._logger.info("Image was already loaded")
            return
        with suppress(TypeError, IOError):
            self.im = load_image_to_numpy(path, IMAGE_ROTATIONS.Portrait, dtype=np.uint8)
            self._im_loaded = True
        if self._im_loaded:
            self._logger.info("Image loaded")
            self._im_path_as_requested = path
            # Convert to grayscale if needed, using standard luminosity method
            if self.im.ndim == 3:
                self.im = np.dot(self.im[..., :3], [0.299, 0.587, 0.144])
        elif try_alternative_path:
            alt_path = os.path.join(
                os.path.dirname(self._analysis_model.compilation),
                os.path.basename(path),
            )
            self._logger.warning("Failed to load image at '%s', trying '%s'.", path, alt_path)
            self.load_image(alt_path, try_alternative_path=False)
        else:
            self._logger.error("Failed to load image")

    @property
    def orientation(self) -> IMAGE_ROTATIONS:
        """The currently loaded image's rotation considered as first dimension
        of image array being image rows
        """
        if not self._im_loaded:
            return IMAGE_ROTATIONS.Unknown
        elif self.im.shape[0] > self.im.shape[1]:
            return IMAGE_ROTATIONS.Portrait
        else:
            return IMAGE_ROTATIONS.Landscape

    def get_im_section(self, plate_model, im=None):

        im = im if im is not None else self.im if self._im_loaded else None
        if im is None:
            return

        x = sorted((plate_model.x1, plate_model.x2))
        y = sorted((plate_model.y1, plate_model.y2))
        if self.orientation == IMAGE_ROTATIONS.Landscape:
            x, y = y, x
        y = tuple(np.clip(y, 0, im.shape[0] - 1))
        x = tuple(np.clip(x, 0, im.shape[1] - 1))

        # In images, the first dimension is typically the y-axis
        section = im[y[0]: y[1], x[0]: x[1]]
        return np.flip(section, axis=np.argmin(section.shape))

    def clear_features(self):
        for grid_arr in self._grid_arrays.values():
            grid_arr.clear_features()

    def analyse(self, image_model: CompileImageAnalysisModel):
        self.load_image(image_model.image.path)
        if self._im_loaded is False:
            self._logger.warning("Image could not be loaded, skipping analysis")
            self.clear_features()
            return

        self._logger.info("Image loaded")
        grayscale = get_grayscale(image_model.fixture.grayscale.name)

        if (
            not image_model.fixture.grayscale.section_values
            or not is_valid_grayscale(grayscale.targets, image_model.fixture.grayscale.section_values)
        ):
            self._logger.warning("Not a valid grayscale")
            self.clear_features()
            return

        self.features.index = image_model.image.index
        grid_arrays_processed = set()

        for plate in image_model.fixture.plates:
            if plate.index not in self._grid_arrays:
                self._logger.info("Skipping plate %s because it is not being analysed", plate.index)
                continue

            if image_model.image.index not in self._plate_image_inclusion[plate.index]:
                self._logger.info("Skipping image %s on plate %s due to inclusion settings", image_model.image.index, plate.index)
                continue

            if not self._grid_arrays[plate.index].has_grid:
                self.set_grid_plates([plate.index], image_model)

            grid_arrays_processed.add(plate.index)
            im = self.get_im_section(plate)
            grid_arr = self._grid_arrays[plate.index]
            grid_arr.analyse(im, image_model)

        for index, grid_arr in self._grid_arrays.items():
            if index not in grid_arrays_processed:
                grid_arr.clear_features()

        self._logger.info("Image %s processed", image_model.image.index)
