const mongoose = require('mongoose');
const ImageModel = mongoose.model('images');

function ImageController(app) {
  this.app = app;
}

ImageController.prototype.route = function() {
  this.app.get('/api/image/:id', this.getImageById.bind(this), this.renderData.bind(this));
};

ImageController.prototype.getImageById = function(request, response, next) {
  ImageModel.findOne({ id: request.params.id }, (error, image) => {
    if (error) {
      return response.status(500).send({ error: error });
    }
    if (!image) {
      return response.sendStatus(404);
    }
    request.imageData = image;
    return next();
  });
};

ImageController.prototype.renderData = function(request, response) {
  return response.status(200).send({ image: request.imageData });
};

module.exports = ImageController;
