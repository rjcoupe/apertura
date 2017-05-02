module.exports = {
  userCanViewStagedImages: function(request, response, next) {
    if (request.user && request.user.admin) {
      return next();
    }
    return response.sendStatus(403);
  },

  userCanUpdateImages: function(request, response, next) {
    if (request.user && request.user.admin) {
      return next();
    }
    return response.sendStatus(403);
  },

  userCanViewAlbum: function(user, album) {
    if (album.public || (user && user.admin)) {
      return true;
    }
    if (user && album.allowedUsers.indexOf(user._id) >= 0) {
      return true;
    }
    return false;
  },

  userHasUploadRights: function(request, response, next) {
    console.log(request.user);
    if (request.user && request.user.canUpload) {
      return next();
    } else {
      return response.sendStatus(403);
    }
  },
};
