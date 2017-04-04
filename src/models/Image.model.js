const mongoose = require('mongoose');
const schema = mongoose.Schema({
  thumbnailUrl: { type: String, unique: true },
  watermarkedUrl: { type: String, unique: true },
  md5: { type: String, unique: true },
  exif: {
    camera: {
      make: String,
      model: String,
      orientation: Number,
      xResolution: Number,
      yResolution: Number,
      resolutionUnit: Number
    },
    data: {
      fNum: Number,
      exposure: Number,
      iso: Number,
      creationDate: Date,
      shutterSpeed: Number,
      flash: Boolean,
      focalLength: Number,
      imageWidth: Number,
      imageHeight: Number
    }
  }
});

mongoose.model('images', schema);
