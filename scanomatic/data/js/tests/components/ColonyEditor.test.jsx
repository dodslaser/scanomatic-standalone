import React from 'react';

import ColonyEditor from '../../ccc/components/ColonyEditor';
import ColonyFeatures from '../../ccc/components/ColonyFeatures';
import ColonyImage from '../../ccc/components/ColonyImage';

import { render, screen, fireEvent, createEvent } from '@testing-library/react';
import '@testing-library/jest-dom'

vi.mock('../../ccc/components/ColonyFeatures');
vi.mock('../../ccc/components/ColonyImage');

describe('<ColonyEditor />', () => {
  const data = {
    image: [[0, 1], [1, 0]],
    imageMin: 0,
    imageMax: 1,
    blob: [[true, false], [false, true]],
    background: [[false, true], [true, false]],
  };
  const cellCount = 1234;
  const cellCountError = false;
  const onSet = vi.fn();
  const onSkip = vi.fn();
  const onUpdate = vi.fn();
  const onCellCountChange = vi.fn();
  const props = {
    data,
    cellCount,
    cellCountError,
    onSet,
    onSkip,
    onUpdate,
    onCellCountChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render a <ColonyFeatures/>', () => {
    render(<ColonyEditor {...props} />);
    expect(ColonyFeatures).toHaveBeenCalledOnce();
  });

  it('should render a "Fix" <button/>', () => {
    render(<ColonyEditor {...props} />);
    expect(screen.queryByRole('button', { name: /fix/i })).toBeInTheDocument();
  });

  it('should render a <ColonyImage/>', () => {
    render(<ColonyEditor {...props} />);
    expect(ColonyImage).toHaveBeenCalledOnce();
  });

  it('should render a "Set" <button />', () => {
    render(<ColonyEditor {...props} />);
    expect(screen.queryByRole('button', { name: /set/i })).toBeInTheDocument();
  });

  it('should render a "Skip" <button />', () => {
    render(<ColonyEditor {...props} />);
    expect(screen.queryByRole('button', { name: /skip/i })).toBeInTheDocument();
  });

  it('should render an <input /> for the cell count', () => {
    const {container} = render(<ColonyEditor {...props} />);
    expect(container.querySelector('input[name="cell-count"]'))
      .toBeInTheDocument()
      .toHaveValue(1234);
  });

  it('should not mark the <input /> as error if cellCountError is false', () => {
    const {container} = render(<ColonyEditor {...props} cellCountError={false} />);
    expect(container.querySelector('input[name="cell-count"]').parentElement)
      .not.toHaveClass('has-error');
  });

  it('should mark the <input /> as error if cellCountError is true', () => {
    const {container} = render(<ColonyEditor {...props} cellCountError={true} />);
    expect(container.querySelector('input[name="cell-count"]').parentElement)
      .toHaveClass('has-error');
  });

  it('should call the onCellCountChange callback when the input is changed', () => {
    const {container} = render(<ColonyEditor {...props} />);
    const input = container.querySelector('input[name="cell-count"]');
    fireEvent.change(input, { target: { value: '666' } });
    expect(onCellCountChange).toHaveBeenCalledWith(666);
  });

  it('should set `draw` to true when the "fix" button is clicked', () => {
    const {container} = render(<ColonyEditor {...props} />);
    const button = container.querySelector('button.btn-fix');
    expect(ColonyImage.mock.instances[0])
      .toHaveProperty('props.draw', false);
    fireEvent.click(button);
    expect(ColonyImage.mock.instances[0])
      .toHaveProperty('props.draw', true);
  });

  it('should call the onSet callback when the "Set" button is clicked', () => {
    const {container} = render(<ColonyEditor {...props} />);
    const button = container.querySelector('button.btn-set');
    expect(onSet).not.toHaveBeenCalled();
    fireEvent.click(button);
    expect(onSet).toHaveBeenCalledOnce();
  });

  it('should call the onSkip callback when the "Skip" button is clicked', () => {
    const {container} = render(<ColonyEditor {...props} />);
    const button = container.querySelector('button.btn-skip');
    expect(onSkip).not.toHaveBeenCalled();
    fireEvent.click(button);
    expect(onSkip).toHaveBeenCalledOnce();
  });

  describe('when the blob is updated', () => {
    const updatedData = { blob: [[false, false], [true, true]] };

    it('should set `draw` to false', () => {
      const {container} = render(<ColonyEditor {...props} />);
      const button = container.querySelector('button.btn-fix');
      const image = ColonyImage.mock.instances[0];
      expect(image).toHaveProperty('props.draw', false);
      fireEvent.click(button);
      expect(image).toHaveProperty('props.draw', true);
      // FIXME: We cant actually trigger the update event as canvas is not implemented in JSDOM
      image.props.onUpdate(updatedData);
      expect(image).toHaveProperty('props.draw', false);
    });

    // FIXME: This test does not make sense as we trigger the onUpdate directly above
    // it('should call the onUpdate callback', () => {
    //   expect(onUpdate).toHaveBeenCalledWith(updatedData);
    // });
  });
});
