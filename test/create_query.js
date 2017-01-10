
var levelgraph = require('../lib/levelgraph')
  , createQuery = require('../lib/utilities').createQuery
  , level = require('memdb')
  , path = require('path')
  , osenv = require('osenv');

describe('createQuery', function() {

  var db, leveldb = leveldb;

  beforeEach(function(done) {
    leveldb = level();
    db = levelgraph(leveldb);
    db.put({ subject: 'a', predicate: 'b', object: 'c' }, done);
  });

  afterEach(function(done) {
    db.close(done);
  });

  it('should get same results as levelgraph.get', function(done) {
    db.get({ predicate: 'b' }, function(err, res) {
      leveldb.createValueStream(db.createQuery({ predicate: 'b' }))
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
