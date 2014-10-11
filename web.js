var express = require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var sys = require("sys"), fs = require("fs");
var jade = require('jade');
var h = require("./helper.js");
var templates = require("./templates"); templates.h = h;
var viewLogic = require("./viewLogic"); viewLogic.h = h;
var dbManager = require("./dbManager"); dbManager.h = h; viewLogic.dbManager = dbManager;
templates.SetVars(dbManager);
var flash = require('connect-flash');
var rdfstore = require('rdfstore');
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/test'); 

passport = require("passport");
LocalStrategy = require('passport-local').Strategy;
FacebookStrategy = require('passport-facebook').Strategy;

var store = new rdfstore.Store({persistent:true, 
                  engine:'mongodb', 
                  name:'test',
                  overwrite:false,    // delete all the data already present in the MongoDB server
                 }, function(store){dbManager.store = store;});

var app = express();

app.use(bodyParser());
app.use(cookieParser());
app.use(session({ secret: 'SECRET' }));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

function findById(id, fn) {
  dbManager.Users.find({_id: id}, function(err, users) {
    if (users) {
      fn(null, users[0]);
    } else {
      fn(new Error('Does not exist'));
    }
  });
}

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  findById(id, function (err, user) {
    done(err, user);
  });
});

dbManager.SetUp();

passport.use(new LocalStrategy(
  function(username, password, done) {
    dbManager.Users.findOne({ username: username }, function(err, user) {
      if (err) { return done(err); }
      if (!user) {
        return done(null, false, { message: 'Incorrect username.' });
      }
      if (!user.validPassword(password)) {
        return done(null, false, { message: 'Incorrect password.' });
      }
      return done(null, user);
    });
  }
));

app.get('/', function(request, response) {viewLogic.indexGET(request, response, dbManager.UserData, dbManager.Games, dbManager.Templates) });
app.get('/login', function(request, response) { viewLogic.loginGET(request, response) });
app.get('/signup', function(request, response) { viewLogic.signupGET(request, response) });
app.post('/signup', function(request, response) { viewLogic.signupPOST(request,response,dbManager.Users,dbManager.UserData) });
app.post('/login', passport.authenticate('local', { failureRedirect: '/login', failureFlash: true }), function(req, res) {res.redirect('/');  });
app.post('/custom', function(request,response) {viewLogic.customPOST(request,response, dbManager.UserData, dbManager.Templates)} ); // Invoke the customization page
app.post('/custom_u', function(request,response) {viewLogic.custom_uPOST(request,response, dbManager.UserData, dbManager.Templates)} ); // Invoke the customization page after saving data
app.post('/custom_update', function(request,response) {viewLogic.CustomUpdate(request,response)}); // For XHR requests via the customization page
app.post('/game', function(request,response) {viewLogic.gamePOST(request,response, dbManager.Games,dbManager.UserData, dbManager.Templates)} );
app.post('/temp', function(request,response) {viewLogic.tempExPOST(request,response, dbManager)} );  // Submission of input for game generation
app.post('/input_update', function(request,response) {viewLogic.inputUpdatePOST(request,response, dbManager)} );  // Update an input form
app.get('/img/:name', function(request,response) { response.sendfile("images/" + request.params.name,{root: __dirname}); });
app.post('/comm', function(request,response) { viewLogic.commPOST(request,response, dbManager.Games,dbManager.UserData) }); // For communication with the server during game play
app.post('/admin', function(request,response) { viewLogic.adminPOST(request, response, dbManager)});
app.post('/fileupload', function(request,response) { viewLogic.uploadPOST(request, response) });
app.get('/loadscript/:src', function(request,response) {response.send(fs.readFileSync(request.params.src));});

var port = process.env.PORT || 8080;
app.listen(port, function() {
  console.log("Listening on " + port);
});
