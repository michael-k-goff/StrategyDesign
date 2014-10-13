// This module handles conversations and people on the map

// Conversation state: This is the state when talking with a person or otherwise receiving textual information
function ConvProcess() {
  if (Control.Query("Forward")) {
    if (GameState.CurConv.screen_num < GameState.CurConv.text.length-1) {GameState.CurConv.screen_num += 1;}
	else {return {ChangeState: "X"};}
  }
  if (Control.Query("Back")) {return {ChangeState: "X"};}
}
var ConvState = {Process: ConvProcess};
CoreState.substates.Conv = ConvState;

// A person
function Person(input) {this.x = input.x; this.y = input.y; this.text = input.text}
Person.prototype.Display = function() {
  var img = this.img;
  if (!img) {img = "scientist.gif";}
  DrawImage32({x:304+32*this.x,y:224+32*this.y,image:img})
}
Person.prototype.Query = function() {
  CoreState.ChangeState("Conv"); GameState.CurConv = {text: this.text, screen_num:0};
}
Person.prototype.Impassible = function() {return true;}
MapObjectClasses.Person = Person;

ConvState.Display = function () {
  DrawColorRect({x:0,y:300,w:640,h:180});
  ctx.font = '20px Arial';
  ctx.fillStyle='#FFFFFF';
  var cur_text = GameState.CurConv.text[GameState.CurConv.screen_num];
  for (var i = 0; i < cur_text.length; i++) {ctx.fillText(cur_text[i],20,340+30*i);}
}