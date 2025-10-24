import React from 'react';

import CCCInitialization from '../../ccc/components/CCCInitialization';

import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

describe('<CCCInitialization />', () => {
  const onSpeciesChange = vi.fn();
  const onReferenceChange = vi.fn();
  const onFixtureNameChange = vi.fn();
  const onPinningFormatNameChange = vi.fn();
  const onSubmit = vi.fn();
  const props = {
    species: 'S. Kombuchae',
    reference: 'Professor X',
    fixtureName: 'fix1',
    fixtureNames: ['fix0', 'fix1'],
    pinningFormatName: '2x4',
    pinningFormatNames: ['1x1', '2x4'],
    onSpeciesChange,
    onReferenceChange,
    onFixtureNameChange,
    onPinningFormatNameChange,
    onSubmit,
  };

  it('should render an <input /> for the species', () => {
    render(<CCCInitialization {...props} />);
    expect(screen.queryByPlaceholderText('species'))
      .toBeInTheDocument()
      .toHaveValue(props.species);
  });

  it('should call onSpeciesChange when the species input changes', () => {
    const {container} = render(<CCCInitialization {...props} />);
    const input = container.querySelector('input.species');
    fireEvent.change(input, { target: { value: 'XXX' } });
    expect(onSpeciesChange).toHaveBeenCalled();
  });

  it('should render an <input /> for the reference', () => {
    const {container} = render(<CCCInitialization {...props} />);
    expect(container.querySelector('input.reference'))
      .toBeInTheDocument()
      .toHaveValue(props.reference);
  });

  it('should call onReferenceChange when the reference changes', () => {
    const {container} = render(<CCCInitialization {...props} />);
    const input = container.querySelector('input.reference');
    fireEvent.change(input, { target: { value: 'XXX' } });
    expect(onReferenceChange).toHaveBeenCalled();
  });

  it('should render a <select /> for the fixtures', () => {
    const {container} = render (<CCCInitialization {...props} />);
    const input = container.querySelector('select.fixtures');
    expect(input).toBeInTheDocument()
      .toHaveValue('fix1')
      .toHaveLength(2);
    expect(input.children[0]).toHaveTextContent('fix0')
      .toHaveValue('fix0')
    expect(input.children[1]).toHaveTextContent('fix1')
      .toHaveValue('fix1')
  });

  it('should call onFixtureChange when the selected fixture changes', () => {
    const {container} = render(<CCCInitialization {...props} />);
    const input = container.querySelector('select.fixtures');
    fireEvent.change(input, { target: { value: 'XXX' } });
    expect(onFixtureNameChange).toHaveBeenCalled();
  });

  it('should render a <select /> for the pinning formats', () => {
    const {container} = render(<CCCInitialization {...props} />);
    const input = container.querySelector('select.pinningformats');
    expect(input)
      .toBeInTheDocument()
      .toHaveValue('2x4')
      .toHaveLength(2);
    expect(input.children[0])
      .toHaveTextContent('1x1')
      .toHaveValue('1x1')
    expect(input.children[1])
      .toHaveTextContent('2x4')
      .toHaveValue('2x4')
  });

  it('should call onPinningFormatNameChange when the selected pinning format changes', () => {
    const {container} = render(<CCCInitialization {...props} />);
    const input = container.querySelector('select.pinningformats');
    fireEvent.change(input, { target: { value: 'XXX' } });
    expect(onPinningFormatNameChange).toHaveBeenCalled();
  });
});
