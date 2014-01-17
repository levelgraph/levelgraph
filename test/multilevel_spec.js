
var levelgraph = require('../lib/levelgraph')
  , manifest = require('level-manifest')
  , multilevel = require('multilevel')
  , level = require('level-test')()
  , osenv = require('osenv');

describe('a multileveled triple store', function() {

  var db, graph, leveldb, server, client;

  beforeEach(function() {
    db = level();
    graph = levelgraph(db);
    server = multilevel.server(db);
    client = multilevel.client(manifest(db));

    server.pipe(client.createRpcStream()).pipe(server);
  });

  it('should put a triple', function(done) {
    var triple = { subject: 'a', predicate: 'b', object: 'c' };
    client.graph.put(triple, done);
  });

  it('should get a triple', function(done) {
    var triple = { subject: 'a', predicate: 'b', object: 'c' };
    client.graph.put(triple, function() {
      client.graph.get({ subject: 'a' }, function(err, list) {
        expect(list).to.eql([triple]);
        done();
      });
    });
  });

  it('should search a triple', function(done) {
    var triple = { subject: 'a', predicate: 'b', object: 'c' };
    client.graph.put(triple, function() {
      client.graph.search([{ subject: { name: 'x' }, predicate: 'b', object: 'c' }], function(err, list) {
        expect(list).to.eql([{ x: 'a' }]);
        done();
      });
    });
  });

  it('should put a triple with a stream', function(done) {
    var triple = { subject: 'a', predicate: 'b', object: 'c' };
    var stream = client.graph.putStream();
    stream.on('end', done);
    stream.end(triple);
  });

  it('should not close anything', function(done) {
    graph.close(done);
  });
});
