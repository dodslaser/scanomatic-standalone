import React from 'react';

import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom'

import PolynomialConstructionError from '../../ccc/components/PolynomialConstructionError';

describe('<PolynomialConstructionError />', () => {
  const error = 'awesomesauce!';
  const onClearError = vi.fn();

  const props = {
    error,
    onClearError,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders an alert', () => {
    const { container } = render(<PolynomialConstructionError {...props} />);
    expect(container.querySelector('div.alert')).toBeInTheDocument();
  });

  it('doesnt render any results', () => {
    const { container } = render(<PolynomialConstructionError {...props} />);
    expect(container.querySelector('div.results')).not.toBeInTheDocument();
  });

  it('the alert displays the error', () => {
    const { container } = render(<PolynomialConstructionError {...props} />);
    expect(container.querySelector('div.alert').textContent).toContain(props.error);
  });

  it('the alert has a close button', () => {
    const { container } = render(<PolynomialConstructionError {...props} />);
    expect(container.querySelector('div.alert button')).toBeInTheDocument();
  });

  it('the alert has a close button invokes onClearError', () => {
    const { container } = render(<PolynomialConstructionError {...props} />);
    const button = container.querySelector('div.alert button')
    expect(onClearError).not.toHaveBeenCalled();
    fireEvent.click(button);
    expect(onClearError).toHaveBeenCalled();
  });
});
