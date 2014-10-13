// Module for the ending of the RPG

function ProcessEnding() {}
var EndingState = {Process: ProcessEnding};
CoreState.substates.Ending = EndingState;

EndingState.Display = function() {ctx.fillText("Ending",300,200);}
CoreState.StatesToSuppressMap.push("Ending");