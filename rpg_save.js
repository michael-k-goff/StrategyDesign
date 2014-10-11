// Module for saving and loading

MainMenuCommands.Save = function () {
  xmlhttp = new XMLHttpRequest();
  xmlhttp.open('POST','/comm',true);
  xmlhttp.setRequestHeader('Content-type', 'application/json; charset=utf-8');
  var reqString = JSON.stringify({'gameID':gameID, 'operation':'save',stats:GameState});
  xmlhttp.send(reqString);
  GameState.MenuReport = ["Saving..."];
}

var LoadSavedGamePipeline = [];
LoadSavedGamePipeline.push(function(temp) {
  SetLocation(JSON.parse(temp).location);
});
LoadSavedGamePipeline.push(function(temp) {
  GameState.Stats = JSON.parse(temp).Stats;
});

LoadAssetsPipeline.push(function() {
  xmlhttp = new XMLHttpRequest();
  xmlhttp.open('POST','/comm',true);
  xmlhttp.onload = function() {
	if (this.response) {
	  for (var i=0; i<LoadSavedGamePipeline.length; i++) {LoadSavedGamePipeline[i](this.response);}
	}
  };
  xmlhttp.setRequestHeader('Content-type', 'application/json; charset=utf-8');
  var reqString = JSON.stringify({'gameID':gameID, 'operation':'load'});
  xmlhttp.send(reqString);
});

MainMenu.choices.push("Save");