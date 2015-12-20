/**
 * Module dependencies.
 */
var express = require('express')
var passport = require('passport')
var util = require('util')
var bodyParser = require('body-parser')
var expressSession = require('express-session')

var config = require('./config.json')
var oauth2 = require('./oauth/oauth2')

var Volonteer = require('./app/services/'+config.service+'/volonteers')

// Express configuration

var session = expressSession({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false
})
var server = express();

server.set('view engine', 'ejs');
server.set('views', process.cwd() + '/oauth/views')
//server.use(express.logger());
//server.use(express.cookieParser());
server.use(bodyParser.json())
server.use(bodyParser.urlencoded({ extended: true }))
/*
server.use(function(req, res, next) {
  console.log('-- session --');
  console.dir(req.session);
  //console.log(util.inspect(req.session, true, 3));
  console.log('-------------');
  next()
});
*/
server.use(passport.initialize());
server.use(passport.session());
//server.use(server.router);
//server.use(express.errorHandler({ dumpExceptions: true, showStack: true }));

// Passport configuration

require('./auth');
require('./oauth/auth');

// Formularz do logowania dla wolontariuszy chcących dać dostęp do swojego
// konta wybranej aplikacji.
server.get('/login', session, function(req, res) { res.render('login') })
server.post('/login', session, passport.authenticate('local', {
  successReturnToOrRedirect: '/',
  failureRedirect: '/login'
}))

server.get('/logout', session, function(req, res) {
  req.logout()
  res.redirect('/')
})

// Okienko w którym wolontariusz wyraża zgodę (lub nie) na dostęp do swojego
// konta.
server.get('/dialog/authorize', session, oauth2.authorization);
server.post('/dialog/authorize/decision', session, oauth2.decision);

// Końcówka dla klienta oauth chcącego zamienić tymczasowy kod dostępu na
// token.
server.post('/oauth/token', oauth2.token);

// Autoryzacja tokenem oAuth
var bearer = passport.authenticate('bearer', { session: false })

server.get('/client', bearer, function(req, res) {
  res.json({
    client_id: req.user.id,
    scope: req.authInfo.scope
  })
})

// Lista wolontariuszy
server.get('/volunteers', bearer, function(req, res) {
  Volonteer.read(req, 'Volonteers', {}, req.query, function (err, users) {
    res.send(users)
  })
})

// Szczegóły wolontariusza
server.get('/volunteers/:id', bearer, function(req, res) {
  Volonteer.read(req, 'Volonteers', {id: req.params.id}, {}, function (err, user) {
    res.send(user)
  })
})

// Aktualizacja wolontariusza
server.post('/volunteers/:id', bearer, function(req, res) {
  Volonteer.update(req, 'Volonteers', {id: req.params.id}, req.body, {}, function (err, user) {
    res.send(user)
  })
})

// Lista zadań
//server.get('/tasks', bearer, function(req, res) { })

// Szczegóły zadania
//server.get('/tasks/:id', bearer, function(req, res) { })

// Zgłoszenie do zadania
//server.post('/tasks/:id/join', bearer, function(req, res) { })

// Baza noclegowa pielgrzymów
//server.get('/pilgrims', bearer, function(req, res) { })

server.listen(config.api_port);
