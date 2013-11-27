/**
 *  @title joola.io
 *  @overview the open-source data analytics framework
 *  @copyright Joola Smart Solutions, Ltd. <info@joo.la>
 *  @license GPL-3.0+ <http://spdx.org/licenses/GPL-3.0+>
 *
 *  Licensed under GNU General Public License 3.0 or later.
 *  Some rights reserved. See LICENSE, AUTHORS.
 **/


var
  fs = require('fs'),
  path = require('path'),
  async = require('async'),
  http = require('http'),
  https = require('https'),
  express = require('express');

var webserver = module.exports = app = express();

webserver.start = function (options, callback) {
  var self = webserver;

  self.options = {
    port: 3000,
    securePort: 3001,
    secure: true,
    secureOnly: false,
    keyFile: path.join(__dirname, '../../config/certs/localhost.key'),
    certFile: path.join(__dirname, '../../config/certs/localhost.csr'),
    viewsPath: __dirname + '/views',
    sessionSecret: '491b8a10-573d-11e3-949a-0800200c9a66',
    sessionTimeout: new Date(Date.now() + 3600000)
  };
  self.options = joola.common._extend(self.options, options);

  app.set('views', self.options.viewsPath);
  app.set('view engine', 'jade');
  app.use(express.favicon('public/assets/ico/favicon.ico'));
  app.use(express.compress());
  app.use(express.json());
  app.use(express.urlencoded());
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(express.session({
    secret: self.options.sessionSecret,
    maxAge: self.options.sessionTimeout,
    expires: self.options.sessionTimeout
  }));
  //app.use(require('joola.io.status')({baseDir: __dirname}));
  /*app.use(express.logger(function (req, res) {
   }));*/

  var startHTTP = function (callback) {
    self.http = http.createServer(app).listen(self.options.port,function (err) {
      if (err) {
        console.log('bbb');
        return callback(err);
      }

      joola.logger.debug('joola.io HTTP server listening on port ' + self.options.port);
      joola.state.set('webserver-http', 'working', 'webserver-http is up.');
      return callback(null, self.http);
    }).on('error',function (err) {
        if (err.code == 'EADDRINUSE' && joola.config.get('webserver')) {
          //fireof an immediate callback with the error
          return callback(err);
        }
        else if (err.code == 'EADDRINUSE') {
          joola.logger.debug('[ignore] joola.io HTTP server server error: ' + err);
          joola.state.set('webserver-http', 'working', 'HTTP webserver-https is disabled.');
        }
        else {
          joola.logger.debug('joola.io HTTP server error: ' + err);
        }
      }).on('close', function () {
        joola.logger.debug('joola.io HTTP server listening on port ' + self.options.port + ' received a CLOSE command.');
        joola.state.set('webserver-http', 'failure', 'HTTP webserver-http is stopped.');
      });
  };

  var startHTTPS = function (callback) {
    var secureOptions;
    try {
      secureOptions = {
        key: fs.readFileSync(self.options.keyFile),
        cert: fs.readFileSync(self.options.certFile)
      };
    }
    catch (ex) {
      return callback(ex);
    }
    self.https = https.createServer(secureOptions, app).listen(self.options.securePort,function (err) {
      if (err) {
        return callback(err);
      }

      joola.logger.debug('joola.io HTTPS server listening on port ' + self.options.securePort);
      joola.state.set('webserver-https', 'working', 'webserver-https is up.');
      return callback(null, self.https);
    }).on('error',function (err) {
        if (err.code == 'EADDRINUSE' && joola.config.get('webserver')) {
          //fireof an immediate callback with the error
          return callback(err);
        }
        else if (err.code == 'EADDRINUSE') {
          joola.logger.debug('[ignore] joola.io HTTPS server server error: ' + err);
          joola.state.set('webserver-https', 'working', 'HTTPS webserver-https is disabled.');
        }
        else {
          joola.logger.debug('joola.io HTTPS server error: ' + err);
        }
      }).on('close', function () {
        joola.logger.debug('joola.io HTTPS server listening on port ' + self.options.securePort + ' received a CLOSE command.');
        joola.state.set('webserver-https', 'failure', 'HTTPS webserver-https is stopped.');
      });
  };

  var calls = [];
  if (!self.options.secureOnly) {
    calls.push(startHTTP);
  }
  if (self.options.secure) {
    calls.push(startHTTPS);
  }
  if (!joola.config.get('webserver')) {
    delete joola.state.controls['webserver-https'];
  }
  async.parallel(calls, function (err) {
    if (typeof callback === 'function')
      callback(err);
  });
};

webserver.stop = function (callback) {
  var self = webserver;

  if (self.http)
    self.http.close();
  if (self.https)
    self.https.close();

  if (typeof callback === 'function')
    callback(null);
};