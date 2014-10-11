// A module for items

// Templates for three item menus: for purchasing, for the main map, and for battle.
// The choices are empty; they are filled in later
var BuyitemMenu = MenuByList({choices: [], cursorParams: {x:10, y:17, dx:0, dy:30},ChoiceDisplay: function(i) {
  ctx.fillText(this.choices[i][0],40,30+30*i);
  ctx.fillText(this.choices[i][1]+ " G",180,30+30*i);
}});
var ItemMenu = MenuByList({choices: [], cursorParams: {x:10, y:17, dx:0, dy:30},ChoiceDisplay: function(i) {
  ctx.fillText(this.choices[i][0],40,30+30*i);
  ctx.fillText("X " + this.choices[i][1],180,30+30*i);
}});
var BattleItemMenu = MenuByList({choices: [], cursorParams: {x:10, y:87, dx:0, dy:30},ChoiceDisplay: function(i) {
  ctx.fillText(this.choices[i][0],40,100+30*i);
  ctx.fillText("X " + this.choices[i][1],180,100+30*i);
}});

// The state for using an item on the main menu
function ProcessItemMenu()
{
  if (Control.Query("Back")) {return {ChangeState:"X"};}
  ItemMenu.Process();
  if (Control.Query("Forward")) { // Use an item
    var depleted = UseItem(ItemMenu.ChoiceNum());
	if (depleted) {return {ChangeState:"X"};}
  }
}
var ItemMenuState = {Process: ProcessItemMenu, Activate: function() {ItemMenu.Reset()}};
ItemMenuState.Display = function() {ItemMenu.Display();}
MainMenuState.substates.ItemMenu = ItemMenuState;

// State for selecting an item to use in battle
function ProcessBattleItemMenu() {
  if (Control.Query("Back")) {return {ChangeState:"X"};}
  if (Control.Query("Forward")) {
    var item_name = GameState.Items[BattleItemMenu.ChoiceNum()][0];
    UseItem(BattleItemMenu.ChoiceNum());
	GameState.BattleReport = ["Used " + item_name + "."];
	EnemyMove();
	if (LoseCondition()) {GameState.BattleReport.push("You have died.");return {ChangeState:"Loss"};}
	else return {ChangeState:"X"};
  }
  BattleItemMenu.Process();
}
var BattleItemMenuState = {Process:ProcessBattleItemMenu};
BattleItemMenuState.Display = function() {BattleItemMenu.Display();};
BattleState.substates.ItemMenu = BattleItemMenuState;

// Buy Item state
function ProcessBuyitem() {
  if (Control.Query("Back")) {return {ChangeState: "X"};}
  BuyitemMenu.Process();
  if (Control.Query("Forward")) {
    var item = GameState.CurMerchant.ItemList[BuyitemMenu.ChoiceNum()];
	if (GameState.Stats.Gold < item[1]) {
	  GameState.MenuReport = ["Not enough money."];
	}
	else {
	  GameState.Stats.Gold -= item[1];
	  GrantItem(item[0]);
	  GameState.MenuReport = ["Thanks!"];
	}
  }
}
var BuyitemState = {Process: ProcessBuyitem, Activate: function() {BuyitemMenu.Reset();}};
BuyitemState.Display = function() {BuyitemMenu.Display();}
TownState.substates.BuyItem = BuyitemState;

// Attach items to parent menus
MainMenu.choices.push("Items");
BattleMenu.choices.push("Items");

// Processing in the main menu
MainMenuCommands["Items"] = function(main_menu_state) {
  if (GameState.Items.length == 0) {GameState.MenuReport = ["No items"];}
  else {main_menu_state.ChangeState("ItemMenu");}
}

// Processing in battle
BattleMenuCommands["Items"] = function(battle_state) {
  if (GameState.Items.length == 0) {GameState.BattleReport = ["No items."]; return;};
  battle_state.ChangeState("ItemMenu");
  BattleItemMenu.Reset();
  return;
}

// Processing in the town menu
TownMenuCommands["Buy Items"] = function(town_state) {
  GameState.MenuReport = [];
  town_state.ChangeState("BuyItem");
}

TownActivatePipeline.push(function() {
  TownMenu.choices.push("Buy Items");
  BuyitemMenu.choices = GameState.CurMerchant.ItemList;
});

// Code for using item.  Only manipulates stats now; no reports, graphics, etc.
function UseItem(num) { // Return 1 if the item is depleted.
  if (GameState.Items[num][0] == "Potion") {
    GameState.Items[num][1]--;
	RestoreHP(5);
  }
  else if (GameState.Items[num][0] == "Hi-Potion") {
    GameState.Items[num][1]--;
	RestoreHP(10);
  }
  if (GameState.Items[num][1] <= 0) {
    GameState.Items.splice(num,1);
	return 1;
  }
}

// Add an item by name to inventory.  Agnostic to the source.
function GrantItem(name) {
  for (var i = 0; i < GameState.Items.length; i++) {
    if (GameState.Items[i][0] == name) {GameState.Items[i][1]++;return;}
  }
  GameState.Items.push([name,1]);
}

// Initialize items when stats are initialized
InitStatOps.push(function() {GameState.Items = [["Potion", 3], ["Hi-Potion", 1]];
  ItemMenu.choices = GameState.Items;
  BattleItemMenu.choices = GameState.Items;
});

// Handle items when loading a saved game
LoadSavedGamePipeline.push(function(resp) {
  GameState.Items = JSON.parse(resp).Items;
  ItemMenu.choices = GameState.Items;
  BattleItemMenu.choices = GameState.Items;
});

// AI functions
AIBattleMoveOptions.push(function() { // Use a random item
  var weight = 10.*Math.random();
  if (GameState.Items.length == 0) {weight = 0;}
  return [weight,{op:"BATTLEITEM",item:(Math.round((Math.random()*30000)))%(GameState.Items.length)}];
});

// The functions for the state BATTLEITEM
function BATTLEITEMMove(p) {
  if (GameState.FrameNum % RT) {return;}
  if (BattleState.state == "") {SeekName(BattleMenu,"Items")}
  if (BattleState.state == "ItemMenu") {if (SeekCursor(BattleItemMenu,p.item)) {PlanStack.pop();}}
}
AIFunctions.BATTLEITEM = {Goal: function(p) {}, Move: BATTLEITEMMove};

// The functions for the planning operation USEITEM.
function USEITEMMove(p) {
  if (CoreState.state == "") {auto_keys.push("Back");}
  if (CoreState.state == "MainMenu" && MainMenuState.state == "") {SeekName(MainMenu,"Items");}
  if (CoreState.state == "MainMenu" && MainMenuState.state == "ItemMenu") {
    if (SeekCursor(ItemMenu,p.item)) {PlanStack.pop();}
  }
}
AIFunctions.USEITEM = {Goal: function(p) {}, Move: USEITEMMove};

// Decide whether to use an item when trying to rest
CheckRestOptions.push(function() {
  for (item in GameState.Items) { // Look for a suitable item to use
    if (GameState.Items[item][0] == "Potion" || GameState.Items[item][0] == "Hi-Potion") {
	  return [2,{op:"USEITEM",item:item}];
	}
  }
  return [-1,{}];
});

// The functions for the operation BUYPOTIONS.  Assume the player is in a town
function BUYPOTIONSMove(p) {
  if (CoreState.state == "Battle") {PlanStack.push({op:"WINBATTLE"}); return;}
  if (GameState.FrameNum % RT) {return;}
  if (TownState.state == "") {SeekName(TownMenu,"Buy Items");}
  if (TownState.state == "BuyItem") {
    SeekCursor(BuyitemMenu,1);
    if (GameState.Stats.Gold <= p.target) {PlanStack.pop(); return;}
  }
}
AIFunctions.BUYPOTIONS = {Goal: function(p) {}, Move: BUYPOTIONSMove};

// Decide whether to buy potions while on the world map
ChooseDestinationOptions.push(function() {
  // Buy potions
  var mingold = MinGold(1);  
  var town = FindOnScreenByKey("merchant");
  if (town && GameState.Stats.Gold >= 2*mingold) {
    var f = function() {
      PlanStack.push({op:"BUYPOTIONS",target:mingold});
      PlanStack.push({op:"QUERY"});
      PlanStack.push({op:"FACE",x:10,y:10});
      PlanStack.push({op:"GOTO",x:10,y:10, range:1});
      SetPath(Plan().x, Plan().y);
    }
	return {weight:3,func: f};
  }
  return {weight:-1};
});