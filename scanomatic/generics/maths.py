from typing import Union
import numpy as np
from numba import njit, prange
import cv2

# def mid50_mean(data: np.ndarray) -> float:
#     data = get_finite_data(data)
#     center_points = int(np.floor(data.size * 0.5))
#     flank = int(np.floor((data.size - center_points) / 2))
#     data.sort()
#     return data[flank:-flank].mean()

def mid50_mean(data: np.ndarray) -> float:
    if (n := data.size) == 0:
        return np.nan
    if (flank := (n + 1) // 4) == 0:
        return np.nan
    partitioned = np.partition(data, (flank, -flank), axis=None)
    return (np.sort(partitioned[flank:-flank])).mean()

# def quantiles_stable(data: np.ndarray) -> tuple[float, float]:
#     data = get_finite_data(data)
#     threshold = int(np.floor(data.size * 0.25))
#     data.sort()
#     return data[threshold], data[-threshold]

def quantiles_stable(data: np.ndarray) -> tuple[float, float]:
    n = data.size
    threshold = n // 4
    partitioned = np.partition(data, (threshold, -threshold))
    p1 = partitioned[threshold]
    p2 = partitioned[-threshold]
    return p1, p2


def get_finite_data(
    data: Union[np.ndarray, np.ma.MaskedArray]
) -> np.ndarray:
    masked_data = (
        np.ma.masked_invalid(data) if not isinstance(data, np.ma.MaskedArray)
        else data
    )
    return masked_data[~masked_data.mask]


def fast_otsu_uint8(im: np.ndarray, *args, **kwargs) -> float:
    threshold, _ = cv2.threshold(im.view(np.uint8), 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    return float(threshold)

@njit(cache=True, boundscheck=False)
def fast_otsu_float64(image: np.ndarray, nbins: int = 256):
    flat_img = image.ravel()
    if flat_img.size == 0:
        return 0.0

    img_min, img_max = flat_img.min(), flat_img.max()

    if img_min == img_max:
        return img_min

    hist, bin_edges = np.histogram(flat_img, bins=nbins, range=(img_min, img_max))

    weight_b = np.cumsum(hist)
    weight_f = flat_img.size - weight_b

    bin_centers = np.arange(nbins)
    sum_b = np.cumsum(bin_centers * hist)
    sum_total = sum_b[-1]

    max_var = -1.0
    threshold_idx = 0

    for i in range(nbins - 1):
        w_b = weight_b[i]
        w_f = weight_f[i]

        if w_b < 0 or w_f < 0:
            continue
        sum_f = sum_total - sum_b[i]
        diff = sum_b[i] * w_f - sum_f * w_b
        var_between = (diff * diff) / (w_b * w_f)

        if var_between > max_var:
            max_var = var_between
            threshold_idx = i

    return bin_edges[threshold_idx + 1]

def binary_erosion(input_array, structure=None, iterations=1, border_value=0):
    return cv2.erode(
        src=(input_array > 0).view(np.uint8) * 255,
        kernel=(
            cv2.getStructuringElement(cv2.MORPH_CROSS, (3, 3))
            if structure is None
            else structure.view(np.uint8)
        ),
        iterations=iterations,
        borderType=cv2.BORDER_CONSTANT,
        borderValue=[int(border_value) * 255]*3,
    ).view(bool)


def binary_dilation(input_array, structure=None, iterations=1, border_value=0):
    return cv2.dilate(
        src=(input_array > 0).view(np.uint8) * 255,
        kernel=(
            cv2.getStructuringElement(cv2.MORPH_CROSS, (3, 3))
            if structure is None
            else structure.view(np.uint8)
        ),
        iterations=iterations,
        borderType=cv2.BORDER_CONSTANT,
        borderValue=[int(border_value) * 255]*3,
    ).view(bool)

def binary_propagation(seed, mask, connectivity=4):
    num_labels, labels = cv2.connectedComponents(mask.view(np.uint8), connectivity=connectivity)
    intersecting = np.unique(labels[seed > 0])
    intersecting = intersecting[intersecting != 0]
    lut = np.zeros(num_labels, dtype=bool)
    if intersecting.size > 0:
        lut[intersecting] = True
    propagated = lut[labels]

    return propagated


def median_filter_3x3(img):
    p = np.pad(img, 1, mode='edge')

    a0 = p[:-2, :-2]
    a1 = p[:-2, 1:-1]
    a2 = p[:-2, 2:]
    a3 = p[1:-1, :-2]
    a4 = p[1:-1, 1:-1]
    a5 = p[1:-1, 2:]
    a6 = p[2:, :-2]
    a7 = p[2:, 1:-1]
    a8 = p[2:, 2:]

    a1, a2 = np.minimum(a1, a2), np.maximum(a1, a2)
    a4, a5 = np.minimum(a4, a5), np.maximum(a4, a5)
    a7, a8 = np.minimum(a7, a8), np.maximum(a7, a8)
    a0, a1 = np.minimum(a0, a1), np.maximum(a0, a1)
    a3, a4 = np.minimum(a3, a4), np.maximum(a3, a4)
    a6, a7 = np.minimum(a6, a7), np.maximum(a6, a7)
    a1, a2 = np.minimum(a1, a2), np.maximum(a1, a2)
    a4, a5 = np.minimum(a4, a5), np.maximum(a4, a5)
    a7, a8 = np.minimum(a7, a8), np.maximum(a7, a8)
    a3 = np.maximum(a0, a3)
    a5 = np.minimum(a5, a8)
    a4, a7 = np.minimum(a4, a7), np.maximum(a4, a7)
    a6 = np.maximum(a3, a6)
    a4 = np.maximum(a1, a4)
    a2 = np.minimum(a2, a5)
    a4 = np.minimum(a4, a7)
    a4, a2 = np.minimum(a4, a2), np.maximum(a4, a2)
    a4 = np.maximum(a6, a4)
    a4 = np.minimum(a4, a2)

    return a4
