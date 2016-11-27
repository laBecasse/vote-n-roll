var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var postcssMiddleware = require('postcss-middleware');
var autoprefixer = require('autoprefixer');
var cssnano = require('cssnano');

var index = require('./routes/index');
var vote  = require('./routes/vote');
var results  = require('./routes/results');
var credit  = require('./routes/credit');

var config = require('./config');

var app = express();

app.set('config',config);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(require('node-sass-middleware')({
  src: path.join(__dirname, 'public/stylesheets'),
  dest: path.join(__dirname, 'public/stylesheets'),
  response: false
  //  debug : true
}));

app.use(postcssMiddleware({
  plugins: [
    /* Plugins */
    autoprefixer({
      browsers: ['last 2 versions']
    }),
    cssnano()
  ],

  src: function(req) {
    return path.join(path.join(__dirname, 'public/stylesheets/*.css'), req.url);
  }
}));

app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);
app.use('/vote',vote);
app.use('/resultats',results);
app.use('/credit',credit);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
