
var levelgraph = require("../");
var levelup = require("levelup");
var tmp = require("tmp");

describe("navigator", function() {

  var db;

  beforeEach(function(done) {
    tmp.dir(function(err, dir) {
      if (err) {
        done(err);
        return;
      }

      db = levelgraph(levelup(dir));
      db.put(require("./fixture/foaf"), done);
    });
  });

  afterEach(function(done) {
    db.close(done);
  });

  it("should navigate to a single vertex", function(done) {
    db.nav("matteo").values(function(err, results) {
      expect(results).to.eql(["matteo"]);
      done();
    });
  });

  it("should follow an arch going out a vertex", function(done) {
    db.nav("matteo").archOut("friend").values(function(err, friends) {
      expect(friends).to.eql(["daniele"]);
      done();
    });
  });

  it("should follow an arch going in a vertex", function(done) {
    db.nav("davide").archIn("friend").values(function(err, friends) {
      expect(friends).to.eql(["marco"]);
      done();
    });
  });

  it("should follow multiple archs, in and out a path", 
     function(done) {
    db.nav("davide").archIn("friend").archIn("friend").archOut("friend").
      values(function(err, friends) {

      expect(friends).to.eql(["marco", "matteo"]);
      done();
    });
  });

  it("should follow multiple archs, in and out a path using a stream", 
     function(done) {
    var stream = db.nav("davide").archIn("friend").archIn("friend").archOut("friend").stream();

    stream.on("data", function(data) {
      expect(["marco", "matteo"].indexOf(data) >= 0).to.be.ok;
    });

    stream.on("end", done);
  });

  it("should allow to set the name of the variables", 
     function(done) {
    db.nav("marco").archIn("friend").as("a").archOut("friend").archOut("friend").as("a").
      values(function(err, friends) {

      expect(friends).to.eql(["daniele"]);
      done();
    });
  });

  it("should allow to bind a variable", 
     function(done) {
    db.nav("matteo").archIn("friend").bind("lucio").archOut("friend").bind("marco").
      values(function(err, friends) {

      expect(friends).to.eql(["marco"]);
      done();
    });
  });

  it("should allow to start the navigation from a variable",
     function(done) {
    db.nav().archOut("friend").bind("matteo").archOut("friend").
      values(function(err, friends) {

      expect(friends).to.eql(["daniele"]);
      done();
    });
  });
});
