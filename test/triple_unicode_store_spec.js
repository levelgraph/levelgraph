
var levelgraph = require('../lib/levelgraph')
  , level = require('level-test')()
  , path = require('path')
  , osenv = require('osenv');

describe('a basic unicode triple store', function() {

  var db, leveldb = leveldb;

  beforeEach(function() {
    leveldb = level();
    db = levelgraph(leveldb);
  });

  afterEach(function(done) {
    db.close(done);
  });

  it('should put a triple', function(done) {
    var triple = { subject: '车', predicate: '是', object: '交通工具' };
    db.put(triple, done);
  });

  describe('with a triple inserted', function() {

    var triple;

    beforeEach(function(done) {
      triple = { subject: '车', predicate: '是', object: '交通工具' };
      db.put(triple, done);
    });

    it('should get it specifiying the subject', function(done) {
      db.get({ subject: '车' }, function(err, list) {
        expect(list).to.eql([triple]);
        done();
      });
    });

    it('should get it specifiying the object', function(done) {
      db.get({ object: '交通工具' }, function(err, list) {
        expect(list).to.eql([triple]);
        done();
      });
    });

    it('should get it specifiying the predicate', function(done) {
      db.get({ predicate: '是' }, function(err, list) {
        expect(list).to.eql([triple]);
        done();
      });
    });

    it('should get it specifiying the subject and the predicate', function(done) {
      db.get({ subject: '车', predicate: '是' }, function(err, list) {
        expect(list).to.eql([triple]);
        done();
      });
    });

    it('should get it specifiying the subject and the object', function(done) {
      db.get({ subject: '车', object: '交通工具' }, function(err, list) {
        expect(list).to.eql([triple]);
        done();
      });
    });

    it('should get it specifiying the predicate and the object', function(done) {
      db.get({ predicate: '是', object: '交通工具' }, function(err, list) {
        expect(list).to.eql([triple]);
        done();
      });
    });

    it('should get it specifiying the subject and falsy params', function(done) {
      db.get({ subject: '车', predicate: false, object: null }, function(err, list) {
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
      var stream = db.getStream({ predicate: '是' });
      stream.on('data', function(data) {
        expect(data).to.eql(triple);
      });
      stream.on('end', done);
    });

    it('should return the triple through the getStream interface with falsy params', function(done) {
      var stream = db.getStream({ subject: null, predicate: '是', object: false });
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
    var t1 = { subject: '车', predicate: '是', object: '交通工具' }
      , t2 = { subject: '车', predicate: '是', object: '动物' };
    db.put([t1, t2], done);
  });

  it('should get only triples with exact match of subjects', function(done) {
    var t1 = { subject: '飞机', predicate: '是', object: '交通工具' }
      , t2 = { subject: '车', predicate: '是', object: '动物' };
    db.put([t1, t2], function() {
      db.get({ subject: '车' }, function(err, matched) {
        expect(matched.length).to.eql(1);
        expect(matched[0]).to.eql(t2);
        done();
      });
    });
  });

  it('should put a triple with an object to false', function(done) {
    var t = { subject: '车', predicate: '是', object: false };
    db.put(t, function() {
      leveldb.get('spo::车::是::false', done);
    });
  });

  describe('with two triple inserted with the same predicate', function() {

    var triple1
      , triple2;

    beforeEach(function(done) {
      triple1 = { subject: '飞机', predicate: '是', object: '交通工具' };
      triple2 = { subject: '狗熊', predicate: '是', object: '动物' };
      db.put([triple1, triple2], done);
    });

    it('should get one by specifiying the subject', function(done) {
      db.get({ subject: '飞机' }, function(err, list) {
        expect(list).to.eql([triple1]);
        done();
      });
    });

    it('should get one by specifiying the subject and a falsy predicate', function(done) {
      db.get({ subject: '飞机', predicate: null }, function(err, list) {
        expect(list).to.eql([triple1]);
        done();
      });
    });

    it('should get two by specifiying the predicate', function(done) {
      db.get({ predicate: '是' }, function(err, list) {
        expect(list).to.eql([triple1, triple2]);
        done();
      });
    });

    it('should get two by specifiying the predicate and a falsy subject', function(done) {
      db.get({ subject: null, predicate: '是' }, function(err, list) {
        expect(list).to.eql([triple1, triple2]);
        done();
      });
    });

    it('should remove one and still return the other', function(done) {
      db.del(triple2, function() {
        db.get({ predicate: '是' }, function(err, list) {
          expect(list).to.eql([triple1]);
          done();
        });
      });
    });

    it('should return both triples through the getStream interface', function(done) {
      var triples = [triple1, triple2]
        , stream = db.getStream({ predicate: '是' });
      stream.on('data', function(data) {
        expect(data).to.eql(triples.shift());
      });

      stream.on('end', done);
    });

    it('should return only one triple with limit 1', function(done) {
      db.get({ predicate: '是', limit: 1 }, function(err, list) {
        expect(list).to.eql([triple1]);
        done();
      });
    });

    it('should return two triples with limit 2', function(done) {
      db.get({ predicate: '是', limit: 2 }, function(err, list) {
        expect(list).to.eql([triple1, triple2]);
        done();
      });
    });

    it('should return three triples with limit 3', function(done) {
      db.get({ predicate: '是', limit: 3 }, function(err, list) {
        expect(list).to.eql([triple1, triple2]);
        done();
      });
    });

    it('should support limit over streams', function(done) {
      var triples = [triple1]
        , stream = db.getStream({ predicate: '是', limit: 1 });
      stream.on('data', function(data) {
        expect(data).to.eql(triples.shift());
      });

      stream.on('end', done);
    });

    it('should return only one triple with offset 1', function(done) {
      db.get({ predicate: '是', offset: 1 }, function(err, list) {
        expect(list).to.eql([triple2]);
        done();
      });
    });

    it('should return only no triples with offset 2', function(done) {
      db.get({ predicate: '是', offset: 2 }, function(err, list) {
        expect(list).to.eql([]);
        done();
      });
    });

    it('should support offset over streams', function(done) {
      var triples = [triple2]
        , stream = db.getStream({ predicate: '是', offset: 1 });
      stream.on('data', function(data) {
        expect(data).to.eql(triples.shift());
      });

      stream.on('end', done);
    });

    it('should return the triples in reverse order with reverse true', function(done) {
      db.get({ predicate: '是', reverse: true }, function(err, list) {
        expect(list).to.eql([triple2, triple1]);
        done();
      });
    });

    it('should return the last triple with reverse true and limit 1', function(done) {
      db.get({ predicate: '是', reverse: true, limit: 1 }, function(err, list) {
        expect(list).to.eql([triple2]);
        done();
      });
    });

    it('should support reverse over streams', function(done) {
      var triples = [triple2, triple1]
        , stream = db.getStream({ predicate: '是', reverse: true });
      stream.on('data', function(data) {
        expect(data).to.eql(triples.shift());
      });

      stream.on('end', done);
    });
  });

  describe('with 10 triples inserted', function() {
    beforeEach(function (done) {
      var triples = [];
      for (var i = 0; i < 10; i++) {
        triples[i] = { subject: '测试项', predicate: '推导', object: '目标' + i };
      }
      db.put(triples, done);
    });

    if (!process.browser) {
      it('should return the approximate size', function(done) {
        db.approximateSize({ predicate: '是' }, function (err, size) {
          expect(size).to.be.a('number');
          done(err);
        });
      });
    }
  });

  it('should put triples using a stream', function(done) {
    var t1 = { subject: '车', predicate: '是', object: '交通工具' };
    var t2 = { subject: '车', predicate: '是', object: '动物' };
    var stream = db.putStream();
    stream.on('close', done);

    stream.write(t1);
    stream.end(t2);
  });

  it('should store the triples written using a stream', function(done) {
    var t1 = { subject: '车', predicate: '是', object: '交通工具' };
    var t2 = { subject: '车', predicate: '是', object: '动物' };
    var stream = db.putStream();

    stream.write(t1);
    stream.end(t2);

    stream.on('close', function() {
      var triples = [t1, t2];
      var readStream = db.getStream({ predicate: '是' });

      readStream.on('data', function(data) {
        expect(data).to.eql(triples.shift());
      });

      readStream.on('end', done);
    });
  });

  it('should del the triples using a stream', function(done) {
    var t1 = { subject: '车', predicate: '是', object: '交通工具' };
    var t2 = { subject: '车', predicate: '是', object: '动物' };
    var stream = db.putStream();

    stream.write(t1);
    stream.end(t2);

    stream.on('close', function() {

      var delStream = db.delStream();
      delStream.write(t1);
      delStream.end(t2);

      delStream.on('close', function() {
        var readStream = db.getStream({ predicate: '是' });

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

  it('should support filtering', function(done) {
    var triple1 = { subject: '车', predicate: '是', object: '动物' }
      , triple2 = { subject: '车', predicate: '是', object: '交通工具' };

    db.put([triple1, triple2], function() {
      function filter(triple) {
        return triple.object === '动物';
      }

      db.get({ subject: '车', predicate: '是', filter: filter }, function(err, results) {
        expect(results).to.eql([triple1]);
        done();
      });
    });
  });

  describe('API deprecations', function() {

    var warnSpy;

    beforeEach(function() {
      warnSpy = sinon.stub(console, 'warn');
    });

    afterEach(function() {
      warnSpy.restore();
    });

    it('should call searchStream when calling joinStream', function() {
      var stub = sinon.stub(db, 'searchStream');
      db.joinStream('车', '是', '交通工具');
      expect(stub).to.be.calledWith('车', '是', '交通工具');
    });

    it('should alias search to join', function() {
      var stub = sinon.stub(db, 'search');
      db.join('车', '是', '交通工具');
      expect(stub).to.be.calledWith('车', '是', '交通工具');
    });

    it('should warn when calling joinStream', function() {
      var stub = sinon.stub(db, 'searchStream');
      db.joinStream('车', '是', '交通工具');

      expect(warnSpy).to.be.calledWith('joinStream is deprecated, use searchStream instead');
    });

    it('should warn when calling join', function() {
      var stub = sinon.stub(db, 'search');
      db.join('车', '是', '交通工具');

      expect(warnSpy).to.be.calledWith('join is deprecated, use search instead');
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
    db = levelgraph(path.join(osenv.tmpdir(), '_levelDeferred1'), done);
  });

  it('should call the callback with a levelgrap', function(done) {
    db = levelgraph(level(), function(err, graphdb) {
      expect(graphdb).to.be.equal(db);
      done();
    });
  });

  it('should support deferred search', function(done) {
    db = levelgraph(level());
    db.search([{ predicate: 'likes' }], function() {
      done();
    });
  });
});

describe('generateBatch', function () {
  var db, leveldb = leveldb;

  beforeEach(function() {
    leveldb = level();
    db = levelgraph(leveldb);
  });

  afterEach(function(done) {
    db.close(done);
  });

  it('should generate a batch from a triple', function() {
    var triple = { subject: '车', predicate: '是', object: '交通工具' };
    var ops = db.generateBatch(triple);
    expect(ops).to.have.property('length', 6);
    ops.forEach(function (op) {
      expect(op).to.have.property('type', 'put');
      expect(JSON.parse(op.value)).to.eql(triple);
    });
  });

  it('should generate a batch of type', function() {
    var triple = { subject: '车', predicate: '是', object: '交通工具' };
    var ops = db.generateBatch(triple, 'del');
    expect(ops).to.have.property('length', 6);
    ops.forEach(function (op) {
      expect(op).to.have.property('type', 'del');
      expect(JSON.parse(op.value)).to.eql(triple);
    });
  });
});
