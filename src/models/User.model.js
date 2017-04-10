const mongoose = require('mongoose');
const schema = mongoose.Schema({
  firstName: String,
  surname: String,
  email: { type: String, unique: true },
  googleId: { type: String, unique: true },
  canUpload: { type: Boolean, index: true, default: false }
});

mongoose.model('users', schema);
