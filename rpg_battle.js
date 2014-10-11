// Module for the battle system
var DISABLE_BATTLES = 0; // Debug variables

var BattleMenu = MenuByList({choices: ["Attack","Run"], cursorParams: {x: 70, y:357, dx:0, dy:30}});

// State to process battle victory
function ProcessVictory() {
  if (Control.Query("Back") || Control.Query("Forward")) {return {BattleOutcome:"Victory"};}
}
var VictoryState = {Process: ProcessVictory};
// State to process battle defeat
function ProcessLoss() {
  if (Control.Query("Back") || Control.Query("Forward")) {return {BattleOutcome:"Loss"};}
}
var LossState = {Process: ProcessLoss};
// State to process battles
var BattleMenuCommands = {};
function BattleProcess() { // Move the battle along as necessary
  if (!this.state) {BattleMenu.Process();}
  if (!this.state && Control.Query("Forward")) { // Enter key
    if (BattleMenu.Choice() == "Run") { // Attempt to run
	  if (AttemptRun()) {return {ChangeState: "X"}};
	}
	else if (BattleMenu.Choice() == "Attack") {
	  myDamage = AttackDamage();
	  GameState.BattleReport = ["Attacked for " + myDamage + " damage."];
	  GameState.Enemy.HP -= myDamage;
	  if (GameState.Enemy.HP <= 0) { // Victory
	    this.ChangeState("Victory");
		BattleVictory();
		return;
	  }
	}
	else if (BattleMenuCommands[BattleMenu.Choice()]) {
	  BattleMenuCommands[BattleMenu.Choice()](this); return;
	}
	EnemyMove();
	if (LoseCondition()) {this.ChangeState("Loss");GameState.BattleReport.push("You have died.");}
  }
}
function BattlePostProcess(return_value,result) {
  if (!return_value) {return_value = {};}
  if (result.BattleOutcome == "Victory") {
    if (GameState.Enemy.FinalBoss) {return_value.ChangeState = "Ending";}
    else {return_value.ChangeState = "X";}
  }
  if (result.BattleOutcome == "Loss") {InitStats(); return_value.ChangeState = "X";}
  return return_value;
}
function BattleActivate() {this.state = ""; GameState.BattleReport = [];}
var BattleState = new State({substates:{Victory:VictoryState, Loss:LossState}, 
    TopProcess: BattleProcess, Activate: BattleActivate, PostProcess: BattlePostProcess});
    
CoreState.substates.Battle = BattleState;

function SetBattle() {
  if (DISABLE_BATTLES) {return;}
  var cur_map = GameData.maps[GameState.location.map];
  if (!cur_map.encounter) {return;}
  if (Math.random() >= cur_map.encounter[0]) {return;}
  BattleMenu.Reset();
  CoreState.ChangeState("Battle");
  BattleState.Activate();
  var rand_enemy = (Math.round((Math.random()*30000)))%(cur_map.encounter[1].length);
  var cur_enemy = GameData.Enemies[cur_map.encounter[1][rand_enemy]];
  GameState.Enemy = {};
  for (key in cur_enemy) {GameState.Enemy[key] = cur_enemy[key]}
  GameState.BattleReport = ["A " + GameState.Enemy.name + " draws near.", "Command?"];
  return 1;
}

function BattleVictory() {
  GameState.BattleReport.push("You are victorious!");
  GameState.BattleReport.push("Received "+GameState.Enemy.EXP+" EXP");
  GameState.BattleReport.push("Received "+GameState.Enemy.Gold+" Gold");
  GameState.Stats.EXP += GameState.Enemy.EXP;
  GameState.Stats.Gold += GameState.Enemy.Gold;
  var lv = GameState.Stats.Level;
  if (GameState.Stats.EXP >= 3*lv*lv*(lv+1)/2 + 4) { // Gain a level
	GameState.Stats.Level++;
	GameState.BattleReport.push("Gained a level!");
	GameState.Stats.MaxHP += (GameState.Stats.Level + Math.floor(Math.random()*GameState.Stats.Level));
	GameState.Stats.Str++;
  }
}

// Damage formula.  Create a calculation pipeline that can be modified later
var AttackDamagePipeline = [];
AttackDamagePipeline.push(function(input) {
  return {dmg: GameState.Stats.Str};
});
function AttackDamage() { // The amount of damage done by attacking
  var input = {};
  for (var i=0; i<AttackDamagePipeline.length; i++) {
    input = AttackDamagePipeline[i](input);
  }
  return input.dmg;
}

function AttemptRun() {
  if (Math.random() > 0.5) {return true;}
  else {GameState.BattleReport = ["Can't run."];}
}

// Enemy damage formula.  Create a calculation pipeline that can be modified later
var EnemyAttackDamagePipeline = [];
EnemyAttackDamagePipeline.push(function(input) {
  return {dmg: GameState.Enemy.Str};
});
function EnemyAttackDamage() { // The amount of damage done by attacking
  var input = {};
  for (var i=0; i<EnemyAttackDamagePipeline.length; i++) {
    input = EnemyAttackDamagePipeline[i](input);
  }
  if (input.dmg < 0) {return 0;} else {return input.dmg;}
}

function EnemyMove() {
  var enemyDamage = EnemyAttackDamage();
  GameState.BattleReport.push("The " + GameState.Enemy.name + " attacked for " + enemyDamage + " damage.");
  GameState.Stats.HP -= enemyDamage;
}

function LoseCondition() {return GameState.Stats.HP <= 0;}

InitStatOps.push(function() {GameState.Enemy = {};});

BattleState.TopDisplay = function () {
  gl.clear(gl.COLOR_BUFFER_BIT);
  if (this.state != "Victory") {
    var prog = "";
    if (GameState.Enemy.palette) {gl.useProgram(shaders.colorMatrixProgram);prog = "ColorMatrix";} // Determine if the color matrix should be used
    if (!GameState.Enemy.size) {DrawImage32({x:304,y:224,image:GameState.Enemy.id, prog:prog, mat: GameState.Enemy.palette});}
    else {DrawImage({x:304,y:224,image:GameState.Enemy.id, size: GameState.Enemy.size, prog:prog, mat: GameState.Enemy.palette});}
    gl.useProgram(shaderProgram);
  }
  ctx.fillStyle='#FFFFFF';
  ctx.font='20px Arial';
  DisplayStatsUpperRight();
  if (!this.state) {BattleMenu.Display();}
  for (var i = 0; i < GameState.BattleReport.length; i++) {
    ctx.fillText(GameState.BattleReport[i],20,30+30*i);
  }
}
  
CoreState.StatesToSuppressMap.push("Battle");
ProcessMapEventsPipeline.push(SetBattle);

// The functions for the state WINBATTLE, the base of the battle portion of the planning stack
function WINBATTLEGoal(p) {return (CoreState.state != "Battle")}
var AIBattleMoveOptions = []; // A list of options, each with score functions
AIBattleMoveOptions.push(function() { // Run away
  return [10.*Math.random(),{op:"BATTLERUN"}];
});
AIBattleMoveOptions.push(function() {
  return [8,{op:"BATTLEATTACK"}];
});
function WINBATTLEMove(p) { // Here is the code for deciding which move to make.  It more or less chooses moves at random
  if (BattleState.state == "Victory" || BattleState.state == "Loss") {
    if (!(GameState.FrameNum % RT)) {auto_keys.push("Forward");}
	return;
  }
  var best_move = [-1,{}]; // Apply a weighting system to decide what to do.  Assumes some move will come out with positive weight
  for (var i = 0; i < AIBattleMoveOptions.length; i++) {
    var move_candidate = AIBattleMoveOptions[i](i);
	if (move_candidate[0] > best_move[0]) {best_move = move_candidate;}
  }
  PlanStack.push(best_move[1]);
}
AIFunctions.WINBATTLE = {Goal: WINBATTLEGoal, Move: WINBATTLEMove};
// The functions for the state BATTLEATTACK
function ATTACKMove(p) {
  if (!(GameState.FrameNum % RT)) {if (SeekName(BattleMenu,"Attack")) {PlanStack.pop();}}
}
AIFunctions.BATTLEATTACK = {Goal: function(p) {}, Move: ATTACKMove};
// The functions for the state BATTLERUN
function RUNMove(p) {
  if (!(GameState.FrameNum % RT)) {if (SeekName(BattleMenu,"Run")) {PlanStack.pop();}}
}
AIFunctions.BATTLERUN = {Goal: function(p) {}, Move: RUNMove};

SeekCoreStateOps.push(function() {
  if (CoreState.state == "Battle") {PlanStack.push({op:"WINBATTLE"}); return 1;}
});

GameData.Enemies = {};
LoadGameDataOps.Enemies = function(temp) {
  for (enemy in temp.Enemies) {
    var en_array = JSON.parse(SingleToDoubleQuotes(temp.Enemies[enemy]));
    GameData.Enemies[en_array[0]] = en_array[1];
  }
}

ChooseDestinationOptions.push(function () {
  return {weight:0,plan:{op:"GRIND"}};
});

// The functions for the state GRIND.  Take a random step. The state is exited under Move, which is nonstandard
function GRINDMove(p) {
  var rand_int = Math.round(Math.random()*30000) % 4;
  var rand_dir = [[0,1],[0,-1],[1,0],[-1,0]][rand_int];
  var tx = GameState.location.x + rand_dir[0];
  var ty = GameState.location.y + rand_dir[1];
  if (Passable(tx,ty) && !GetObjectAtLocation(tx,ty)) {
    auto_keys.push(["DOWN","UP","RIGHT","LEFT"][rand_int]);
  }
  PlanStack.pop();
}
AIFunctions.GRIND = {Goal: function(p) {}, Move: GRINDMove};