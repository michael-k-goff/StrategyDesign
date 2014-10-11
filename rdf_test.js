var rdfstore = require('rdfstore');
/*
rdfstore.create(function(store) {
  var store = new rdfstore.Store({persistent:true, 
                    engine:'mongodb', 
                    name:'rdf_test',
                    overwrite:false,    // delete all the data already present in the MongoDB server
                   }, function(store){
     store.execute("SELECT * { ?s ?p ?o }", function(success, results){
     if(success) {
       // process results        
       console.log(results);       
      }
    });
  });  
});*/

var store = new rdfstore.Store({persistent:true, 
                  engine:'mongodb', 
                  name:'rdf_test',
                  overwrite:false,    // delete all the data already present in the MongoDB server
                 }, function(store){
  store.rdf.setPrefix("ex", "http://example.org/people/");
  store.rdf.setPrefix("foaf", "http://xmlns.com/foaf/0.1/");
  var graph = store.rdf.createGraph();
  graph.add(store.rdf.createTriple( store.rdf.createNamedNode(store.rdf.resolve("ex:Alice")),
                                 store.rdf.createNamedNode(store.rdf.resolve("foaf:knows")),
                                 store.rdf.createNamedNode("Bob") ));
  graph.add(store.rdf.createTriple( store.rdf.createNamedNode(store.rdf.resolve("ex:Bob")),
                                 store.rdf.createNamedNode(store.rdf.resolve("foaf:knows")),
                                 store.rdf.createNamedNode("Candy") ));
  graph.add(store.rdf.createTriple( store.rdf.createNamedNode(store.rdf.resolve("ex:Candy")),
                                 store.rdf.createNamedNode(store.rdf.resolve("foaf:knows")),
                                 store.rdf.createNamedNode("Duga") ));  
  // The following inserts triples into the database
  // To delete triples, use store.delete(graph, function(success) {} );
//  store.insert(graph, function(success) {
    store.execute("SELECT ?s WHERE {?s <http://xmlns.com/foaf/0.1/knows> <Bob>}", function(success, results){
      if(success) {
        // process results        
        console.log(results);       
      }
	  else {console.log("Error");}
    });
//  });
//  store.execute("DELETE {?s ?p ?o} WHERE {?s ?p ?o}", function(success,results) {});
//  store.execute("DELETE {?s ?p ?o} WHERE {?s ?p ?o; <http://xmlns.com/foaf/0.1/name> \"alice\"}", function(success,results) {
});  