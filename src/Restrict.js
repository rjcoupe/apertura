module.exports = {
  userHasUploadRights: function(request, response, next) {
    if (request.user.canUpload) {
      return next();
    } else {
      return response.status(403);
    }
  }
};
