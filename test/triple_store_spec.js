
var levelgraph = require("../")
  , level = require("level-test")();

describe("a basic triple store", function() {

  var db;

  beforeEach(function() {
    db = levelgraph(level());
  });

  afterEach(function(done) {
    db.close(done);
  });

  it("should put a triple", function(done) {
    var triple = { subject: "a", predicate: "b", object: "c" };
    db.put(triple, done);
  });

  describe("with a triple inserted", function() {

    var triple;

    beforeEach(function(done) {
      triple = { subject: "a", predicate: "b", object: "c" };
      db.put(triple, done);
    });

    it("should get it specifiying the subject", function(done) {
      db.get({ subject: "a" }, function(err, list) {
        expect(list).to.eql([triple]);
        done();
      });
    });

    it("should get it specifiying the object", function(done) {
      db.get({ object: "c" }, function(err, list) {
        expect(list).to.eql([triple]);
        done();
      });
    });

    it("should get it specifiying the predicate", function(done) {
      db.get({ predicate: "b" }, function(err, list) {
        expect(list).to.eql([triple]);
        done();
      });
    });

    it("should get it specifiying the subject and the predicate", function(done) {
      db.get({ subject: "a", predicate: "b" }, function(err, list) {
        expect(list).to.eql([triple]);
        done();
      });
    });

    it("should get it specifiying the subject and the object", function(done) {
      db.get({ subject: "a", object: "c" }, function(err, list) {
        expect(list).to.eql([triple]);
        done();
      });
    });

    it("should get it specifiying the predicate and the object", function(done) {
      db.get({ predicate: "b", object: "c" }, function(err, list) {
        expect(list).to.eql([triple]);
        done();
      });
    });

    ["subject", "predicate", "object"].forEach(function(type) {
      it("should get nothing if nothing matches an only " + type + " query", 
         function(done) {

        var query  = {};
        query[type] = "notfound";
        db.get(query, function(err, list) {
          expect(list).to.eql([]);
          done();
        });
      });
    });

    it("should return the triple through the getStream interface", function(done) {
      var stream = db.getStream({ predicate: "b" });
      stream.on("data", function(data) {
        expect(data).to.eql(triple);
      });
      stream.on("end", done);
    });
  });

  it("should put an array of triples", function(done) {
    var t1 = { subject: "a", predicate: "b", object: "c" }
      , t2 = { subject: "a", predicate: "b", object: "d" };
    db.put([t1, t2], done);
  });

  describe("with two triple inserted with the same predicate", function() {

    var triple1
      , triple2;

    beforeEach(function(done) {
      triple1 = { subject: "a1", predicate: "b", object: "c" };
      triple2 = { subject: "a2", predicate: "b", object: "d" };
      db.put([triple1, triple2], done);
    });

    it("should get one by specifiying the subject", function(done) {
      db.get({ subject: "a1" }, function(err, list) {
        expect(list).to.eql([triple1]);
        done();
      });
    });

    it("should get two by specifiying the predicate", function(done) {
      db.get({ predicate: "b" }, function(err, list) {
        expect(list).to.eql([triple1, triple2]);
        done();
      });
    });

    it("should remove one and still return the other", function(done) {
      db.del(triple2, function() {
        db.get({ predicate: "b" }, function(err, list) {
          expect(list).to.eql([triple1]);
          done();
        });
      });
    });

    it("should return both triples through the getStream interface", function(done) {
      var triples = [triple1, triple2]
        , stream = db.getStream({ predicate: "b" });
      stream.on("data", function(data) {
        expect(data).to.eql(triples.shift());
      });

      stream.on("end", done);
    });
  });

  it("should put triples using a stream", function(done) {
    var t1 = { subject: "a", predicate: "b", object: "c" };
    var t2 = { subject: "a", predicate: "b", object: "d" };
    var stream = db.putStream();
    stream.on("close", done);

    stream.write(t1);
    stream.end(t2);
  });

  it("should store the triples written using a stream", function(done) {
    var t1 = { subject: "a", predicate: "b", object: "c" };
    var t2 = { subject: "a", predicate: "b", object: "d" };
    var stream = db.putStream();

    stream.write(t1);
    stream.end(t2);

    stream.on("close", function() {
      var triples = [t1, t2];
      var readStream = db.getStream({ predicate: "b" });

      readStream.on("data", function(data) {
        expect(data).to.eql(triples.shift());
      });

      readStream.on("end", done);
    });
  });

  it("should del the triples using a stream", function(done) {
    var t1 = { subject: "a", predicate: "b", object: "c" };
    var t2 = { subject: "a", predicate: "b", object: "d" };
    var stream = db.putStream();

    stream.write(t1);
    stream.end(t2);

    stream.on("close", function() {

      var delStream = db.delStream();
      delStream.write(t1);
      delStream.end(t2);

      delStream.on("close", function() {
        var readStream = db.getStream({ predicate: "b" });

        var results = [];
        readStream.on("data", function(data) {
          results.push(data);
        });

        readStream.on("end", function() {
          expect(results).to.have.property("length", 0);
          done();
        });
      });
    });
  });
});
