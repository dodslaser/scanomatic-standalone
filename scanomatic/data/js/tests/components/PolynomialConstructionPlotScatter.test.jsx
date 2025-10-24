import { createSVGWindow } from 'svgdom';

// Create an svgdom window and document
const svgWindow = createSVGWindow();
const svgDocument = svgWindow.document;

// Assign svgdom's SVG interfaces to the global window
global.SVGElement = svgWindow.SVGElement;
global.SVGSVGElement = svgWindow.SVGSVGElement;
global.SVGPathElement = svgWindow.SVGPathElement;
global.SVGRectElement = svgWindow.SVGRectElement;
global.SVGCircleElement = svgWindow.SVGCircleElement;
global.SVGLineElement = svgWindow.SVGLineElement;
global.SVGTextElement = svgWindow.SVGTextElement;
global.SVGDocument = svgWindow.SVGDocument;
global.document = svgDocument;

if (typeof window !== 'undefined') {
  window.SVGElement = svgWindow.SVGElement;
  window.SVGSVGElement = svgWindow.SVGSVGElement;
  window.SVGPathElement = svgWindow.SVGPathElement;
  window.SVGRectElement = svgWindow.SVGRectElement;
  window.SVGCircleElement = svgWindow.SVGCircleElement;
  window.SVGLineElement = svgWindow.SVGLineElement;
  window.SVGTextElement = svgWindow.SVGTextElement;
  window.SVGDocument = svgWindow.SVGDocument;
}

import React from 'react';

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom'

import PolynomialResultsPlotScatter from '../../ccc/components/PolynomialResultsPlotScatter';


// Mock c3 as SVG does not work in JSDOM
// vi.mock('c3', () => ({
//   default: {
//     generate: vi.fn()
//   }
// }));



describe('<PolynomialResultsPlotScatter />', () => {
  const resultsData = {
    calculated: [1, 2, 3, 4, 5],
    independentMeasurements: [2, 2, 3, 4, 5],
  };
  const correlation = {
    slope: 4,
    intercept: 10,
    stderr: 0.11,
  };
  const props = {
    resultsData,
    correlation
  };

  it('renders a div to place the plot in', () => {
    const { container } = render(<PolynomialResultsPlotScatter {...props} />);
    expect(container.querySelector('div.poly-corr-chart')).toBeInTheDocument();
  });

  it('renders the title', () => {
    render(<PolynomialResultsPlotScatter {...props} />);
    expect(screen.getByRole('heading', { level: 4 }))
      .toBeInTheDocument()
      .toHaveTextContent('Population Size Correlation');
  });

  it('renders summary paragraph', () => {
    render(<PolynomialResultsPlotScatter {...props} />);
    const { slope, intercept, stderr } = correlation;
    const expected = `Correlation: y = ${slope.toFixed(2)}x + ${intercept.toFixed(0)} (standard error ${stderr})`;
    expect(screen.getByText(expected)).toBeInTheDocument();

  });

  // FIXME: c3 does not work in JSDOM, so no SVG can be rendered
  // it('plots the data', () => {
  //   const expected = '<svg width="520" height="500" style="overflow: hidden;">';
  //   const result = wrapper.find('div.poly-corr-chart').html();
  //   expect(result).toContain(expected);
  // });
});
