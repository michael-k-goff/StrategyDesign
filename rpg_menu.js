// The RPG menu module

// A general menu class
function Menu(input) {this.Choice = input.Choice; this.NumChoices = input.NumChoices; this.ChoiceDisplay = input.ChoiceDisplay;
  this.cursor = 0, this.cursorParams = input.cursorParams;
}
Menu.prototype.Choice = function() {return this.Choice(this.cursor);}
Menu.prototype.Process = function() {
  if (Control.Query("Down") && this.cursor < this.NumChoices() - 1) {this.cursor++;}
  if (Control.Query("Up") && this.cursor > 0) {this.cursor--;}
}
Menu.prototype.Reset = function() {this.cursor = 0;}
Menu.prototype.Display = function() {
  var num_choices = this.NumChoices();
  for (var i = 0; i < num_choices; i++) {this.ChoiceDisplay(i);}
  DrawColorRect({x:this.cursorParams.x+(this.cursorParams.dx)*this.cursor, y:this.cursorParams.y+(this.cursorParams.dy)*this.cursor, w: 13, h: 13, r:1,g:1,b:1})
}
// Create a menu on a list of objects
function MenuByList(inputs) {
  ChoiceDisplay = inputs.ChoiceDisplay; cursorParams = inputs.cursorParams
  // Default choice display with location extracted from cursor parameters.  Assumes the input menu is a list of strings
  if (!ChoiceDisplay) {ChoiceDisplay = function(i) {ctx.fillText(this.choices[i],this.cursorParams.x+30+this.cursorParams.dx*i,this.cursorParams.y+13+this.cursorParams.dy*i);}}
  ret_value = new Menu({Choice: function() {return this.choices[this.cursor]}, 
                NumChoices: function() {return this.choices.length}, ChoiceDisplay: ChoiceDisplay, cursorParams: cursorParams});
  ret_value.choices = inputs.choices;
  ret_value.ChoiceNum = function() {return this.cursor};
  return ret_value;
}

function SeekName(menu,name) { // Seek menu choice by name
  for (var i=0; i<menu.choices.length; i++) {
    if (menu.choices[i] == name) {return SeekCursor(menu,i);}
  }
}

function SeekInitialName(menu,name) { // Seek menu choice that starts with the given character sequence
  for (var i=0; i<menu.choices.length; i++) {
    if (menu.choices[i].substring(0,name.length) == name) {return SeekCursor(menu,i);}
  }
}

function SeekCursor(menu,pos) { // Seek menu choice and select it.  Assume the desired menu is active.  Return true if the selection is made
  if (menu.cursor == pos) {auto_keys.push("Forward"); return true;}
  else if (menu.cursor < pos) {auto_keys.push("Down")}
  else if (menu.cursor > pos) {auto_keys.push("Up")}
  return false;
}