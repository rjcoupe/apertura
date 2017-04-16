import React, { Component } from 'react';
import ImageThumbnail from './ImageThumbnail';
import '../style/front-page.css';

export default class FrontPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      images: []
    };
  }

  componentWillMount() {
    fetch('/api/images/frontpage')
      .then((response) => {
        return response.json();
      })
      .then((json) => {
        this.setState({ images: json.imageData });
      });
  }

  render() {
    return (
      <main>
        <div className="masonry">
        {this.state.images.map((image) => {
          return <ImageThumbnail image={image} key={Math.random()}/>
        })}
        </div>
      </main>
    )
  }
}
