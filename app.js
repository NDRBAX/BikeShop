var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var session = require("express-session");


var app = express();

/* 
! Les sessions ne font plus parties des tâches indispensables du développeur,
! car elles font parties des tachês automatisés inclues dans un ensemble ou un système.
? NodeJS étant un environnement simple, il est nécessaire de préciser qqs trucs, 
? comme la ligne juste en dessous qu'il suffit tout simplement de copier et coller.
! En php le développeur ne touche pas aux sessions; c'est l'adminitrateur qui s'en chargera.
* On peut définir le temps de vie d'une session, car une session peut se réinitialiser même si 
* on reste innactif un certain temps. */

app.use(
    session({
        secret: 'a4f8071f-c873-4447-8ee2',
        resave: false,
        saveUninitialized: false,
    })
);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

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

module.exports = app;