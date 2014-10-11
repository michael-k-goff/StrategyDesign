// The main menu module

var MainMenu = MenuByList({choices: [], cursorParams: {x:10, y:17, dx:0, dy:30}});

// Main menu state
var MainMenuCommands = {};
function ProcessMainMenu()
{
  if (Control.Query("back") || Control.Query("forward")) {GameState.MenuReport = [];}
  if (this.state) {return;} // Only to this stuff in the top main menu
  if (Control.Query("Back")) {return {ChangeState: "X"};} // Shift key gets out of the menu
  MainMenu.Process();
  if (Control.Query("Forward")) {
    // Instructions for main menu selections are generally defined in MainMenuCommands
    if (MainMenuCommands[MainMenu.Choice()]) {
	  MainMenuCommands[MainMenu.Choice()](this);
	}
	else {
	  GameState.MenuReport = ["???"]; // Undefined main menu choice
	}
  }
}
function MainMenuActivate() {MainMenu.Reset(); this.state = ""; GameState.MenuReport = [];}
var MainMenuState = new State({substates:{},TopProcess: ProcessMainMenu, Activate: MainMenuActivate});
CoreState.substates.MainMenu = MainMenuState;

CoreProcessPipeline.push(function(core_state) {
  if (Control.Query("Back")) {
    core_state.ChangeState("MainMenu");
	return 1;
  }
});

SeekCoreStateOps.push(function() {
  if (CoreState.state == "MainMenu") {
    if (!(GameState.FrameNum % RT)) {auto_keys.push("Back"); return 1;}
  }
});

MainMenuState.TopDisplay = function() {
  ctx.fillStyle='#000000';
  DrawColorRect({x:0,y:0,w:240,h:480});
  DrawColorRect({x:380,y:0,w:260,h:200});
  ctx.font = '20px Arial';
  ctx.fillStyle='#FFFFFF';
  DisplayStatsUpperRight();
  if (this.state == "") {MainMenu.Display();}  
  for (var i=0; i<GameState.MenuReport.length; i++) { // Display report
    ctx.fillText(GameState.MenuReport[i],20,390+30*i);
  }
}