
var levelup = require("levelup");
var levelgraph = require("../");
var tmp = require("tmp");

tmp.dir(function(err, dir) {
  if (err) {
    console.log(err);
    process.exit(1);
  }

  db = levelgraph(levelup(dir));
  db.put([{
    subject: "matteo",
    predicate: "friend",
    object: "daniele"
  }, {
    subject: "daniele",
    predicate: "friend",
    object: "matteo"
  }, {
    subject: "daniele",
    predicate: "friend",
    object: "marco"
  }, {
    subject: "lucio",
    predicate: "friend",
    object: "matteo"
  }, {
    subject: "lucio",
    predicate: "friend",
    object: "marco"
  }, {
    subject: "marco",
    predicate: "friend",
    object: "davide"
  }], function () {

    db.nav("matteo").archIn("friend").archOut("friend").
      values(function(err, results) {
      console.log(results);
    });

    db.search([{
      subject: db.v("x0"),
      predicate: 'friend',
      object: 'matteo'
    }, {
      subject: db.v("x0"),
      predicate: 'friend',
      object: db.v("x1")
    }], function(err, results) {
      console.log(results);
    });
  });
});
