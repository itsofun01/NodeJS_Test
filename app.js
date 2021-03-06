var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var flash = require('connect-flash');
var moment = require('moment');

var indexRouter = require('./routes/index');
var authRouter = require('./routes/auth');
var crudRouter = require('./routes/CRUD');
var taskPageRouter = require('./routes/taskPage');

var connect_db = require('./db');
//const redis = require('redis');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy
const User = require('./models/model_user');
const bcrypt = require('bcrypt');

// var RedisStore = require("connect-redis")(session);
// let redisClient = redis.createClient();

var app = express();

var io = require('socket.io')();
app.io = io;
passportSocketIo = require("passport.socketio");

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(flash());
app.use(cookieParser('asdf33g4w4hghjkuil8saef345')); // cookie parser must use the same secret as express-session.

const cookieExpirationDate = new Date();
const cookieExpirationDays = 365;
cookieExpirationDate.setDate(cookieExpirationDate.getDate() + cookieExpirationDays);

app.use(session({
	secret: 'asdf33g4w4hghjkuil8saef345', // must match with the secret for cookie-parser
  resave: true,
  saveUninitialized: true,
  //store: new RedisStore({ client: redisClient, ttl : 260 }),
	cookie: {
	    httpOnly: true,
	    expires: cookieExpirationDate // use expires instead of maxAge
	}
 } ));

//Start passport process
passport.use(
  new LocalStrategy((username, password, callback) => {
      User.findOne({ username: username }, (err, user) => {
        console.log('======> Find in data: Input | '+username);
          if (err) {
            console.log('======> Find in data: Error');
            return callback(err);
          }else{
              if(user){
                  console.log('======> Find in data: Found | '+username);
                  var vaild = bcrypt.compareSync(password, user.password)
                  console.log('======> Find in data: Password | '+vaild);
                  if(vaild){
                      console.log('======> Find in data: OK ');
                      callback(null,{
                          id: user._id,
                          liked: user.liked,
                          name: user.name,
                          username: user.username,
                          password: user.password
                      })
                  }else{
                      console.log('======> Find in data: Pass not OK ');
                      return callback(null, false);
                  }
              }else{
                console.log('======> Find in data: Not Found');
                  return callback(null, false);
              }
          }
      });
  })
);

//send data to session
passport.serializeUser((user, callback) => {
    console.log('======> Serizlize data ID: '+user.id);
    callback(null, user.id);
});

//เอาของที่เก็บใน session มาใช้ต่อ
passport.deserializeUser((id, callback) => {
    console.log('======> Verify by ID: '+id);
    User.findById(id, (err, user) => {
        if (err) {
        return callback(err);
        }
        callback(null, user);
    });
});
 
app.use(passport.initialize());
app.use(passport.session());

//Set path
app.use('/', indexRouter);
app.use('/auth', authRouter);
app.use('/CRUD', crudRouter);
app.use('/task', taskPageRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
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

// io.use(passportSocketIo.authorize({
//   cookieParser: cookieParser,       // the same middleware you registrer in express
//   key:          'asdf33g4w4hghjkuil8saef345',       // the name of the cookie where express/connect stores its session_id
//   secret:       'asdf33g4w4hghjkuil8saef345',    // the session_secret to parse the cookie
//   store:        RedisStore,        // we NEED to use a sessionstore. no memorystore please
//   success:      onAuthorizeSuccess,  // *optional* callback on success - read more below
//   fail:         onAuthorizeFail,     // *optional* callback on fail/error - read more below
// }));

// function onAuthorizeSuccess(data, accept){
//   console.log('successful connection to socket.io');
//   // The accept-callback still allows us to decide whether to
//   // accept the connection or not.
//   accept(null, true);
// }

// function onAuthorizeFail(data, message, error, accept){
//   if(error)
//     throw new Error(message);
//   console.log('failed connection to socket.io:', message);

//   // We use this callback to log all of our failed connections.
//   accept(null, false);
// }

require('./routes/socket')(io);

module.exports = app;
