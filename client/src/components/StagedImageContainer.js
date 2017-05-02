import React, { Component } from 'react';


export default class StagedImageContainer extends Component {
  constructor(props) {
    super(props);
    this.state = {
      public: false,
      frontPage: false,
      id: this.props.image._id,
      status: 'staged'
    };
    this.handleFieldChange = this.handleFieldChange.bind(this);
    this.publishImage = this.publishImage.bind(this);
  }

  handleFieldChange(event) {
    if (event.target.type === 'checkbox') {
      this.setState({ [event.target.name]: event.target.checked })
    } else {
      this.setState({ [event.target.name]: event.target.value });
    }
  }

  publishImage() {
    let update = this.state;
    update.status = 'published';
    fetch('/api/image/update', {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      credentials: 'same-origin',
      method: 'PUT',
      body: JSON.stringify(update)
    })
    .then((response) => {
      console.log(response.status);
    });
  }

  render() {
    const formFields = [
      { label: 'Public', type: 'checkbox', name: 'public' },
      { label: 'Front Page', type: 'checkbox', name: 'frontPage' }
    ];
    return (
      <div className="staged-image-container" data-image-id={this.props.image._id}>
          <img src={this.props.image.thumbnailUrl} />
          <strong>{this.props.image.title}</strong>
          <table>
            {formFields.map((field) => {
              let fieldHtml;
              switch(field.type) {
                case 'text':
                case 'checkbox':
                case 'radio':
                fieldHtml = <input type={field.type} name={field.name} onChange={this.handleFieldChange} value={this.state[field.name]} />;
                break;
              }
              return (
                <tr>
                  <td>{field.label}</td>
                  <td>{fieldHtml}</td>
                </tr>
              )
            })}
          <tr>
            <td colspan="2">
              <button onClick={this.publishImage}>Publish</button>
            </td>
          </tr>
        </table>
      </div>
    )
  }
}
