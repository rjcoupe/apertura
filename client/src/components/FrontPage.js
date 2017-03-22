import React, { Component } from 'react';
import ImageThumbnail from './ImageThumbnail';
import '../style/front-page.css';

export default class FrontPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      images: [
        { url: 'http://lorempixel.com/1280/800/' },
        { url: 'http://lorempixel.com/1280/800/' },
        { url: 'http://lorempixel.com/1280/800/' },
        { url: 'http://lorempixel.com/1280/800/' },
        { url: 'http://lorempixel.com/1280/800/' },
        { url: 'http://lorempixel.com/1280/800/' },
        { url: 'http://lorempixel.com/1280/800/' },
        { url: 'http://lorempixel.com/1280/800/' },
        { url: 'http://lorempixel.com/1280/800/' },
        { url: 'http://lorempixel.com/1280/800/' },
        { url: 'http://lorempixel.com/1280/800/' },
        { url: 'http://lorempixel.com/1280/800/' },
        { url: 'http://lorempixel.com/1280/800/' },
        { url: 'http://lorempixel.com/1280/800/' },
        { url: 'http://lorempixel.com/1280/800/' },
        { url: 'http://lorempixel.com/1280/800/' },
        { url: 'http://lorempixel.com/1280/800/' },
        { url: 'http://lorempixel.com/1280/800/' },
        { url: 'http://lorempixel.com/1280/800/' },
        { url: 'http://lorempixel.com/1280/800/' }
      ]
    };
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
