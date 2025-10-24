import React from 'react';

import CCCInfoBox from '../../ccc/components/CCCInfoBox';

import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

import cccMetadata from '../fixtures/cccMetadata';

describe('<CCCInfoBox />', () => {
  const props = { cccMetadata };

  it('should render a <table />', () => {
    render(<CCCInfoBox {...props} />);
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('should show the CCC id', () => {
    const {container} = render(<CCCInfoBox {...props} />);
    expect(container).toHaveTextContent(cccMetadata.id);
  });

  it('should show the CCC access token', () => {
    const {container} = render(<CCCInfoBox {...props} />);
    expect(container).toHaveTextContent(cccMetadata.accessToken);
  });

  it('should show the CCC species', () => {
    const {container} = render(<CCCInfoBox {...props} />);
    expect(container).toHaveTextContent(cccMetadata.species);
  });

  it('should show the CCC reference', () => {
    const {container} = render(<CCCInfoBox {...props} />);
    expect(container).toHaveTextContent(cccMetadata.reference);
  });

  it('should show the CCC pinning format', () => {
    const {container} = render(<CCCInfoBox {...props} />);
    expect(container).toHaveTextContent(cccMetadata.pinningFormat.name);
  });

  it('should show the CCC fixture name', () => {
    const {container} = render(<CCCInfoBox {...props} />);
    expect(container).toHaveTextContent(cccMetadata.fixtureName);
  });
});
