// A keyboard module

// A standard keyboard manager.  Keeps track of which keys are pressed.
// Values: 13, Enter; 16, Backspace; 32, Spacebar
var keyRepeatTimes = {13:15, 38:8, 40:8, 16: 15, 32:15};
function KeyManager() {this.keys = [];this.Countdown = 0;}
KeyManager.prototype.KeyDown = function(key) {if (this.keys.indexOf(key) < 0) {this.keys.push(key); this.Countdown = 0;}}
KeyManager.prototype.HardQuery = function(key) {
  if (this.keys.indexOf(key) < 0) {return false;}
  if (keyRepeatTimes[key]) {this.Countdown = keyRepeatTimes[key];}
  return true;
}
KeyManager.prototype.Query = function(key) {
  if (this.keys.indexOf(key) < 0) {return false;}
  if (this.Countdown > 0) {return false;}
  if (keyRepeatTimes[key]) {this.Countdown = keyRepeatTimes[key];}
  return true;
}
KeyManager.prototype.DelayQuery = function(key) { // Query but don't reset the countdown until after done processing
  if (this.keys.indexOf(key) < 0) {return false;}
  if (this.Countdown > 0) {return false;}
  if (keyRepeatTimes[key]) {this.ToSetCountdown = keyRepeatTimes[key];}
  return true;
}
KeyManager.prototype.Reset = function() {
  if (this.ToSetCountdown && !this.Countdown) {
    this.Countdown = this.ToSetCountdown;
  }
  this.ToSetCountdown = 0;
}
KeyManager.prototype.KeyUp = function(key) {for (var i=this.keys.length; i--;) {if (this.keys[i] == key) {this.keys.splice(i,1);}}}
var KeyMan = new KeyManager();
function OnKeyDown(e) {
  var keyCode = e.keyCode;
  KeyMan.KeyDown(keyCode);
}
window.onkeydown=function(e) {OnKeyDown(e);};
function OnKeyUp(e) {
  var keyCode = e.keyCode;
  KeyMan.KeyUp(keyCode);
}
window.onkeyup=function(e) {OnKeyUp(e);};

function SetKeyboardController() {
  Control.Query = function(query) {
    if (query == "Up" || query == "up") {return KeyMan.Query(38);}
	if (query == "Down" || query == "down") {return KeyMan.Query(40);}
	if (query == "Left" || query == "left") {return KeyMan.Query(37);}
	if (query == "Right" || query == "right") {return KeyMan.Query(39);}
	if (query == "UP") {return KeyMan.HardQuery(38);}
	if (query == "DOWN") {return KeyMan.HardQuery(40);}
	if (query == "LEFT") {return KeyMan.HardQuery(37);}
	if (query == "RIGHT") {return KeyMan.HardQuery(39);}
	if (query == "Back") {return KeyMan.Query(16);}
	if (query == "back") {return KeyMan.DelayQuery(16);}
	if (query == "Forward") {return KeyMan.Query(13);}
	if (query == "forward") {return KeyMan.DelayQuery(13);}
  }
  Control.SetFrame = function() {KeyMan.Countdown--;}
  Control.PostFrame = function() {KeyMan.Reset();}
}

if (!AUTOPLAY || AUTOPLAY < 0) {SetKeyboardController();}