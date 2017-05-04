import React, { Component } from 'react';

import StagedImageContainer from './StagedImageContainer';


export default class StagedImages extends Component {
  constructor(props) {
    super(props);
    this.state = {
      images: []
    };
  }

  componentWillMount() {
    fetch('/api/images/staged', { credentials: 'same-origin' })
      .then((response) => {
        return response.json();
      })
      .then((json) => {
        this.setState({ images: json.imageData });
      });
  }

  render() {
    return (
      <main className="image-stage">
        {this.state.images.map((image) => {
          return (
            <StagedImageContainer image={image} />
          )
        })}
      </main>
    );
  }
}
