const mongoose = require('mongoose');
const ImageModel = mongoose.model('images');

const _ = require('lodash');
const async = require('async');
const aws = require('aws-sdk');
const crypto = require('crypto');
const exifImage = require('exif').ExifImage;
const fs = require('fs');
const multer = require('multer');
const nconf = require('nconf');
const sharp = require('sharp');
const tmpfile = require('tmpfile');
const uuid = require('uuid');
const watermarker = require('image-watermark');

function ImageController(app) {
  this.app = app;
  const awsConfig = {
    accessKeyId: nconf.get('aws-key'),
    secretAccessKey: nconf.get('aws-secret'),
    region: nconf.get('aws-region')
  };
  aws.config.update(awsConfig);
}

ImageController.prototype.route = function() {
  this.app.get('/api/image/:id', this.getImageById.bind(this), this.renderData.bind(this));
  this.app.post('/api/image/upload',
    multer({ dest: '/tmp' }).array('images'),
    this.processImageUploads.bind(this),

    // this.getImageMD5.bind(this),
    // this.checkForPreviousUpload.bind(this),
    // this.createThumbnail.bind(this),
    // this.addWatermarkToImage.bind(this),
    // this.uploadImagesToS3.bind(this),
    // this.extractExifData.bind(this),
    // this.storeImageMetaData.bind(this),
    this.renderData.bind(this)
  );
};

ImageController.prototype.getImageById = function(request, response, next) {
  ImageModel.findOne({ _id: request.params.id }, (error, image) => {
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

ImageController.prototype.processImageUploads = function(request, response, next) {
  request.uploadedImageIds = [];
  async.eachLimit(request.files, nconf.get('imageUploadBus') || 5, (file, callback) => {
    let imageData = {};
    this.getImageMD5(file)
      .then((md5) => {
        imageData.md5 = md5;
        return this.checkForPreviousUpload(md5);
      })
      .then(() => {
        return this.createThumbnail(file);
      })
      .then((thumbnailFilePath) => {
        imageData.local.thumbnailFilePath = thumbnailFilePath;
        return this.addWatermarkToImage(file);
      })
      .then((watermarkedFilePath) => {
        imageData.local.watermarkedFilePath = watermarkedFilePath;
        return this.uploadImagesToS3(imageData.local, request.body.applyWatermark);
      })
      .then((imageUrls) => {
        imageData.watermarkedUrl = imageUrls.watermarkedUrl;
        imageData.thumbnailUrl = imageUrls.thumbnailUrl;
        return this.extractExifData(file);
      })
      .then((exifData) => {
        imageData.exif = exifData;
        return this.storeImageMetaData(imageData);
      })
      .then((savedImage) => {
        request.uploadedImageIds.push(savedImage._id);
        callback();
      })
      .catch((error) => {
        console.log(`Error caught in promise chain: ${error}`);
        callback(error);
      });
  }, (error) => {
    if (error) {
      return response.status(500).send(error);
    } else {
      return next();
    }
  });
};

ImageController.prototype.getImageMD5 = function(file) {
  return new Promise((resolve, reject) => {
    fs.readFile(file.path, (error, data) => {
      if (error) {
        return reject(error);
      }
      const md5 = crypto.createHash('md5').update(data).digest('hex');
      return resolve(md5);
    });
  });
};

ImageController.prototype.checkForPreviousUpload = function(md5) {
  return new Promise((resolve, reject) => {
    ImageModel.findOne({ md5: md5 }, (error, image) => {
      if (image) {
        return reject('File already uploaded');
      }
      return resolve();
    });
  });
};

ImageController.prototype.createThumbnail = function(file) {
  return new Promise((resolve, reject) => {
    const thumbnailFilePath = tmpfile({ extension: 'jpg' });
    try {
      sharp(file.path)
        .resize(400)
        .toFile(thumbnailFilePath, (error) => {
          if (error) {
            return reject('Thumbnail creation error');
          }
          return resolve(thumbnailFilePath);
        });
    } catch (e) {
      return reject(e);
    }
  });

};

ImageController.prototype.addWatermarkToImage = function(file) {
  return new Promise((resolve, reject) => {
    const watermarkFilePath = tmpfile({ extension: 'jpg' });
    const watermarkOptions = {
      text: nconf.get('watermark:text'),
      dstPath: watermarkFilePath
    };
    watermarker.embedWatermarkWithCb(file.path, watermarkOptions, (error) => {
      if (error) {
        return reject(`Failed adding watermark: ${error}`);
      }
      return resolve(watermarkFilePath);
    });
  });
};

ImageController.prototype.uploadImagesToS3 = function(paths, applyWatermark) {
  return new Promise((resolve, reject) => {
    const s3 = new aws.S3({
      params: { Bucket: nconf.get('aws-uploadBucket') }
    });
    const thumbnailKey = `${uuid.v4()}.jpg`;
    const watermarkedKey = `${uuid.v4()}.jpg`;
    const thumbnailFile = fs.readFileSync(paths.thumbnailFilePath);
    const watermarkedFile = fs.readFileSync(paths.watermarkedFilePath);
    let results = {};
    async.parallel([
      (callback) => {
        s3.upload({
          Key: thumbnailKey,
          Body: thumbnailFile,
          ACL: 'public-read'
        }, (error, info) => {
          console.error(error);
          callback(error, info);
          results.thumbnailUrl = info.Location;
        });
      },
      (callback) => {
        if (applyWatermark) {
          s3.upload({
            Key: watermarkedKey,
            Body: watermarkedFile,
            ACL: 'public-read'
          }, (error, info) => {
            console.error(error);
            callback(error, info);
            results.watermarkedUrl = info.Location;
          });
        } else {
          callback();
        }
      }
    ], (error) => {
      if (error) {
        return reject(`Failed to save image: ${error.message}`);
      }
      return resolve(results);
    });
  });

};

ImageController.prototype.extractExifData = function(file) {
  return new Promise((resolve) => {
    new exifImage({ image: file.path }, (error, exif) => {
      // We have to re-create the creation date because, by default, the date elements
      // will be separated with colons, which confuses JS.
      const createDateYear = exif.exif.CreateDate.substr(0, 4);
      const createDateMonth = exif.exif.CreateDate.substr(5, 2);
      const createDateDay = exif.exif.CreateDate.substr(8, 2);
      const createDateTime = exif.exif.CreateDate.substr(11, 8);
      const createDate = `${createDateYear}-${createDateMonth}-${createDateDay} ${createDateTime}`;

      return resolve({
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
          creationDate: createDate,
          shutterSpeed: exif.exif.ShutterSpeedValue,
          flash: (exif.exif.Flash === 1),
          focalLength: exif.exif.FocalLength,
          imageWidth: exif.exif.ExifImageWidth,
          imageHeight: exif.exif.ExifImageHeight
        }
      });
    });
  });
};

ImageController.prototype.storeImageMetaData = function(imageData) {
  return new Promise((resolve, reject) => {
    console.log(imageData);
    const image = new ImageModel(imageData);
    image.save((error) => {
      if (error) return reject(error);
      return resolve();
    });
  });
};

ImageController.prototype.renderData = function(request, response) {
  return response.status(200).send({ image: request.imageData });
};

module.exports = ImageController;
