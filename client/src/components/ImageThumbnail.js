import React, { Component } from 'react';

export default class ImageThumbnail extends Component {
  render() {
    return (
      <div className="image-container">
        <img src={this.props.image.thumbnailUrl} alt={`${this.props.image.title || "No alternative text available"} &copy; Richard Coupe`} />
      </div>
    )
  }
}
