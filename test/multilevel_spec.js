var levelgraph = require('../lib/levelgraph')
  , multilevel = require('multilevel')
  , level = require('memdb')
  , osenv = require('osenv');

describe('a multileveled triple store', function() {

  var db, graph, leveldb, server, client;

  beforeEach(function() {
    db = level();
    server = multilevel.server(db);
    client = multilevel.client();
    graph = levelgraph(client);

    server.pipe(client.createRpcStream()).pipe(server);
  });

  it('should put a triple', function(done) {
    var triple = { subject: 'a', predicate: 'b', object: 'c' };
    graph.put(triple, done);
  });

  it('should get a triple', function(done) {
    var triple = { subject: 'a', predicate: 'b', object: 'c' };
    graph.put(triple, function() {
      graph.get({ subject: 'a' }, function(err, list) {
        expect(list).to.eql([triple]);
        done();
      });
    });
  });

  it('should search a triple', function(done) {
    var triple = { subject: 'a', predicate: 'b', object: 'c' };
    graph.put(triple, function() {
      graph.search([{ subject: graph.v('x'), predicate: 'b', object: 'c' }], function(err, list) {
        expect(list).to.eql([{ x: 'a' }]);
        done();
      });
    });
  });

  it('should search many triples', function(done) {
    var triple1 = { subject: 'a1', predicate: 'b', object: 'c' };
    var triple2 = { subject: 'a2', predicate: 'b', object: 'c' };
    graph.put([triple1, triple2], function() {
      graph.search([{ subject: graph.v('x'), predicate: 'b', object: 'c' }], function(err, list) {
        expect(list).to.eql([{ x: 'a1' }, {x: 'a2'}]);
        done();
      });
    });
  });

  it('should do a join with two results', function(done) {
    graph.put(require('./fixture/foaf'), function(done) {
      graph.search([{
        subject: graph.v('x'),
        predicate: 'friend',
        object: 'marco'
      }, {
        subject: graph.v('x'),
        predicate: 'friend',
        object: 'matteo'
      }], function(err, results) {
        expect(results).to.have.property('length', 2);
        expect(results[0]).to.have.property('x', 'daniele');
        expect(results[1]).to.have.property('x', 'lucio');
        done();
      });
    });
  });

  it('should put a triple with a stream', function(done) {
    var triple = { subject: 'a', predicate: 'b', object: 'c' };
    var stream = graph.putStream();
    stream.on('end', done);
    stream.end(triple);
  });

  it('should not close anything', function(done) {
    graph.close(done);
  });
});
