
var levelgraph = require("../");
var levelup = require("levelup");
var tmp = require("tmp");

describe("a basic triple store", function() {

  var db;

  beforeEach(function(done) {
    tmp.dir(function(err, dir) {
      if (dir) {
        db = levelgraph(levelup(dir));
      }
      done(err);
    });
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
      it("should get nothing if nothing matches an only " + type + " query", function(done) {
        var query  = {};
        query[type] = "notfound";
        db.get(query, function(err, list) {
          expect(list).to.eql([]);
          done();
        });
      });
    });
  });

  it("should put an array of triples", function(done) {
    var t1 = { subject: "a", predicate: "b", object: "c" };
    var t2 = { subject: "a", predicate: "b", object: "d" };
    db.put([t1, t2], done);
  });

  describe("with two triple inserted with the same predicate", function() {

    var triple1;
    var triple2;

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
  });
});
