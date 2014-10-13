// Town module

var TownMenu = MenuByList({choices: [], cursorParams: {x:10, y:17, dx:0, dy:30}});

// Town state
var TownMenuCommands = {};
function TownProcess() {
  if (this.state) {return;}
  if (Control.Query("Back")) {return {ChangeState: "X"};} // Shift key gets out of the menu
  TownMenu.Process();
  if (Control.Query("Forward")) {
	for (var c in TownMenuCommands) { // Check each command in the list whether it matches the selected menu choice
	  if (TownMenu.Choice().indexOf(c) == 0) {
    	return TownMenuCommands[c](this);
	  }
	}
	GameState.MenuReport = ["???"]; // This is activated if the selected menu choice is not a recognized command.  Indicates something went wrong.
  }
}
var TownActivatePipeline = []; // A list of operations performed when activating a town
function TownActivate() {
  GameState.MenuReport = [];
  TownMenu.choices = []; // Since the town menu can change by down, rebuild it with each town
  for (var i=0; i<TownActivatePipeline.length; i++) {TownActivatePipeline[i]();}
  TownMenu.Reset();
}
var TownState = new State({substates:{}, TopProcess: TownProcess, Activate: TownActivate});

CoreState.substates.Town = TownState;

// For now, assume that every map object takes up one panel, given by coordinates x,y, and the map is implicit.
function Town(input) {this.x = input.x; this.y = input.y; this.merchant = input.merchant} // Town
Town.prototype.Query = function() {GameState.CurMerchant = this.merchant;CoreState.ChangeState("Town");}
Town.prototype.Impassible = function() {return true;}
MapObjectClasses.Town = Town;

TownState.TopDisplay = function () {
  ctx.fillStyle='#000000';
  DrawColorRect({x:0,y:0,w:240,h:480});
  DrawColorRect({x:380,y:0,w:260,h:200});
  ctx.font = '20px Arial';
  ctx.fillStyle='#FFFFFF';
  DisplayStatsUpperRight();
  for (var i=0; i<GameState.MenuReport.length; i++) {
    ctx.fillText(GameState.MenuReport[i],20,390+30*i);
  }
  if (!this.state) {TownMenu.Display();}
}

Town.prototype.Display = function() {
  DrawImage32({x:304+32*this.x,y:224+32*this.y,image:"scientist.gif"});
}

SeekCoreStateOps.push(function() {
  if (CoreState.state == "Town") {
    if (!(GameState.FrameNum % RT)) {auto_keys.push("Back"); return 1;}
  }
});