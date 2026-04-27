import operator
from enum import Enum
from typing import Any, Optional

import numpy as np
import cv2
from numba import njit
import bottleneck as bn
from scipy.ndimage import (  # type: ignore
    center_of_mass,
    gaussian_filter,
    label
)
from scanomatic.data_processing.convolution import FilterArray

import scanomatic.image_analysis.blob as blob
import scanomatic.image_analysis.histogram as histogram
from scanomatic.generics.maths import quantiles_stable, binary_erosion, mid50_mean
from scanomatic.models.analysis_model import MEASURES
from scanomatic.models.factories.analysis_factories import (
    AnalysisFeaturesFactory
)


def points_in_circle(circle: tuple[tuple[float, float], float]):
    """A generator to return all points whose indices are within given circle.

    Function takes two arguments:

    @circle     A tuple with the structure ((i,j),r)
                Where i and j are the center coordinates of the arrays first
                and second dimension

    @arr        An array (NOT ANYMORE, just give positions!)

    Usage:

    raster = np.fromfunction(lambda i,j: 100+10*i+j, shape, dtype=int)
    points_iterator = points_in_circle(((i0,j0),r),raster)
    pts = np.array(list(points_iterator))

    Originally written by jetxee
    Modified by Martin Zackrisson

    Found on
    http://stackoverflow.com/questions/2770356/
    extract-points-within-a-shape-from-a-raster
    """

    (i0, j0), r = circle

    def intceil(x):
        return int(np.ceil(x))

    for i in range(intceil(i0 - r), intceil(i0 + r)):
        ri = np.sqrt(r ** 2 - (i - i0) ** 2)
        for j in range(intceil(j0 - ri), intceil(j0 + ri)):
            yield (i, j)


def get_round_kernel(
    radius: float = 6.0,
    outline: bool = False,
) -> FilterArray:
    diameter = (radius + 1) * 2 + 1
    center_offset = radius + 1
    round_kernel = np.zeros((diameter, diameter), dtype=bool)
    y, x = np.ogrid[-radius: radius, -radius: radius]

    if outline:
        index = radius ** 2 - 1 <= x ** 2 + y ** 2 <= radius ** 2 + 2

    else:
        index = x ** 2 + y ** 2 <= radius ** 2

    round_kernel[
        center_offset - radius: center_offset + radius,
        center_offset - radius: center_offset + radius
    ][index] = True

    return round_kernel


def get_array_subtraction(
    array_one: np.ndarray,
    array_two: np.ndarray,
    offset: tuple[int, int],
    output=None,
) -> Optional[np.ndarray]:
    """Makes offsetted subtractions for A1 - A2 independent of sizes

    If output is supplied it will be fed directly into it, else,
    it will just return a new array.
    """
    o1_low = offset[0]
    o2_low = offset[1]

    o1_high = o1_low + array_two.shape[0]
    o2_high = o2_low + array_two.shape[1]

    if o1_low < 0:

        b1_low = -o1_low
        o1_low = 0

    else:

        b1_low = 0

    if o2_low < 0:

        b2_low = -o2_low
        o2_low = 0

    else:

        b2_low = 0

    if o1_high > array_one.shape[0]:

        b1_high = array_two.shape[0] - (o1_high - array_one.shape[0])
        o1_high = array_one.shape[0]

    else:

        b1_high = array_two.shape[0]

    if o2_high > array_one.shape[1]:

        b2_high = array_two.shape[1] - (o2_high - array_one.shape[1])
        o2_high = array_one.shape[1]

    else:

        b2_high = array_two.shape[1]

    if output is None:

        diff_array = array_one.copy()

        diff_array[o1_low: o1_high, o2_low: o2_high] -= (
            array_two[b1_low: b1_high, b2_low: b2_high]
        )

        return diff_array

    else:

        output[o1_low: o1_high, o2_low: o2_high] = (
            array_one[o1_low: o1_high, o2_low: o2_high]
            - array_two[b1_low: b1_high, b2_low: b2_high]
        )

# def get_array_subtraction(
#     array_one: np.ndarray,
#     array_two: np.ndarray,
#     offset: tuple[int, int],
#     output: Optional[np.ndarray] = None,
# ) -> Optional[np.ndarray]:
#     """Makes offsetted subtractions for A1 - A2 independent of sizes

#     If output is supplied it will be fed directly into it, else,
#     it will just return a new array.
#     """
#     y_off, x_off = offset
#     h1, w1 = array_one.shape
#     h2, w2 = array_two.shape

#     y1_start, y1_end = max(0, y_off), min(h1, y_off + h2)
#     x1_start, x1_end = max(0, x_off), min(w1, x_off + w2)

#     if y1_start >= y1_end or x1_start >= x1_end:
#         return array_one.copy() if output is None else None

#     y2_start, y2_end = y1_start - y_off, y1_end - y_off
#     x2_start, x2_end = x1_start - x_off, x1_end - x_off

#     slice1 = (slice(y1_start, y1_end), slice(x1_start, x1_end))
#     slice2 = (slice(y2_start, y2_end), slice(x2_start, x2_end))

#     if output is None:
#         result = array_one.copy()
#         result[slice1] -= array_two[slice2]
#         return result
#     else:
#         output[slice1] = array_one[slice1] - array_two[slice2]

class CellItem:

    def __init__(
        self,
        identifier: tuple[int, int, int],
        grid_array: np.ndarray,
    ):
        """Cell_Item is a super-class for Blob, Background and Cell and should
        not be accessed directly.

        It takes these argument:

        @identifier     A id list (plate, row, column) so that it knows its
                        position.

        @grid_array     The first image_section (will initialize a filter
                        array of the same size.

        It has some functions:

        set_data_soruce Sets the image data array

        set_type        Checks and defines the type of cell item a thing is

        do_analysis     Runs analysis on a cell type, given that it has
                        previously been detected

        get_round_kernel    A function to get a binary array with a circle
                            in the center."""

        self.grid_array = grid_array.copy()
        self.filter_array = np.zeros(grid_array.shape, dtype=bool)

        self._identifier = identifier
        self._compartment_type = identifier[-1]
        self.features = AnalysisFeaturesFactory.create(
            index=self._compartment_type,
            data={},
        )
        self._features_key_list = [
            MEASURES.Count,
            MEASURES.Mean,
            MEASURES.Median,
            MEASURES.IQR,
            MEASURES.IQR_Mean,
            MEASURES.Sum,
        ]
        self.features.shape = (len(self._features_key_list),)
        self.old_filter = None

    def set_data_source(self, data_source) -> None:
        self.grid_array = data_source
        if self.grid_array.shape != self.filter_array.shape:
            self.filter_array = np.zeros(
                self.grid_array.shape,
                dtype=bool,
            )

    def do_analysis(self):
        """
        do_analysis updates the values of the features-dict.
        Depending one what type of cell item it is (Blob, Background, Cell)
        different types of calculations will be done.

        The function requires that the cell item type has been set,
        which can be ensured by running set_type.

        Default initiation of a cell item will automatically set the type.

        The function takes no arguments
        """
        # FIXME: Replace print statements with logging and make them more informative
        feature_data: dict[MEASURES, Any] = self.features.data  # ty: ignore[invalid-assignment]
        if self.filter_array is None or not self._features_key_list:
            return

        masked_values = self.grid_array[self.filter_array > 0]
        if (n := masked_values.size) == 0:
            print(f"GCdissect {self._identifier} No blob")
            feature_data.clear()
            return

        if n == (total_sum := masked_values.sum()):
            print(f"GCdissect {self._identifier} No background")
            feature_data.clear()
            return

        feature_data[MEASURES.Count] = n
        feature_data[MEASURES.Sum] = total_sum
        feature_data[MEASURES.Mean] = total_sum / n

        if MEASURES.Median in self._features_key_list:
            feature_data[MEASURES.Median] = bn.median(masked_values)

        if {MEASURES.IQR, MEASURES.IQR_Mean} & set(self._features_key_list):
            try:
                feature_data[MEASURES.IQR] = quantiles_stable(masked_values)
                feature_data[MEASURES.IQR_Mean] = mid50_mean(masked_values)
            except (ValueError, TypeError, Exception):
                feature_data[MEASURES.IQR] = None
                feature_data[MEASURES.IQR_Mean] = None

        if MEASURES.Centroid in self._features_key_list:
            try:
                feature_data[MEASURES.Centroid] = center_of_mass(self.filter_array)
            except Exception:
                feature_data[MEASURES.Centroid] = None

        if MEASURES.Perimeter in self._features_key_list:
            feature_data[MEASURES.Perimeter] = None


def get_onion_values(
    array: np.ndarray,
    array_filter: FilterArray,
    layer_size: int,
) -> np.ndarray:
    """
    get_onion_value peals off bits of the A_filter and sums up
    what is left in A until nothing rematins in A_filter. At each
    layer it subtracts itself from the previous to become an onion.
    It returns a 2D array of sum and pixel count pairs.
    It leaves all sent parameters untouched...
    """

    onion_filter = array_filter.copy()
    onion = []

    while onion_filter.sum() > 0:

        onion.insert(0, [np.sum(array * onion_filter), onion_filter.sum()])

        if onion[0][0] <= 0:

            onion[0][0] = 1

        if len(onion) > 1:

            onion[1] = (
                np.log2(onion[1][0]) - np.log2(onion[0][0]),
                onion[1][1] - onion[0][1],
            )

        onion_filter = binary_erosion(onion_filter, iterations=layer_size)

    return np.asarray(onion)


class BlobDetectionTypes(Enum):
    DEFAULT = 0
    ITERATIVE = 1
    THRESHOLD = 2


class Blob(CellItem):
    BLOB_RECIPE = blob.AnalysisRecipeEmpty()
    blob.AnalysisRecipeMedianFilter(BLOB_RECIPE)
    blob.AnalysisThresholdOtsu(BLOB_RECIPE, threshold_unit_adjust=0.5)
    blob.AnalysisRecipeDilate(BLOB_RECIPE, iterations=2)

    def __init__(
        self,
        identifier: tuple[int, int, int],
        grid_array: np.ndarray,
        run_detect: bool = True,
        threshold: Optional[float] = None,
        blob_detect: BlobDetectionTypes = BlobDetectionTypes.DEFAULT,
        image_color_logic: str = "norm",
        center: Optional[tuple[float, float]] = None,
        radius: Optional[float] = None,
    ):
        CellItem.__init__(self, identifier, grid_array)
        self.threshold = threshold
        if not isinstance(blob_detect, BlobDetectionTypes):
            try:
                blob_detect = BlobDetectionTypes[blob_detect.upper()]
            except KeyError:
                blob_detect = BlobDetectionTypes.DEFAULT
        if blob_detect is BlobDetectionTypes.THRESHOLD:
            self.detect_function = self.threshold
        elif blob_detect is BlobDetectionTypes.ITERATIVE:
            self.detect_function = self.iterative_threshold_detect
        else:
            self.detect_function = self.default_detect

        self.old_trash = None
        self.trash_array = None
        self.image_color_logic = image_color_logic
        self._features_key_list += [MEASURES.Centroid, MEASURES.Perimeter]
        self.features.shape = (len(self._features_key_list),)
        self.histogram = histogram.Histogram(
            self.grid_array,
            run_at_init=False,
        )

        if run_detect:
            if center is not None and radius is not None:
                self.manual_detect(center, radius)
            else:
                self.detect_function()

        self._debug_ticker = 0

    def set_blob_from_shape(
        self,
        rect: Optional[tuple[tuple[int, int], tuple[int, int]]] = None,
        circle: Optional[tuple[tuple[float, float], float]] = None,
    ) -> None:
        """
        set_blob_from_shape serves as the purpose of allowing users to
        define their blob (that is where the colony is).

        It can take either a rectange or a circle description

        Arguments:

        @rect   A list of two two tuples.
                First tuple should be that (upper, left) coordinate
                Second tuple should be the (lower, right) coordinate

        @circle A tuple containing (origo, radius)
                Where origo is a tuple itself (x,y)
        """

        self.filter_array[...] = False
        if rect:
            self.filter_array[
                rect[0][0]: rect[1][0],
                rect[0][1]: rect[1][1]
            ] = True

        elif circle:

            """
            raster = np.fromfunction(
                lambda i, j: 100 + 10 * i + j,
                self.grid_array.shape, dtype=int)
            """

            pts_iterator = points_in_circle(circle)

            for pt in pts_iterator:
                self.filter_array[pt] = True

    def set_threshold(
        self,
        threshold: float = None,
        relative: bool = False,
        im=None,
    ) -> None:
        """
        set_threshold allows user to set the threshold manually or, if no
        argument is passed, to have it set using the histogram of the
        image section and the Otsu-algorithm

        Function has optional arguments

        @threshold      Manually enforced threshold
                        Default (None)

        @relative       Boolean declaring if threshold is a relative value.
                        This argument only has an effect togeather with
                        threshold.
                        Default (false)

        @im             Optional alternative image source
        """

        if threshold is not None:
            if relative:
                self.threshold += threshold
            else:
                self.threshold = threshold
        else:
            if im is None:
                im = self.grid_array

            self.histogram.re_hist(im)
            self.threshold = histogram.otsu(histogram=self.histogram)

    def get_diff(self, other_img, other_blob):
        """
        get_diff withdraws the other_img values from current image
        (a copy of it) superimposoing them using each blob-detection
        as reference point
        """

        cur_center = center_of_mass(self.filter_array)
        other_center = center_of_mass(other_blob)

        offset = np.round(np.asarray(other_center) - np.asarray(cur_center))

        if np.isnan(offset).sum() > 0:
            offset = np.zeros(2)

        return get_array_subtraction(other_img, self.grid_array, offset)

    def get_ideal_circle(self, c_array: Optional[FilterArray] = None):
        """
        get_ideal_circle is a function that extracts the ideal
        circle from an array assuming that there's only one
        continious solid object in the array.

        It has one optional parameter:

        @c_array    An array to be analysed, if not passed
                    the current filter-array will be used instead.

        The function returns the following tuple:

            ( center_of_mass_position, radius )
        """

        if c_array is None:

            c_array = self.filter_array

        center_of_mass_position = center_of_mass(c_array)

        radius = (np.sum(c_array) / np.pi) ** 0.5

        return center_of_mass_position, radius

    def get_circularity(self, c_array: Optional[FilterArray] = None) -> float:
        """
        get_circularity uses get_ideal_circle to make an abstract model
        of the object in c_array and passes this information to
        get_round_kernel producing the ideal circle as an array. This
        is subracted from the mass-center of the object in c_array.
        The differating pixels are summed and used as a measure of the
        circularity dividing it by the square root sum of pixels in the
        blob (to make the fraction independent for radius for near circular
        objects).

        The function takes one optional argument:

        @c_array        Array containing a blob, if nothing is passed then
                        self.filter_array will be used.

        The function returns a fraction value that estimates the
        circularity of the blob
        """

        if c_array is None:

            c_array = self.filter_array

        if c_array.sum() < 1:

            return 1000

        center_of_mass_position, radius = self.get_ideal_circle(c_array)

        radius = round(radius)

        perfect_blob = get_round_kernel(radius=radius)

        offset = [
            np.round(i[0] - i[1] / 2.0) for i in
            zip(center_of_mass_position,  perfect_blob.shape)
        ]

        diff_array = np.abs(get_array_subtraction(
            c_array,
            perfect_blob,
            offset,
        ))

        return diff_array.sum() / (np.sqrt(c_array.sum()) * np.pi)

    def detect(
        self,
        detect_type: Optional[BlobDetectionTypes] = None,
        max_change_threshold: int = 8,
        remember_filter: bool = True,
        remember_trash: bool = False,
    ) -> None:
        """
        Generic wrapper function for blob-detection that calls the
        proper detection function and evaluates the results in comparison
        to the detected blob at time t+1

        Optional argument:

        @use_fallback_detection     If set, overrides the instance default
        @max_change_threshold       The max sum of differentiating pixels
                                    devided by old filters sum of pixels.
        @remember_filter            If set, the current filter will be saved
                                    as old_filter for the next detection
        @remember_trash             If set, the current trash will be saved
                                    as old_trash for the next detection
        """
        if getattr(self, 'filter_array', None) is not None:
            self.trash_array = np.zeros(self.filter_array.shape, dtype=bool)

        if detect_type is None:
            self.detect_function()
        elif detect_type is BlobDetectionTypes.ITERATIVE:
            self.iterative_threshold_detect()
        elif detect_type is BlobDetectionTypes.THRESHOLD:
            self.threshold_detect()
        else:
            self.default_detect()

        if getattr(self, 'trash_array', None) is None and self.filter_array is not None:
            self.trash_array = np.zeros(self.filter_array.shape, dtype=bool)

        if getattr(self, 'old_filter', None) is not None:
            if self.filter_array.sum() == 0:
                self.filter_array = self.old_filter.copy()

            old_sum = self.old_filter.sum()
            sqrt_of_oldsum = old_sum ** 0.5
            blob_diff = (self.old_filter ^ self.filter_array).sum()

            if sqrt_of_oldsum > 0 and (blob_diff / sqrt_of_oldsum) > max_change_threshold:
                if self.filter_array.sum() <= 0 or old_sum <= 0:
                    bad_diff = True
                else:
                    old_com = center_of_mass(self.old_filter)
                    new_com = center_of_mass(self.filter_array)

                    d1 = int(old_com[0] - new_com[0])
                    d2 = int(old_com[1] - new_com[1])

                    def get_slice(offset: int):
                        if offset > 0:
                            return slice(offset, None), slice(None, -offset)
                        elif offset < 0:
                            return slice(None, offset), slice(-offset, None)
                        else:
                            return slice(None), slice(None)

                    old_s1, new_s1 = get_slice(d1)
                    old_s2, new_s2 = get_slice(d2)

                    diff_filter = (
                        self.old_filter[old_s1, old_s2] ^
                        self.filter_array[new_s1, new_s2]
                    )

                    bad_diff = (diff_filter.sum() / sqrt_of_oldsum) > max_change_threshold

                if bad_diff:
                    self.filter_array = self.old_filter.copy()
                    if getattr(self, 'old_trash', None) is not None:
                        self.trash_array = self.old_trash.copy()

        if remember_filter and self.filter_array is not None:
            self.old_filter = self.filter_array.copy()

        if remember_trash and getattr(self, 'trash_array', None) is not None:
            self.old_trash = self.trash_array.copy()


    def iterative_threshold_detect(self) -> None:
        grid_array = gaussian_filter(self.grid_array, 2)

        threshold = 1
        self.threshold_detect(im=grid_array, threshold=threshold)

        while self.get_circularity() > 10 and threshold < 124:
            self.threshold_detect(im=grid_array, threshold=threshold)

    def threshold_detect(
        self,
        im=None,
        threshold: Optional[float] = None,
        color_logic: Optional[str] = None,
    ) -> None:
        """
        If there is a threshold previously set, this will be used to
        detect blob by accepting everythin above threshold as the blob.

        If no threshold has been set, threshold is calculated using
        Otsu on the histogram of the image-section.

        Function takes one optional argument:

        @im             Optional alternative image source
        """

        if self.threshold is None or threshold is not None:
            self.set_threshold(im=im, threshold=threshold)

        if im is None:
            im = self.grid_array

        if color_logic is None:
            color_logic = self.image_color_logic

        self.filter_array[...] = False

        if color_logic == "inv":
            self.filter_array[im < self.threshold] = True
        else:
            self.filter_array[im > self.threshold] = True


    def manual_detect(self, center: tuple[float, float], radius: float) -> None:
        self.filter_array[...] = False

        stencil = get_round_kernel(int(np.round(radius)))
        x_size = (stencil.shape[0] - 1) / 2
        y_size = (stencil.shape[1] - 1) / 2
        center = list(map(int, list(map(round, center))))

        if (
            self.filter_array.shape[0] > center[0] + x_size + 1
            and center[0] - x_size >= 0
        ):

            x_slice = slice(center[0] - x_size, center[0] + x_size + 1, None)
            x_stencil_slice = slice(None, None, None)

        elif center[0] - x_size < 0:

            x_slice = slice(None, center[0] + x_size + 1, None)
            x_stencil_slice = slice(
                stencil.shape[0] - (center[0] + x_size + 1),
                None,
                None,
            )

        else:
            x_slice = slice(center[0] - x_size, None, None)
            x_stencil_slice = slice(
                None,
                self.filter_array.shape[0] - center[0] + x_size,
                None,
            )

        if (
            self.filter_array.shape[1] > center[1] + y_size + 1
            and center[1] - y_size >= 0
        ):

            y_slice = slice(center[1] - y_size, center[1] + y_size + 1, None)
            y_stencil_slice = slice(None, None, None)

        elif center[1] - y_size < 0:

            y_slice = slice(None, center[1] + y_size + 1, None)
            y_stencil_slice = slice(
                stencil.shape[1] - (center[1] + y_size + 1),
                None,
                None,
            )

        else:
            y_slice = slice(center[1] - y_size, None, None)
            y_stencil_slice = slice(
                None,
                self.filter_array.shape[1] - center[1] + y_size,
                None,
            )

        self.filter_array[(x_slice, y_slice)] |= (
            stencil[(x_stencil_slice, y_stencil_slice)]
        )

    def default_detect(self) -> None:
        if self.grid_array.size:
            self.BLOB_RECIPE.analyse(self.grid_array, self.filter_array)
            self.keep_best_blob()

    @staticmethod
    @njit(cache=True, boundscheck=False)
    def get_blob_lut(labeled: np.ndarray, num_labels: int) -> np.ndarray:
        rows, cols = labeled.shape
        n = num_labels
        # 0: background, 1: keep, 2: trash
        lut = np.zeros(n + 1, dtype=np.uint8)
        # 0: area, 1: min_y, 2: max_y, 3: min_x, 4: max_x, 5: sum_y, 6: sum_x, 7: quality
        stats = np.zeros((n, 8), dtype=np.float64)
        stats[:, 1] = rows
        stats[:, 3] = cols

        for i in range(rows):
            for j in range(cols):
                lbl = labeled[i, j]
                if lbl > 0:
                    idx = lbl - 1
                    stats[idx, 0] += 1
                    stats[idx, 1] = min(stats[idx, 1], i)
                    stats[idx, 2] = max(stats[idx, 2], i)
                    stats[idx, 3] = min(stats[idx, 3], j)
                    stats[idx, 4] = max(stats[idx, 4], j)
                    stats[idx, 5] += i
                    stats[idx, 6] += j

        for idx in range(n - 1, -1, -1):
            ext_y = stats[idx, 2] - stats[idx, 1] + 1
            ext_x = stats[idx, 4] - stats[idx, 3] + 1
            min_ext = min(ext_y, ext_x)
            max_ext = max(ext_y, ext_x)
            stats[idx, 7] = stats[idx, 0] * min_ext / max_ext if max_ext > 0 else 0

        q_order = np.argsort(stats[:, 7])[::-1]
        best_quality_label = q_order[0] + 1

        if not stats[:, 7].any():
            return lut

        lut[best_quality_label] = 1
        for idx in q_order[1:]:
            cy = int(round(stats[idx, 5] / stats[idx, 0]))
            cx = int(round(stats[idx, 6] / stats[idx, 0]))
            lut[idx + 1] = 1 if lut[labeled[cy, cx]] == 1 else 2

        return lut

    def keep_best_blob(self) -> None:
        """Evaluates all blobs detected and keeps the best one"""
        labeled, labels = label(self.filter_array)
        lut = self.get_blob_lut(labeled, labels)
        self.filter_array = lut[labeled] == 1
        self.trash_array = lut[labeled] == 2


class Background(CellItem):
    def __init__(self, identifier, grid_array, blob_instance, run_detect=True):
        CellItem.__init__(self, identifier, grid_array)

        if isinstance(blob_instance, Blob):
            self.blob = blob_instance
        else:
            self.blob = None
        if run_detect:
            self.detect()

    def detect(self, **kwargs) -> None:
        """
        detect finds the background

        It is assumed that the background is the inverse
        of the blob. Therefore this function only runs after
        the detect function has been run on blob.

        Function takes no arguments (**kwargs just there to keep interface)
        """
        if self.blob is None or self.blob.filter_array is None:
            print(f"BG {self._identifier}: no blob data available.")
            return
        self.filter_array[...] = ~(self.blob.filter_array | self.blob.trash_array)
        self.filter_array = binary_erosion(self.filter_array, iterations=3, border_value=1)


class Cell(CellItem):
    def __init__(
        self,
        identifier,
        grid_array,
        run_detect=True,
        threshold=-1,
    ):
        CellItem.__init__(self, identifier, grid_array)

        self.threshold = threshold
        self.filter_array[...] = True
        if run_detect:
            self.detect()

    @staticmethod
    def detect(**kwargs) -> None:
        """
        detect makes a filter that is true for the full area

        The function takes no argument.
        """
        pass
