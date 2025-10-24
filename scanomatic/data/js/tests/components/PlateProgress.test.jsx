import React from 'react';

import { render } from '@testing-library/react';
import '@testing-library/jest-dom'

import PlateProgress from '../../ccc/components/PlateProgress';

describe('<PlateProgress />', () => {
  const props = {
    now: 7,
    max: 42,
  };

  it('should render a bootstrap progress bar', () => {
    const { container } = render(<PlateProgress {...props} />);
    expect(container.querySelector('div.progress')).toBeInTheDocument()
    expect(container.querySelector('div.progress').querySelector('div.progress-bar')).toBeInTheDocument();
  });

  it('should set the progress bar width according to the props', () => {
    const { container } = render(<PlateProgress {...props} />);
    expect(container.querySelector('div.progress-bar')).toHaveStyle({ width: '17%' });
  });

  it('should set the bar text according to the props', () => {
    const { container } = render(<PlateProgress {...props} />);
    expect(container.querySelector('div.progress-bar')).toHaveTextContent('7/42');
  });

  it('should give the progress bar a min-width so that the text is shown', () => {
    const { container } = render(<PlateProgress {...props} />);
    expect(container.querySelector('div.progress-bar')).toHaveStyle({ minWidth: '3em' });
  });
});
