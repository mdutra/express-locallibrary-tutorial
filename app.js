require('dotenv').config();

const express = require('express');
const path = require('path');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const compression = require('compression');
const helmet = require('helmet');
// const favicon = require('serve-favicon');

const index = require('./routes/index');
const book = require('./routes/book');
const genre = require('./routes/genre');
const author = require('./routes/author');
const bookinstance = require('./routes/bookinstance');


// Create the Express application object
const app = express();

app.use(helmet());

// Set up mongoose connection
const devDbUrl = `mongodb://${process.env.DB_USER}:${process.env.DB_PASS}@ds161016.mlab.com:61016/local_library`;
const mongoDB = process.env.MONGODB_URI || devDbUrl;
mongoose.connect(mongoDB, {
  useMongoClient: true,
});
mongoose.Promise = global.Promise;
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// uncomment after placing your favicon in /public
// app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(compression()); // Compress all routes

app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);
app.use('/book', book);
app.use('/genre', genre);
app.use('/author', author);
app.use('/bookinstance', bookinstance);

// catch 404 and forward to error handler
app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

app.use((err, req, res, next) => {
  if (err instanceof mongoose.CastError) {
    err.message = `${err.stringValue} is an invalid ID`;
    err.status = 422;
  }

  next(err);
});

app.use((err, req, res, next) => {
  // If there was a response already
  if (res.headersSent) {
    next(err); // Use Express default error handler
  } else {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
  }
});

module.exports = app;
