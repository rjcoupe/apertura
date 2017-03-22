const mongoose = require('mongoose');
const ImageModel = mongoose.model('images');

const crypto = require('crypto');
const exifImage = require('exif').ExifImage;
const fs = require('fs');
const tmpfile = require('tmpfile');

function ImageController(app) {
  this.app = app;
}

ImageController.prototype.route = function() {
  this.app.get('/api/image/:id', this.getImageById.bind(this), this.renderData.bind(this));
  this.app.post('/api/image/upload',
    this.getImageMD5.bind(this),
    this.checkForPreviousUpload.bind(this),
    this.uploadImageToS3.bind(this),
    this.storeImageMetaData.bind(this)
  );
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

ImageController.prototype.getImageMD5 = function(request, response, next) {
  const image = request.files.imageUpload.path;
  fs.readFile(image, (error, data) => {
    request.image = {
      md5: crypto.createHash('md5').update(data).digest('hex')
    };
    return next();
  });
};

ImageController.prototype.checkForPreviousUpload = function(request, response, next) {
  ImageModel.findOne({ md5: request.image.md5 }, (error, image) => {
    if (image) {
      return response.status(400).send('File already uploaded');
    }
    return next();
  });
};

ImageController.prototype.uploadImageToS3 = function(request, response, next) {

};

ImageController.prototype.storeImageMetaData = function(request, response, next) {
  new exifImage({ image: request.files.imageUpload.path }, (error, exif) => {
    request.image.exif = {
      camera: {
        make: exif.image.Make,
        model: exif.image.Model,
        orientation: exif.image.Orientation,
        xResolution: exif.image.XResolution,
        yResolution: exif.image.YResolution,
        resolutionUnit: exif.image.ResolutionUnit
      },
      data: {
        fNum: exif.exif.FNumber,
        aperture: exif.exif.ApertureValue,
        iso: exif.exif.iso,
        creationDate: exif.exif.CreateDate,
        shutterSpeed: exif.exif.ShutterSpeedValue,
        flash: (exif.exif.Flash === 1),
        focalLength: exif.exif.FocalLength,
        imageWidth: exif.exif.ExifImageWidth,
        imageHeight: exif.exif.ExifImageHeight
      }
    };
  });
};

ImageController.prototype.renderData = function(request, response) {
  return response.status(200).send({ image: request.imageData });
};

module.exports = ImageController;
