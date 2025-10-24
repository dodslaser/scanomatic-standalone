import { beforeEach, expect, vi } from 'vitest';
import * as API from '../ccc/api';

import { ajaxMock, mostRecentRequest } from './helpers/AjaxMock';

import $ from 'jquery';
global.$ = $
global.jQuery = $


describe('API', () => {
  const onSuccess = vi.fn();
  const onError = vi.fn();
  let ajax = null;

  afterEach(() => {
    onSuccess.mockClear();
    onError.mockClear();
    $.mockjax.clear();
  });

  it('should have jquery', () => {
    expect(API.HasJquery()).toBe(true);
  });

  describe('SetGridding', () => {
    const cccId = 'CCC42';
    const imageId = '1M4G3';
    const plate = 0;
    const pinningFormat = [42, 18];
    const offset = [6, 7];
    const accessToken = 'open for me';
    const args = [cccId, imageId, plate, pinningFormat, offset, accessToken];

    beforeEach(() => {
      ajax = new ajaxMock({
        url: '/api/calibration/*/image/*/plate/*/grid/set',
        method: 'POST',
      });
    });

    it('should query the correct url', () => {
      API.SetGridding(...args);
      expect(mostRecentRequest().url)
        .toBe('/api/calibration/CCC42/image/1M4G3/plate/0/grid/set');
    });

    it('should send a POST request', () => {
      API.SetGridding(...args);
      expect(mostRecentRequest()).toHaveMethod('POST');
    });

    it('should send the pinning format', () => {
      API.SetGridding(...args);
      const params = JSON.parse(mostRecentRequest().data);
      expect(params.pinning_format).toEqual(pinningFormat);
    });

    it('should send the offset', () => {
      API.SetGridding(...args);
      const params = JSON.parse(mostRecentRequest().data);
      expect(params.gridding_correction).toEqual(offset);
    });

    it('should send the access token', () => {
      API.SetGridding(...args);
      const params = JSON.parse(mostRecentRequest().data);
      expect(params.access_token).toEqual(accessToken);
    });

    it('Should return a promise that resolves on success', async () => {
      await API.SetGridding(...args).then((value) => {
        expect(value).toEqual({ status: 200 })
      });
    });

    it('should return a promise that rejects on error', async () => {
      ajax.update({ status: 400 });
      await API.SetGridding(...args).catch((reason) => {
        expect(reason).toEqual({ status: 400 });
      });
    });
  });

  describe('SetColonyCompression', () => {
    const cccId = 'CCC42';
    const imageId = '1M4G3';
    const plate = 'PL4T3';
    const accessToken = 'T0P53CR3T';
    const colony = {
      blob: [[true, false], [false, true]],
      background: [[false, true], [true, false]],
    };
    const cellCount = 666;
    const row = 4;
    const col = 1;
    const args = [cccId, imageId, plate, accessToken, colony, cellCount, row, col, onSuccess, onError];

    beforeEach(() => {
      ajax = new ajaxMock({
        url: '/api/calibration/*/image/*/plate/*/compress/colony/*/*',
        method: 'POST',
      });
    });

    it('should query the correct url', async () => {
      await API.SetColonyCompression(...args);
      expect(mostRecentRequest().url)
        .toBe('/api/calibration/CCC42/image/1M4G3/plate/PL4T3/compress/colony/1/4');
    });

    it('should send the cell count', async () => {
      await API.SetColonyCompression(...args);
      const params = JSON.parse(mostRecentRequest().data);
      expect(params.cell_count).toEqual(cellCount);
    });

    it('should call onSuccess on success', async () => {
      await API.SetColonyCompression(...args);
      expect(onSuccess).toHaveBeenCalledWith({ status: 200 });
    });

    it('should call onError on error', async () => {
      ajax.update({ status: 400 });
      await API.SetColonyCompression(...args).catch((reason) => {
        expect(reason.status).toEqual(400);
      });
      expect(onError).toHaveBeenCalledWith({ status: 400 });
    });
  });

  describe('SetColonyDetection', () => {
    const cccId = 'CCC42';
    const imageId = '1M4G3';
    const plate = 'PL4T3';
    const accessToken = 'T0P53CR3T';
    const row = 4;
    const col = 1;
    const args = [cccId, imageId, plate, accessToken, row, col, onSuccess, onError];

    beforeEach(() => {
      ajax = new ajaxMock({
        url: '/api/calibration/*/image/*/plate/*/detect/colony/*/*',
        method: 'POST',
      });
    });

    it('should query the correct url', async() => {
      await API.SetColonyDetection(...args);
      expect(mostRecentRequest().url)
        .toBe('/api/calibration/CCC42/image/1M4G3/plate/PL4T3/detect/colony/1/4');
    });

    it('should call onSuccess on success', async () => {
      await API.SetColonyDetection(...args);
      expect(onSuccess).toHaveBeenCalledWith({ status: 200});
    });

    it('should call onError on error', async () => {
      ajax.update({ status: 400 });
      await API.SetColonyDetection(...args).catch((reason) => {
        expect(reason.status).toEqual(400);
      });
      expect(onError).toHaveBeenCalledWith({ status: 400 });
    });
  });

  describe('GetMarkers', () => {
    const fixtureName = 'MyFixture123';
    const image = new File(['foo'], 'myimage.tiff');
    const args = [fixtureName, image];

    beforeEach(() => {
      ajax = new ajaxMock({
        url: '/api/data/markers/detect/*',
        method: 'POST',
      });
    });

    it('should query the correct url', async () => {
      await API.GetMarkers(...args);
      expect(mostRecentRequest().url).toBe('/api/data/markers/detect/MyFixture123');
    });

    it('should send a POST request', async () => {
      await API.GetMarkers(...args);
      expect(mostRecentRequest().method).toEqual('POST');
    });

    it('should send the file', async () => {
      await API.GetMarkers(...args);
      expect(mostRecentRequest().data.get('image')).toEqual(image);
    });

    it('should set "save" to false', async () => {
      await API.GetMarkers(...args);
      expect(mostRecentRequest().data.get('save')).toEqual('false');
    });

    it('should return a promise that resolve on success', async () => {
      await API.GetMarkers(...args).then((value) => {
        expect(value).toEqual({ status: 200 });
      });
    });

    it('should return a promise that rejects on error', async () => {
      ajax.update({ status: 400, responseText: { reason: "MOCK FAILURE" } });
      await API.GetMarkers(...args).catch((reason) => {
        expect(reason).toEqual("MOCK FAILURE");
      });
    });
  });

  describe('GetImageid', () => {
    const cccId = 'CCC0';
    const image = new File(['foo'], 'myimage.tiff');
    const accessToken = 'T0K3N';
    const args = [cccId, image, accessToken];

    beforeEach(() => {
      ajax = new ajaxMock({
        url: '/api/calibration/*/add_image',
        method: 'POST',
      });
    });

    it('should query the correct url', async () => {
      await API.GetImageId(...args);
      expect(mostRecentRequest().url)
        .toEqual('/api/calibration/CCC0/add_image');
    });

    it('should send a POST request', async () => {
      await API.GetImageId(...args);
      expect(mostRecentRequest().method).toEqual('POST');
    });

    it('should send the image', async () => {
      await API.GetImageId(...args);
      expect(mostRecentRequest().data.get('image')).toEqual(image);
    });

    it('should send the access token', async () => {
      await API.GetImageId(...args);
      expect(mostRecentRequest().data.get('access_token')).toEqual('T0K3N');
    });

    it('should return a promise that resolves on success', async () => {
      await API.GetImageId(...args).then((value) => {
        expect(value).toEqual({ status: 200 });
      });
    });

    it('should return a promise that rejects on error', async () => {
      ajax.update({ status: 400, responseText: { reason: 'MOCK FAILURE' } });
      await API.GetImageId(...args).catch((reason) => {
        expect(reason).toEqual('MOCK FAILURE');
      });
    });
  });

  describe('SetCccImageData', () => {
    const cccId = 'CCC0';
    const imageId = 'IMG0';
    const accessToken = 'T0K3N';
    const dataArray = [
      { key: 'key1', value: 'value1' },
      { key: 'key2', value: 'value2' },
    ];
    const fixture = 'MyFixture';
    const args = [cccId, imageId, accessToken, dataArray, fixture];

    beforeEach(() => {
      ajax = new ajaxMock({
        url: '/api/calibration/*/image/*/data/set',
        method: 'POST',
      });
    });

    it('should query the correct url', async () => {
      await API.SetCccImageData(...args);
      expect(mostRecentRequest().url)
        .toEqual('/api/calibration/CCC0/image/IMG0/data/set');
    });

    it('should send a POST request', async () => {
      await API.SetCccImageData(...args);
      expect(mostRecentRequest().method).toEqual('POST');
    });

    it('should send the access token', async () => {
      await API.SetCccImageData(...args);
      expect(mostRecentRequest().data.get('access_token'))
        .toEqual('T0K3N');
    });

    it('should send the ccc id', async () => {
      await API.SetCccImageData(...args);
      expect(mostRecentRequest().data.get('ccc_identifier'))
        .toEqual('CCC0');
    });

    it('should send the image id', async () => {
      await API.SetCccImageData(...args);
      expect(mostRecentRequest().data.get('image_identifier'))
        .toEqual('IMG0');
    });

    it('should send the fixture name', async () => {
      await API.SetCccImageData(...args);
      expect(mostRecentRequest().data.get('fixture'))
        .toEqual('MyFixture');
    });

    it('should send the passed in data', async () => {
      await API.SetCccImageData(...args);
      expect(mostRecentRequest().data.get('key1'))
        .toEqual('value1');
      expect(mostRecentRequest().data.get('key2'))
        .toEqual('value2');
    });

    it('should return a promise that resolves on success', async () => {
      await API.SetCccImageData(...args).then((value) => {
        expect(value).toEqual({ status: 200 });
      });
    });

    it('should return a promise that rejects on error', async () => {
      ajax.update({ status: 400, responseText: { reason: 'MOCK FAILURE' } });
      await API.SetCccImageData(...args).catch((reason) => {
        expect(reason).toEqual('MOCK FAILURE');
      });
    });
  });

  describe('SetCccImageSlice', () => {
    const cccId = 'CCC0';
    const imageId = 'IMG0';
    const accessToken = 'T0K3N';

    const args = [cccId, imageId, accessToken];

    beforeEach(() => {
      ajax = new ajaxMock({
        url: '/api/calibration/*/image/*/slice/set',
        method: 'POST',
      });
    });

    it('should query the correct url', async () => {
      await API.SetCccImageSlice(...args);
      expect(mostRecentRequest().url)
        .toEqual('/api/calibration/CCC0/image/IMG0/slice/set');
    });

    it('should send a POST request', async () => {
      await API.SetCccImageSlice(...args);
      expect(mostRecentRequest()).toHaveMethod('POST');
    });

    it('should send the access token', async () => {
      await API.SetCccImageSlice(...args);
      expect(mostRecentRequest().data.get('access_token'))
        .toEqual('T0K3N');
    });

    it('should return a promise that resolves on success', async () => {
      await API.SetCccImageSlice(...args).then((value) => {
        expect(value).toEqual({ status: 200 });
      });
    });

    it('should return a promise that rejects on error', async () => {
      ajax.update({ status: 400, responseText: { reason: 'MOCK FAILURE' } });
      await API.SetCccImageSlice(...args).catch((reason) => {
        expect(reason).toEqual('MOCK FAILURE');
      });
    });
  });

  describe('SetGrayScaleImageAnalysis', () => {
    const cccId = 'CCC0';
    const imageId = 'IMG0';
    const accessToken = 'T0K3N';
    const args = [cccId, imageId, accessToken];

    beforeEach(() => {
      ajax = new ajaxMock({
        url: '/api/calibration/*/image/*/grayscale/analyse',
        method: 'POST',
      });
    });

    it('should query the correct URL', async () => {
      await API.SetGrayScaleImageAnalysis(...args);
      expect(mostRecentRequest().url)
        .toEqual('/api/calibration/CCC0/image/IMG0/grayscale/analyse');
    });

    it('should send a POST request', async () => {
      await API.SetGrayScaleImageAnalysis(...args);
      expect(mostRecentRequest().method)
        .toEqual('POST');
    });

    it('should send the access token', async () => {
      await API.SetGrayScaleImageAnalysis(...args);
      expect(mostRecentRequest().data.get('access_token'))
        .toEqual('T0K3N');
    });

    it('should return a promise that resolves on success', async () => {
      await API.SetGrayScaleImageAnalysis(...args).then((value) => {
        expect(value).toEqual({ status: 200 });
      });
    });

    it('should return a promise that rejects on error', async () => {
      ajax.update({ status: 400, responseText: { reason: 'MOCK FAILURE' } });
      await API.SetGrayScaleImageAnalysis(...args).catch((reason) => {
        expect(reason).toEqual('MOCK FAILURE');
      });
    });
  });

  describe('SetGrayScaleTransform', () => {
    const cccId = 'CCC0';
    const imageId = 'IMG0';
    const accessToken = 'T0K3N';
    const plate = 1;
    const args = [cccId, imageId, plate, accessToken];

    beforeEach(() => {
      ajax = new ajaxMock({
        url: '/api/calibration/*/image/*/plate/*/transform',
        method: 'POST',
      });
    });

    it('should query the correct URL', async () => {
      await API.SetGrayScaleTransform(...args);
      expect(mostRecentRequest().url)
        .toEqual('/api/calibration/CCC0/image/IMG0/plate/1/transform');
    });

    it('should send a POST request', async () => {
      await API.SetGrayScaleTransform(...args);
      expect(mostRecentRequest().method)
        .toEqual('POST');
    });

    it('should send the access_token', async () => {
      await API.SetGrayScaleTransform(...args);
      expect(mostRecentRequest().data.get('access_token'))
        .toEqual('T0K3N');
    });

    it('should return a promise that resolves on success', async () => {
      await API.SetGrayScaleTransform(...args).then((value) => {
        expect(value).toEqual({ status: 200 });
      });
    });

    it('should return a promise that rejects on error', async () => {
      ajax.update({ status: 400, responseText: { reason: 'MOCK FAILURE' } });
      await API.SetGrayScaleTransform(...args).catch((reason) => {
        expect(reason).toEqual('MOCK FAILURE');
      });
    });
  });

  describe('GetFixturePlates', () => {
    const fixtureName = 'MyFixture';
    const args = [fixtureName];

    beforeEach(() => {
      ajax = new ajaxMock({
        url: '/api/data/fixture/get/*',
        method: 'GET',
      });
    });

    it('should query the correct URL', async () => {
      await API.GetFixturePlates(...args);
      expect(mostRecentRequest().url)
        .toEqual('/api/data/fixture/get/MyFixture');
    });

    it('should send a GET request', async () => {
      await API.GetFixturePlates(...args);
      expect(mostRecentRequest()).toHaveMethod('get');
    });

    it('should return a promise that resolves on success', async () => {
      ajax.update({ status: 200, responseText: { plates: ["a", "b", "c"] } });
      await API.GetFixturePlates(...args).then((value) => {
        expect(value).toEqual(["a", "b", "c"]);
      });
    });

    it('should return a promise that rejects on error', async () => {
      ajax.update({ status: 400, responseText: { reason: 'MOCK FAILURE' } });
      await API.GetFixturePlates(...args).catch((reason) => {
        expect(reason).toEqual('MOCK FAILURE');
      });
    });
  });

  describe('SetNewCalibrationPolynomial', () => {
    const cccId = 'CCC0';
    const power = 5;
    const accessToken = 'T0K3N';

    const args = [cccId, power, accessToken];

    beforeEach(() => {
      ajax = new ajaxMock({
        url: '/api/calibration/*/construct/*',
        method: 'POST',
      });
    });

    it('should query the correct URL', async () => {
      await API.SetNewCalibrationPolynomial(...args);
      expect(mostRecentRequest().url)
        .toEqual('/api/calibration/CCC0/construct/5');
    });

    it('should send a POST request', async () => {
      await API.SetNewCalibrationPolynomial(...args);
      expect(mostRecentRequest().method)
        .toEqual('POST');
    });

    it('should send the access_token', async () => {
      await API.SetNewCalibrationPolynomial(...args);
      expect(JSON.parse(mostRecentRequest().data).access_token)
        .toEqual('T0K3N');
    });

    it('should return a promise that resolves on success', async () => {
      await API.SetNewCalibrationPolynomial(...args).then((value) => {
        expect(value).toEqual({ status: 200 });
      });
    });

    it('should return a promise that rejects on error', async () => {
      ajax.update({ status: 400, responseText: { reason: 'MOCK FAILURE' } });
      await API.SetNewCalibrationPolynomial(...args).catch((reason) => {
        expect(reason).toEqual('MOCK FAILURE');
      });
    });
  });

  describe('GetFixture', () => {
    const args = [];

    beforeEach(() => {
      ajax = new ajaxMock({
        url: '/api/data/fixture/names',
        method: 'GET',
      });
    });

    it('should query the correct URL', async () => {
      await API.GetFixtures(...args);
      expect(mostRecentRequest().url)
        .toEqual('/api/data/fixture/names');
    });

    it('should send a GET request', async () => {
      await API.GetFixtures(...args);
      expect(mostRecentRequest()).toHaveMethod('get');
    });

    it('should return a promise that resolves on success', async () => {
      ajax.update({ status: 200, responseText: { fixtures: ["a", "b", "c"] } });
      await API.GetFixtures(...args).then((value) => {
        expect(value).toEqual(["a", "b", "c"]);
      });
    });

    it('should return a promise that rejects on error', async () => {
      ajax.update({ status: 400, responseText: { reason: 'MOCK FAILURE' } });
      await API.GetFixtures(...args).catch((reason) => {
        expect(reason).toEqual('MOCK FAILURE');
      });
    });
  });

  describe('GetPinningFormats', () => {
    const args = [];
    const apiData = {
      pinning_formats: [
        { name: '1x1', value: [1, 1] },
        { name: '2x4', value: [2, 4] },
      ],
    };
    const pinningFormats = [
      { name: '1x1', nCols: 1, nRows: 1 },
      { name: '2x4', nCols: 2, nRows: 4 },
    ];

    beforeEach(() => {
      ajax = new ajaxMock({
        url: '/api/analysis/pinning/formats',
        method: 'GET',
        responseText: apiData,
      });
    });

    it('should query the correct URL', async () => {
      await API.GetPinningFormats(...args);
      expect(mostRecentRequest().url)
        .toEqual('/api/analysis/pinning/formats');
    });

    it('should send a GET request', async () => {
      API.GetPinningFormats(...args);
      expect(mostRecentRequest()).toHaveMethod('get');
    });

    it('should return a promise that resolves on success', async () => {
      await API.GetPinningFormats(...args).then((value) => {
        expect(value).toEqual(pinningFormats);
      });
    });

    it('should return a promise that rejects on error', async () => {
      ajax.update({ status: 400, responseText: { reason: 'MOCK FAILURE' } });
      await API.GetPinningFormats(...args).catch((reason) => {
        expect(reason).toEqual('MOCK FAILURE');
      });
    });
  });

  describe('InitiateCCC', () => {
    const species = 'S. Kombuchae';
    const reference = 'Professor X';
    const args = [species, reference];

    beforeEach(() => {
      ajax = new ajaxMock({
        url: '/api/calibration/initiate_new',
        method: 'GET',
      });
    });

    it('should query the correct URL', async() => {
      await API.InitiateCCC(...args);
      expect(mostRecentRequest().url)
        .toEqual('/api/calibration/initiate_new');
    });

    it('should send a POST request', async () => {
      await API.InitiateCCC(...args);
      expect(mostRecentRequest()).toHaveMethod('post');
    });

    it('should send the species', async () => {
      await API.InitiateCCC(...args);
      expect(mostRecentRequest().data.get('species')).toEqual(species);
    });

    it('should send the reference', async () => {
      await API.InitiateCCC(...args);
      expect(mostRecentRequest().data.get('reference')).toEqual(reference);
    });

    it('should return a promise that resolves on success', async () => {
      await API.InitiateCCC(...args).then((value) => {
        expect(value).toEqual({ status: 200 });
      });
    });

    it('should return a promise that rejects on error', async () => {
      ajax.update({ status: 400, responseText: { reason: 'MOCK FAILURE' } });
      await API.InitiateCCC(...args).catch((reason) => {
        expect(reason).toEqual('MOCK FAILURE');
      });
    });
  });

  describe('finalizeCalibration', () => {
    const cccId = 'CCC0';
    const accessToken = 'T0K3N';

    const args = [cccId, accessToken];

    beforeEach(() => {
      ajax = new ajaxMock({
        url: '/api/calibration/*/finalize',
        method: 'POST',
      });
    });

    it('should query the correct URL', async () => {
      await API.finalizeCalibration(...args);
      expect(mostRecentRequest().url)
        .toEqual('/api/calibration/CCC0/finalize');
    });

    it('should send a POST request', async () => {
      await API.finalizeCalibration(...args);
      expect(mostRecentRequest().method).toEqual('POST');
    });

    it('should send the access_token', async () => {
      await API.finalizeCalibration(...args);
        expect(JSON.parse(mostRecentRequest().data).access_token)
        .toEqual('T0K3N');
    });

    it('should return a promise that resolves on success', async () => {
      await API.finalizeCalibration(...args).then((value) => {
        expect(value).toEqual({ status: 200 });
      });
    });

    it('should return a promise that rejects on error', async () => {
      ajax.update({ status: 400, responseText: { reason: 'MOCK FAILURE' } });
      await API.finalizeCalibration(...args).catch((reason) => {
        expect(reason).toEqual('MOCK FAILURE');
      });
    });
  });
});
