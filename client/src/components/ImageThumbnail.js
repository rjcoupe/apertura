import React, { Component } from 'react';

export default class ImageThumbnail extends Component {
  render() {
    return (
      <div className="image-container">
        <img src={this.props.image.url + '?' + Math.random()*1000} alt="Some shit" />
      </div>
    )
  }
}
