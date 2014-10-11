// The controller is an abstract class that manages input for a game

function Controller() {
  this.Query = function(query) {return 0;};
  this.SetFrame = function() {return 0;};
  this.PostFrame = function() {return 0;};
}
var Control = new Controller();