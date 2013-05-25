
var levelgraph = require("../");
var levelup = require("levelup");
var tmp = require("tmp");

module.exports = function(joinAlgorithm) {

  var db;

  beforeEach(function(done) {
    tmp.dir(function(err, dir) {
      if (err) {
        done(err);
        return;
      }

      db = levelgraph(levelup(dir), { joinAlgorithm: joinAlgorithm });
      db.put(require("./fixture/foaf"), done);
    });
  });

  afterEach(function(done) {
    db.close(done);
  });

  it("should do a join with one results", function(done) {
    db.join([{
      subject: db.v("x"),
      predicate: "friend",
      object: "daniele"
    }], function(err, results) {
      expect(results).to.have.property("length", 1);
      expect(results[0]).to.have.property("x", "matteo");
      done();
    });
  });

  it("should a join with two results", function(done) {
    db.join([{
      subject: db.v("x"),
      predicate: "friend",
      object: "marco"
    }, {
      subject: db.v("x"),
      predicate: "friend",
      object: "matteo"
    }], function(err, results) {
      expect(results).to.have.property("length", 2);
      expect(results[0]).to.have.property("x", "daniele");
      expect(results[1]).to.have.property("x", "lucio");
      done();
    });
  });

  it("should return the two contexts through the joinStream interface", function(done) {
    var contexts = [{ x: "daniele" }, { x: "lucio" }]
      , stream = db.joinStream([{
          subject: db.v("x"),
          predicate: "friend",
          object: "marco"
        }, {
          subject: db.v("x"),
          predicate: "friend",
          object: "matteo"
        }]);

    stream.on("data", function(data) {
      expect(data).to.eql(contexts.shift());
    });

    stream.on("end", done);
  });

  it("should allow to find mutual friends", function(done) {
    var contexts = [{ x: "daniele", y: "matteo" }, { x: "matteo", y: "daniele" }]
    //var contexts = [{ x: "matteo", y: "daniele" }, { x: "daniele", y: "matteo" }]

      , stream = db.joinStream([{
          subject: db.v("x"),
          predicate: "friend",
          object: db.v("y")
        }, {
          subject: db.v("y"),
          predicate: "friend",
          object: db.v("x")
        }]);

    stream.on("data", function(data) {
      var expected = contexts.shift();
      console.log("----> DATA", data);
      expect(data).to.eql(expected);
    });

    stream.on("end", function() {
      expect(contexts).to.have.property("length", 0);
      done();
    });
  });

  it("should allow to intersect common friends", function(done) {
    var contexts = [{ x: "marco" }, { x: "matteo" }]
      , stream = db.joinStream([{
          subject: "lucio",
          predicate: "friend",
          object: db.v("x")
        }, {
          subject: "daniele",
          predicate: "friend",
          object: db.v("x")
        }]);

    stream.on("data", function(data) {
      console.log("----> DATA", data);
      expect(data).to.eql(contexts.shift());
    });

    stream.on("end", function() {
      expect(contexts).to.have.property("length", 0);
      done();
    });
  });

  it("should support the friend of a friend scenario", function(done) {
    var contexts = [{ x: "daniele", y: "marco" }]
      , stream = db.joinStream([{
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
      console.log("----> DATA", data);
      expect(data).to.eql(contexts.shift());
    });

    stream.on("end", function() {
      expect(contexts).to.have.property("length", 0);
      done();
    });
  });

  it("should return triples from a join aka materialized API", function(done) {
    db.join([{
      subject: db.v("x"),
      predicate: "friend",
      object: "marco"
    }, {
      subject: db.v("x"),
      predicate: "friend",
      object: "matteo"
    }], {
      materialized: {
        subject: db.v("x"),
        predicate: "newpredicate",
        object: "abcde"
      }
    }, function(err, results) {
      expect(results).to.eql([{
        subject: "daniele",
        predicate: "newpredicate",
        object: "abcde"
      }, {
        subject: "lucio",
        predicate: "newpredicate",
        object: "abcde"
      }]);
      done();
    });
  });

  it("should emit triples from the stream interface aka materialized API", function(done) {
    var triples = [{
          subject: "daniele",
          predicate: "newpredicate",
          object: "abcde"
        }]

      , stream = db.joinStream([{
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
        }], {
          materialized: {
            subject: db.v("x"),
            predicate: "newpredicate",
            object: "abcde"
          }
        });

    stream.on("data", function(data) {
      expect(data).to.eql(triples.shift());
    });

    stream.on("end", function() {
      expect(triples).to.have.property("length", 0);
      done();
    });
  });
};
