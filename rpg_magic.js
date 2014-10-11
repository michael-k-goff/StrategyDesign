// This module handles all things related to magic

// Define the menus
var MagicMenu = MenuByList({choices: ["Cure"], cursorParams: {x:10, y:17, dx:0, dy:30}});
var BattleMagicMenu = MenuByList({choices: ["Cure"], cursorParams: {x:10, y:87, dx:0, dy:30}});

// Attach magic to parent menus
MainMenu.choices.push("Magic");
BattleMenu.choices.push("Magic");

// State for using magic in the main menu
function ProcessMagicMenu()
{
  if (Control.Query("Back")) {return {ChangeState:"X"};}
  MagicMenu.Process();
  if (Control.Query("Forward")) { // Use an item
    UseSpell(MagicMenu.ChoiceNum());
  }
}
// Define the state in the main menu
var MagicMenuState = {Process: ProcessMagicMenu, Activate: function() {MagicMenu.Reset()}};
MagicMenuState.Display = function() {MagicMenu.Display();}
// Add it to the main menu state system
MainMenuState.substates.MagicMenu = MagicMenuState;
MainMenuCommands["Magic"] = function(main_menu_state) {
  main_menu_state.ChangeState("MagicMenu");
}

// State for selecting a spell to use in battle
function ProcessBattleMagicMenu() {
  if (Control.Query("Back")) {return {ChangeState:"X"};}
  if (Control.Query("Forward")) {
    UseSpell(BattleMagicMenu.Choice(),report = "Battle");
	EnemyMove();
	if (LoseCondition()) {GameState.BattleReport.push("You have died.");return {ChangeState:"Loss"};}
	else return {ChangeState:"X"};
  }
  BattleMagicMenu.Process();
}
var BattleMagicMenuState = {Process:ProcessBattleMagicMenu};
BattleMagicMenuState.Display = function() {BattleMagicMenu.Display();};
// Add the magic menu state to the battle menu state system
BattleState.substates.MagicMenu = BattleMagicMenuState;
BattleMenuCommands["Magic"] = function(battle_menu_state) {
  battle_menu_state.ChangeState("MagicMenu");
}

// Management of MP and spells
RestoreFunctions.push(function() {GameState.Stats.MP = GameState.Stats.MaxMP;})

function UseSpell(spell_name, report) { // For now, assume the only spell is Cure
  report = report || "Main";
  if (GameState.Stats.MP == 0 && report == "Main") {GameState.MenuReport = ["Not enough MP"];return;}
  if (GameState.Stats.MP == 0 && report == "Battle") {GameState.BattleReport = ["Not enough MP"];return;}
  else {
    GameState.Stats.MP -= 1;
	RestoreHP(Math.round(GameState.Stats.MaxHP / 10));
	var message = ["Restored " + Math.round(GameState.Stats.MaxHP / 10) + " HP"];
	if (GameState.Stats.HP == GameState.Stats.MaxHP) {message = ["HP fully restored"];}
	if (report == "Main") {GameState.MenuReport = message;}
	else {GameState.BattleReport = message;}
  }
}

InitStatOps.push(function() {
  GameState.Stats.MP = 5;
  GameState.Stats.MaxMP = 5;
});

DisplayStatsUpperRightTexts.push(function() {return "MP: " + GameState.Stats.MP + "/" + GameState.Stats.MaxMP}); // For display in status box

// AI functions

// Function for deciding whether to use magic
AIBattleMoveOptions.push(function() { // Use a random item
  var weight = 10.*Math.random();
  if (GameState.Stats.MP == 0) {weight = 0;}
  return [weight,{op:"BATTLEMAGIC",spell:"Cure"}];
});
// The functions for the state BATTLEMAGIC
function MAGICMove(p) {
  if (GameState.FrameNum % RT) {return;}
  if (BattleState.state == "") {SeekName(BattleMenu,"Magic")}
  if (BattleState.state == "MagicMenu") {if (SeekCursor(BattleMagicMenu,0)) {PlanStack.pop();}}
}
AIFunctions.BATTLEMAGIC = {Goal: function(p) {}, Move: MAGICMove};
// The functions for the planning operation USEMAGIC on the world map
function USEMAGICMove(p) {
  if (CoreState.state == "") {auto_keys.push("Back");}
  if (CoreState.state == "MainMenu" && MainMenuState.state == "") {SeekName(MainMenu,"Magic");}
  if (CoreState.state == "MainMenu" && MainMenuState.state == "MagicMenu") {
    if (SeekCursor(MagicMenu,0)) {PlanStack.pop();} // For now, assume only one spell
  }
}
AIFunctions.USEMAGIC = {Goal: function(p) {}, Move: USEMAGICMove};
// Decide whether to use magic on the map
CheckRestOptions.push(function() {
  if (GameState.Stats.MP > 0) {
	return [3,{op:"USEMAGIC",spell:"Cure"}];
  }
  return [-1,{}];
});
