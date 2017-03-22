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
  // this.app.post('/auth/login');

};

AuthController.prototype.initialisePassport = function() {
  this.app.use(passport.initialize());
  this.app.use(passport.session());

  passport.serializeUser(function(user, done) {
    done(null, user);
  });

  passport.deserializeUser(function(user, done) {
    done(null, user);
  });
  
  passport.use(new GoogleStrategy({
    clientID: nconf.get('auth:google:id'),
    clientSecret: nconf.get('auth:google:secret'),
    callbackURL: '/auth/google/callback'
  },
  (token, tokenSecret, profile, done) => {
    console.log(profile);
    UserModel.findOne({ googleId: profile.id }, (error, user) => {
      if (user) {
        return done(error, user);
      } else {
        if (nconf.get('auth:permittedDomains').indexOf(profile._json.domain) !== -1) {
          // User is new, but from a permitted domain
          UserModel.create({
            googleId: profile.id,
            firstName: profile.name.givenName,
            surname: profile.name.familyName,
            email: profile.emails[0].value
          }, (error, user) => {
            return done(error, user);
          });
        }
      }
    });
  }));

  this.app.get('/auth/google', passport.authenticate('google',
    { scope: ['openid', 'profile', 'email'] }));
  this.app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/auth/login' }),
    (request, response) => {
      response.redirect('/admin');
    }
  );

};

module.exports = AuthController;
