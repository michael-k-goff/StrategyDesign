var jade = require("jade");
var fs = require("fs");
exports.fs = fs;
h = this;

// The bag of objects template
function BagOfObjects(ObjectList,request,response,dbManager,h) {
    var BaseClasses = []; // Set up names and numbers of the base classes
	var BaseClassNumbers = {};
	for (var i=0; i<ObjectList.length; i++) {
	  BaseClasses.push(ObjectList[i][0]);
	  BaseClassNumbers[ObjectList[i][0]] = ObjectList[i][1].length;
	}
    dbManager.Assets.find().where('name').in(BaseClasses).exec(function(err, assets) { // Load the base classes
	  var class_list = ""; // Set up the SPARQL query for identifying interaction classes
	  for (var i=0; i<assets.length; i++) {
	    if (i>0) {class_list += ", ";}
	    class_list += "<" + assets[i]._id + ">";
	  }
	  dbManager.store.execute("SELECT ?s1 ?s2 ?o WHERE { ?s1 <interact1> ?o . ?s2 <interact2> ?o . FILTER(?s1 IN ("+class_list+") && ?s2 IN ("+class_list+") && ?s1 != ?s2 )}",
	              function(success, interaction_classes){ // SPARQL query for interaction classes
		var iClassesIds = []; // Set up to load interaction classes
        for (var i=0; i<interaction_classes.length; i++) {
		  iClassesIds.push(interaction_classes[i].o.value);
		}
		dbManager.Assets.find().where('_id').in(iClassesIds).exec(function(err, interaction_assets) { // Load interaction classes
		  for (var i=0; i<interaction_assets.length; i++) { // Merge class assets
		    assets.push(interaction_assets[i]);
		  }
		  var initCode = h.KeyManager() + h.BuildClasses(assets, 1) + "\n"; // Generate code to build classes
		  initCode += "var numNewObj = 0;\n"; // Number of new objects created so far.
		  initCode += "function NewObj(class_name, params) {\n" + // The object creation function
		              "var newObjStr = 'Objects.new_object_'+numNewObj.toString()+'= new '+class_name+'('+JSON.stringify(params)+');';eval(newObjStr);\n" +
					  "Objects['new_object_'+numNewObj.toString()].interactions = [];" +
					  "Objects['new_object_'+numNewObj.toString()].type = class_name;" +
					  "Objects['new_object_'+numNewObj.toString()].address = 'new_object_'+numNewObj.toString();\n" +
					  "for (var i = 0; i < Interact1List[class_name].length; i++) {\n" +
					    "var int_class = Interact1List[class_name][i][1];\n" +
					    "var other_class = Interact1List[class_name][i][0];\n" +
						"for (var j = 0; j < BaseClassLists[other_class].length; j++) {\n" +
						  "var other_object = BaseClassLists[other_class][j];\n" +
						  "var new_int_name = 'new_object1_'+numNewObj.toString()+'_'+i.toString()+'_'+j.toString();\n" +
						  "newObjStr = 'Objects[new_int_name] = new ' + int_class + '({var'+class_name+':Objects.new_object_'+numNewObj.toString()+',var'+other_class+':Objects[other_object]})';\n" +
						  "eval(newObjStr);\n" +
						  "Objects['new_object_'+numNewObj.toString()].interactions.push(new_int_name);\n" +
						  "Objects[new_int_name].BaseClass1 = 'new_object_'+numNewObj.toString();\n" +
						  "Objects[other_object].interactions.push(new_int_name);\n" +
						  "Objects[new_int_name].BaseClass2 = other_object;\n" +
						"}" +
					  "}" +
					  "for (var i = 0; i < Interact2List[class_name].length; i++) {\n" +
					    "var int_class = Interact2List[class_name][i][1];\n" +
					    "var other_class = Interact2List[class_name][i][0];\n" +
						"for (var j = 0; j < BaseClassLists[other_class].length; j++) {\n" +
						  "var other_object = BaseClassLists[other_class][j];\n" +
						  "var new_int_name = 'new_object2_'+numNewObj.toString()+'_'+i.toString()+'_'+j.toString();\n" +
						  "newObjStr = 'Objects[new_int_name] = new ' + int_class + '({var'+class_name+':Objects.new_object_'+numNewObj.toString()+',var'+other_class+':Objects[other_object]})';\n" +
						  "eval(newObjStr);\n" +
						  "Objects['new_object_'+numNewObj.toString()].interactions.push(new_int_name);\n" +
						  "Objects[new_int_name].BaseClass2 = 'new_object_'+numNewObj.toString();\n" +
						  "Objects[other_object].interactions.push(new_int_name);\n" +
						  "Objects[new_int_name].BaseClass1 = other_object;\n" +
						"}" +
					  "}" +
		              "numNewObj += 1;}\n";
		  initCode += "function ObjDel(address) {\n" + // The object deletion function
		              "if (!Objects[address]) {return;}\n" +
					  "if (Objects[address].BaseClass1) {ClearInteraction(Objects[address].BaseClass1,address);}\n" +
					  "if (Objects[address].BaseClass2) {ClearInteraction(Objects[address].BaseClass2,address);}\n" +
		              "var arr = BaseClassLists[Objects[address].type];" +
					  "for (var i in arr) {" +
					  "if (arr[i] == address) {arr.splice(i,1);break;}" +
					  "}" +
		              "if (Objects[address].interactions) {" +
					  "for (var i=0; i<Objects[address].interactions.length; i++) {ObjDel(Objects[address].interactions[i]);}}\n" +
		              "delete Objects[address];}\n\n";
		  initCode += "function ClearInteraction(base,interaction) {\n" + // Clean up the list of interaction classes
		              "if (!Objects[base]) {return;}\n" +
					  "var arr = Objects[base].interactions;"+
					  "for (var i in arr) {"+
					  "if (arr[i] == interaction) {arr.splice(i,1);break;}"+
					  "}" +
					  "}\n";
          initCode += "var Objects = {};\n"; // All game objects are in the Objects object.
		  for (var i=0; i<ObjectList.length; i++) { // Instantiate all the base objects
		    initCode += h.ClassKeyArray(ObjectList[i][0], ObjectList[i][1], 1) + "\n";
		  }
		  var IdToNameAndNumber = {};	// Dictionary to convert Class ID's to name and number of elements present
		  for (var i=0; i<assets.length; i++) {
		    IdToNameAndNumber[assets[i]._id] = [assets[i].name,0];
			if (BaseClassNumbers[assets[i].name]) {IdToNameAndNumber[assets[i]._id][1] = BaseClassNumbers[assets[i].name];}
		  }
		  initCode += "Interact1List = {};Interact2List = {};\n"; // List of which classes interact
		  for (i=0;i<BaseClasses.length;i++) {
		    initCode += "Interact1List."+BaseClasses[i]+" = [];";
			initCode += "Interact2List."+BaseClasses[i]+" = [];\n";
		  }
		  for (var i=0; i<interaction_classes.length; i++){ // Instantiate the interaction objects
		    initCode += h.InteractionClassKey(IdToNameAndNumber[interaction_classes[i].o.value][0], 
			                                  IdToNameAndNumber[interaction_classes[i].s1.value][0],
											  IdToNameAndNumber[interaction_classes[i].s1.value][1],
											  IdToNameAndNumber[interaction_classes[i].s2.value][0],
											  IdToNameAndNumber[interaction_classes[i].s2.value][1]);
		  }
    
          var disp_code = 
          // Update
          "for (object in Objects)\n" +
            "{if (typeof Objects[object].Update === 'function') {Objects[object].Update()}}\n" +
          // Draw
          "for (object in Objects)\n" +
            "{if (typeof Objects[object].Draw === 'function') {Objects[object].Draw()}}\n";
          var keyCode = "keyMan.KeyDown(keyCode);" + // Process keystrokes using a standard key manager
		                "for (object in Objects)\n" + // Key code for every object
						  "{if (typeof Objects[object].KeyFunc === 'function') {Objects[object].KeyFunc(keyCode)}}\n";
          var keyUpCode = "keyMan.KeyUp(keyCode);";
          var gameCode = h.MakeScript(initCode + h.Interval(disp_code,15) + h.KeyFunc(keyCode) + h.KeyUpFunc(keyUpCode));
          var game_data = {name: request.body.name, gameCode: gameCode, x: 640, y: 480}; // Package code and game metadata
          h.SaveAndLoadGame(request, response, dbManager, game_data); // Export
		});
	  });
    });
}
exports.BagOfObjects = BagOfObjects;

// Load a script
function LoadScript(file) {
  return "var fileref=document.createElement('script');\n" +
                "fileref.setAttribute('type','text/javascript');\n" +
                "fileref.setAttribute('src', 'loadscript/" + file + "');\n" +
				"document.getElementsByTagName('head')[0].appendChild(fileref);\n";
}
exports.LoadScript = LoadScript;

// Set an interaction class in the Objects dictionary.
// The inputs are arrays of class variables, and the input names are what goes into the input variable.
function InteractionClassKey(class_name, input_class_1, input_len_1, input_class_2, input_len_2) {
  var object_name = "Objects";
  var ret_value = "";
  var input_name_1 = "var" + input_class_1;
  var input_name_2 = "var" + input_class_2;
  var input_1 = object_name + ".inst" + input_class_1;
  var input_2 = object_name + ".inst" + input_class_2;
  ret_value += "Interact1List."+input_class_1+".push(['"+input_class_2+"','"+class_name+"']);";
  ret_value += "Interact2List."+input_class_2+".push(['"+input_class_1+"','"+class_name+"']);\n";
  for (var i=0; i < input_len_1*input_len_2; i++)
  {
    ret_value += object_name + ".inst" + class_name + "_" + i.toString() + " = new " + 
      class_name+"({"+input_name_1 +":"+input_1+"_"+Math.floor((i/input_len_2)).toString()+
      ","+input_name_2+":"+input_2+"_"+(i%input_len_2).toString()+"});\n";
	ret_value += object_name+".inst"+class_name+"_" + i.toString() + ".BaseClass1 = 'inst"+input_class_1 + "_" + Math.floor((i/input_len_2)).toString()+"';\n";
	ret_value += object_name+".inst"+class_name+"_" + i.toString() + ".BaseClass2 = 'inst"+input_class_2 + "_" + Math.floor((i%input_len_2)).toString()+"';\n";
	ret_value += object_name + ".inst" + input_class_1 + "_" + Math.floor((i/input_len_2)).toString()+".interactions.push(\"inst" +
	  class_name + "_" + i.toString() + "\");\n";
	ret_value += object_name + ".inst" + input_class_2 + "_" + Math.floor((i%input_len_2)).toString()+".interactions.push(\"inst" +
	  class_name + "_" + i.toString() + "\");\n";
  }
  return ret_value;
}
exports.InteractionClassKey = InteractionClassKey;

// Set an interaction class.  The inputs are arrays of class variables, and the input names are what goes into the input variable.
function SetInteractionClass(var_name, class_name, input_name_1, input_1, input_len_1, input_name_2, input_2, input_len_2) {
  var ret_value = "var " + var_name + " = new Array();";
  for (var i=0; i < input_len_1*input_len_2; i++)
  {
    ret_value += var_name + "[" + i.toString() + "] = new "+class_name+"({"+input_name_1 +":"+input_1+"["+Math.floor((i/input_len_2)).toString()+"]"+
      ","+input_name_2+":"+input_2+"["+(i%input_len_2).toString()+"]"+"});"
  }
  ret_value += "\n";
  return ret_value;
}
exports.SetInteractionClass = SetInteractionClass;

// A standard class to keep track of which keys are down
function KeyManager() {
  return MakeClass("KeyMan", [], "this.keys = [];") +
        SetMethod("KeyMan", "KeyDown", ["key"], "if (this.keys.indexOf(key) < 0) {this.keys.push(key);}") +
        SetMethod("KeyMan", "Query", ["key"], "return this.keys.indexOf(key) != -1;") +
        SetMethod("KeyMan", "KeyUp", ["key"], "for (var i=this.keys.length; i--;) {if (this.keys[i] == key) {this.keys.splice(i,1);}}") +
        ClassVar("keyMan", "KeyMan", []);
}
exports.KeyManager = KeyManager;

// From class data (assets), as formatted for standard class assets, build code to create classes.  No instances created
function BuildClasses(assets, keep_lists) { // keep_lists is a binary variable that indicates whether master lists of base classes should be kept
  class_code = "";
  if (keep_lists) {
    class_code = "var BaseClassLists = {};\n";
  }
  for (i = 0; i < assets.length; i++) {
    class_code += MakeClass(assets[i].name, ["input"], eval(assets[i].data.init));
    for (var method_name in assets[i].data) {
      if (method_name != "init") {
        class_code += SetMethod( assets[i].name, method_name, ["input"], eval(assets[i].data[method_name]) );
      }
    }
  }
  return class_code;
}
exports.BuildClasses = BuildClasses;


// From class data (asset), as formatted in a standard class asset, build the code to create a class and some instances
// The instances are formatted {name1: input1, ...}
// The array parameter indicates whether the instances values should be interpreted as arrays of or single input objects.
function BuildClass(asset, instances, array) {
  class_code = MakeClass(asset.name, ["input"], eval(asset.data.init));
  for (var method_name in asset.data) {
    if (method_name != "init") {
      class_code += SetMethod( asset.name, method_name, ["input"], eval(asset.data[method_name]) );
    }
  }
  for (var inst in instances) {
    if (array) {
      class_code += ClassVarArray(inst, asset.name, instances[inst]);
    }
    else {
      class_code += ClassVar(inst, asset.name, instances[inst]);
    }
    
  }
  return class_code;
}
exports.BuildClass = BuildClass;

function ReadFile(path, callback) {
  fs.readFile(path, function(err,data) {callback(err,data)});
}
exports.ReadFile = ReadFile;

function SaveFile(path, data, callback) {
  fs.writeFile(__dirname+path, data, function(err,data2) {callback(err,data2)});
}
exports.SaveFile = SaveFile;

function SimpleInputForm(inputs) // Create a simple customization form based on a list of inputs
{
  var code = "<form name=\"input\" action=\"temp\" method=\"post\">";
  for (var i=0; i<inputs.length; i++) {
    code += "<br>"+inputs[i]+": <input type=\"text\" name=\""+inputs[i]+"\">";
  }
  code += "<input type=\"hidden\" name=\"template\" value=\"#{locals.template_id}\"><br>" +
    "<input type=\"submit\" name=\"submitform\" value=\"Save\"></form>";
  return code;
}
exports.SimpleInputForm = SimpleInputForm;

function MakeClass(name, params, init_code)
{
  return "function " + name + "("+params.join()+") {"+init_code+"}\n";
  // Example: "function Background(x,y) {this.x = x; this.y = y;}\n"
}
exports.MakeClass = MakeClass;

function SetMethod(class_name, method_name, params, code)
{
  return class_name + ".prototype." + method_name + " = function(" + params.join() + ") {" + code + "};\n";
  // Example: "Background.prototype.Draw = function() {" + h.DrawRect("'#FFFFFF'","0","0","this.x","this.y") + "};\n"
}  
exports.SetMethod = SetMethod;

function ClassVar(var_name, class_name, params)
{
  if (params.isArray) {params = params.join();}
  return "var " + var_name + " = new "+class_name+"("+params+");\n";
  // Example: "var background = new Background(800,600);\n";
}
exports.ClassVar = ClassVar;

// Like ClassVarArray, but creates a new key inside an existing variable
// The name of the variable is the name of the class, prefixed by "inst".
function ClassKeyArray(class_name, params, keep_lists) { // keep_lists is a binary variable that indicates whether lists of base classes should be kept
  var obj_name = "Objects";
  var ret_value = "";
  if (keep_lists) {
    ret_value = "BaseClassLists." + class_name + "=[];\n";
  }
  for (var i=0; i<params.length; i++)
  {
    if (params[i].isArray) {params[i].join();}
    ret_value += obj_name + ".inst" + class_name + "_" + i.toString() + " = new "+class_name+"("+params[i]+");\n"; // Create the object
	ret_value += obj_name + ".inst" + class_name + "_" + i.toString() + ".interactions = [];\n"; // Here we will store all interaction classes that use it
	ret_value += obj_name + ".inst" + class_name + "_" + i.toString() + ".type = \""+class_name+"\";\n";
	ret_value += obj_name + ".inst" + class_name + "_" + i.toString() + ".address = \"inst"+class_name+"_"+i.toString()+"\";\n";
	if (keep_lists) {
	  ret_value += "BaseClassLists." + class_name + ".push(\"inst" + class_name + "_" + i.toString() + "\");\n";
	}
  }
  return ret_value;
}
exports.ClassKeyArray = ClassKeyArray;

function ClassVarArray(var_name, class_name, params)
{
  var ret_value = "var " + var_name + " = new Array();";
  for (var i=0; i<params.length; i++)
  {
    if (params[i].isArray) {params[i].join();}
    ret_value += var_name + "[" + i.toString() + "] = new "+class_name+"("+params[i]+");"
  }
  ret_value += "\n";
  return ret_value;
}
exports.ClassVarArray = ClassVarArray;

// Save a game with the code generated and redirect the user to a new instance.
var gameTemp = fs.readFileSync("template.jade");
var game_fn = jade.compile(gameTemp);
exports.game_fn = game_fn;
function SaveAndLoadGame(request, response, dbManager, game_code) {
  var new_game = new dbManager.Games(game_code);
  new_game.save(function(err) {
    dbManager.Games.findById(new_game, function (err, game) {
      dbManager.UserData.findOne({username: request.user.username}, function(err,user_data) {
        user_data.myGames.push(game.id);
        user_data.save();
        var content = game_fn({"initCode": game.gameCode, "gameID":game.id, "name":game.name, "game": game});
        response.send(content);
      });
    });
  });
}
exports.SaveAndLoadGame = SaveAndLoadGame;

// Create an HTTP request
function HTTPreq(request_string, load_func)
{
  var httpreq = "xmlhttp = new XMLHttpRequest();\n" +
                "xmlhttp.open('POST','/comm',true);\n";
  if (load_func) {httpreq += ("xmlhttp.onload = " + load_func + ";\n");}
  httpreq +=    "xmlhttp.setRequestHeader('Content-type', 'application/json; charset=utf-8');\n" +
                "xmlhttp.send(" + request_string + ");\n";
  return httpreq;
}
exports.HTTPreq = HTTPreq

// Generate JavaScript tags around a string of code
function MakeScript(code) {
  return '<script type="text/javascript">' + code + '</script>';
}

// Generate the function for a mouse click around some code
function MouseFunc(code) {
  return 'function Mouse(e) {' + 'var x = e.x-canv.offsetLeft;' + 'var y = e.y-canv.offsetTop;' + code + '}' + 'canv.onmousedown=function(e) {Mouse(e);};';
}

// Generate function for an onkeydown event around some code 
function KeyFunc(code) {
  return 'function OnKeyDown(e) {' + 'var keyCode = e.keyCode;' + code + '}' + 'window.onkeydown=function(e) {OnKeyDown(e);};';
}

// Generate function for an onkeyup event around some code 
function KeyUpFunc(code) {
  return 'function OnKeyUp(e) {' + 'var keyCode = e.keyCode;' + code + '}' + 'window.onkeyup=function(e) {OnKeyUp(e);};';
}
exports.KeyUpFunc = KeyUpFunc;

function DrawRect(color, x, y, w, h) {
  return 'ctx.fillStyle=' + color + ';' + 'ctx.fillRect(' + x + ',' + y + ',' + w + ',' + h +');\n';
}

function DrawText(color, font, text, x, y) {
  return 'ctx.fillStyle=' + color + ';' + 'ctx.font=' + font + ';' + 'ctx.fillText(' + text + ',' + x + ',' + y +');';
}

function InitVariables(var_list) {
  var ret_value = "";
  for (var i=0; i<var_list.length; i++) {
    next_line = "var " + var_list[i][0] + " = " + var_list[i][1] + ";";
    ret_value += next_line;
  }
  return ret_value;
}

function Interval(code,ms) {
  ret_value = "setInterval(intervalMethod," + ms.toString() + ");";
  ret_value += "function intervalMethod() {";
  ret_value += code;
  ret_value += "}";
  return ret_value;
}

function LoadImage(name,url) {
  ret_value = 'gameImages["' + name + '"] = new Image();' +
    'gameImages["' + name + '"].onload = function() {'+
      'gameImages["' + name + '"].loaded = true;' +
    '};' +
    'gameImages["' + name + '"].loaded = false;' +
    'gameImages["' + name + '"].src = "' + url + '";';
  return ret_value;
}

function DrawImage(name, x, y) {
  ret_value = 'if (gameImages["' + name + '"].loaded) {' +
    'ctx.drawImage(gameImages["' + name + '"],'+x+','+y+');' + "}";
  return ret_value;
}

exports.MakeScript = MakeScript;
exports.MouseFunc = MouseFunc;
exports.DrawRect = DrawRect;
exports.InitVariables = InitVariables;
exports.Interval = Interval;
exports.LoadImage = LoadImage;
exports.DrawImage = DrawImage;
exports.KeyFunc = KeyFunc;
exports.DrawText = DrawText;
