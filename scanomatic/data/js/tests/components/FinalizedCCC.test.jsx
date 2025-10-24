import React from 'react';
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

import FinalizedCCC from '../../ccc/components/FinalizedCCC';
import cccMetadata from '../fixtures/cccMetadata';

describe('<FinalizedCCC />', () => {
  const props = { cccMetadata };

  it('should say "Well Done!"', () => {
    render(<FinalizedCCC {...props} />);
    expect(screen.getByText(/Well Done!/)).toBeInTheDocument();
  });

  it('should show the calibration as string', () => {
    render(<FinalizedCCC {...props} />);
    expect(screen.getByText(/S\. Kombuchae, Professor X/)).toBeInTheDocument();
  });

  it('should show a button to go to the home page', () => {
    render(<FinalizedCCC {...props} />);
    expect(screen.getByRole('link', { name: /go to home page/i }))
      .toBeInTheDocument()
      .toHaveAttribute('href', '/');
  });
});
