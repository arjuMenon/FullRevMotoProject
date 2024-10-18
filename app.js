var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var db = require('./config/connection')
var session = require('express-session')
var hbs = require('express-handlebars')
const handlebars = require('handlebars')


var adminRouter = require('./routes/admin');
var usersRouter = require('./routes/users');

handlebars.registerHelper('eq', function (a, b) {
  return a === b;
});

var app = express();
var fileUpload = require('express-fileupload')



// view engine setup
app.engine('hbs', hbs.engine({ extname: 'hbs', defaultLayout: 'layout', layoutsDir: __dirname + '/views/layouts/', partialsDir: __dirname + '/views/partials/' }));
app.set('view engine', 'hbs');



app.set('views', path.join(__dirname, 'views'));
app.use(session({
  secret: 'your-secret-key',  // Replace with a strong secret for your app
  resave: false,              // Don't save session if unmodified
  saveUninitialized: true,    // Save uninitialized sessions
  cookie: { secure: false, maxAge: 600000 }   // Set secure to true in production for HTTPS
}));


app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
db.connect(() => {
  console.log('DATABASE CONNECTED')
})
app.use(fileUpload());
app.use('/admin', adminRouter);
app.use('/', usersRouter);


// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
