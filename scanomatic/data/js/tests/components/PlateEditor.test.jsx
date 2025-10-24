import React from 'react';

import cccMetadata from '../fixtures/cccMetadata';
import PlateEditor, { PlateStatusLabel } from '../../ccc/components/PlateEditor';
import PlateContainer from '../../ccc/containers/PlateContainer';
import PlateProgress from '../../ccc/components/PlateProgress';
import Gridding from '../../ccc/components/Gridding';
import ColonyEditorContainer from '../../ccc/containers/ColonyEditorContainer';

import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

import { ajaxMock } from '../helpers/AjaxMock';

import $ from 'jquery'
vi.stubGlobal('$', $);
vi.stubGlobal('jQuery', $);

vi.mock('../../ccc/components/Gridding');
vi.mock('../../ccc/containers/ColonyEditorContainer');
vi.mock('../../ccc/containers/PlateContainer');
vi.mock('../../ccc/components/PlateProgress', {spy: true});

describe('<PlateEditor />', () => {
  const props = {
    cccMetadata,
    imageId: '1M4G3',
    imageName: 'myimage.tiff',
    plateId: 1,
    onClickNext: vi.fn(),
    onColonyFinish: vi.fn(),
    rowOffset: 1,
    colOffset: 2,
    onRowOffsetChange: vi.fn(),
    onColOffsetChange: vi.fn(),
    onRegrid: vi.fn(),
    griddingError: 'XxX',
    griddingLoading: true,
    selectedColony: { row: 1, col: 2 },
    step: 'pre-processing',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render a bootstrap panel', () => {
    const {container} = render(<PlateEditor {...props} />);
    expect(container.querySelector('div.panel')).toBeInTheDocument();
  });

  it('should show the image title and plate number in the panel heading', () => {
    const {container} = render(<PlateEditor {...props} />);
    expect(container.querySelector('div.panel-heading')).toHaveTextContent('myimage.tiff, Plate 1');
  });

  describe('gridding', () => {
    new ajaxMock({url: '/api/calibration/*/image/*/plate/*/detect/colony/*/*', method: 'POST'});

    it('should render a <PlateContainer />', () => {
      render(<PlateEditor {...props} step="gridding" />);
      expect(PlateContainer).toHaveBeenCalled();
    });

    it('should render a <Gridding />', () => {
      render(<PlateEditor {...props} step="gridding" />);
      expect(Gridding).toHaveBeenCalled();
    });

    it('should render a <button /> "Next"', () => {
      const {container} = render(<PlateEditor {...props} step="gridding" />);
      expect(container.querySelector('button.btn-next')).toHaveTextContent('Next');
    });

    it('should disable the <button /> if griddingLoading is true', () => {
      const {container} = render(<PlateEditor {...props} step="gridding" griddingLoading griddingError={null} />);
      expect(container.querySelector('button.btn-next')).toBeDisabled();
    });

    it('should disable the <button /> if griddingError is not empty', () => {
      const {container} = render(<PlateEditor {...props} step="gridding" griddingLoading={false} griddingError="Error"/>);
      expect(container.querySelector('button.btn-next')).toBeDisabled();
    });

    it('should enable the <button /> if griddingLoading is false and griddingError is null', () => {
      const {container} = render(<PlateEditor {...props} step="gridding" griddingLoading={false} griddingError={null} />);
      expect(container.querySelector('button.btn-next')).toBeEnabled();
    });

    it('should pass onRowOffsetChange to <Gridding />', () => {
      render(<PlateEditor {...props} step="gridding" />);
      expect(Gridding.mock.instances[0]).toHaveProperty('props.onRowOffsetChange', props.onRowOffsetChange);
    });

    it('should pass onColOffsetChange to <Gridding />', () => {
      render(<PlateEditor {...props} step="gridding" />);
      expect(Gridding.mock.instances[0]).toHaveProperty('props.onColOffsetChange', props.onColOffsetChange);
    });

    it('should pass onRegrid to <Gridding />', () => {
      render(<PlateEditor {...props} step="gridding" />);
      expect(Gridding.mock.instances[0]).toHaveProperty('props.onRegrid', props.onRegrid);
    });

    it('should pass griddingError to <Gridding />', () => {
      render(<PlateEditor {...props} step="gridding" />);
      expect(Gridding.mock.instances[0]).toHaveProperty('props.error', 'XxX');
    });

    it('should pass griddingLoading to <Gridding />', () => {
      render(<PlateEditor {...props} step="gridding" />);
      expect(Gridding.mock.instances[0]).toHaveProperty('props.loading', true);
    });

    it('should set the title to "Gridding"', () => {
      render(<PlateEditor {...props} step="gridding" />);
      expect(screen.getByRole('heading', { name: /Step 2: Gridding/i })).toBeInTheDocument();
    });
  });

  describe('colony-detection', () => {
    it('should set the title to "Colony Detection"', () => {
      render(<PlateEditor {...props} step="colony-detection" />);
      expect(screen.getByRole('heading', { name: /Step 3: Colony Detection/i })).toBeInTheDocument();
    });

    it('should render a <ColonyEditorContainer />', () => {
      render(<PlateEditor {...props} step="colony-detection" />);
      expect(ColonyEditorContainer).toHaveBeenCalled();
    });

    it('should pass the current colony row/col to the <ColonyEditorContainer />', () => {
      render(<PlateEditor {...props} step="colony-detection" />);
      expect(ColonyEditorContainer.mock.instances[0]).toHaveProperty('props.row', 1);
      expect(ColonyEditorContainer.mock.instances[0]).toHaveProperty('props.col', 2);
    });

    it('should pass the current colony row/col to the <PlateContainer />', () => {
      render(<PlateEditor {...props} step="colony-detection" />);
      expect(PlateContainer.mock.instances[0]).toHaveProperty('props.selectedColony', props.selectedColony);
    });

    it('should call onColonyFinish when <ColonyEditorContainer /> finishes', () => {
      render(<PlateEditor {...props} step="colony-detection" />);
      ColonyEditorContainer.mock.instances[0].props.onFinish();
      expect(props.onColonyFinish).toHaveBeenCalled();
    });

    it('should render a <PlateProgress />', () => {
      render(<PlateEditor {...props} step="colony-detection" />);
      expect(PlateProgress).toHaveBeenCalled();
    });

    it('should pass the total number of colony to the <PlateProgress />', () => {
      render(<PlateEditor {...props} step="colony-detection" />);
      expect(PlateProgress).toHaveBeenCalledWith(expect.objectContaining({ max: 6 }), expect.anything());
    });

    it('should pass the position of the current colony to the <PlateProgress />', () => {
      render(<PlateEditor {...props} step="colony-detection" />);
      expect(PlateProgress).toHaveBeenCalledWith(expect.objectContaining({ now: 4 }), expect.anything());
    });
  });
});

describe('<PlateStatusLabel />', () => {
  describe('step=pre-processing', () => {
    it('should have class label-default', () => {
      const {container} = render(<PlateStatusLabel step="pre-processing" />);
      expect(container.firstChild).toHaveClass('label-default');
    });

    it('should have text Pre-processing...', () => {
      const {container} = render(<PlateStatusLabel step="pre-processing" />);
      expect(container).toHaveTextContent('Pre-processing...');
    });
  });

  describe('step=gridding, griddingError=null', () => {
    it('should have class label-default', () => {
      const {container} = render(<PlateStatusLabel step="gridding" />);
      expect(container.firstChild).toHaveClass('label-default');
    });

    it('should have text Gridding...', () => {
      const {container} = render(<PlateStatusLabel step="gridding" />);
      expect(container).toHaveTextContent('Gridding...');
    });
  });

  describe('step=gridding, griddingError!=null', () => {
    it('should have class label-danger', () => {
      const {container} = render(<PlateStatusLabel step="gridding" griddingError="xxx" />);
      expect(container.firstChild).toHaveClass('label-danger');
    });

    it('should have text Gridding error', () => {
      const {container} = render(<PlateStatusLabel step="gridding" griddingError="xxx" />);
      expect(container).toHaveTextContent('Gridding error');
    });
  });

  describe('step=colony-detection, now=42, total=96', () => {
    it('should have class label-primary', () => {
      const {container} = render(<PlateStatusLabel step="colony-detection" now={42} max={96} />);
      expect(container.firstChild).toHaveClass('label-primary');
    });

    it('should have text 42/96', () => {
      const {container} = render(<PlateStatusLabel step="colony-detection" now={42} max={96} />);
      expect(container).toHaveTextContent('42/96');
    });
  });

  describe('step=done', () => {
    it('should have class label-success', () => {
      const {container} = render(<PlateStatusLabel step="done" />);
      expect(container.firstChild).toHaveClass('label-success');
    });

    it('should have text Done!', () => {
      const {container} = render(<PlateStatusLabel step="done" />);
      expect(container).toHaveTextContent('Done!');
    });
  });
});
