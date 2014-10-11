// The module for the boss

function Boss(input) {this.x = input.x; this.y = input.y; this.type = "Boss"}
Boss.prototype.Query = function() {
  CoreState.ChangeState("Battle");
  BattleMenu.Reset();
  BattleState.Activate();
  var cur_enemy = GameData.Enemies["boss"];
  GameState.Enemy = {};
  for (key in cur_enemy) {GameState.Enemy[key] = cur_enemy[key]}
  GameState.Enemy.FinalBoss = 1;
  GameState.BattleReport = ["A " + GameState.Enemy.name + " draws near.", "Command?"];
}
Boss.prototype.Impassible = function() {return true;}

MapObjectClasses.Boss = Boss;

Boss.prototype.Display = function() {
  var img = this.img;
  if (!img) {img = "ship.jpg";}
  DrawImage32({x:304+32*this.x,y:224+32*this.y,image:img});
}

ChooseDestinationOptions.push(function () {
  // Challenge the boss if it is nearby
  var boss = FindOnScreen("type","Boss");
  if (boss && GameData.maps[GameState.location.map].level < GameState.Stats.Level/2 - 1) {
    var f = function() {
      PlanStack.push({op:"QUERY"});
	  PlanStack.push({op:"FACE",x:boss.x,y:boss.y});
	  PlanStack.push({op:"GOTO",x:boss.x,y:boss.y, range:1});
	  SetPath(Plan().x, Plan().y);
	}
	return {weight:4,func: f};
  }
  else {return {weight:-1};}
});