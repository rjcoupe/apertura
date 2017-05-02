import React, { Component } from 'react';
import ImageThumbnail from './ImageThumbnail';
import '../style/front-page.css';

export default class FrontPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      images: [],
      displayedImage: 0
    };
    this.changeSlide = this.changeSlide.bind(this);
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

  componentDidMount() {
    setInterval(this.changeSlide, 15000);
  }

  changeSlide() {
    if (this.state.displayedImage = (this.state.images.length - 1)) {
      this.setState({ displayedImage: 0 });
    } else {
      let newImage = this.state.displayedImage + 1;
      this.setState({ displayedImage: newImage });
    }
    console.log('Changing to image', this.state.displayedImage);
  }

  render() {
    console.log(this.state.images);
    let slideShow = this.state.images.map((image, index) => {
      return (
        <div className={`slideshow-image-container ${index == this.state.displayedImage ? 'active' : ''}`}>
          <img src={image.fullSizeUrl}/>
        </div>
      );
    });
    return (
      <main className="front-page">
        <div className="slideshow">
          {slideShow}
        </div>
      </main>
    )
  }
}
