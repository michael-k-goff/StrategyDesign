var express = require('express');
var sys = require("sys"), fs = require("fs");
var mongoose = require('mongoose');
require('mongoose-function')(mongoose);
var t = require("./templates.js");
exports.t = t;

// Execute a SPARQL query and return the response.  The purpose of this is that it seems that functions with callbacks cannot be stored the database
function PackageSPARQL(query, response) {
  this.store.execute(query, function(success,results) {
		  response.send(results);
  });
}
exports.PackageSPARQL = PackageSPARQL;

// Creation of an input page is routed through the dbManager
function GenerateCustomPage(request, response, i, id) { // id is for the template
  t.GenerateCustomPage(request, response, i, id);
}
exports.GenerateCustomPage = GenerateCustomPage;

function SetUp() {
  var db = mongoose.connection;
  db.on('error', console.error.bind(console, 'connection error:'));
  db.once('open', function callback () {
    console.log("Connected to database!");
    var LocalUserSchema = new mongoose.Schema({
      username: String,
      password: String
    });
    var UserDataSchema = new mongoose.Schema({
      username: String,
      myGames: [mongoose.Schema.ObjectID],
	  inputCache: String // A stringified JSON object which stores input data for a game
    });
    var GameSchema = new mongoose.Schema({
      name: String,
      gameCode: String,
      saveData: String,
      http_func: Function,
      x: Number,
      y: Number,
	  instructions: String
    });
    var AssetSchema = new mongoose.Schema({
      name: String,
      data: mongoose.Schema.Types.Mixed
    });
    var TemplateSchema = new mongoose.Schema({
      name: String, // The name of the template
      code: String, // The code, currently a jade template, representing how the customization page should be created.  Now obsolete
      fn: Function,  // The function executed when the customization form is submitted.  Now obsolete
	  i: [String], // Interpreted code that specifies the input page
	  o: [String] // Interpreted code that specifies the result of the input
    });
	var ClassSchema = new mongoose.Schema({
	  name: String,
	  f_names: [String],
	  f_codes: [mongoose.Schema.Function]
	});
	var QuadSchema = new mongoose.Schema({
	  name: String
	});
    
    LocalUserSchema.methods.validPassword = function(password) {
      return this.password == password;
    };

    exports.Users = mongoose.model('userauths', LocalUserSchema);
    exports.UserData = mongoose.model('UserData', UserDataSchema);
    exports.Games = mongoose.model('Games', GameSchema);
    exports.Assets = mongoose.model('Assets', AssetSchema);
    exports.Templates = mongoose.model('Templates', TemplateSchema);
	exports.Classes = mongoose.model('Classes', ClassSchema);
	exports.quads = mongoose.model('quads',QuadSchema);
	// Create two accounts if necessary
    var new_user = new exports.Users({ username:"public", password: "public" });
    new_user.save();
    var new_user_data = new exports.UserData( {username: "public"} );
    new_user_data.save();
    var new_user = new exports.Users({ username:"admin", password: "adminpass" });
    new_user.save();
    var new_user_data = new exports.UserData( {username: "admin"} );
    new_user_data.save();
  });
}
exports.SetUp = SetUp;

function AddTriple(graph,store,s,p,o) {
  graph.add(store.rdf.createTriple( store.rdf.createNamedNode(s),
                                 store.rdf.createNamedNode(p),
                                 store.rdf.createNamedNode(o) ));
}
exports.AddTriple = AddTriple;

// An experimental function for RDF triples
function SetRDF() {
  var graph = this.store.rdf.createGraph();
  var store = this.store;
  AddTriple(graph, this.store, "Alice", "knows", "Bob");
  AddTriple(graph, this.store, "Bob", "knows", "Candy");
  store.insert(graph, function(success) {
    store.execute("DELETE {?s ?p ?o} WHERE {?s ?p ?o FILTER (?o = <Bob> || ?s = <Bob>)}", function(success,results) {});
  });
}
exports.SetRDF = SetRDF;

function NukeRDF() { // This function is not desired, and hopefully the circumstances that necessitate it will be corrected.
  exports.quads.find().remove();
}
exports.NukeRDF = NukeRDF;

// Clear old games and game data
function ClearGames() {
  exports.Games.find().remove();
  exports.UserData.find({}, function(err, user_data) {
    for (ud in user_data) {
	  user_data[ud].myGames = [];
	  user_data[ud].save();
	}
  });
  // The following deletes all RDF triples whose subject is associated with a particular game
  this.store.execute("DELETE {?s ?p ?o} WHERE {?s ?p ?o . ?s <InGame> ?gameid}", function(success,results) {});  
}
exports.ClearGames = ClearGames;

// Restore the Template database
function Restore() {
  delete require.cache[__dirname+"\\templates.js"];
  t = require("./templates.js");
  t.SetVars(this);
/*
  var TasksDone = {"Assets": 0, "Templates": 0}; // Delete all assets and templates and repopulate
  exports.Templates.find().remove(function(err,data) {
    TasksDone.Templates = 1;
    if (TasksDone.Assets) {
      t.Populate(exports.Templates, exports.Assets);
    }
  });
  exports.Assets.find().remove(function(err,data) {
    TasksDone.Assets = 1;
    if (TasksDone.Templates) {
      t.Populate(exports.Templates, exports.Assets);
    }
  });*/
/*  
  exports.Users.find().remove(function(err,data) { // Delete all users and create a dummy user
    exports.UserData.find().remove( function(err,data) {
      var new_user = new exports.Users({ username: "p", password: "p" }); // A dummy user
      new_user.save();
      var new_user_data = new exports.UserData( {username: "p"} );
      new_user_data.save();
    });
  });*/
}
exports.Restore = Restore;

function Clear() {
  exports.Users.find().remove();
  exports.UserData.find().remove();
  exports.Games.find().remove();
  exports.Assets.find().remove();
  exports.Templates.find().remove();
}
exports.Clear = Clear;

function Populate() {
  t.Populate(exports.Templates, exports.Assets);
}
exports.Populate = Populate;

function Report() {
  // Print out the current databases
  exports.Users.find({}, function(err, user_data) {
    console.log("USERS\n==========================");
    console.log(user_data);
  });
  exports.UserData.find({}, function(err, user_data) {
    console.log(user_data);
  });
/*  exports.Games.find({}, function(err, games) {
    console.log("\nGAMES\n=============================");
    for (game in games) {
      console.log(games[game]);
 //     console.log(games[game].name);
 //     console.log("   " + games[game].saveData);
    }
  });*/
  exports.Assets.find({}, function(err,assets) {
    console.log("\nASSETS\n================================");
    for (asset in assets) {
      console.log(assets[asset].name + " " + assets[asset]._id);
    }
  });
  exports.Templates.find({}, function(err, templates) {
    console.log("\nTEMPLATES\n=============================");
    for (template in templates) {
      console.log(templates[template].name);
    }
  });
}
exports.Report = Report;

function RDF_Report() {
  this.store.execute("SELECT ?s ?p ?o WHERE { ?s ?p ?o }", function(success, results){ 
    for (result in results) {console.log(results[result]);}
	if (results.length == 0) {console.log("No triples");}
  });
}
exports.RDF_Report = RDF_Report;