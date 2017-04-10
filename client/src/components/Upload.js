import React, { Component } from 'react';

export default class Upload extends Component {
  render() {
    return (
      <form method="post" action="/api/image/upload" encType="multipart/form-data" multiple>
        <input type="file" name="image" />
        <input type="submit" />
      </form>
    );
  }
}
