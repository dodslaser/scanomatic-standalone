import PropTypes from 'prop-types';
import React from 'react';

import Plate from '../components/Plate';
import { GetSliceImageURL } from '../api';
import { loadImage } from '../helpers';
import CCCPropTypes from '../prop-types';

export default class PlateContainer extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  componentDidMount() {
    const { cccId, imageId, plateId } = this.props;
    loadImage(GetSliceImageURL(cccId, imageId, plateId)).then((image) => {
      this.setState({ image });
    });
  }

  render() {
    if (!this.state.image) {
      return null;
    }
    return (
      <Plate
        image={this.state.image}
        grid={this.props.grid}
        selectedColony={this.props.selectedColony}
      />
    );
  }
}

PlateContainer.propTypes = {
  cccId: PropTypes.string.isRequired,
  imageId: PropTypes.string.isRequired,
  plateId: PropTypes.number.isRequired,
  grid: CCCPropTypes.gridShape,
  selectedColony: CCCPropTypes.selectedColonyShape,
};

PlateContainer.defaultProps = {
  grid: undefined,
  selectedColony: undefined,
};
