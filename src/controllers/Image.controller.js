const mongoose = require('mongoose');
const ImageModel = mongoose.model('images');

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
    multer({ dest: '/tmp' }).single('image'),
    this.getImageMD5.bind(this),
    this.checkForPreviousUpload.bind(this),
    this.createThumbnail.bind(this),
    this.addWatermarkToImage.bind(this),
    this.uploadImagesToS3.bind(this),
    this.extractExifData.bind(this),
    this.storeImageMetaData.bind(this),
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

ImageController.prototype.getImageMD5 = function(request, response, next) {
  const image = request.file.path;
  request.image = {};
  fs.readFile(image, (error, data) => {
    request.image.md5 = crypto.createHash('md5').update(data).digest('hex');
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

ImageController.prototype.createThumbnail = function(request, response, next) {
  const thumbnailFilePath = tmpfile({ extension: 'jpg' });
  try {
    sharp(request.file.path)
      .resize(400)
      .toFile(thumbnailFilePath, (error) => {
        if (error) {
          return response.status(500).send('Thumbnail creation error');
        }
        request.thumbnailFilePath = thumbnailFilePath;
        return next();
      });
  } catch (e) {
    console.error(e);
  }
};

ImageController.prototype.addWatermarkToImage = function(request, response, next) {
  const watermarkFilePath = tmpfile({ extension: 'jpg' });
  const watermarkOptions = {
    text: nconf.get('watermark:text'),
    dstPath: watermarkFilePath
  };
  watermarker.embedWatermarkWithCb(request.file.path, watermarkOptions, (error) => {
    if (error) {
      return response.status(500).send(`Failed adding watermark: ${error}`);
    }
    request.watermarkedFilePath = watermarkFilePath;
    return next();
  });
};

ImageController.prototype.uploadImagesToS3 = function(request, response, next) {
  const s3 = new aws.S3({
    params: { Bucket: nconf.get('aws-uploadBucket') }
  });
  const thumbnailKey = `${uuid.v4()}.jpg`;
  const watermarkedKey = `${uuid.v4()}.jpg`;
  const thumbnailFile = fs.readFileSync(request.thumbnailFilePath);
  const watermarkedFile = fs.readFileSync(request.watermarkedFilePath);
  async.parallel([
    (callback) => {
      s3.upload({
        Key: thumbnailKey,
        Body: thumbnailFile,
        ACL: 'public-read'
      }, (error, info) => {
        console.error(error);
        request.image.thumbnailUrl = info.Location;
        callback(error, info);
      });
    },
    (callback) => {
      s3.upload({
        Key: watermarkedKey,
        Body: watermarkedFile,
        ACL: 'public-read'
      }, (error, info) => {
        console.error(error);
        request.image.watermarkedUrl = info.Location;
        callback(error, info);
      });
    }
  ], (error, results) => {
    console.log(error, results);
    if (!error) {
      return next();
    } else {

      return response.status(500).send(`Failed to save image: ${error.message}`);
    }
  });
};

ImageController.prototype.extractExifData = function(request, response, next) {
  new exifImage({ image: request.file.path }, (error, exif) => {
    // We have to re-create the creation date because, by default, the date elements
    // will be separated with colons, which confuses JS.
    const createDateYear = exif.exif.CreateDate.substr(0, 4);
    const createDateMonth = exif.exif.CreateDate.substr(5, 2);
    const createDateDay = exif.exif.CreateDate.substr(8, 2);
    const createDateTime = exif.exif.CreateDate.substr(11, 8);
    const createDate = `${createDateYear}-${createDateMonth}-${createDateDay} ${createDateTime}`;

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
        creationDate: createDate,
        shutterSpeed: exif.exif.ShutterSpeedValue,
        flash: (exif.exif.Flash === 1),
        focalLength: exif.exif.FocalLength,
        imageWidth: exif.exif.ExifImageWidth,
        imageHeight: exif.exif.ExifImageHeight
      }
    };
    return next();
  });
};

ImageController.prototype.storeImageMetaData = function(request, response, next) {
  console.log(request.image);
  const image = new ImageModel(request.image);
  console.log(image);
  image.save((error) => {
    if (error) console.error(error);
    return next();
  });
};

ImageController.prototype.renderData = function(request, response) {
  return response.status(200).send({ image: request.imageData });
};

module.exports = ImageController;
