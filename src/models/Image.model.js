const mongoose = require('mongoose');
const schema = mongoose.Schema({
  thumbnailUrl: { type: String, unique: true },
  fullSizeUrl: { type: String, unique: true },
  md5: { type: String, unique: true },
  views: { type: Number, default: 0 },
  status: { type: String, index: true },
  public: { type: Boolean, index: true, default: false },
  frontPage: { type: Boolean, index: true, default: false },
  albums: [{ type: mongoose.Schema.Types.ObjectId, ref: 'albums' }],
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
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
