// Top level data
var GameData = {};
var gameImages = {}; gameTextures = {};
var GameState = {}; // All variables stored here.

function IntervalMethod() {
  Control.SetFrame();
  CoreState.Process();
  Control.PostFrame();
}

function SingleToDoubleQuotes(str) { // Find a better way to make the conversion
  return str.replace(/'/g,'"')
}

var LoadGameDataOps = {};
function SetLoadedGameData(temp) {
  for (op in temp) {if (LoadGameDataOps[op]) {LoadGameDataOps[op](temp);}}
}

var LoadAssetsPipeline = []; // A list of operations that are triggered by loading of game assets
function load_func() {
  temp = JSON.parse(this.response);
  SetLoadedGameData(temp);
  requestAnimationFrame(DisplayLoop);
  setInterval(IntervalMethod,30);
  for (var i=0; i<LoadAssetsPipeline.length; i++) {LoadAssetsPipeline[i]();}
}

// Request RPG assets
xmlhttp = new XMLHttpRequest();
xmlhttp.open('POST','/comm',true);
xmlhttp.onload = load_func;
xmlhttp.setRequestHeader('Content-type', 'application/json; charset=utf-8');
var reqString = JSON.stringify({'gameID':gameID, 'operation':'get_data'});
xmlhttp.send(reqString);