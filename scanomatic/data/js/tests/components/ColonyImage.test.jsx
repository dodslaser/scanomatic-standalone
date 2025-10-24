import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

import ColonyImage from '../../ccc/components/ColonyImage';

describe('<ColonyImage/>', () => {
  const data = {
    image: [[0, 1], [1, 0]],
    imageMin: 0,
    imageMax: 1,
    blob: [[true, false], [false, true]],
    background: [[false, true], [true, false]],
  };

  it('should render 1 <canvas/>', () => {
    const {container} = render(<ColonyImage data={data} />);
    expect(container.querySelectorAll('canvas')).toHaveLength(1);
  });

  it('should render no <button />', () => {
    render(<ColonyImage data={data} />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  describe('when draw=true', () => {
    it('should render 2 <canvas/>', () => {
      const {container} = render(<ColonyImage data={data} draw />);
      expect(container.querySelectorAll('canvas')).toHaveLength(2);
    });

    it('should render a "+", "-" and "Update" buttons', () => {
      render(<ColonyImage data={data} draw />);
      const buttons = screen.queryAllByRole('button');
      expect(buttons).toHaveLength(3);
      expect(buttons[0]).toHaveTextContent('+');
      expect(buttons[1]).toHaveTextContent('-');
      expect(buttons[2]).toHaveTextContent('Update');
    });

    it('should call the onUpdate callback when the "Update" button is clicked', () => {
      const onUpdate = vi.fn();
      render(<ColonyImage data={data} onUpdate={onUpdate} draw />);
      const button = screen.getByRole('button', { name: 'Update' });
      fireEvent.click(button);
      expect(onUpdate).toHaveBeenCalled();
    });
  });
});
