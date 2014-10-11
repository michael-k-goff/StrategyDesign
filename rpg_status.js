// RPG status module

MainMenu.choices.push("Status");

// Status state: display the status.  Currently no lower level states
function ProcessStatus() {if (Control.Query("Back")) {return {ChangeState:"X"};}}
var StatusState = {Process: ProcessStatus};

MainMenuCommands.Status = function (main_menu_state) {
  main_menu_state.ChangeState("Status");
}

MainMenuState.substates.Status = StatusState;

var StatusDisplayOps = [];
StatusState.Display = function() {
  for (var i=0; i<StatusDisplayOps.length; i++) {StatusDisplayOps[i]();}
}