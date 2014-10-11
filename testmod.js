// This is a test of the module loading system

InitStats = function() { // Initialize all player stats to their starting values.  Does not affect state data.
  GameState.FrameNum = 0;
  GameState.Enemy = {};
  SetLocation(GameData.InitLocation);
  GameState.Stats = {HP:9999, MaxHP:9999, MP:5, MaxMP:5, Str:1, EXP:0, Gold:0, Level: 1};
  GameState.Items = [["Potion", 3], ["Hi-Potion", 1]];
  ItemMenu.choices = GameState.Items;
  BattleItemMenu.choices = GameState.Items;
  // Equipment formatted as Name, Type, Cost, Strength
  GameState.Equipment = {"W":["No Weapon","W",0,0],"A":["No Armor","A",0,0]};
}
