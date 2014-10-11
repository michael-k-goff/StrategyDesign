// The main map module for the RPG

// Assume the map is attached to the core state.  This may be changed later
CoreState.StatesToSuppressMap = [];
CoreDisplayPipeline.push(function() {
  if (CoreState.StatesToSuppressMap.indexOf(this.state) < 0) {DrawMap();}
});

CoreProcessPipeline.push(function(core_state) {
  if (Control.Query("Forward")) {QueryMap();return 1;}
});

CoreProcessPipeline.push(function(core_state) { // Work through the intermediate map walking
  core_state.walk_state = UpdateMapPosition();
  if (core_state.walk_state == "NotReady") {return 1;}
});

CoreProcessPipeline.push(function(core_state) { // Check for map events when arriving on a panel
  if (core_state.walk_state == "JustReady") {ProcessMapEvents();} // When arriving on a panel, we check for event, objects
  if (core_state.state) {return 1;} // The above line might have changed the state
});

CoreProcessPipeline.push(function(core_state) { // If ready, take the next step
  var tx = GameState.location.x;
  var ty = GameState.location.y;
  if (Control.Query("LEFT")) {tx--;GameState.location.dx = -1; GameState.location.dy = 0;}
  if (Control.Query("UP")) {ty--;GameState.location.dx = 0; GameState.location.dy = -1;}
  if (Control.Query("RIGHT")) {tx++;GameState.location.dx = 1; GameState.location.dy = 0;}
  if (Control.Query("DOWN")) {ty++;GameState.location.dx = 0; GameState.location.dy = 1;}
  if (tx == GameState.location.x && ty == GameState.location.y) {return;} // Stop if not actually moving
  // Determine if the target location is valid
  if (!Passable(tx,ty)) {return;}
  // Make the step
  GameState.location.x = tx;
  GameState.location.y = ty;
  GameState.location.stepwait = 3;
});

// These values to be filled in when assets are loaded
GameData.maps = {};
GameData.tilesets = {};

// This function processes the gradual movement on the map, returning a string indicating whether
// the player has just arrived on a panel, arrived a while ago, or has not arrived.
function UpdateMapPosition() { // Return a nonzero value if a step is not possible
  var speed = 32.01 / 5.0;
  var camera_ready = 0;
  if (GameState.location.camera_x == 32*GameState.location.x && GameState.location.camera_y == 32*GameState.location.y) {camera_ready=1;}
  if (GameState.location.stepwait > 0) {GameState.location.stepwait--;}
  if (GameState.location.camera_x < 32*GameState.location.x) {
    GameState.location.camera_x += speed;
	if (GameState.location.camera_x > 32*GameState.location.x) {GameState.location.camera_x = 32*GameState.location.x}
  }
  if (GameState.location.camera_x > 32*GameState.location.x) {
    GameState.location.camera_x -= speed;
	if (GameState.location.camera_x < 32*GameState.location.x) {GameState.location.camera_x = 32*GameState.location.x}
  }
  if (GameState.location.camera_y < 32*GameState.location.y) {
    GameState.location.camera_y += speed;
	if (GameState.location.camera_y > 32*GameState.location.y) {GameState.location.camera_y = 32*GameState.location.y}
  }
  if (GameState.location.camera_y > 32*GameState.location.y) {
    GameState.location.camera_y -= speed;
	if (GameState.location.camera_y < 32*GameState.location.y) {GameState.location.camera_y = 32*GameState.location.y}
  }
  var now_camera_ready = 0;
  if (GameState.location.camera_x == 32*GameState.location.x && GameState.location.camera_y == 32*GameState.location.y) {now_camera_ready=1;}
  if (GameState.location.stepwait > 0) {return "NotReady"}
  if (camera_ready) {return "Ready";}
  if (now_camera_ready) {return "JustReady";}
  return "NotReady";
}

// Investigate any map object that exists right in front of the player
function QueryMap() {
  var cur_map = GameData.maps[GameState.location.map];
  var tx = GameState.location.x + GameState.location.dx;
  var ty = GameState.location.y + GameState.location.dy;
  for (var obj in cur_map.objects) {
    if (cur_map.objects[obj].x == tx && cur_map.objects[obj].y == ty && cur_map.objects[obj].Query) {cur_map.objects[obj].Query();};
  }
}

function Passable(x,y) { // Return true is coordinate (x,y) on the current map is passable, false otherwise
  var cur_map = GameData.maps[GameState.location.map];
  var cur_tileset = GameData.tilesets[cur_map.tileset];
  if (y < 0 || y >= cur_map.tiles.length || x < 0 || x >= cur_map.tiles[y].length) {return false;} // Prevent walking off the map
  if (!cur_tileset[cur_map.tiles[y][x]][1]) {return false;} // Block walking on impassible tiles
  for (var obj in cur_map.objects) { // Check impassible map objects
    if (cur_map.objects[obj].x == x && cur_map.objects[obj].y == y && cur_map.objects[obj].Impassible && cur_map.objects[obj].Impassible()) {return false;}
  }
  return true;
}

function GetObjectAtLocation(x,y) { // Return the object at the player's location, if any.  Assume only one
  var cur_map = GameData.maps[GameState.location.map];
  for (var obj in cur_map.objects) {
    if ((cur_map.objects[obj].x == x || cur_map.objects[obj].ig == "x") && (cur_map.objects[obj].y == y || cur_map.objects[obj].ig == "y") && cur_map.objects[obj].Enter) {
	  return cur_map.objects[obj]; // Only one map object assumed per panel.
	}
  }
  return 0;
}

// Work through a list of functions that occur at each frame on the map, such as interacting with 
// a map object or a random battle.
var ProcessMapEventsPipeline = [];
ProcessMapEventsPipeline.push(function() {
  var GetObj = GetObjectAtLocation(GameState.location.x,GameState.location.y);
  if (GetObj) {GetObj.Enter();return 1;}
});
function ProcessMapEvents() {
  for (var i=0; i<ProcessMapEventsPipeline.length; i++) {
    if (ProcessMapEventsPipeline[i]()) {return;}
  }
}

// Change the hero's location.  This is for direct location setting rather than normal walking
function SetLocation(new_loc) {
  if (!GameState.location) {GameState.location = {}};
  GameState.location.map = new_loc.map;
  GameState.location.x = new_loc.x;
  GameState.location.y = new_loc.y;
  GameState.location.camera_x = GameState.location.x * 32;
  GameState.location.camera_y = GameState.location.y * 32;
  if (!new_loc.dx) {GameState.location.dx = 0}
  else {GameState.location.dx = new_loc.dx}
  if (!new_loc.dy) {GameState.location.dy = 1}
  else {GameState.location.dy = new_loc.dy}
  GameState.location.stepwait = 3;
}

// This object associates classes for map objects with names. Defined in other modules.
var MapObjectClasses = {};

// Fill in map data when loading game assets
LoadGameDataOps.maps = function(temp) {
  GameData.maps = temp.maps;
  for (map in GameData.maps) {
    GameData.maps[map].tiles = JSON.parse(SingleToDoubleQuotes(GameData.maps[map].tiles));
	GameData.maps[map].encounter = JSON.parse(SingleToDoubleQuotes(GameData.maps[map].encounter));
	GameData.maps[map].objects = JSON.parse(SingleToDoubleQuotes(GameData.maps[map].objects));
	var map_info = JSON.parse(SingleToDoubleQuotes(GameData.maps[map].map_info));
	for (item in map_info) {GameData.maps[map][item] = map_info[item];}
	delete(GameData.maps[map].map_info);
	for (obj in GameData.maps[map].objects) {
	  var type = GameData.maps[map].objects[obj].type;
      GameData.maps[map].objects[obj] = new MapObjectClasses[type](GameData.maps[map].objects[obj].initparams);
	}
  }
}

// Fill in tilesets when loading game assets
LoadGameDataOps.tilesets = function(temp) {
  GameData.tilesets = JSON.parse(SingleToDoubleQuotes(temp.tilesets));
}

// Draw the hero on the world map
function DrawHero() {
  var hx = 304+GameState.location.camera_x;
  var hy = 224+GameState.location.camera_y;
  if (GameState.location.dy == 1) {DrawImage32({x:hx, y: hy, image: "herodown.jpg"});}
  else if (GameState.location.dy == -1) {DrawImage32({x:hx, y: hy, image: "heroup.jpg"});}
  else if (GameState.location.dx == 1) {DrawImage32({x:hx, y: hy, image: "heroright.jpg"});}
  else {DrawImage32({x:hx, y: hy, image: "heroleft.jpg"});}
}

// Draw the borders of the map
function DrawBorder(x,y,max_x,max_y,border_tile,borders,tileset) {
  if (!borders)
    DrawImage32({x:304+32*x, y:224+32*y, image:border_tile});
  else {
    var bx = 1; var by = 1;
	if (x < 0) {bx = 0;}
	if (y < 0) {by = 0;}
	if (x >= max_x) {bx = 2;}
	if (y >= max_y) {by = 2;}
	var tile = tileset[borders[by][bx]][0];
	DrawImage32({x:304+32*x, y:224+32*y, image:tile});
  }
}

// The core of the map drawing function
function DrawMap() {
  gl.useProgram(shaderProgram);
  var cur_map = GameData.maps[GameState.location.map];
  var cur_tileset = GameData.tilesets[cur_map.tileset];
  var border_tile = cur_tileset[cur_tileset.border][0];
  mvPushMatrix();
  var x_offset = -GameState.location.camera_x; var y_offset = -GameState.location.camera_y;
  if (cur_map.clamp) {
    var c;
    if (cur_map.clamp == "Standard") {c = 0;}
	else {c = cur_map.clamp;}
    if (x_offset > -32*(9-c)) {x_offset = -32*(9-c)}
	if (y_offset > -32*(7-c)) {y_offset = -32*(7-c)}
	if (x_offset < -32*(cur_map.tiles[0].length-10+c)) {x_offset = -32*(cur_map.tiles[0].length-10+c);}
	if (y_offset < -32*(cur_map.tiles.length-8+c)) {y_offset = -32*(cur_map.tiles.length-8+c);}
  }
  mat4.translate(mvMatrix, [x_offset, y_offset, 0]);
  gl.bindBuffer(gl.ARRAY_BUFFER, rectBuffer);
  for (var x = -11-Math.floor(x_offset/32); x < 12-Math.floor(x_offset/32); x++) { // Draw panels
    for (var y = -9-Math.floor(y_offset/32); y < 10-Math.floor(y_offset/32); y++) {
	  if (y < 0 || y >= cur_map.tiles.length || x < 0 || x >= cur_map.tiles[y].length) { // Draw tiles off the map
    	DrawBorder(x,y,cur_map.tiles[0].length,cur_map.tiles.length,border_tile,cur_map.border,cur_tileset)
	  }
	  else {
	    var tile = cur_tileset[cur_map.tiles[y][x]][0];
		DrawImage32({x:304+32*x, y:224+32*y, image:tile});
	  }
	}
  }
  for (var obj in cur_map.objects) {if (cur_map.objects[obj].Display) {cur_map.objects[obj].Display();}}
  DrawHero();
  mvPopMatrix();
}

// Given the broad structure of the map for use by the AI
var map_structure = {}; // Keep track of the broad structure of the map and warps
var map_structure_set = 0;
function ExtractMapStructure() {
  for (map in GameData.maps) { // Extract the overall map structure.  Assumes the entire map structure is immediately available to the AI
    map_structure_set = 1;
    map_structure[map] = {warps:[]};
	for (var obj in GameData.maps[map].objects) {
      var o = GameData.maps[map].objects[obj];
	  if (o.destmap) {
	    map_structure[map].warps.push([o.destmap,o.x,o.y]);
  	  }
    }
  }
}

function FindOnScreenByKey(key) { // Return an object for which the key has a nontrivial value
  var cur_map = GameData.maps[GameState.location.map];
  for (obj in cur_map.objects) {
    if (cur_map.objects[obj][key]) {return cur_map.objects[obj]}
  }
  return 0;
}

function FindOnScreen(key,value) { // Return an object with the given parameters
  var cur_map = GameData.maps[GameState.location.map];
  for (obj in cur_map.objects) {
    if (cur_map.objects[obj][key] == value) {return cur_map.objects[obj]}
  }
  return 0;
}

function SetPath(x,y) { // Find the path from the current position to the destination (x,y) using A*
  var tiles = GameData.maps[GameState.location.map].tiles;
  var d = []; // List of distances to the end
  dir = []; // List of arrows to the end
  for (var i=0; i<tiles.length; i++) // Build an empty array
  {
    var row = [];
	var dir_row = [];
	for (var j=0; j<tiles[i].length; j++) {row.push(9999);dir_row.push("X");}
	d.push(row);
	dir.push(dir_row);
  }
  var vectors = [[0,1],[1,0],[0,-1],[-1,0]];
  var directions = ["U","L","D","R"];
  var layer = 0;
  d[y][x] = 0;
  var opened = [[x,y]]
  while (d[GameState.location.y][GameState.location.x] >= 9999 && opened.length > 0) { // The distance calculating loop
    var new_opened = [];
    for (var i=0; i<opened.length; i++) {
	  for (var j=0; j<vectors.length; j++) {
	    var nx = opened[i][0] + vectors[j][0]; var ny = opened[i][1] + vectors[j][1];
		// Add a panel to potential paths if not already included, it is passable, and not an object (unless the start)
	    if (Passable(nx,ny) && d[ny][nx] > layer+1 && (!GetObjectAtLocation(nx,ny) || (nx == GameState.location.x && ny == GameState.location.y))) {
		  d[ny][nx] = layer+1;
		  dir[ny][nx] = directions[j];
		  new_opened.push([nx,ny]);
		}
	  }
	}
	opened = new_opened;
	layer += 1;
  }
}

function GetAdvance() { // Return the coordinates of the warp to the next map, if any
  var cur_map = GameData.maps[GameState.location.map];
  for (var obj in cur_map.objects) {
    var o = cur_map.objects[obj];
	if (o.destmap == map_structure[GameState.location.map].next) {
	  return [o.x,o.y];
	}
  }
  return 0;
}
/*
function MapAccessible(map) {
  return true;
}*/
function GetMapDest() { // Look for a best level map to go to
  // Look for a map with the most appropriate level
  var destination = 0;
  var best_level = GameData.maps[GameState.location.map].level; // Find a map with a level preferable to current level
  for (map in GameData.maps) {
    if (GameData.maps[map].level > best_level && MapAccessible(map)) {
	  destination = map;
	  best_level = GameData.maps[map].level;
	}
  }
  if (destination) {FindMapPath(GameState.location.map, destination);}
  return destination;
}

function FindMapPath(start,end) { // Find a path from map start to map end using A*
// For now, assume that the map structure is symmetric: the existence of a warp from X to Y implies a warp from Y to X.
  for (map in map_structure) {map_structure[map].next = 0;}
  if (start == end) {return;}
  var opened = [end];
  while (opened.length > 0 && !map_structure[start].next) {
    var next_opened = [];
    for (var i = 0; i < opened.length; i++) {
	  var next_map = map_structure[opened[i]];
	  for (var j=0; j < next_map.warps.length; j++) {
	    var test_map = next_map.warps[j][0];
		if (!map_structure[test_map].next) {
		  next_opened.push(test_map);
		  map_structure[test_map].next = opened[i];
		}
	  }
	}
	opened = next_opened;
  }
}

// The functions for the state GOTO, which seeks to talk to a particular panel
var dirs = {L: "LEFT", R: "RIGHT", U: "UP", D: "DOWN"};
// In this beast, the first part stops if there is no direction embedded in the map, and the second if close to the goal
function GOTOGoal(p) {return (!dirs[dir[GameState.location.y][GameState.location.x]] ||
  p.range && Math.abs(GameState.location.x - p.x) + Math.abs(GameState.location.y - p.y) <= p.range)}
function GOTOMove(p) {
  if (CoreState.state == "") {auto_keys.push(dirs[dir[GameState.location.y][GameState.location.x]]);}
  else {SeekCoreState();}
}
AIFunctions.GOTO = {Goal: GOTOGoal, Move: GOTOMove};

// The functions for the state QUERY, which queries the object immediately in front of the player
function QUERYMove(p) {if (!(GameState.FrameNum % RT)) {auto_keys.push("Forward"); PlanStack.pop();}}
AIFunctions.QUERY = {Goal: function(p) {}, Move: QUERYMove};
// The functions for the state FACE, which faces an adjacent object and adjacent objects only
function FACEGoal(p) {return (GameState.location.x + GameState.location.dx == p.x && GameState.location.y + GameState.location.dy == p.y);}
function FACEMove(p) {
  if (CoreState.state == "") {
    if (GameState.location.x > p.x) {auto_keys.push("LEFT");}
    else if (GameState.location.x < p.x) {auto_keys.push("RIGHT");}
    else if (GameState.location.y > p.y) {auto_keys.push("UP");}
    else if (GameState.location.y < p.y) {auto_keys.push("DOWN");}
  }
  else {SeekCoreState();}
}
AIFunctions.FACE = {Goal: FACEGoal, Move: FACEMove};

// The functions for the state GOTOMAP, which has the goal of walking to a particular map
var GOTOMAPPipeline = []; // A list of operations that are checked while moving.  May override the plan
function GOTOMAPGoal(p) {return (p.map == GameState.location.map);}
function GOTOMAPMove(p) {
  if (CoreState.state != "") {SeekCoreState(); return;}
  for (var i=0; i<GOTOMAPPipeline.length; i++) {
    if (GOTOMAPPipeline[i]()) {return;}
  }
  var next_coord = GetAdvance();
  if (GameState.location.x == next_coord[0] && GameState.location.y == next_coord[1]) {
    PlanStack.push({op:"GRIND"}); // This is to insure that the player can get back on the warp
  }
  else {
    PlanStack.push({op:"GOTO",x:next_coord[0],y:next_coord[1]});
    SetPath(Plan().x,Plan().y);
  }
}
AIFunctions.GOTOMAP = {Goal: GOTOMAPGoal, Move: GOTOMAPMove};

var ChooseDestinationOptions = [];
ChooseDestinationOptions.push(function () {
  var next_map = GetMapDest();
  if (next_map) {return {weight:4,plan:{op:"GOTOMAP",map:next_map}};}
  else {return {weight:-1};}
});
function ChooseDestination() { // Choose the next goal at the top level
  if (!map_structure_set) {ExtractMapStructure();} // Ensure that the set up is called after game data is loaded.
  // Check is a rest is needed and can be done
  var best_move = {weight:-1};
  for (var i=0; i<ChooseDestinationOptions.length; i++) {
    var test_move = ChooseDestinationOptions[i]();
	if (test_move.weight > best_move.weight) {best_move = test_move;}
  }
  if (best_move.func) {best_move.func();}
  else if (best_move.plan) {PlanStack.push(best_move.plan);}
}

LoadGameDataOps.StartLoc = function(temp) {
  GameData.InitLocation = JSON.parse(SingleToDoubleQuotes(temp.StartLoc));
}