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
