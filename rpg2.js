fs = require("fs");

// A list of modules associated with the RPG template
var Modules = [{v:"key",file:"rpg_key.js",name:"Keyboard",auto:1},
               {v:"ai",file:"rpg_ai.js",name:"AI",auto:1},
               {v:"state",file:"rpg_state.js",name:"State System",auto:1,dep:["key","ai"]},
               {v:"menu",file:"rpg_menu.js",name:"Menu",auto:1,dep:["state"]},
               {v:"map",file:"rpg_map.js",name:"Map",auto:1,dep:["state"]},
               {v:"mainmenu",file:"rpg_mainmenu.js",name:"Main Menu",auto:1,dep:["menu"]},
               {v:"stats",file:"rpg_stats.js",name:"Stats",auto:1,dep:["map","menu"]},
               {v:"status",file:"rpg_status.js",name:"Status",auto:1,dep:["mainmenu"]},
               {v:"save",file:"rpg_save.js",name:"Save",auto:1,dep:["mainmenu"]},
               {v:"warps",file:"rpg_warps.js",name:"Map Warps",auto:1,dep:["map"]},
               {v:"conversation",file:"rpg_conv.js",name:"Conversation",auto:1,dep:["map"]},
               {v:"battle",file:"rpg_battle.js",name:"Battle",auto:1,dep:["map","stats"]},
               {v:"boss",file:"rpg_boss.js",name:"Boss",auto:1,dep:["battle"]},
               {v:"ending",file:"rpg_ending.js",name:"Ending",auto:1,dep:["state"]},
               {v:"town",file:"rpg_town.js",name:"Town",auto:1,dep:["map","menu"]},
               {v:"inn",file:"rpg_inn.js",name:"Inn",auto:1,dep:["town","stats"]},
			   {v:"items",file:"rpg_items.js",name:"Items",dep:["town","stats"]},
               {v:"magic",file:"rpg_magic.js",name:"Magic",dep:["stats"]},
               {v:"equip",file:"rpg_equip.js",name:"Equipment",dep:["battle","town","stats"]}];
// Given dependencies above, build the list of prerequisites as well
var PreReqs = {};
for (var i=0; i<Modules.length; i++) { // Set up prerequisite variables
  PreReqs[Modules[i].v] = [];
}
for (var i=0; i<Modules.length; i++) { // Fill in the list of dependencies
  if (Modules[i].dep) {
    for (var j=0; j<Modules[i].dep.length; j++) {
	  PreReqs[Modules[i].dep[j]].push(Modules[i].v);
    }
  }
  else {Modules[i].dep = [];} // For uniformity, create an empty dependency list
}
for (var i=0; i<Modules.length; i++) { // Fill in the dependencies in the module object
  Modules[i].preq = PreReqs[Modules[i].v];
}
exports.Modules = Modules;

function makeRPG(input) {
  var varCode = fs.readFileSync("rpg_code.js") + fs.readFileSync("rpg_graphics.js") + fs.readFileSync("rpg_controller.js");
  for (var i=0; i<Modules.length; i++) {
    if (input[Modules[i].v]) {varCode += fs.readFileSync(Modules[i].file);}
  }
  function http_func(req_body, game, response, dbManager, templates) {
	templates.http_func(req_body, game, response, dbManager, ["rpg2"]);
  }
  var gameCode = "<canvas id='glCanvas' width='640' height='480' style='border:1px solid #000000;position: fixed; left: 10; top: 200; z-index: 0;'></canvas>" +
	       "<script type='text/javascript' src='/loadscript/glMatrix-0.9.5.min.js'></script>" +
	       h.MakeScript(varCode);
	
  return {name: input.name, gameCode: gameCode, http_func: http_func, x: 640, y: 480}; // Package code and game metadata
}
exports.makeRPG = makeRPG;

function AddImage(bnode, graph, store, img) {
  graph.add(store.rdf.createTriple(bnode, 
			                 store.rdf.createNamedNode("HasTerrain"),
							 store.rdf.createNamedNode(img)));
}

function AddTriple(bnode, graph, store, pred, obj) {
  // This method of converting " to ' in a JSON object is inefficient.  Look for a better way.
  graph.add(store.rdf.createTriple(bnode, 
			                 store.rdf.createNamedNode(pred),
							 store.rdf.createLiteral(obj.replace(/"/g,"'"))));
}

function AttachID(bnode,graph,store,gameid) { // Attach the game ID to a node
  graph.add(store.rdf.createTriple(bnode, 
			                 store.rdf.createNamedNode("InGame"),
							 store.rdf.createNamedNode(gameid)));
}

function makeGraph(store, input, gameid)
{
    var graph = store.rdf.createGraph();
	var bnode = store.rdf.createBlankNode();
	AttachID(bnode,graph,store,gameid);
	
	if (isNaN(input.size)) {input.size = 5;}
	if (!input.size || input.size < 1 || input.size > 1000) {input.size = 5;}
	
	var imglist =["water.jpg","tree.jpg","heroup.jpg","herodown.jpg","heroright.jpg","heroleft.jpg","person.jpg","alien.jpg","alien.jpg","bunny.jpg","spider.jpg","ship.jpg","blob.jpg",
	  "town.jpg","warp.jpg","treemonster.jpg","desert.jpg","grass.jpg","mountain.jpg","ice.jpg","tundra.jpg"];
	for (var img in imglist) {AddImage(bnode,graph,store,imglist[img]);}
	EnemyList = MakeEnemies(bnode,graph,store,input);
	MakeMaps(bnode, graph, store, input, gameid, EnemyList);
	AddTriple(bnode, graph,store,"HasTilesets",MakeTilesets(input));
	return graph;
}
exports.makeGraph = makeGraph;

function MakeMapStructure(size) {
  var slot_opposites = {N: "S", S: "N", W: "E", E: "W"};
  var slots = [[0,"N"],[0,"S"],[0,"W"],[0,"E"]];
  var maps = {warps:[[]], power:[0]}; // Each element in the warps array is a list of warps.  Each warp is the slot, target map, and target slot.  Each element in the power array is the strength of enemies at that map.
  for (var i = 1; i < size; i++) {
    var previous_slot = (Math.round((Math.random()*30000)))%(slots.length);
	var previous_pos = slots[previous_slot];
	slots.splice(previous_slot,1);
	for (var k = 0; k < 4; k++) {
	  var directions = ["N","S","E","W"];
	  if (directions[k] != slot_opposites[previous_pos[1]]) {slots.push([i,directions[k]]);}
	}
    maps.warps[previous_pos[0]].push([previous_pos[1],i,slot_opposites[previous_pos[1]]]);
	maps.warps.push([[slot_opposites[previous_pos[1]],previous_pos[0],previous_pos[1]]]);
	maps.power.push(0);
  }
  var cur_power = 1;
  for (var i = 0; i < maps.warps[0].length; i++) {
    cur_power = FillPower(maps, maps.warps[0][i][1], cur_power);
  }
  return maps;
}

function FillPower(maps, map_num, cur_power) {
  maps.power[map_num] = cur_power;
  cur_power += 1;
  for (var i = 1; i < maps.warps[map_num].length; i++) {cur_power = FillPower(maps, maps.warps[map_num][i][1], cur_power);}
  return cur_power;
}

function MakeMaps(bnode, graph, store, input, gameid, EnemyList) {
  var structure = MakeMapStructure(input.size);
  var warps = structure.warps;
  var slot_positions = {N: [10,0,"x"], S:[10,19,"x"], W: [0,10,"y"], E: [19,10,"y"]};
  var maps = [];
  for (var i = 0; i < input.size; i++) {
    var objects = [];
	var warp_positions = {E:0,W:0,S:0,N:0};
	for (var j=0; j<warps[i].length; j++) {
	  var sp = slot_positions[warps[i][j][0]];
	  warp_positions[warps[i][j][0]] = 1;
	  var dp = slot_positions[warps[i][j][2]];
	  objects.push({type: "Warp", initparams:{x:sp[0], y:sp[1], ig:sp[2], img: 0,destmap: "Overworld"+warps[i][j][1], destx: dp[0], desty: dp[1]}});
	}
	var suffix = "";
	var pow = structure.power[i];
    if (pow>0) {suffix = "+" + pow;}
    objects.push({type: "Town", initparams: {x:10,y:10,merchant:{EquipList:[["Club"+suffix,"W",10*(pow+1),pow+1],["Clothes"+suffix,"A",10*(pow+1),pow+1]],inncost:6*(pow+1),ItemList:[["Potion",1],["Hi-Potion",3]]}}});
	if (i == 0 ) {
	  var text = ["Welcome to a procedurally generated world."];
	  if (warps[i].length > 0) {text.push("First go " +warps[i][0][0] + ".");}
	  for (var k = 1; k < warps[i].length; k++) {text.push("Then go " +warps[i][k][0] + ".");}
	  objects.push({type: "Person", initparams: {x:9,y:10,text:[text]}});
	}
	else if ( i == input.size - 1) {
	  objects.push({type: "Boss", initparams: {x:9,y:10}});
	}
	else {
	  var text = ["Hi. Welcome to area " + structure.power[i] + "."];
	  if (warps[i].length > 1) {text.push("First go " +warps[i][1][0] + ".");}
	  for (var k = 2; k < warps[i].length; k++) {text.push("Then go " +warps[i][k][0] + ".");}
	  text.push("Go " + warps[i][0][0] + " to go back.");
	  objects.push({type: "Person", initparams: {x:9,y:10,text:[text]}});
	}
	// Determine terrain
	var tv = [["g","f","w"],["t","i","w"],["g","d","m"],["f","t","m"]][(Math.round((Math.random()*30000)))%4]; // Random subtileset for this map
	var t = [];
	for (var j = 0; j < 20; j++) {
	  var next_row = [];
	  for (var k = 0; k < 20; k++) {next_row.push(tv[0]);}
	  t.push(next_row);
	}
	for (var k = 0; k < 25; k++) {
	  var a = (Math.round((Math.random()*30000)))%20;
	  var b = (Math.round((Math.random()*30000)))%20;
	  t[a][b] = tv[1];
	}
	for (var j = 0; j < 7; j++) { // Put barriers against boundaries
	  for (var k = 0; k < 20; k++) {
	    if (!warp_positions["E"]) {
		  var rv = 7*Math.random()-j;
		  if (rv > 0) {t[k][19-j] = tv[2];}
		}
		if (!warp_positions["W"]) {
		  var rv = 7*Math.random()-j;
		  if (rv > 0) {t[k][j] = tv[2];}
		}
		if (!warp_positions["S"]) {
		  var rv = 7*Math.random()-j;
		  if (rv > 0) {t[19-j][k] = tv[2];}
		}
		if (!warp_positions["N"]) {
		  var rv = 7*Math.random()-j;
		  if (rv > 0) {t[j][k] = tv[2];}
		}
	  }
	}
	var border = [[tv[2],tv[2],tv[2]],[tv[2],tv[2],tv[2]],[tv[2],tv[2],tv[2]]]
	if (warp_positions["E"]) {border[1][2] = tv[0];}
	if (warp_positions["W"]) {border[1][0] = tv[0];}
	if (warp_positions["S"]) {border[2][1] = tv[0];}
	if (warp_positions["N"]) {border[0][1] = tv[0];}
	for (var j = 0; j < 3; j++) {border[j] = border[j].join("");}
	// Convert terrain arrays into tile strings
	for (var j = 0; j < 20; j++) {t[j] = t[j].join("");}
    maps.push({name: "Overworld"+i, tiles:t,map_info:{tileset:"Overtile",clamp:1,border:border, level:structure.power[i]},objects:objects, encounter: [0.1,EnemyList.power[structure.power[i]]]});
  }
  for (map in maps) {
    var mapnode = store.rdf.createBlankNode();
	AttachID(mapnode,graph,store,gameid);
	AddTriple(mapnode,graph,store,"MapName",maps[map].name);
	AddTriple(mapnode,graph,store,"HasTiles",JSON.stringify(maps[map].tiles));
	AddTriple(mapnode,graph,store,"HasObjects",JSON.stringify(maps[map].objects)); // For now, all objects bundled into one triple
	AddTriple(mapnode,graph,store,"HasEnemies",JSON.stringify(maps[map].encounter));
	AddTriple(mapnode,graph,store,"HasInfo",JSON.stringify(maps[map].map_info));
  }
  var start_data = {map:"Overworld0",x:9,y:9};
  AddTriple(bnode, graph, store, "HasStart", JSON.stringify(start_data));
}

function MakeTilesets(input) {
  var overtile = {f:["tree.jpg",1], w:["water.jpg",0], g:["grass.jpg",1], d:["desert.jpg",1], i:["ice.jpg",1], m:["mountain.jpg",0],t:["tundra.jpg",1], border: "w"};
  return JSON.stringify({Overtile: overtile});
}
function MakeEnemies(bnode,graph,store,input) {
  var Enemies = {};
  var enemy_bases = [["alien","Alien","alien.jpg"],["bunny","Bunny","bunny.jpg"],["spider","Spider","spider.jpg"],["blob","Blob","blob.jpg"]];
  var powers = [];
  for (var i = 0; i < input.size; i++) {
    var power = [];
    for (var k = 2*i; k < 2*i+2; k++) {
	  var cycle_position = [Math.floor(k / enemy_bases.length), k % (enemy_bases.length)];
	  var prefixes = ["","Kilo ", "Mega ", "Giga ", "Tera ", "Peta ", "Exa ", "Zeta ", "Yotta ", "Xena ", "Weka ", "Vendeka ", "Udeka ", "Treda ", "Sorta ", "Rinta ", "Quexa ", "Pepta ", "Ocha ", "Nena ", "Minga ", "Luma "];
	  var varname = enemy_bases[cycle_position[1]][0] + cycle_position[0];
	  var enemy_name;
	  if (cycle_position[0] >= prefixes.length) {enemy_name = cycle_position[0] + "X " + enemy_bases[cycle_position[1]][1];}
	  else {enemy_name = prefixes[cycle_position[0]] + enemy_bases[cycle_position[1]][1];}
	  var img = enemy_bases[cycle_position[1]][2];
	  var size = 1+0.5*cycle_position[0];
	  if (size > 4) {size = 4;}
	  Enemies[varname] = {name: enemy_name, id: img, HP:3*k+2-2*(k%2), Str:i+1, EXP:i*i+k+1, Gold:k+1, size: size};
	  power.push(varname);
	}
	powers.push(power);
  }
  Enemies["boss"] = {name: "Final Boss",id: "ship.jpg", HP: 3*input.size, Str: 0, EXP:0, Gold:0};
  for (enemy in Enemies) {AddTriple(bnode, graph,store,"HasEnemy",JSON.stringify([enemy,Enemies[enemy]]));}
  Enemies.power = powers;
  return Enemies;
}

// The HTTP function
function http_func(req_body, game, response, dbManager, params) {
      if (req_body.operation == "load") {
        response.send(game.saveData);
      }
      else if (req_body.operation == "save") {
        game.saveData = JSON.stringify(req_body.stats);
        game.save();
        response.send("");
      }
	  else if (req_body.operation == "get_data") {
		dbManager.store.execute("SELECT ?p ?o ?mapname WHERE {?s ?p ?o . ?s <InGame> <"+req_body.gameID+"> OPTIONAL { ?s <MapName> ?mapname }}", function(success,results) {
		  var ret_value = {images: {}, maps: {}, Enemies: []};
		  for (var i=0; i<results.length; i++) {
			if (results[i].p.value == "HasTerrain") {
			  var img64 = fs.readFileSync("images/"+results[i].o.value).toString('base64');
			  ret_value.images[results[i].o.value] = img64;
			}
			if (results[i].mapname) {
			  var name = results[i].mapname.value;
			  if (!ret_value.maps[name]) {ret_value.maps[name] = {};}
			  if (results[i].p.value == "HasTiles") {ret_value.maps[name].tiles = results[i].o.value;}
			  if (results[i].p.value == "HasObjects") {ret_value.maps[name].objects = results[i].o.value;}
			  if (results[i].p.value == "HasEnemies") {ret_value.maps[name].encounter = results[i].o.value;}
			  if (results[i].p.value == "HasInfo") {ret_value.maps[name].map_info = results[i].o.value;}
			}
			else {
	  		  if (results[i].p.value == "HasTilesets") {ret_value.tilesets = results[i].o.value;}
		  	  if (results[i].p.value == "HasEnemy") {ret_value.Enemies.push(results[i].o.value);}
			  if (results[i].p.value == "HasStart") {ret_value.StartLoc = results[i].o.value;}
			}
		  }
		  response.send(ret_value);
        });
	  }
	  else {
        response.send("");
	  }  
}
exports.http_func = http_func;