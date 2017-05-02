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

const restrict = require('../Restrict');

function ImageController(app) {
  this.app = app;
}

ImageController.prototype.route = function() {
  this.app.get('/api/image/:id',
    this.getImageById.bind(this),
    this.renderData.bind(this));

  this.app.get('/api/images/frontpage',
    this.getImagesForFrontPage.bind(this),
    this.renderData.bind(this));

  this.app.get('/api/images/staged',
    restrict.userCanViewStagedImages.bind(this),
    this.getStagedImages.bind(this),
    this.renderData.bind(this));

  this.app.put('/api/image/update',
    restrict.userCanUpdateImages.bind(this),
    this.updateImage.bind(this),
    this.renderData.bind(this));

  this.app.post('/api/image/upload',
    restrict.userHasUploadRights.bind(this),
    multer({ dest: '/tmp' }).array('images'),
    this.processImageUploads.bind(this),
    this.renderData.bind(this));
};

ImageController.prototype.getStagedImages = function(request, response, next) {
  ImageModel.find({
    status: 'staged'
  })
  .sort({ 'exif.creationDate': 1 })
  .populate('uploadedBy', 'firstName surname')
  .exec((error, images) => {
    if (error) {
      return response.status(500).send({ error: error });
    }
    request.imageData = images;
    return next();
  });
};

ImageController.prototype.updateImage = function(request, response, next) {
  const update = {
    public: request.body.public,
    status: request.body.status,
    frontPage: request.body.frontPage
  };
  ImageModel.update({
    _id: request.body.id
  }, {
    '$set': update
  }, next);
};

ImageController.prototype.getImagesForFrontPage = function(request, response, next) {
  ImageModel.find({
    status: 'published',
    frontPage: true,
    public: true
  },
  { fullSizeUrl: 1 })
  .sort({ views: -1, 'exif.creationDate': -1 })
  .exec((error, images) => {
    if (error) {
      return response.status(500).send({ error: error });
    }
    if (!images) {
      return response.sendStatus(404);
    }
    request.imageData = images;
    return next();
  });
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
    next();
    image.views += 1;
    image.save();
  });
};

ImageController.prototype.processImageUploads = function(request, response) {
  request.uploadedImageIds = [];
  async.eachLimit(request.files, nconf.get('imageUploadBus') || 5, (file, callback) => {
    console.log('Handling file upload ' + file.path);
    let imageData = { status: 'staged', albums: [], uploadedBy: request.user._id, local: {} };
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
        if (request.body.addWatermark) {
          return this.addWatermarkToImage(file);
        } else {
          return new Promise((resolve) => {
            const filePath = tmpfile({ extension: 'jpg' });
            fs.createReadStream(file.path).pipe(fs.createWriteStream(filePath));
            return resolve(file.path);
          });
        }
      })
      .then((fullSizeFilePath) => {
        imageData.local.fullSizeFilePath = fullSizeFilePath;
        return this.uploadImagesToS3(imageData.local);
      })
      .then((imageUrls) => {
        imageData.fullSizeUrl = imageUrls.fullSizeUrl;
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
        console.log(`Error caught in image upload promise chain: ${error}`);
        callback(error);
      });
  }, (error) => {
    if (error) {
      return response.status(500).send(error);
    } else {
      return response.send(request.uploadedImageIds);
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
        return reject('Duplicate');
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

ImageController.prototype.uploadImagesToS3 = function(paths) {
  return new Promise((resolve, reject) => {
    const awsConfig = {
      accessKeyId: nconf.get('aws-key'),
      secretAccessKey: nconf.get('aws-secret'),
      region: nconf.get('aws-region')
    };
    aws.config.update(awsConfig);
    const s3 = new aws.S3({
      params: { Bucket: nconf.get('aws-uploadBucket') }
    });
    const thumbnailKey = `${uuid.v4()}.jpg`;
    const fullSizeKey = `${uuid.v4()}.jpg`;
    const thumbnailFile = fs.readFileSync(paths.thumbnailFilePath);
    const fullSizeFile = fs.readFileSync(paths.fullSizeFilePath);
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
        s3.upload({
          Key: fullSizeKey,
          Body: fullSizeFile,
          ACL: 'public-read'
        }, (error, info) => {
          console.error(error);
          callback(error, info);
          results.fullSizeUrl = info.Location;
        });
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
      if (error) {
        return resolve({});
      }
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
    delete imageData.local;
    console.log(imageData);
    const image = new ImageModel(imageData);
    image.save((error, i) => {
      if (error) return reject(error);
      return resolve(i);
    });
  });
};

ImageController.prototype.renderData = function(request, response) {
  return response.status(200).send({ imageData: request.imageData });
};

module.exports = ImageController;
