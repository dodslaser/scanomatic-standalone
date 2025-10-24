import React from 'react';

import Plate from '../../ccc/components/Plate';

import { render } from '@testing-library/react';
import '@testing-library/jest-dom'

const canvasContext = {
  drawImage: vi.fn(),
  scale: vi.fn(),
  beginPath: vi.fn(),
  arc: vi.fn(),
  stroke: vi.fn(),
}
window.HTMLCanvasElement.prototype.getContext = () => canvasContext;

// vi.mock('../../ccc/Components/Plate', {spy: true});

// FIXME: We used to do some form of visual regression testing here
// but this is problematic with vitest and jsdom, as it doesnt actually
// load images. Leaving this commented out for future reference.

// const toLookLikeImage = (util, customEqualityTesters) => ({
//   compare: (actual, expected) => {
//     const expectedCanvas = document.createElement('canvas');
//     expectedCanvas.width = expected.naturalWidth;
//     expectedCanvas.height = expected.naturalHeight;
//     expectedCanvas.getContext('2d').drawImage(expected, 0, 0);
//     const actualImageData = actual.getContext('2d')
//       .getImageData(0, 0, actual.width, actual.height);
//     const expectedImageData = expectedCanvas.getContext('2d')
//       .getImageData(0, 0, actual.width, actual.height);
//     const result = {};
//     result.pass = util.equals(actualImageData, expectedImageData, customEqualityTesters);

//     const actualDataURL = actual.toDataURL();
//     const expectedDataURL = expectedCanvas.toDataURL();
//     if (result.pass) {
//       result.message = 'Expected canvas to look different';
//     } else {
//       result.message = 'Expected canvas to look the same';
//     }
//     result.message += `\n\texpected: ${expectedDataURL}`;
//     result.message += `\n\tactual: ${actualDataURL}`;
//     return result;
//   },
// });

// expect.extend({ toLookLikeImage });

describe('<Plate />', () => {
  const grid = [
    [[150, 150], [50, 50]],
    [[50, 150], [50, 150]],
  ];
  const image = new Image({ width: 200, height: 200 });
  const SCALE = 0.2;
  const COLONY_OUTLINE_RADIUS = 30
  const SELECTED_COLONY_MARKER_RADIUS = 40;

  const expected = {
    width: image.width * SCALE,
    height: image.height * SCALE,
  }

  beforeAll(() => {
    vi.resetAllMocks();
  });

  it('should render a <canvas />', () => {
    const { container } = render(<Plate image={image} />);
    expect(container.querySelector('canvas')).toBeInTheDocument()
  });

  it('should size <canvas /> based on the image', () => {
    const { container } = render(<Plate image={image} />);
    expect(container.querySelector('canvas'))
      .toHaveProperty('width', expected.width)
      .toHaveProperty('height', expected.height);
  });

  it('should render the image in the <canvas />', () => {
    render(<Plate image={image} />);
    expect(canvasContext.drawImage).toHaveBeenCalledWith(image, 0, 0, expected.width, expected.height);
    expect(canvasContext.scale).toHaveBeenCalledWith(SCALE, SCALE);
  });

  it('should render the grid on top of the image', () => {
    render(<Plate image={image} grid={grid} />);
    expect(canvasContext.drawImage).toHaveBeenCalledWith(image, 0, 0, expected.width, expected.height);
    expect(canvasContext.scale).toHaveBeenCalledWith(SCALE, SCALE);
    expect(canvasContext.beginPath).toHaveBeenCalledTimes(4);
    expect(canvasContext.arc)
      .toHaveBeenCalledTimes(4)
      .toHaveBeenCalledWith(50, 50, COLONY_OUTLINE_RADIUS, 0, 2 * Math.PI)
      .toHaveBeenCalledWith(150, 50, COLONY_OUTLINE_RADIUS, 0, 2 * Math.PI)
      .toHaveBeenCalledWith(50, 150, COLONY_OUTLINE_RADIUS, 0, 2 * Math.PI)
      .toHaveBeenCalledWith(150, 150, COLONY_OUTLINE_RADIUS, 0, 2 * Math.PI);
    expect(canvasContext.stroke).toHaveBeenCalledTimes(4);
  });

  it('should render a circle around the selected colony', () => {
    render(<Plate image={image} grid={grid} selectedColony={{ row: 1, col: 0 }} />);
    expect(canvasContext.arc)
      .toHaveBeenCalledWith(50, 50, SELECTED_COLONY_MARKER_RADIUS, 0, 2 * Math.PI);
  });

  it('should update the canvas when props change', () => {
    const updateCanvas = vi.spyOn(Plate.prototype, 'updateCanvas');
    const { rerender } = render(<Plate image={image} grid={grid} selectedColony={{ row: 0, col: 0 }} />);
    expect(updateCanvas).toHaveBeenCalledOnce();
    rerender(<Plate image={image} grid={grid} selectedColony={{ row: 0, col: 1 }} />);
    expect(updateCanvas).toHaveBeenCalledTimes(2);
  });
});
