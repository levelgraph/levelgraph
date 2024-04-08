var levelgraph      = require('../../lib/levelgraph')
  , createQuery     = require('../../lib/utilities').createQuery
  , { MemoryLevel } = require('memory-level')
  , path            = require('path')
  , { ValueStream } = require('level-read-stream')
  , osenv           = require('osenv');

describe('createQuery', function() {

  var db, leveldb = leveldb;

  beforeEach(function(done) {
    leveldb = new MemoryLevel();
    db = levelgraph(leveldb);
    db.put({ subject: 'a', predicate: 'b', object: 'c' }, done);
  });

  afterEach(function(done) {
    db.close(done);
  });

  it('should get same results as levelgraph.get', function(done) {
    db.get({ predicate: 'b' }, function(err, res) {
      new ValueStream(leveldb, db.createQuery({ predicate: 'b' }))
        .on('data', function(data) {
          expect([data]).to.eql(res);
          done();
        })
      ;
    });
  });

  it('should be exposed in lib/utilities.js', function(done) {
    expect(createQuery).to.eql(db.createQuery);
    done();
  });

});
