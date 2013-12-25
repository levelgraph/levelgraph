
var levelgraph = require('../lib/levelgraph')
  , level = require('level-test')()
  , osenv = require('osenv');

describe('a basic triple store', function() {

  var db;

  beforeEach(function() {
    db = levelgraph(level());
  });

  afterEach(function(done) {
    db.close(done);
  });

  it('should put a triple', function(done) {
    var triple = { subject: 'a', predicate: 'b', object: 'c' };
    db.put(triple, done);
  });

  describe('with a triple inserted', function() {

    var triple;

    beforeEach(function(done) {
      triple = { subject: 'a', predicate: 'b', object: 'c' };
      db.put(triple, done);
    });

    it('should get it specifiying the subject', function(done) {
      db.get({ subject: 'a' }, function(err, list) {
        expect(list).to.eql([triple]);
        done();
      });
    });

    it('should get it specifiying the object', function(done) {
      db.get({ object: 'c' }, function(err, list) {
        expect(list).to.eql([triple]);
        done();
      });
    });

    it('should get it specifiying the predicate', function(done) {
      db.get({ predicate: 'b' }, function(err, list) {
        expect(list).to.eql([triple]);
        done();
      });
    });

    it('should get it specifiying the subject and the predicate', function(done) {
      db.get({ subject: 'a', predicate: 'b' }, function(err, list) {
        expect(list).to.eql([triple]);
        done();
      });
    });

    it('should get it specifiying the subject and the object', function(done) {
      db.get({ subject: 'a', object: 'c' }, function(err, list) {
        expect(list).to.eql([triple]);
        done();
      });
    });

    it('should get it specifiying the predicate and the object', function(done) {
      db.get({ predicate: 'b', object: 'c' }, function(err, list) {
        expect(list).to.eql([triple]);
        done();
      });
    });

    ['subject', 'predicate', 'object'].forEach(function(type) {
      it('should get nothing if nothing matches an only ' + type + ' query', 
         function(done) {

        var query  = {};
        query[type] = 'notfound';
        db.get(query, function(err, list) {
          expect(list).to.eql([]);
          done();
        });
      });
    });

    it('should return the triple through the getStream interface', function(done) {
      var stream = db.getStream({ predicate: 'b' });
      stream.on('data', function(data) {
        expect(data).to.eql(triple);
      });
      stream.on('end', done);
    });

    it('should get the triple if limit 1 is used', function(done) {
      db.get({ limit: 1 }, function(err, list) {
        expect(list).to.eql([triple]);
        done();
      });
    });

    it('should get the triple if limit 0 is used', function(done) {
      db.get({ limit: 0 }, function(err, list) {
        expect(list).to.eql([triple]);
        done();
      });
    });

    it('should get the triple if offset 0 is used', function(done) {
      db.get({ offset: 0 }, function(err, list) {
        expect(list).to.eql([triple]);
        done();
      });
    });

    it('should not get the triple if offset 1 is used', function(done) {
      db.get({ offset: 1 }, function(err, list) {
        expect(list).to.eql([]);
        done();
      });
    });
  });

  it('should put an array of triples', function(done) {
    var t1 = { subject: 'a', predicate: 'b', object: 'c' }
      , t2 = { subject: 'a', predicate: 'b', object: 'd' };
    db.put([t1, t2], done);
  });

  it('should get only triples with exact match of subjects', function(done) {
    var t1 = { subject: 'a1', predicate: 'b', object: 'c' }
      , t2 = { subject: 'a', predicate: 'b', object: 'd' };
    db.put([t1, t2], function() {
      db.get({ subject: 'a' }, function(err, matched) {
        expect(matched.length).to.eql(1);
        expect(matched[0]).to.eql(t2);
        done();
      });
    });
  });

  describe('with two triple inserted with the same predicate', function() {

    var triple1
      , triple2;

    beforeEach(function(done) {
      triple1 = { subject: 'a1', predicate: 'b', object: 'c' };
      triple2 = { subject: 'a2', predicate: 'b', object: 'd' };
      db.put([triple1, triple2], done);
    });

    it('should get one by specifiying the subject', function(done) {
      db.get({ subject: 'a1' }, function(err, list) {
        expect(list).to.eql([triple1]);
        done();
      });
    });

    it('should get two by specifiying the predicate', function(done) {
      db.get({ predicate: 'b' }, function(err, list) {
        expect(list).to.eql([triple1, triple2]);
        done();
      });
    });

    it('should remove one and still return the other', function(done) {
      db.del(triple2, function() {
        db.get({ predicate: 'b' }, function(err, list) {
          expect(list).to.eql([triple1]);
          done();
        });
      });
    });

    it('should return both triples through the getStream interface', function(done) {
      var triples = [triple1, triple2]
        , stream = db.getStream({ predicate: 'b' });
      stream.on('data', function(data) {
        expect(data).to.eql(triples.shift());
      });

      stream.on('end', done);
    });

    it('should return only one triple with limit 1', function(done) {
      db.get({ predicate: 'b', limit: 1 }, function(err, list) {
        expect(list).to.eql([triple1]);
        done();
      });
    });

    it('should return two triples with limit 2', function(done) {
      db.get({ predicate: 'b', limit: 2 }, function(err, list) {
        expect(list).to.eql([triple1, triple2]);
        done();
      });
    });

    it('should return three triples with limit 3', function(done) {
      db.get({ predicate: 'b', limit: 3 }, function(err, list) {
        expect(list).to.eql([triple1, triple2]);
        done();
      });
    });

    it('should support limit over streams', function(done) {
      var triples = [triple1]
        , stream = db.getStream({ predicate: 'b', limit: 1 });
      stream.on('data', function(data) {
        expect(data).to.eql(triples.shift());
      });

      stream.on('end', done);
    });

    it('should return only one triple with offset 1', function(done) {
      db.get({ predicate: 'b', offset: 1 }, function(err, list) {
        expect(list).to.eql([triple2]);
        done();
      });
    });

    it('should return only no triples with offset 2', function(done) {
      db.get({ predicate: 'b', offset: 2 }, function(err, list) {
        expect(list).to.eql([]);
        done();
      });
    });

    it('should support offset over streams', function(done) {
      var triples = [triple2]
        , stream = db.getStream({ predicate: 'b', offset: 1 });
      stream.on('data', function(data) {
        expect(data).to.eql(triples.shift());
      });

      stream.on('end', done);
    });
  });

  it('should put triples using a stream', function(done) {
    var t1 = { subject: 'a', predicate: 'b', object: 'c' };
    var t2 = { subject: 'a', predicate: 'b', object: 'd' };
    var stream = db.putStream();
    stream.on('close', done);

    stream.write(t1);
    stream.end(t2);
  });

  it('should store the triples written using a stream', function(done) {
    var t1 = { subject: 'a', predicate: 'b', object: 'c' };
    var t2 = { subject: 'a', predicate: 'b', object: 'd' };
    var stream = db.putStream();

    stream.write(t1);
    stream.end(t2);

    stream.on('close', function() {
      var triples = [t1, t2];
      var readStream = db.getStream({ predicate: 'b' });

      readStream.on('data', function(data) {
        expect(data).to.eql(triples.shift());
      });

      readStream.on('end', done);
    });
  });

  it('should del the triples using a stream', function(done) {
    var t1 = { subject: 'a', predicate: 'b', object: 'c' };
    var t2 = { subject: 'a', predicate: 'b', object: 'd' };
    var stream = db.putStream();

    stream.write(t1);
    stream.end(t2);

    stream.on('close', function() {

      var delStream = db.delStream();
      delStream.write(t1);
      delStream.end(t2);

      delStream.on('close', function() {
        var readStream = db.getStream({ predicate: 'b' });

        var results = [];
        readStream.on('data', function(data) {
          results.push(data);
        });

        readStream.on('end', function() {
          expect(results).to.have.property('length', 0);
          done();
        });
      });
    });
  });

  it('should alias searchStream to joinStream', function() {
    expect(db.joinStream).to.eql(db.searchStream);
  });

  it('should alias search to join', function() {
    expect(db.join).to.eql(db.search);
  });

  it('should support filtering', function(done) {
    var triple1 = { subject: 'a', predicate: 'b', object: 'd' }
      , triple2 = { subject: 'a', predicate: 'b', object: 'c' };

    db.put([triple1, triple2], function() {
      function filter(triple) {
        return triple.object === 'd';
      }

      db.get({ subject: 'a', predicate: 'b', filter: filter }, function(err, results) {
        expect(results).to.eql([triple1]);
        done();
      });
    });
  });
});

describe('deferred open support', function() {
  
  var db;

  afterEach(function(done) {
    db.close(done);
  });

  it('should call the callback if a level is passed', function(done) {
    db = levelgraph(level(), done);
  });

  it('should call the callback if a level is not passed', function(done) {
    db = levelgraph(osenv.tmpdir() + '_levelDeferred1', done);
  });

  it('should call the callback with a levelgrap', function(done) {
    db = levelgraph(level(), function(err, graphdb) {
      expect(graphdb).to.be.equal(db);
      done();
    });
  });
});
