// The AI planning module

// Auto-play variables
var auto_keys = []; // Which keys are being held down at the moment by the auto-player
var PlanStack = [{op:"WINGAME"}]; // A stack of planned operations.  The top of the stack is the most immediate goal.
var dir = []; // List of arrows to the target position
var RT = 10; // The repeat time, in frames, for actions aside from walking on the map

/* How the Planning Stack works: It is a stack of operations, each of which has an operation type and some other parameters associated with it.
   For each operation type, there are several associated functions.
   Goal is a function that takes the plan and parameters as input and determines if the goal is achieved.
   Move is the core of the game playing.  It decides both which key(s) to press and what, if anything, is added to the planning stack.
   If Goal returns true, the top of the stack is popped.  If the stack is empty, the game is won. */
   
var AIFunctions = {}; // A list of all the AI functions
AIFunctions.NONE = {Goal: function(p) {}, Move: function(p) {}}; // Nothing happens if the stack is empty

function AutoSetMove() { // The core of the autoplayer.  Both decides the next move and modifies the plan stack.
  var p = Plan();
  auto_keys = [];
  while (AIFunctions[p.op] && AIFunctions[p.op].Goal(p)) {PlanStack.pop(); p = Plan();} // Clear out all completed goals
  if (AIFunctions[p.op]) {AIFunctions[p.op].Move(p);}
}

function Plan() { // Return the top of the planning stack
  if (PlanStack.length == 0) {return {op:"NONE"};}
  return PlanStack[PlanStack.length-1];
}

function AutoPlay(query) {
  for (i in auto_keys) {if (query == auto_keys[i]) {auto_keys.splice(i,1);return true;}}
  return false;
}

if (AUTOPLAY && AUTOPLAY > 0) {Control.Query = AutoPlay; Control.SetFrame = AutoSetMove;}