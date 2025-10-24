import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

import ImageUpload from '../../ccc/components/ImageUpload';

describe('<ImageUpload />', () => {
  const onImageChange = vi.fn();
  const props = { onImageChange };

  it('should render a file <input />', () => {
    const {container} = render(<ImageUpload {...props} />);
    const input = container.querySelector('input[type="file"]');
    expect(input).toBeInTheDocument();
  });

  it('should call onFileChange when a file is selected', () => {
    const file = 'my-image.tiff';
    const {container} = render(<ImageUpload {...props} />);
    const input = container.querySelector('input[type="file"]');
    fireEvent.change(input, { target: { files: [file] } });
    expect(onImageChange).toHaveBeenCalledWith(file);
  });

  const progress = { now: 1, max: 2, text: 'Making progress' };

  it('should hide the file input if progress is not null', () => {
    const {container} = render(<ImageUpload {...props} progress={progress} />);
    const input = container.querySelector('input[type="file"]');
    expect(input).not.toBeInTheDocument();
  });

  it('should show the progress text', () => {
    render(<ImageUpload {...props} progress={progress} />);
    const progressText = screen.getByText(/Making progress/);
    expect(progressText).toBeInTheDocument();
  });

  it('should show a progress bar if progress is not null', () => {
    const {container} = render(<ImageUpload {...props} progress={progress} />);
    const progressBar = container.querySelector('.progress-bar');
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveStyle({ width: '50%' });
  });
});
