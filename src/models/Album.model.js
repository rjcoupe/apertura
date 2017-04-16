const mongoose = require('mongoose');
const schema = mongoose.Schema({
  title: { type: String, index: true },
  primaryImage: { type: mongoose.Schema.Types.ObjectId, ref: 'images' },
  images: [{ type: mongoose.Schema.Types.ObjectId, ref: 'images' }],
  public: { type: Boolean, index: true },
  allowedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'users' }]
});

mongoose.model('albums', schema);
