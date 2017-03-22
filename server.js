// Express
const express = require('express');
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

// Mongoose
const mongoose = require('mongoose');

// Misc Utils
const _ = require('lodash');
const fs = require('fs');
const colors = require('colors'); // eslint-disable-line no-unused-vars

// nConf
const nconf = require('nconf');
nconf.argv().env().file({ file: './config.json' });

// Initialise Mongoose Models
console.log('Initialising Models'.blue.bold);
const modelFiles = fs.readdirSync('./src/models');
_.each(modelFiles, (file) => {
  if (/\.model\.js$/.test(file)) {
    require(`./src/models/${file}`);
    console.log(`** ${file}`.green);
  }
});

// Set up routes
console.log('\nCreating Routes'.blue.bold);
const controllerFiles = fs.readdirSync('./src/controllers');
_.each(controllerFiles, (file) => {
  if (/\.controller\.js$/.test(file)) {
    let controllerClass = require(`./src/controllers/${file}`);
    let controller = new controllerClass(app);
    controller.route();
    console.log(`** ${file}`.green);
  }
});

// Connect to Mongo and listen for web traffic
let mongoUrl = 'mongodb://';
if (nconf.get('mongo:username')) {
  mongoUrl += `${nconf.get('mongo:username')}:${nconf.get('mongo:password')}@`;
}
mongoUrl += `${nconf.get('mongo:host')}:${nconf.get('mongo:port')}/${nconf.get('mongo:db')}`;
mongoose.connect(mongoUrl);
mongoose.connection.once('open', () => {
  app.listen(nconf.get('web:port'), () => {
    console.log('Webserver is listening'.green.bold);
  });
});