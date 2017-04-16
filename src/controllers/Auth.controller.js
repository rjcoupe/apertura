const expressSession = require('express-session');
const mongoose = require('mongoose');
const nconf = require('nconf');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

const UserModel = mongoose.model('users');

function AuthController(app) {
  this.app = app;
  this.initialisePassport();
}

AuthController.prototype.route = function() {
  this.app.get('/auth/logout', this.logout.bind(this));
};

AuthController.prototype.logout = function(request, response) {
  if (request.user) {
    request.logout();
    return response.sendStatus(200);
  } else {
    return response.sendStatus(400);
  }
};

AuthController.prototype.initialisePassport = function() {
  this.app.use(expressSession({ secret: 'abc',
    saveUninitialized: true, resave: true }));
  this.app.use(passport.initialize());
  this.app.use(passport.session());

  passport.serializeUser(function(user, done) {
    done(null, user.id);
  });

  passport.deserializeUser(function(id, done) {
    UserModel.findOne({ _id: id }, (error, user) => {
      done(null, user);
    });
  });

  passport.use(new GoogleStrategy({
    clientID: nconf.get('auth:google:id'),
    clientSecret: nconf.get('auth:google:secret'),
    callbackURL: '/auth/google/callback'
  },
  (token, tokenSecret, profile, done) => {
    UserModel.findOne({ googleId: profile.id }, (error, user) => {
      if (user) {
        console.log(user, error);
        return done(error, user);
      } else {
        UserModel.create({
          googleId: profile.id,
          firstName: profile.name.givenName,
          surname: profile.name.familyName,
          email: profile.emails[0].value
        }, (error, user) => {
          return done(error, user);
        });
      }
    });
  }));

  this.app.get('/auth/google', passport.authenticate('google',
    { scope: ['openid', 'profile', 'email'] }));
  this.app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/auth/login' }),
    (request, response) => {
      console.log(request.user.email, 'authenticated');
      return response.redirect('/');
    }
  );

};

module.exports = AuthController;
