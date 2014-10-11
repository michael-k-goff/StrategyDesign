// Code for the inn module in the RPG template

// The function executed when the Inn choice is selected from the town menu
TownMenuCommands["Inn"] = function() {
  if (GameState.Stats.Gold >= GameState.CurMerchant.inncost) {
	GameState.Stats.Gold -= GameState.CurMerchant.inncost;
    Restore();
    GameState.MenuReport = ["Rested."];
  }
  else {GameState.MenuReport = ["Not enough gold."];}
}

// Add the Inn choice to the town menu when a town is entered.
TownActivatePipeline.push(function () {
  TownMenu.choices.push("Inn " + GameState.CurMerchant.inncost + "G");
});

// Decide whether to use the inn in the AI
CheckRestOptions.push(function() {
  var town = FindOnScreenByKey("merchant");
  if (town && GameState.Stats.Gold >= town.merchant.inncost) { // Rest at an inn
    var f = function() {
	  PlanStack.push({op:"REST"});
	  PlanStack.push({op:"QUERY"});
	  PlanStack.push({op:"FACE",x:10,y:10});
	  PlanStack.push({op:"GOTO",x:10,y:10, range:1});
	  SetPath(Plan().x, Plan().y);
	}
	return [1,{},f];
  }
  else {return [-1,{}];}
});

// Evaulate the desire to save gold on account of using the inn
GoldDesires.push(function() {
  var town = FindOnScreenByKey("merchant");
  if (!town) {return {amount:0,priority:0};}
  return {amount:town.merchant.inncost, priority:3};
});

// The functions for the state REST.  Assumes the player is in a town and is looking for an inn
// It seems to be possible that the players end up not in a town; this is a bug
function RESTGoal(p) {return (GameState.Stats.HP == GameState.Stats.MaxHP);}
function RESTMove(p) {if (!(GameState.FrameNum % RT)) {SeekInitialName(TownMenu,"Inn");}}
AIFunctions.REST = {Goal: RESTGoal, Move: RESTMove};