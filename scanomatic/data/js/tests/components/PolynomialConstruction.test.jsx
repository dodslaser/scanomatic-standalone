import React from 'react';

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom'

import PolynomialConstruction from '../../ccc/components/PolynomialConstruction';
import PolynomialResultsInfo from '../../ccc/components/PolynomialResultsInfo';
import PolynomialResultsPlotScatter from '../../ccc/components/PolynomialResultsPlotScatter';
import PolynomialResultsColonyHistograms from '../../ccc/components/PolynomialResultsColonyHistograms';
import PolynomialConstructionError from '../../ccc/components/PolynomialConstructionError';
import { amplitude, animatedPoints } from 'happy-dom/lib/PropertySymbol';

vi.mock('../../ccc/components/PolynomialResultsInfo', {spy: true});
vi.mock('../../ccc/components/PolynomialResultsPlotScatter');
vi.mock('../../ccc/components/PolynomialResultsColonyHistograms', {spy: true});
vi.mock('../../ccc/components/PolynomialConstructionError', {spy: true});

// Mock c3 as SVG does not work in JSDOM
vi.mock('c3', () => ({
  default: {
    generate: vi.fn()
  }
}));

describe('<PolynomialConstruction />', () => {
  const degreeOfPolynomial = 3;
  const onConstruction = vi.fn();
  const onClearError = vi.fn();
  const onDegreeOfPolynomialChange = vi.fn();
  const onFinalizeCCC = vi.fn();
  const polynomial = {
    coefficients: [42, 42, 42],
    colonies: 96,
  };
  const resultsData = {
    calculated: [1, 2, 3],
    independentMeasurements: [4, 5, 6],
  };
  const correlation = {
    slope: 55,
    intercept: -444,
    stderr: 0.01,
  };
  const colonies = {
    pixelValues: [[1, 2], [5.5]],
    pixelCounts: [[100, 1], [44]],
    targetValues: [123, 441],
    minPixelValue: 1,
    maxPixelValue: 5.5,
    maxCount: 100,
    independentMeasurements: [4, 5, 6],
  };
  const error = 'No no no!';

  const props = {
    degreeOfPolynomial,
    onConstruction,
    onClearError,
    onDegreeOfPolynomialChange,
    onFinalizeCCC,
    polynomial,
    resultsData,
    correlation,
    colonies,
    error,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render a button to construct the polynomial', () => {
    render(<PolynomialConstruction {...props} />);
    expect(screen.getByRole('button', { name: /construct polynomial/i })).toBeInTheDocument();
  });

  it('should render a finalize button', () => {
    render(<PolynomialConstruction {...props} />);
    expect(screen.getByRole('button', { name: /finalize/i })).toBeInTheDocument();
  });

  it('should enable the finalize button if there is a polynomial', () => {
    render(<PolynomialConstruction {...props} />);
    expect(screen.getByRole('button', { name: /finalize/i })).toBeEnabled();
  });

  it('should disable the finalize button if there is no polynomial', () => {
    render(<PolynomialConstruction {...props} polynomial={null} />);
    expect(screen.getByRole('button', { name: /finalize/i })).toBeDisabled();
  });

  it('should call onFinalizeCCC when the finalize button is clicked', () => {
    render(<PolynomialConstruction {...props} />);
    const button = screen.getByRole('button', { name: /finalize/i });
    expect(onFinalizeCCC).not.toHaveBeenCalled();
    fireEvent.click(button);
    expect(onFinalizeCCC).toHaveBeenCalledOnce();
  });

  it('should render a PolynomialResultsInfo', () => {
    render(<PolynomialConstruction {...props} />);
    expect(PolynomialResultsInfo).toHaveBeenCalledOnce();
  });

  it('should render a PolynomialResultsPlotScatter', () => {
    render(<PolynomialConstruction {...props} />);
    expect(PolynomialResultsPlotScatter).toHaveBeenCalledOnce();
  });

  it('should render a PolynomialResultsColonyHistograms', () => {
    render(<PolynomialConstruction {...props} />);
    expect(PolynomialResultsColonyHistograms).toHaveBeenCalledOnce();
  });

  it('should render a PolynomialConstructionError', () => {
    render(<PolynomialConstruction {...props} />);
    expect(PolynomialConstructionError).toHaveBeenCalledOnce();
  });

  it('should call onConstruction when clicked', () => {
    render(<PolynomialConstruction {...props} />);
    const button = screen.getByRole('button', { name: /construct polynomial/i });
    fireEvent.click(button);
    expect(onConstruction).toHaveBeenCalled();
  });

  it('should set resultsData according to props', () => {
    render(<PolynomialConstruction {...props} />);
    expect(PolynomialResultsPlotScatter.mock.instances[0])
      .toHaveProperty('props.resultsData', props.resultsData);
  });

  it('should set correlation according to props', () => {
    render(<PolynomialConstruction {...props} />);
    expect(PolynomialResultsPlotScatter.mock.instances[0])
      .toHaveProperty('props.correlation', props.correlation);
  });

  it('should set the results polynomial according to props', () => {
    render(<PolynomialConstruction {...props} />);
    expect(PolynomialResultsInfo).toHaveBeenCalledWith(
      expect.objectContaining({ polynomial: props.polynomial }),
      expect.anything()
    );
  });

  it('should set the results error according to props', () => {
    render(<PolynomialConstruction {...props} />);
    expect(PolynomialConstructionError).toHaveBeenCalledWith(
      expect.objectContaining({ error: props.error }),
      expect.anything()
    );
  });

  it('should set the results onClearError according to props', () => {
    render(<PolynomialConstruction {...props} />);
    expect(PolynomialConstructionError).toHaveBeenCalledWith(
      expect.objectContaining({ onClearError: props.onClearError }),
      expect.anything()
    );
  });

  it('should not render any results info if there are none', () => {
    render(<PolynomialConstruction {...props} polynomial={null} />);
    expect(PolynomialResultsInfo).not.toHaveBeenCalled();
    expect(PolynomialResultsPlotScatter).toHaveBeenCalledOnce();
    expect(PolynomialConstructionError).toHaveBeenCalledOnce();
    expect(PolynomialResultsColonyHistograms).toHaveBeenCalledOnce();
  });

  it('should not render any results scatter if there are none', () => {
    render(<PolynomialConstruction {...props} resultsData={null} />);
    expect(PolynomialResultsInfo).toHaveBeenCalledOnce();
    expect(PolynomialResultsPlotScatter).not.toHaveBeenCalled();
    expect(PolynomialConstructionError).toHaveBeenCalledOnce();
    expect(PolynomialResultsColonyHistograms).toHaveBeenCalledOnce();
  });

  it('should not render any results histograms if there are none', () => {
    render(<PolynomialConstruction {...props} colonies={null} />);
    expect(PolynomialResultsInfo).toHaveBeenCalledOnce();
    expect(PolynomialResultsPlotScatter).toHaveBeenCalledOnce();
    expect(PolynomialResultsColonyHistograms).not.toHaveBeenCalled();
    expect(PolynomialConstructionError).toHaveBeenCalledOnce();
  });

  it('should not render any error if there is none', () => {
    render(<PolynomialConstruction {...props} error={null} />);
    expect(PolynomialResultsInfo).toHaveBeenCalledOnce();
    expect(PolynomialResultsPlotScatter).toHaveBeenCalledOnce();
    expect(PolynomialResultsColonyHistograms).toHaveBeenCalledOnce();
    expect(PolynomialConstructionError).not.toHaveBeenCalled();
  });

  it('should render a <select /> for the degree of the polynomial', () => {
    render(<PolynomialConstruction {...props} />);
    expect(screen.getByRole('combobox'))
      .toBeInTheDocument()
      .toHaveClass('degree')
      .toHaveValue('3');
  });

  it('should render options for degree 2 to 5', () => {
    render(<PolynomialConstruction {...props} />);
    const select = screen.getByRole('combobox');
    expect(select.children).toHaveLength(4);
    expect(select.children[0]).toHaveValue('2')
    expect(select.children[1]).toHaveValue('3')
    expect(select.children[2]).toHaveValue('4')
    expect(select.children[3]).toHaveValue('5')
  });

  it('should call onDegreeOfPolynomialChange when the selected degree changes', () => {
    render(<PolynomialConstruction {...props} />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '4' } });
    expect(onDegreeOfPolynomialChange).toHaveBeenCalledOnce();
  });
});
