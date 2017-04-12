module.exports = {
  userHasUploadRights: function(request, response, next) {
    if (request.user && request.user.canUpload) {
      return next();
    } else {
      return response.redirect('/auth/google');
    }
  }
};
