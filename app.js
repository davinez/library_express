require('dotenv').config();
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const compression = require('compression');
const helmet = require('helmet');

const mongoose = require('mongoose');

// Handlebars partials/register
const { handlebars } = require('hbs');
const fs = require('fs');

// Routes
const indexRouter = require('./routes/index');
const catalogRouter = require('./routes/catalog');

// Create the Express application object
const app = express();

// Set up mongoose connection
const user = process.env.DB_USER;
const password = process.env.DB_PASS;
const dbname = process.env.DB_NAME;

const mongoDB = `mongodb+srv://${user}:${password}@cluster0.rp2su.mongodb.net/${dbname}?retryWrites=true&w=majority`;
mongoose.connect(mongoDB, { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// Middleware chain
app.use(helmet());
app.use(compression()); // Compress all routes
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Add catalog routes to middleware chain.
// URL will be /catalog/books/
app.use('/', indexRouter);
app.use('/catalog', catalogRouter);

// The last middleware in the chain adds handler methods for errors and HTTP 404 responses.
app.use((req, res, next) => {
  next(createError(404));
});

// error handler
app.use((err, req, res, next) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

/*
  ========================================
  Handlebars partials and custom helpers
  ========================================
*/

// partials are rendered during compile not runtime,
// to see changes we need to restart server
const sidebar = fs.readFileSync('./views/sidebar.hbs').toString();
handlebars.registerPartial('sidebar', sidebar);

handlebars.registerHelper('ifEquals', function (arg1, arg2, options) {
  return arg1 === arg2 ? options.fn(this) : options.inverse(this);
});
// options.fn(this) is true and options.inverse(this) is false
handlebars.registerHelper('ifEqualsString', function (arg1, arg2, options) {
  if (arg1 === undefined || arg2 === undefined) {
    return options.inverse(this);
  }

  return arg1.toString() === arg2.toString()
    ? options.fn(this)
    : options.inverse(this);
});
handlebars.registerHelper('elseCompare', function (arg1, arg2, options) {
  return arg1 !== arg2 ? options.fn(this) : options.inverse(this);
});
handlebars.registerHelper('ifLower', function (arg1, arg2, options) {
  return arg1 < arg2 - 1 ? options.fn(this) : options.inverse(this);
});

module.exports = app;
