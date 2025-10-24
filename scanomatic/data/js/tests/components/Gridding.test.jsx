import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

import Gridding from '../../ccc/components/Gridding';

describe('<Gridding />', () => {
  const props = {
    loading: false,
    onRegrid: vi.fn(),
    rowOffset: 1,
    colOffset: 2,
    onRowOffsetChange: vi.fn(),
    onColOffsetChange: vi.fn(),
  };

  it('should render a title', () => {
    render(<Gridding {...props} />);
    expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Gridding');
  });

  it('should render a Re-grid <Button />', () => {
    render(<Gridding {...props} />);
    expect(screen.getByRole('button', { name: /re-grid/i })).toBeInTheDocument();
  });

  it('should call onRegrid when Re-grid button is clicked', () => {
    render(<Gridding {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /re-grid/i }));
    expect(props.onRegrid).toHaveBeenCalled();
  });

  it('should render a number input for the row offset', () => {
    const {container} = render(<Gridding {...props} />);
    const input = container.querySelector('input.row-offset');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'number');
    expect(input).toHaveValue(props.rowOffset);
  });

  it('should call onRowOffsetChange when the row offset is changed', () => {
    const {container} = render(<Gridding {...props} />);
    const input = container.querySelector('input.row-offset');
    fireEvent.change(input, { target: { value: '42' } });
    expect(props.onRowOffsetChange).toHaveBeenCalledWith(42);
  });

  it('should render a number input for the col offset', () => {
    const {container} = render(<Gridding {...props} />);
    const input = container.querySelector('input.col-offset');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'number');
    expect(input).toHaveValue(props.colOffset);
  });

  it('should call onColOffsetChange when the col offset is changed', () => {
    const {container} = render(<Gridding {...props} />);
    const input = container.querySelector('input.col-offset');
    fireEvent.change(input, { target: { value: '42' } });
    expect(props.onColOffsetChange).toHaveBeenCalledWith(42);
  });

  it('should render the error as alert-danger', () => {
    const {container} = render(<Gridding {...props} error="XxX" />);
    const alert = container.querySelector('form .alert-danger');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent('XxX');
  });

  it('should render an alert-success if no error', () => {
    const {container} = render(<Gridding {...props} />);
    const alert = container.querySelector('form .alert-success');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent('Gridding was succesful!');
  });

  describe('loading state', () => {
    it('should render a progress bar', () => {
      const {container} = render(<Gridding {...props} loading />);
      const progress = container.querySelector('div.progress');
      expect(progress).toBeInTheDocument();
    });

    it('should hide the form', () => {
      render(<Gridding {...props} loading />);
      expect(screen.queryByRole('form')).not.toBeInTheDocument();
    });
  });
});
