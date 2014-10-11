var express = require('express');
var sys = require("sys"), fs = require("fs");
var jade = require('jade');
var mongoose = require('mongoose');
var templates = require("./templates");

function uploadPOST(request, response) {
  fs.readFile(request.files.newImage.path, function (err, data) {
    var newPath = __dirname + "/images/" + request.files.newImage.name;
    fs.writeFile(newPath, data, function (err) {
      response.send("Uploaded!");
    });
  });
}
exports.uploadPOST = uploadPOST;

function adminPOST(request, response) {
  if (request.body.command == 'restore') {
    exports.dbManager.Restore(response);
	delete require.cache[__dirname+"\\templates.js"];
    templates = require("./templates.js");
    templates.Update(exports.dbManager);
  }
  if (request.body.command == 'report') {
    exports.dbManager.Report();
  }
  if (request.body.command == 'setrdf') {
    exports.dbManager.SetRDF();
  }
  if (request.body.command == 'rdfreport') {
    exports.dbManager.RDF_Report();
  }
  if (request.body.command == 'cleargames') {
    exports.dbManager.ClearGames();
  }
  if (request.body.command == 'nuke') {
    exports.dbManager.NukeRDF();
  }
  response.redirect('/');

}
exports.adminPOST = adminPOST;

function commPOST(request, response, Games, UserData) {
  Games.findById(request.body.gameID, function(err,game) {
    if (game.http_func) {
      game.http_func(request.body, game, response, exports.dbManager, templates);
    }
  });
}
exports.commPOST = commPOST;

var gameTemp = fs.readFileSync("template.jade");
var game_fn = jade.compile(gameTemp);
function loadGame(gameID, response, game, game_mode) {
  var content = game_fn({"initCode": game.gameCode, "gameID":gameID, "name":game.name, "game": game, "mode": game_mode});
  response.send(content);
}
function makeSaveGameObject(title, game_code) {
  ret_value = {name: title, gameCode: game_code["code"]};
  if (game_code["http_func"]) {
    ret_value["http_func"] = game_code["http_func"];
  }
  return ret_value;
}
function gamePOST(request, response, Games, UserData, Templates) {
  var gameID = 0; // The ID of the current game instance, if any.
  if (request.body.loadGame) {
    Games.findById(request.body.gameID, function(err, game) {
      loadGame(request.body.gameID, response, game, request.body.loadGame);
    });
    return;
  }
}
exports.gamePOST = gamePOST;

function tempExPOST(request, response) { // Process template execution
  exports.dbManager.Templates.findById(request.body.template, function(err, template) {
    templates.ProcessInputPage(request, response, template.o);
  });
}
exports.tempExPOST = tempExPOST;

function inputUpdatePOST(request,response) { // Update an input form
  exports.dbManager.Templates.findById(request.body.template, function(err, template) {
    templates.UpdateInputPage(request, response);
  });
}
exports.inputUpdatePOST = inputUpdatePOST;

function CustomUpdate(request,response) {
  exports.dbManager.UserData.findOne({username:request.user.username}, function(err,user_data) {
    templates.CustomUpdate(request.body,response,user_data);
  });
}
exports.CustomUpdate = CustomUpdate;

function customPOST(request, response, UserData, Templates) {
  var query = Templates.findById(request.body["templateID"]);
  query.select('name i _id');
  if (!request.user) {
    response.send("Please log in.");
  } else {
    UserData.findOne({username: request.user.username}, function(err,user_data) {
      query.exec(function(err, template) {
	    exports.dbManager.GenerateCustomPage(request, response, template.i, template.id);
      });
    });
  }
}
exports.customPOST = customPOST;

function custom_uPOST(request, response, UserData, Templates) {
  UserData.findOne({username: request.user.username}, function(err,user_data) {
    var inputCache = JSON.parse(user_data.inputCache);
    if (!inputCache.template) {response.send("viewLogic/custom_uPOST Error: missing template");}
	else {
	  var query = Templates.findById(inputCache.template);
	  query.select('name i _id');
	  query.exec(function(err, template) {
	    exports.dbManager.GenerateCustomPage(request, response, template.i, template.id);
	  });
	}
  });
}
exports.custom_uPOST = custom_uPOST;

function signupPOST(request, response, Users, UserData) {
  var new_user = new Users({ username: request.body["username"], password: request.body["password"] });
  new_user.save();
  var new_user_data = new UserData( {username: request.body["username"]} );
  new_user_data.save();
  response.redirect('/');
}
exports.signupPOST = signupPOST;

function signupGET(request, response) {
  var content = 'Register a new account:' + '<form action="/signup" method="post">' +
        '<div>' + '<label>Username:</label>' + '<input type="text" name="username"/><br/>' + '</div>' +
        '<div>' + '<label>Password:</label>' + '<input type="password" name="password"/>' + '</div>' +
        '<div>' + '<input type="submit" value="Submit"/>' + '</div>' +
        '</form>';
  response.send(content);
}
exports.signupGET = signupGET;

function loginGET(request, response) {
  var content = 'Log in:' + '<form action="/login" method="post">' +
        '<div>' + '<label>Username:</label>' + '<input type="text" name="username"/><br/>' + '</div>' +
        '<div>' + '<label>Password:</label>' + '<input type="password" name="password"/>' + '</div>' +
        '<div>' + '<input type="submit" value="Submit"/>' + '</div>' +
        '</form>';
  response.send(content);
}
exports.loginGET = loginGET;

function indexGET(request, response, UserData, Games, Templates) {
  indexTemp = fs.readFileSync("indexTemplate.jade");
  var fn = jade.compile(indexTemp);
  var query = Templates.find();
  query.select('name _id');
  if (!request.user) {
    query.exec(function(err, dbtemplates) {
      var content = fn({"templates": dbtemplates, "user": request.user});
      response.send(content.toString());
    });
  } else {
    UserData.findOne({username: request.user.username}, function(err,user_data) {
//    In case of a problem, comment out these two lines to clear the input cache for the given user	
//	  user_data.inputCache = ""; // asdf
//	  user_data.save(); // asdf
      query.exec(function(err, dbtemplates) {
        Games.find().where('_id').in(user_data.myGames).exec(function(err, games) {
          var content = fn({"templates": dbtemplates, "user": request.user, "games": games});
          response.send(content.toString());
        });
      });
    });
  }
}
exports.indexGET = indexGET;