import React, { Component } from 'react';

export default class ImageThumbnail extends Component {
  render() {
    return (
      <div className="image-container">
        <img src={this.props.image.thumbnailUrl} alt="Some shit" />
      </div>
    )
  }
}
