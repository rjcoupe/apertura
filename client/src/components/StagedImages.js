import React, { Component } from 'react';


export default class StagedImages extends Component {
  constructor(props) {
    super(props);
    this.state = {
      images: []
    };
    this.handleFieldChange = this.handleFieldChange.bind(this);
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

  handleFieldChange(event) {
    console.log(event.target);
  }

  render() {
    const formFields = [
      { label: 'Visible to all', type: 'checkbox' }
    ];
    return (
      <main className="image-stage">
        {this.state.images.map((image) => {
          return (
            <div className="staged-image-container">
              <img src={image.thumbnailUrl} />
              <strong>{image.title}</strong>
              <table>
                {formFields.map((field) => {
                  let fieldHtml;
                  switch(field.type) {
                    case 'text':
                    case 'checkbox':
                    case 'radio':
                    fieldHtml = <input type={field.type} name={field.name} onChange={this.handleFieldChange} />;
                    break;
                  }
                  return (
                    <tr>
                      <td>{field.label}</td>
                      <td>{fieldHtml}</td>
                    </tr>
                  )
                })}
              </table>
            </div>
          )
        })}
      </main>
    );
  }
}
