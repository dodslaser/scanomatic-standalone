import React from 'react';

import CCCEditor from '../../ccc/components/CCCEditor';
import CCCInfoBox from '../../ccc/components/CCCInfoBox';
import PolynomialConstructionContainer from '../../ccc/containers/PolynomialConstructionContainer';
import ImageUploadContainer from '../../ccc/containers/ImageUploadContainer';
import PlateEditorContainer from '../../ccc/containers/PlateEditorContainer';

import cccMetadata from '../fixtures/cccMetadata';

import { render } from '@testing-library/react';
import { ajaxMock } from '../helpers/AjaxMock';

import $ from 'jquery'
vi.stubGlobal('$', $);
vi.stubGlobal('jQuery', $);

// Mock c3 as SVG does not work in JSDOM
vi.mock('c3', () => ({}));

vi.mock('../../ccc/components/CCCInfoBox', {spy: true});
vi.mock('../../ccc/containers/PolynomialConstructionContainer');
vi.mock('../../ccc/containers/ImageUploadContainer');
vi.mock('../../ccc/containers/PlateEditorContainer');


describe('<CCCEditor />', () => {
  const onFinalizeCCC = vi.fn();
  const onFinishPlate = vi.fn();
  const onFinishUpload = vi.fn();
  const props = {
    cccMetadata,
    plates: [
      { imageName: 'my-image.tiff', imageId: '1M4G3', plateId: 1 },
      { imageName: 'my-image.tiff', imageId: '1M4G3', plateId: 2 },
      { imageName: 'other-image.tiff', imageId: '1M4G32', plateId: 2 },
    ],
    currentPlate: 1,
    onFinalizeCCC,
    onFinishPlate,
    onFinishUpload,
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  new ajaxMock({url: '/api/calibration/*/image/*/plate/*/transform'});
  new ajaxMock({url: '/api/calibration/*/image/*/plate/*/grid/set'});

  it('should render a <CCCInfoBox />', () => {
    render(<CCCEditor {...props} />);
    expect(CCCInfoBox).toHaveBeenCalled();
  });

  it('should pass cccMetadata to <CCCInfoBox />', () => {
    render(<CCCEditor {...props} />);
    expect(CCCInfoBox).toHaveBeenCalledWith(
      expect.objectContaining({ cccMetadata: cccMetadata }), expect.anything()
    );
  });

  it('should render an <PolynomialConstructionContainer/>', () => {
    render(<CCCEditor {...props} />);
    expect(PolynomialConstructionContainer).toHaveBeenCalled();
  });

  it('should pass cccMetadata to <PolynomialConstructionContainer />', () => {
    render(<CCCEditor {...props} />);
    expect(PolynomialConstructionContainer).toHaveBeenCalledWith(
      expect.objectContaining({ cccMetadata: cccMetadata }), expect.anything()
    );
  });

  it('should pass onFinalizeCCC to <PolynomialConstructionContainer />', () => {
    render(<CCCEditor {...props} />);
    expect(PolynomialConstructionContainer).toHaveBeenCalledWith(
      expect.objectContaining({ onFinalizeCCC: onFinalizeCCC }), expect.anything()
    );
  });

  describe('when currentImage is null', () => {
    it('should render an <ImageUploadContainer />', () => {
      render(<CCCEditor {...props} />);
      expect(ImageUploadContainer).toHaveBeenCalled();
    });

    it('should pass cccMetadata to <ImageUploadContainer />', () => {
      render(<CCCEditor {...props} />);
      expect(ImageUploadContainer).toHaveBeenCalledWith(
        expect.objectContaining({ cccMetadata: cccMetadata }), expect.anything()
      );
    });

    it('should call onFinishUpload when <ImageUploadContainer /> calls onFinish', () => {
      render(<CCCEditor {...props} />);
      ImageUploadContainer.mock.instances[0].props.onFinish();
      expect(onFinishUpload).toHaveBeenCalled();
    });
  });

  it('should render a <PlateEditorContainer /> per plate', () => {
    render(<CCCEditor {...props} />);
    expect(PlateEditorContainer).toHaveBeenCalledTimes(3);
  });

  it('should pass cccMetadata to <PlateEditorContainer />', () => {
    render(<CCCEditor {...props} />);
    expect(PlateEditorContainer.mock.instances[0]).toHaveProperty('props.cccMetadata', cccMetadata);
  });

  it('should pass the plate imageId to <PlateEditorContainer />', () => {
    render(<CCCEditor {...props} />);
    expect(PlateEditorContainer.mock.instances[0]).toHaveProperty('props.imageId', props.plates[0].imageId);
  });

  it('should pass the plate imageName to <PlateEditorContainer />', () => {
    render(<CCCEditor {...props} />);
    expect(PlateEditorContainer.mock.instances[0]).toHaveProperty('props.imageName', props.plates[0].imageName);
  });

  it('should pass the plate plateId to <PlateEditorContainer />', () => {
    render(<CCCEditor {...props} />);
    expect(PlateEditorContainer.mock.instances[0]).toHaveProperty('props.plateId', props.plates[0].plateId);
  });

  it('should pass collapse=false to <PlateEditorContainer /> for current plate', () => {
    render(<CCCEditor {...props} />);
    expect(PlateEditorContainer.mock.instances[1]).toHaveProperty('props.collapse', false);
  });

  it('should pass collapse=true to <PlateEditorContainer /> otherwise', () => {
    render(<CCCEditor {...props} />);
    expect(PlateEditorContainer.mock.instances[0]).toHaveProperty('props.collapse', true);
    expect(PlateEditorContainer.mock.instances[2]).toHaveProperty('props.collapse', true);
  });

  it('should call onFinishPlate when <PlateEditorContainer /> calls onFinish', () => {
    render (<CCCEditor {...props} />);
    PlateEditorContainer.mock.instances[1].props.onFinish();
    expect(onFinishPlate).toHaveBeenCalled();
  });
});
