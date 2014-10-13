var jade = require("jade");
var fs = require("fs");
var dbManager;
// Templates.  For now, the RPG.  Later, likely to have 4X, Bag of Objects, etc.
var rpg = require("./rpg2.js");

function SetVars(db) {
  dbManager = db;
}
exports.SetVars = SetVars;

// Pass along standard HTTP functions
function http_func(req_body, game, response, dbManager, params) {
  if (params[0] == "rpg2") {rpg.http_func(req_body, game, response, dbManager, params)}
}
exports.http_func = http_func;

// Create the customization page from interpreted input.  This function is a wrapper that extracts user data
function GenerateCustomPage(request, response, input, id) { // id is for the template
	user = "public";
	if (request.user) {user = request.user.username}
	dbManager.UserData.findOne({username: user}, function(err,user_data) {
		var inputCache = {clear:1};
		if (user_data && user_data.inputCache) {inputCache = JSON.parse(user_data.inputCache);}
		if (inputCache.clear) {
			inputCache = CreateInputCache(input);
			if (user_data) {
				user_data.inputCache = JSON.stringify(inputCache);
				user_data.save(function(err) {
					GenerateCustomPageHelper(request,response,input,id,inputCache);
				});
			}
			else {GenerateCustomPageHelper(request,response,input,id,inputCache);}	
		}
		else {GenerateCustomPageHelper(request,response,input,id,inputCache);}
	});
}

function CreateInputCache(input,id) { // When activating a template, create the starting input cache
  // Eventually, this function should parse the input to determine the proper initialize for the input cache
  ic = {template:id};
  for (var i=0; i<rpg.Modules.length; i++) {
    if (rpg.Modules[i].auto) {ic[rpg.Modules[i].v] = 1;}
  }
  return ic;
}

// Process an XHR from the customization page.
function CustomUpdate(body,response,userdata) {
  if (body.operation == "set_vars") {
    var new_cache = JSON.parse(userdata.inputCache);
    for (var i=0; i<body.data.length; i++) {
      new_cache[body.data[i].v] = body.data[i].val;
    }
    userdata.inputCache = JSON.stringify(new_cache);
    userdata.save(function(err) {
      response.send("");
    });
  }
}
exports.CustomUpdate = CustomUpdate;

function GenerateStandardAngular() {
  return "<script type='text/javascript'>" +
         "angular.module('customApp', []);" +
         "</script>\n";
}

// Create the customization page from interpreted input
function GenerateCustomPageHelper(request, response, input, id, inputCache) { // id is for the template
  var code = "<!doctype html><html>";
  code += "<link rel='stylesheet' href='https://maxcdn.bootstrapcdn.com/bootstrap/3.2.0/css/bootstrap.min.css'>";
  code += "<head><script type='text/javascript' src='/loadscript/angular.min.js'></script></head>\n";
  code += GenerateStandardAngular(); // Creates standard angular code to be used by various modules
  code += "<body ng-app = 'customApp'>";
  if (input[0] == "StdInput") {
    var inputs = JSON.parse(input[1]);
    code += "<form name=\"input\" action=\"temp\" method=\"post\">";
    for (var i=0; i<inputs.length; i++) {
      code += "<br>"+inputs[i]+": <input type=\"text\" name=\""+inputs[i]+"\">";
    }
    code += "<input type=\"hidden\" name=\"template\" value=\""+id.toString()+"\"><br>" +
      "<input type=\"submit\" name=\"submitform\" value=\"Save\"></form>";
  } 
  if (input[0] == "Modules") { 
    var parse_position = 1;
	while (parse_position < input.length) {
	  result = ModuleParse(input,parse_position,id,inputCache);
	  parse_position = result.new_position;
	  code += result.code;
	}
  }
  code += "<a href='/'>Back</a>"
  code += "</body></html>"
  response.send(code);
}
exports.GenerateCustomPage = GenerateCustomPage;

function ModuleParseStdForm(input,parse_position,id,inputCache,parse_position) {
  parse_position += 1;
  var variables = []; // The variables governed by this form
  while (parse_position < input.length && input[parse_position] != "EndStdForm") {
    var next_var = {v:input[parse_position+1],n:input[parse_position],val:inputCache[input[parse_position+1]]};
    variables.push(next_var);
	parse_position += 2;
  }
  var code = "<script>" +
         "angular.module('customApp').controller('Controller"+parse_position+"', ['$scope', '$http', function($scope,$http) {" +
         "$scope.vars = "+JSON.stringify(variables)+";" +
         "$scope.update_input = function() {" +
         "$http({method:'POST',url:'/custom_update',data:{operation:'set_vars',data:$scope.vars}})." +
         "success(function(data, status, headers, config) {})." +
         "error(function(data, status, headers, config) {});" +
         "};" +
         "}]);" +
         "</script>\n";
  code += "<div ng-controller='Controller"+parse_position+"'>" +
             "<form ng-submit='update_input()'>" +
             "<div ng-repeat='var in vars'>" +
             "{{var.n}}: <input type ='text' ng-model='var.val'>" +
             "</div>" +
             "<input class='btn-primary' type='submit' value='Update'>" +
             "</form>" +
             "</div>\n";
  return {new_position: parse_position+1, code:code};
}

function ModuleParseToggle(input, parse_position, id, inputCache,parse_position) {
  parse_position += 1;
  var variables = []; // The data and initial values associated with the modules
  var name2num = {}; // This object indicates the number in the variables list for each module
  var index = 0; // The variable index
  while (input[parse_position] != "EndToggle") {
    var module = rpg.Modules[input[parse_position+1]]; // Here we assume that the RPG template is being used.  This will have to change later.    
    var status = inputCache[module.v];
    if (!status) {status = 0;}
    variables.push({status:status, name:module.name, var_name:module.v, i:index, dep:module.dep, preq:module.preq});
    name2num[module.v] = index;
    index += 1;
    parse_position += 2;
  }
  var code = "<script>\n" +
         "angular.module('customApp').controller('Controller"+parse_position+"', ['$scope', '$http', function($scope,$http) {\n" +
           "$scope.status_next_names = ['Enable','Disable'];\n" +
           "$scope.status_names = ['Disabled.','Enabled.'];\n" +
           "$scope.status_colors = ['red','blue'];\n" +
           "$scope.vars = "+JSON.stringify(variables)+";\n" +
           "$scope.name2num = "+JSON.stringify(name2num)+";\n" +
           "$scope.toggle = function(i) {\n" + // Called when the Enable/Disable button is clicked for module i
             "$scope.vars[i].status = 1-$scope.vars[i].status\n" +
             "$http({method:'POST',url:'/custom_update',data:{operation:'set_vars',data:[{v:$scope.vars[i].var_name, val:$scope.vars[i].status}]}}).\n" +
             "success(function(data, status, headers, config) {}).\n" +
             "error(function(data, status, headers, config) {});\n" +
           "};\n" +
           "$scope.visible = function(i) {\n" + // Indicates whether module i can be switched
             "return ($scope.missing_prereqs(i).length == 0);\n" +
           "};\n" +
           "$scope.missing_prereqs = function(i) {\n" + // Identify the modules that need to be changes to change i
             "var missing = [];" +
             "if ($scope.vars[i].status == 0) {\n" +
               "for (var j=0; j<$scope.vars[i].dep.length; j++) {\n" +
                 "var k = $scope.name2num[$scope.vars[i].dep[j]];\n" +
                 "if (typeof k !== undefined && $scope.vars[k].status == 0) {missing.push(k);}\n" +
               "}\n" +
             "}\n" +
             "if ($scope.vars[i].status == 1) {\n" +
               "for (var j=0; j<$scope.vars[i].preq.length; j++) {\n" +
                 "var k = $scope.name2num[$scope.vars[i].preq[j]];\n" +
                 "if (typeof k !== undefined && $scope.vars[k].status == 1) {missing.push(k);}\n" +
               "}\n" +
             "}\n" +
             "return missing;" +
           "}\n" +
           "$scope.message = function(i) {\n" + // The message, if any, indicated what needs to happen to change module i
             "var missing = $scope.missing_prereqs(i);\n" +
             "if (missing.length == 0) {return '';}\n" +
             "var message = ' Requires ';\n" +
             "if ($scope.vars[i].status) {message = ' Required for '}\n" +
             "for (var j=0; j<missing.length; j++) {\n" +
               "message += $scope.vars[missing[j]].name;\n" +
               "if (j == missing.length-1) {message += '.'} else {message += ', '}\n" +
             "}\n" +
             "return message;\n" +
           "}\n" +
         "}]);\n" +
         "</script>\n";
  code += "<div ng-controller='Controller"+parse_position+"'>\n" +
             "<div ng-repeat='var in vars'>\n" +
             "{{var.name}}" +
             "<form ng-submit='toggle(var.i)' ng-show='visible(var.i)' style='display: inline'>\n" +
             "<input class='btn-primary' type='submit' value='{{status_next_names[var.status]}}'>\n" +
             "</form>\n" +
             "<font color='{{status_colors[var.status]}}'> ({{status_names[var.status]}}{{message(var.i)}})</font>" +
             "</div>\n" +
             "</div>\n";
  return {new_position: parse_position+1, code:code};
/*  
  var module = rpg.Modules[input[parse_position+2]]; // Here we assume that the RPG template is being used.  This will have to change later.
  var status = "Disabled";
  if (inputCache[module.v]) {status = "Enabled";}
  var action = "Enable";
  if (status == "Enabled") {action = "Disable";}
  var next_value = "1";
  if (status == "Enabled") {next_value="";}
  var missing_requirements = []; // A list of modules that need to be set/unset in order to change this one.
  if (status == "Disabled") {
	for (var i=0; i<module.dep.length;i++) {
	  if (!inputCache[module.dep[i]]) {missing_requirements.push(module.dep[i]);}
	}
  }
  else {
	for (var i=0; i<module.preq.length;i++) {
      if (inputCache[module.preq[i]]) {missing_requirements.push(module.preq[i]);}
	}
  }
	
  var code = module.name + "  " +
    "<form name=\"input_" + parse_position + "\" style='display: inline' action=\"input_update\" method=\"post\">" +
    "<input type=\"hidden\" name=\"template\" value=\""+id.toString()+"\">" +
    "<input type=\"hidden\" name=\"" + module.v + "\" value='"+next_value+"'>" +
    "<input type=\"hidden\" name='variable_names' value='"+JSON.stringify([module.v])+"'>";
  if (missing_requirements.length == 0) {
    code += "<input type=\"submit\" name=\"submitform\" value=\""+action+"\">";
  }
  code += "</form>";
  var extra_message = "";
  var fcolor = "red";
  if (status == "Disabled") {
    if (missing_requirements.length > 0) {
	  extra_message = "Requires";
	  for (var i=0; i<missing_requirements.length;i++) {
	    extra_message += " " + missing_requirements[i];
		if (i == missing_requirements.length-1) {extra_message += ".";}
		else {extra_message += ",";}
	  }
	}
  }
  if (status == "Enabled") {
    fcolor="blue";
	if (missing_requirements.length > 0) {
	  extra_message = "Required for"
	  for (var i=0; i<missing_requirements.length;i++) {
	    extra_message += " " + missing_requirements[i];
		if (i == missing_requirements.length-1) {extra_message += ".";}
		else {extra_message += ",";}
	  }
	}
  }
  code += "<font color='"+fcolor+"'>  ("+status+") "+extra_message+"</font><br>";
  return {new_position: parse_position+3, code:code};*/
}

function ModuleParseCreate(input,parse_position,id,inputCache,parse_position) {
  var code = "<form name=\"input_" + parse_position + "\" action=\"input_update\" method=\"post\">" +
	"<input type=\"hidden\" name=\"template\" value=\""+id.toString()+"\">" +
    "<input type=\"hidden\" name='create' value='1'>" +
    "<input type=\"submit\" name=\"submitform\" value=\"Create!\"></form>";
  return {new_position: parse_position+1, code:code};
}

var ModuleParseFunctions = {StdForm:ModuleParseStdForm, Toggle:ModuleParseToggle, Create:ModuleParseCreate};

// This function parses top level sequences in the input array for the Module input format
function ModuleParse(input,parse_position,id,inputCache) { // id is for the template
  if (ModuleParseFunctions[input[parse_position]]) {
    return ModuleParseFunctions[input[parse_position]](input,parse_position,id,inputCache,parse_position);
  }
  console.log("Warning: unrecognized Module code " + input[parse_position] + " at position " + parse_position);
  return {new_position:parse_position+1, code: ""}; // Unrecognized object, skip one element in the array and hope for the best
}

function CreateNewGame(request, response, user_data) {
	var inputCache = {};
	if (user_data.inputCache) {inputCache = JSON.parse(user_data.inputCache);}
	var game_data = rpg.makeRPG(inputCache);
	// Export the game
	var new_game = new dbManager.Games(game_data);
	new_game.save(function(err) {
		dbManager.Games.findById(new_game, function (err, game) {
			user_data.myGames.push(game.id);
			if (user_data.inputCache ) {user_data.inputCache = JSON.stringify({template: user_data.inputCache.template,clear:1})} // Mostly clear the cache upon creating the game
			else {user_data.inputCache = JSON.stringify({template: request.body.template,clear:1})}
			user_data.save();
			var graph = rpg.makeGraph(dbManager.store, inputCache, game.id);
			dbManager.store.insert(graph, function(success) {response.redirect("/")});
		});
	});
}

// Update the input form and remain there
function UpdateInputPage(request,response) {
	var user = "public";
	if (request.user) {user = request.user.username}
	dbManager.UserData.findOne({username: user}, function(err,user_data) {
		if (request.body.create) { // Create a new game from data.  Should probably be spun off to a new function
			CreateNewGame(request,response,user_data);
			return;
		}
    var new_cache = {};
	if (user_data.inputCache) {new_cache = JSON.parse(user_data.inputCache);}
	if (!new_cache.template) {new_cache.template = request.body.template;}
	// Eventually we will need more general instructions on how to update the cache from input.
	variable_names = JSON.parse(request.body.variable_names);
	for (var i = 0; i < variable_names.length; i++) {
		var vn = variable_names[i];
		new_cache[vn] = request.body[vn];
	}
    user_data.inputCache = JSON.stringify(new_cache);
	user_data.save(function(err) {
		response.redirect(307,"/custom_u");
	});
  });
}
exports.UpdateInputPage = UpdateInputPage;

// Process the input page
function ProcessInputPage(request, response, output)
{
  if (!Array.isArray(output)) {
    response.send("Error: Output is not an array.");
	return;
  }
  if (output.length == 0) {
    response.send("Error: Output has zero length.");
	return;
  }
  else if (output[0] == "RPG2") {
	var game_data = rpg.makeRPG(request.body);
    // Export the game
	var new_game = new dbManager.Games(game_data);
    new_game.save(function(err) {
      dbManager.Games.findById(new_game, function (err, game) {
        dbManager.UserData.findOne({username: request.user.username}, function(err,user_data) {
          user_data.myGames.push(game.id);
          user_data.save();
          var content = h.game_fn({"initCode": game.gameCode, "gameID":game.id, "name":game.name, "game": game});
		  var graph = rpg.makeGraph(dbManager.store, request.body, game.id);
		  dbManager.store.insert(graph, function(success) {response.send(content);});
        });
      });
    });
  }
  else {response.send("Unrecognized template")}
}
exports.ProcessInputPage = ProcessInputPage;

// Make or replace the template with the given name.
function MakeTemplate(name,i,o) {
  dbManager.Templates.findOne({name: name}, function(err,template_data) {
    if (template_data) {
	  template_data.i = i;
      template_data.o = o;
      template_data.save();
	}
	else {
	  var new_template = new dbManager.Templates( {name:name, i: i, o: o} );
	  new_template.save();
	}
  });
}

// Delete the template of the given name if there is one.
function DeleteTemplate(name) {
  dbManager.Templates.findOne({name: name}).remove();
}

function MakeClass(name,data) {
  dbManager.Assets.findOne({name: name}, function(err,asset_data) {
    if (asset_data) {
	  asset_data.data = data;
	  asset_data.markModified('data');
	  asset_data.save();
	}
	else {
	  var new_asset = new dbManager.Assets( {name:name, data:data} );
	  new_asset.save();
	}
  });
}

function SetInteractionClass(b1,b2,i) {
  dbManager.Assets.find().select('name _id').where('name').in([b1,b2,i]).exec(function(err,assets) {
    var ids = [0,0,0];
	for (asset in assets) {
	  if (assets[asset].name == b1) {ids[0] = assets[asset]._id;}
	  if (assets[asset].name == b2) {ids[1] = assets[asset]._id;}
	  if (assets[asset].name == i) {ids[2] = assets[asset]._id;}
	}
	if (!ids[0] || !ids[1] || !ids[2]) {console.log("Error adding interaction triple: some class not defined.");return;}
	var graph = dbManager.store.rdf.createGraph();
	dbManager.AddTriple(graph,dbManager.store,ids[0].toString(), "interact1", ids[2].toString());
	dbManager.AddTriple(graph,dbManager.store,ids[1].toString(), "interact2", ids[2].toString());
	dbManager.store.insert(graph, function(success) {if (!success) {console.log("Problem add triples");}});
  });
}

function Update(db)
{
  if (require.cache[__dirname+"\\rpg2.js"]) {delete require.cache[__dirname+"\\rpg2.js"];}
  rpg = require("./rpg2.js");
  rpg.h = h;
  dbManager = db;
  
  var rpg_input_list = ["Modules","StdForm","Name ","name","Size ","size","EndStdForm","Toggle"];
  for (var i=0; i<rpg.Modules.length; i++) {
	rpg_input_list.push("rpg"); // The name of the module
	rpg_input_list.push(String(i)); // The inputCache variable associated with the module
  }
  rpg_input_list.push("EndToggle");
  rpg_input_list.push("Create");
  MakeTemplate("RPG",rpg_input_list,["RPG2"]);
}
exports.Update = Update;

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Everything after this line is the old, hard-coded templates, which are now considered obsolete.
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function rootTemplate(inputs) {
  return {"code":inputs.initCode};
}
var root = {"name": "Root", "inputs": ["initCode"], "fn": rootTemplate};

function redSquareTemplate(inputs) {
  var x = parseInt(inputs.rectX);
  var y = parseInt(inputs.rectY);
  if (x < 20 || x > 200 || isNaN(x)) {x=40;}
  if (y < 20 || y > 200 || isNaN(y)) {y=40;}

  return {"code": h.MakeScript(h.DrawRect("'#FF0000'", "20", "20", x.toString(), y.toString()))};
}
var redSquare = {"name": "Red Square", "inputs": ["rectX", "rectY"], "fn": redSquareTemplate};

function clickTemplate(inputs) {
  var mouseCode = h.DrawRect("'#00FF00'", "x-5", "y-5", "10", "10");
  return {"code": h.MakeScript(h.MouseFunc(mouseCode))};
}
var click = {"name": "Click", "inputs": [], "fn": clickTemplate};

function exSquareTemplate(inputs) {
  var initCode = h.InitVariables([["x","25"],["y", "50"]]);
  code = h.DrawRect("'#0000FF'", "0", "0", "x", "y") + "x += 1;" + "y += 1;";
  initCode += h.Interval(code,30);
  return {"code": h.MakeScript(initCode)};
}
var exSquare = {"name": "Expanding Square", "inputs": [], "fn": exSquareTemplate};

function dispImgTemplate(inputs) {
  var initCode = h.LoadImage("treeImg", "/img/tree.jpg");
  var dispCode = h.DrawImage("treeImg","0","0");
  dispCode = h.Interval(dispCode,30);
  initCode += dispCode;
  return {"code":h.MakeScript(initCode)};
}
var dispImg = {"name": "Display Image", "inputs": [], "fn": dispImgTemplate};

function keyTemplate(inputs) {
  var keyCode = h.DrawRect("'#FFFFFF'","0","0","400","300") +
                h.DrawRect("'#'+('00000'+(keyCode*7777777 % 16777216).toString(16)).slice(-6)", "0", "0", "100", "100") + 
                h.DrawText("'#000000'","'30px Arial'", "keyCode", "150","50");
  return {"code":h.MakeScript(h.KeyFunc(keyCode))};
}
var key = {"name": "Key", "inputs": [], "fn": keyTemplate};
exports.t = {"Root": root, "Red Square": redSquare, "Click": click, "Expanding Square": exSquare, "Display Image": dispImg, "Key": key};

function countTemplate(inputs) {
  var varCode = h.InitVariables([["numClick","0"],["numKey","0"]]) + "\n" +
                "function load_func() {\n" +
                "console.log(this.response)\n" +
                "if (this.response) {" +
                "rjson = JSON.parse(this.response);" +
                "numClick = rjson.numClick;" +
                "numKey = rjson.numKey;" +
                "}\n" + "}\n" +
                "var reqString = JSON.stringify({'gameID':gameID, 'operation':'load'});\n" +
                h.HTTPreq("reqString", "load_func");
  var displayCode = h.DrawRect("'#FFFFFF'","0","0","400","300") +
                    h.DrawText("'#000000'","'30px Arial'", "'Clicks: ' + numClick","50","50") +
                    h.DrawText("'#000000'","'30px Arial'", "'Keys: ' + numKey","50","100");
  var keyCode = "if (keyCode == 83) {" +
                "var reqString = JSON.stringify({'gameID':gameID, 'operation': 'save', 'numClick':numClick, 'numKey':numKey});" +
                h.HTTPreq("reqString") +
                "} else { numKey += 1;}";
  var keyCode = h.KeyFunc(keyCode);
  var mouseCode = h.MouseFunc("numClick += 1;");
  displayCode = h.Interval(displayCode,30);
  function http_func(req_body, game, response) {
    if (req_body.operation == "load") {
      return game.saveData;
    }
    else if (req_body.operation == "save") {
      game.saveData = JSON.stringify(req_body);
      game.save();
      return "";
    }
    return "";
  }
  return {"code":h.MakeScript(varCode + keyCode + mouseCode + displayCode), "http_func":http_func};
}
var count = {"name": "Counter", "inputs": [], "fn": countTemplate};
exports.t["Counter"] = count;
