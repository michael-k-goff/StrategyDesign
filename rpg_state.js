// The state system module.  Includes a core state

// Classes to manage a general state system
// Substates are objects that should have all methods invoked by the top state.
function State(input) {
  this.state = "";	// The current substate.  An empty string indicates a top level state
  // Dump all input variables into the state.  May contain substate specifications, TopDisplay and TopProcess function, Activate function, etc.
  for (var key in input) {this[key] = input[key]}
  this.Display = function() {
    if (this.TopDisplay) {this.TopDisplay();}
	if (this.state && this.substates[this.state].Display) {this.substates[this.state].Display();}
  }
  this.Process = function() {
    var return_value = {}; // What gets returned
    var result = {}; // The result from processing of any substate
    if (this.TopProcess) {return_value = this.TopProcess();}
	if (this.state && this.substates[this.state].Process) {
	  result = this.substates[this.state].Process();
	  if (!result) {var result = {};}
	  if (result && result.ChangeState) {
	    new_state = result.ChangeState;
		if (result.ChangeState == "X") {new_state = "";}
		this.ChangeState(new_state);
	  }
	}
	if (this.PostProcess) {return this.PostProcess(return_value,result);}
	return return_value;
  }
  this.ChangeState = function(new_state) {
    this.state = new_state;
	if (this.state && this.substates[this.state].Activate) {this.substates[this.state].Activate();}
  }
}

// Core state: This state controls all others.  The top state is the map display
var CoreProcessPipeline = []; // A list of operations done in the core processing phase
function CoreProcess() { // Move from one panel to the next on the map, depending on what key(s) are down.
  // Determine target location
  GameState.FrameNum += 1;
  if (this.state) {return;}
  for (var i=0; i<CoreProcessPipeline.length; i++) {
    if (CoreProcessPipeline[i](this)) {return;}
  }
}
function CoreActivate() {}
var CoreState = new State({substates:{}, TopProcess: CoreProcess, Activate: CoreActivate});

var CoreDisplayPipeline = [];
CoreState.TopDisplay = function () {
  mat4.identity(mvMatrix);
  ctx.clearRect(0,0,640,480);
  for (var i=0; i<CoreDisplayPipeline.length; i++) {CoreDisplayPipeline[i]();}
}

// The functions for state WINGAME, the base of the planning stack
function WINGAMEGoal(p) {if (CoreState.state == "Ending") {return true;} return false;}
function ChooseDestination() {} // A dummy function which will be overwritten, probably in the map module
function WINGAMEMove(p) {
  if (CoreState.state == "") {ChooseDestination();}
  else {SeekCoreState();}
}
AIFunctions.WINGAME = {Goal: WINGAMEGoal, Move: WINGAMEMove};

SeekCoreStateOps = [];
function SeekCoreState() { // This AI planning function tries to get to the core state
  for (var i=0; i<SeekCoreStateOps.length; i++) {
    if (SeekCoreStateOps[i]()) {return;}
  }
}