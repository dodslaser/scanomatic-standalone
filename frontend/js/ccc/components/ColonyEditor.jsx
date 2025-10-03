import PropTypes from 'prop-types';
import React from 'react';

import ColonyFeatures from './ColonyFeatures';
import ColonyImage from './ColonyImage';
import CCCPropTypes from '../prop-types';

export default class ColonyEditor extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      drawing: false,
      data: props.data,
    };
    this.handleClickFix = this.handleClickFix.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleUpdate = this.handleUpdate.bind(this);
  }

  // eslint-disable-next-line camelcase
  UNSAFE_componentWillReceiveProps(props) {
    this.setState({
      drawing: false,
      data: props.data,
    });
  }

  handleClickFix() {
    this.setState({ drawing: true });
  }

  handleUpdate(data) {
    this.setState({ drawing: false });
    const { onUpdate } = this.props;
    if (onUpdate != null) onUpdate(data);
  }

  handleInputChange(event) {
    if (this.props.onCellCountChange) {
      this.props.onCellCountChange(parseInt(event.target.value, 10));
    }
  }

  render() {
    const cellCountValue = this.props.cellCount == null ? '' : this.props.cellCount;
    const cellCountFormGroupClass = `form-group${this.props.cellCountError ? ' has-error' : ''}`;
    return (
      <div>
        <div><span>Colony Image</span></div>
        <ColonyImage
          data={this.state.data}
          draw={this.state.drawing}
          onUpdate={this.handleUpdate}
        />
        <div><br /></div>
        <div><span>Colony MetaData</span></div>
        <ColonyFeatures data={this.state.data} />
        <div className={cellCountFormGroupClass}>
          <label className="control-label" htmlFor="cell-count">Cell Count</label>
          <input
            className="form-control"
            type="number"
            name="cell-count"
            value={cellCountValue}
            onChange={this.handleInputChange}
          />
        </div>
        <div className="text-center">
          <div className="btn-group">
            <button
              type="button"
              className="btn btn-default btn-fix"
              onClick={this.handleClickFix}
            >
              Fix
            </button>
            <button
              type="button"
              className="btn btn-default btn-skip"
              onClick={this.props.onSkip}
            >
              Skip
            </button>
            <button
              type="button"
              className="btn btn-primary btn-set"
              onClick={this.props.onSet}
            >
              Set
            </button>
          </div>
        </div>
      </div>
    );
  }
}

ColonyEditor.propTypes = {
  data: CCCPropTypes.colonyDataShape.isRequired,
  cellCount: PropTypes.number,
  cellCountError: PropTypes.bool,
  onCellCountChange: PropTypes.func,
  onSet: PropTypes.func,
  onSkip: PropTypes.func,
  onUpdate: PropTypes.func,
};

ColonyEditor.defaultProps = {
  cellCount: undefined,
  cellCountError: undefined,
  onCellCountChange: undefined,
  onSet: undefined,
  onSkip: undefined,
  onUpdate: undefined,
};
