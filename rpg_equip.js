// This module handles things related to equipment

// For shopping at town.
var BuyequipMenu = MenuByList({choices: [], cursorParams: {x:10, y:17, dx:0, dy:30},ChoiceDisplay: function(i) {
  ctx.fillText(this.choices[i][0],40,30+30*i);
  ctx.fillText(this.choices[i][2]+ " G",180,30+30*i);
}});

// The effect of a weapon on the damage pipeline
AttackDamagePipeline.push(function(input) {
  return {dmg: input.dmg + GameState.Equipment.W[3]};
});

// The effect of armor on the damage pipeline
EnemyAttackDamagePipeline.push(function(input) {
  return {dmg: input.dmg - GameState.Equipment.A[3]};
});

// Initial equipment
InitStatOps.push(function() {GameState.Equipment = {"W":["No Weapon","W",0,0],"A":["No Armor","A",0,0]};});

// Buy Equipment state
function ProcessBuyequip() {
  if (Control.Query("Back")) {GameState.MenuReport = []; return {ChangeState: "X"};}
  BuyequipMenu.Process();
  if (Control.Query("Forward")) {
    var item = GameState.CurMerchant.EquipList[BuyequipMenu.ChoiceNum()];
	if (item[2] > GameState.Stats.Gold) {GameState.MenuReport = ["Not enough gold."];}
	else {
	  GameState.Stats.Gold -= item[2];
	  GameState.MenuReport = ["Thanks!"];
	  GameState.Equipment[item[1]] = item;
	}
  }
}
var BuyequipState = {Process: ProcessBuyequip, Activate: function() {BuyequipMenu.Reset();}};
BuyequipState.Display = function() {BuyequipMenu.Display();}
TownState.substates.BuyEquip = BuyequipState;

TownMenuCommands["Buy Equipment"] = function(town_state) {
  GameState.MenuReport = [];
  town_state.ChangeState("BuyEquip");
}

TownActivatePipeline.push(function() {
  TownMenu.choices.push("Buy Equipment");
  BuyequipMenu.choices = GameState.CurMerchant.EquipList;
});

StatusDisplayOps.push(function() {
  ctx.fillText(GameState["Equipment"]["W"][0],10,30);
  ctx.fillText("Atk+" + GameState["Equipment"]["W"][3],150,30);
  ctx.fillText(GameState["Equipment"]["A"][0],10,60);
  ctx.fillText("Def+" + GameState["Equipment"]["A"][3],150,60);    
});

// The AI functions for the state UPGRADE.  Assumes the player is in a town. State exited in a nonstandard way through Move
function UPGRADEMove(p) {
  if (CoreState.state == "Battle") {PlanStack.push({op:"WINBATTLE"}); return;}
  if (GameState.FrameNum % RT) {return;}
  if (TownState.state == "") {SeekName(TownMenu,"Buy Equipment");}
  if (TownState.state == "BuyEquip") {
    if (SeekCursor(BuyequipMenu,p.next_equip)) {PlanStack.pop(); return;}
  }
}
AIFunctions.UPGRADE = {Goal: function(p) {}, Move: UPGRADEMove};

// Handle prioritizing of equipment with spending money
GoldDesires.push(function() {
  var town = FindOnScreenByKey("merchant");
  if (!town) {return {amount:0, priority:0};}
  var mingold = 0; var upgrade_amount = 0;
  for (var i=0; i<town.merchant.EquipList.length; i++) {
    if (town.merchant.EquipList[i][3] - GameState.Equipment[town.merchant.EquipList[i][1]][3] > upgrade_amount) {
	  upgrade_amount = upgrade_amount = town.merchant.EquipList[i][3] - GameState.Equipment[town.merchant.EquipList[i][1]][3];
	  mingold = town.merchant.EquipList[i][2];
	}
  }
  return {amount:mingold, priority:2};
});

// Decide whether to upgrade equipment
ChooseDestinationOptions.push(function() {
  // Check about upgrading equipment
  var unaffordable_equipment = 0; // For later use, remember if there is any equipment that we can't buy yet
  var town = FindOnScreenByKey("merchant");
  var next_equip = -1; var upgrade_amount = 0; // Look for a suitable equipment upgrade
  for (var i=0; i<town.merchant.EquipList.length; i++)
    if (GameState.Stats.Gold >= town.merchant.EquipList[i][2]) { // Check if the new item can be afforded
	  if (town.merchant.EquipList[i][3] - GameState.Equipment[town.merchant.EquipList[i][1]][3] > upgrade_amount) { // Check if it is the best upgrade so far
	    next_equip = i;
		upgrade_amount = town.merchant.EquipList[i][3] - GameState.Equipment[town.merchant.EquipList[i][1]][3];
	  }
	}
	else {unaffordable_equipment = 1;}
  if (next_equip >= 0) { // Upgrade equipment
    var f = function() {
      PlanStack.push({op:"UPGRADE", next_equip: next_equip});
	  PlanStack.push({op:"QUERY"});
	  PlanStack.push({op:"FACE",x:10,y:10});
	  PlanStack.push({op:"GOTO",x:10,y:10, range:1});
	  SetPath(Plan().x, Plan().y);
	}
	return {weight:5,func: f};
  }
  else {return {weight:-1};}
});
