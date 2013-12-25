
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

    var stream = db.searchStream([{
      subject: "matteo",
      predicate: "friend",
      object: db.v("x")
    }, {
      subject: db.v("x"),
      predicate: "friend",
      object: db.v("y")
    }, {
      subject: db.v("y"),
      predicate: "friend",
      object: "davide"
    }]);

    stream.on("data", function(data) {
      console.log(data);
    });
  });
});
