import React from 'react';
import { render } from '@testing-library/react'

import ColonyFeatures from '../../ccc/components/ColonyFeatures';
import data from '../fixtures/colonyData';

describe('<ColonyFeatures />', () => {
  it('should render a <canvas />', () => {
    render(<ColonyFeatures data={data} />);
    expect(document.querySelectorAll('canvas')).toHaveLength(1);
  });
});
