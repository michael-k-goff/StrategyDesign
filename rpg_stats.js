// A module for basic stats

// Initialize stats at the start of a game, including possibly after a loss
var InitStatOps = [];
InitStatOps.push(function() {GameState.FrameNum = 0;});
InitStatOps.push(function() {SetLocation(GameData.InitLocation);});
InitStatOps.push(function() {GameState.Stats = {HP:10, MaxHP:10, Str:1, EXP:0, Gold:50, Level: 1};});
function InitStats() { // Initialize all player stats to their starting values.  Does not affect state data.
  for (var i=0; i<InitStatOps.length; i++) {
    InitStatOps[i]();
  }
}

LoadAssetsPipeline.push(InitStats);

function RestoreHP(num) {
  GameState.Stats.HP += num;
  if (GameState.Stats.HP > GameState.Stats.MaxHP) {GameState.Stats.HP = GameState.Stats.MaxHP}
}

var RestoreFunctions = [function() {GameState.Stats.HP = GameState.Stats.MaxHP;}];
function Restore() {
  for (var i=0; i<RestoreFunctions.length; i++) {RestoreFunctions[i]();}
}

var DisplayStatsUpperRightTexts = [];
DisplayStatsUpperRightTexts.push(function() {return "HP: " + GameState.Stats.HP + "/" + GameState.Stats.MaxHP});
DisplayStatsUpperRightTexts.push(function() {return "Str: " + GameState.Stats.Str});
DisplayStatsUpperRightTexts.push(function() {return "EXP: " + GameState.Stats.EXP});
DisplayStatsUpperRightTexts.push(function() {return "Gold: " + GameState.Stats.Gold});
DisplayStatsUpperRightTexts.push(function() {return "Level: " + GameState.Stats.Level});
function DisplayStatsUpperRight() {
  for (var i=0; i<DisplayStatsUpperRightTexts.length; i++) {
    ctx.fillText(DisplayStatsUpperRightTexts[i](),400,32+30*i);
  }
}

GOTOMAPPipeline.push(CheckRest); // Resting trumps moving to a new map

// Resting in the AI: decide whether and how to restore health
var CheckRestOptions = [];
function CheckRest() { // This AI planning functions checks whether the player should rest and develops a plan to do so.  Return true if resting
  if (GameState.Stats.HP >= 2* GameState.Stats.MaxHP / 3) {return;}
  var best_move = [-1,{}];
  for (var i=0; i<CheckRestOptions.length; i++) {
    var move_candidate = CheckRestOptions[i]();
	if (move_candidate[0] > best_move[0]) {best_move = move_candidate;}
  }
  if (best_move[0] >= 0) {
    if (best_move.length == 2) {PlanStack.push(best_move[1]);}
	else {best_move[2]();}
	return true;
  }
}

// This option is structured under the assumption that if a rest is needed, then this will be
// the option chosen.  Hence the development of the rest plan is executed here.
// This should probably be changed eventually
ChooseDestinationOptions.push(function() {
  if (CheckRest()) {return {weight:10};}
  else {return {weight:-1};}
});

var GoldDesires = []; // A list of pairs that indicate how much a certain level of savings is desired.  Used to evaluate purchasing decisions
function MinGold(priority) { // Return the minimum savings at a given purchase priority
  var mingold = 0;
  for (var i=0; i<GoldDesires.length; i++) {
    var desire = GoldDesires[i]();
    if (desire.priority >= priority && mingold < desire.amount) {mingold = desire.amount;}
  }
  return mingold;
}

// Determine whether a map is to be considered as a destination.
function MapAccessible(map) {
  return GameState.Stats.Level > 2*GameData.maps[map].level;
}