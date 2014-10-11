function makeRPG(params) {
    var Weapons = params.Weapons;
	var Enemies = params.Enemies;
    var varCode = h.InitVariables([["Weapons", JSON.stringify(Weapons)],
	   ["Enemies", JSON.stringify(Enemies)],
	   ["Stats","{EnemyHP: 10, CurEnemy: '', EXP: 0, Gold: 0, Weapon: 'None'}"]]) + "\n" +
	            "function RandEnemy() {" +
                "var result;var count = 0;" +
                "for (var e in Enemies)" +
                "if (Math.random() < 1/++count) {result = e}" +
                "return result;}" +

                "function load_func() {\n" +
                "if (this.response) {" +
                "rjson = JSON.parse(this.response);" +
                "Stats = rjson.Stats;" +
                "}\n" + "}\n" +
                "var reqString = JSON.stringify({'gameID':gameID, 'operation':'load'});\n" +
                h.HTTPreq("reqString", "load_func") +
				"Stats.CurEnemy = RandEnemy();\n" +
				"Stats.EnemyHP = Enemies[Stats.CurEnemy].HP;\n"+
				
				"var WeaponList = [];var i=0;" +
				"for (weapon in Weapons) {\n" +
				"WeaponList.push(weapon);" +
				"}\n";
    var displayCode = h.DrawRect("'#FFFFFF'","0","0","640","480") + "\n" +
                    h.DrawText("'#000000'","'30px Arial'", "'Enemy: ' + Stats.CurEnemy + ' (' + Stats.EnemyHP + ')'","0","30") + "\n" +
                    h.DrawText("'#000000'","'30px Arial'", "'EXP: ' + Stats.EXP","0","60") + "\n" +
					h.DrawText("'#000000'","'30px Arial'", "'Gold: ' + Stats.Gold","0","90") + "\n" +
					h.DrawText("'#000000'","'30px Arial'", "'Weapon: ' + Stats.Weapon + ' (' + Weapons[Stats.Weapon].Atk +')'","0","120") + "\n"+
					"var i = 1;\n" +
					"for (var i=0; i<WeaponList.length;i++) {\n" +
					h.DrawText("'#000000'","'30px Arial'", "WeaponList[i] + '(' + Weapons[WeaponList[i]].Atk + '): ' + Weapons[WeaponList[i]].Cost","300","30*i+30") + "\n" +
					"}\n";
    var keyCode = "if (keyCode == 83) {" +
                "var reqString = JSON.stringify({'gameID':gameID, 'operation': 'save', 'Stats':Stats});" +
                h.HTTPreq("reqString") + "} else {" +
				"Stats.EnemyHP -= Weapons[Stats.Weapon].Atk;" +
				"if (Stats.EnemyHP <= 0) {" +
				"Stats.EXP += Enemies[Stats.CurEnemy].EXP;" +
				"Stats.Gold += Enemies[Stats.CurEnemy].Gold;" +
				"Stats.CurEnemy = RandEnemy();" +
				"Stats.EnemyHP = Enemies[Stats.CurEnemy].HP;" +
				"}}\n";
    var keyCode = h.KeyFunc(keyCode);
	var mouse = "if (x<300) {return;}\n" +
	            "var selection = WeaponList[Math.floor(y/30)];\n" +
				"if (y < 0 || y >= 30*WeaponList.length) {return;}\n" +
				"if (Stats.Gold < Weapons[selection].Cost) {return;}\n" +
				"Stats.Weapon = selection;" +
				"Stats.Gold -= Weapons[selection].Cost;";
    var mouseCode = h.MouseFunc(mouse);
    displayCode = h.Interval(displayCode,30);
    function http_func(req_body, game, response, dbManager) {
      if (req_body.operation == "load") {
        response.send(game.saveData);
      }
      else if (req_body.operation == "save") {
        game.saveData = JSON.stringify(req_body);
        game.save();
        response.send("");
      }
	  else {
        response.send("");
	  }
    }
	var gameCode = h.MakeScript(varCode + keyCode + mouseCode + displayCode);
	return {name: params.name, gameCode: gameCode, http_func: http_func, x: 640, y: 480}; // Package code and game metadata
}
exports.makeRPG = makeRPG;

function storeTriples(params, store, game) {
		  var graph = store.rdf.createGraph();
		  for (enemy in params.Enemies) {
		    var b_node = store.rdf.createBlankNode();
			graph.add(store.rdf.createTriple(b_node, 
			                 store.rdf.createNamedNode("InGame"),
							 store.rdf.createNamedNode(game.id)));
			graph.add(store.rdf.createTriple(b_node, 
			                 store.rdf.createNamedNode("HasName"),
							 store.rdf.createLiteral(enemy)));
			graph.add(store.rdf.createTriple(b_node, 
			                 store.rdf.createNamedNode("HasEXP"),
							 store.rdf.createLiteral(params.Enemies[enemy].EXP)));
			graph.add(store.rdf.createTriple(b_node, 
			                 store.rdf.createNamedNode("HasGold"),
							 store.rdf.createLiteral(params.Enemies[enemy].Gold)));
			graph.add(store.rdf.createTriple(b_node, 
			                 store.rdf.createNamedNode("HasHP"),
							 store.rdf.createLiteral(params.Enemies[enemy].HP)));
		  }
		  for (weapon in params.Weapons) {
		    var b_node = store.rdf.createBlankNode();
			graph.add(store.rdf.createTriple(b_node, 
			                 store.rdf.createNamedNode("InGame"),
							 store.rdf.createNamedNode(game.id)));
			graph.add(store.rdf.createTriple(b_node, 
			                 store.rdf.createNamedNode("HasName"),
							 store.rdf.createLiteral(weapon)));
			graph.add(store.rdf.createTriple(b_node, 
			                 store.rdf.createNamedNode("HasAtk"),
							 store.rdf.createLiteral(params.Weapons[weapon].Atk)));
			graph.add(store.rdf.createTriple(b_node, 
			                 store.rdf.createNamedNode("HasCost"),
							 store.rdf.createLiteral(params.Weapons[weapon].Cost)));
		  }
		  store.insert(graph, function(success) {});
}
exports.storeTriples = storeTriples;