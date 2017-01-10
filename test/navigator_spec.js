
var levelgraph = require('../lib/levelgraph')
  , level = require('memdb');

describe('navigator', function() {

  var db;

  beforeEach(function(done) {
    db = levelgraph(level());
    db.put(require('./fixture/foaf'), done);
  });

  afterEach(function(done) {
    db.close(done);
  });

  it('should navigate to a single vertex', function(done) {
    db.nav('matteo').values(function(err, results) {
      expect(results).to.eql(['matteo']);
      done();
    });
  });

  it('should follow an arch going out a vertex', function(done) {
    db.nav('matteo').archOut('friend').values(function(err, friends) {
      expect(friends).to.eql(['daniele']);
      done();
    });
  });

  it('should follow an arch going in a vertex', function(done) {
    db.nav('davide').archIn('friend').values(function(err, friends) {
      expect(friends).to.eql(['marco']);
      done();
    });
  });

  it('should follow multiple archs, in and out a path',
     function(done) {
    db.nav('davide')
      .archIn('friend')
      .archIn('friend')
      .archOut('friend').
      values(function(err, friends) {

      expect(friends).to.eql(['marco', 'matteo']);
      done();
    });
  });

  it('should follow multiple archs, in and out a path using a stream',
     function(done) {
    var stream = db.nav('davide')
                   .archIn('friend')
                   .archIn('friend')
                   .archOut('friend')
                   .valuesStream();

    stream.on('data', function(data) {
      expect(['marco', 'matteo'].indexOf(data) >= 0).to.equal(true);
    });

    stream.on('end', done);
  });

  it('should allow to set the name of the variables',
     function(done) {
    db.nav('marco')
      .archIn('friend')
      .as('a')
      .archOut('friend')
      .archOut('friend')
      .as('a').
      values(function(err, friends) {
        expect(friends).to.eql(['daniele']);
        done();
      });
  });

  it('should allow to bind a variable',
     function(done) {
    db.nav('matteo')
      .archIn('friend')
      .bind('lucio')
      .archOut('friend')
      .bind('marco').
      values(function(err, friends) {
        expect(friends).to.eql(['marco']);
        done();
      });
  });

  it('should allow to start the navigation from a variable',
     function(done) {
    db.nav().archOut('friend').bind('matteo').archOut('friend').
      values(function(err, friends) {
        expect(friends).to.eql(['daniele']);
        done();
      });
  });

  it('should return the solutions',
     function(done) {
    db.nav('daniele').archOut('friend').as('a').
      solutions(function(err, solutions) {
        expect(solutions).to.eql([{ a: 'marco' }, { a: 'matteo' }]);
        done();
      });
  });

  it('should return the solution as a stream',
     function(done) {

    var solutions = [{ a: 'marco' }, { a: 'matteo' }]

      , stream = db.nav('daniele')
                   .archOut('friend')
                   .as('a')
                   .solutionsStream();

    stream.on('data', function(data) {
      expect(data).to.eql(solutions.shift());
    });

    stream.on('end', done);
  });

  it('should return no solution if no condition is specified',
     function(done) {
    db.nav('daniele').solutions(function(err, solutions) {
      expect(solutions).to.eql([]);
      done();
    });
  });

  it('should return the materialized triples',
     function(done) {
    var pattern = {
      subject: 'daniele',
      predicate: 'friends-of-dani',
      object: db.v('a')
    };

    db.nav('daniele').archOut('friend').as('a').
      triples(pattern, function(err, triples) {

      expect(triples).to.eql([{
        subject: 'daniele',
        predicate: 'friends-of-dani',
        object: 'marco'
      }, {
        subject: 'daniele',
        predicate: 'friends-of-dani',
        object: 'matteo'
      }]);

      done();
    });
  });

  it('should return the materialized triples as a stream',
     function(done) {

    var pattern = {
          subject: 'daniele',
          predicate: 'friends-of-dani',
          object: db.v('a')
        }

      , triples = [{
          subject: 'daniele',
          predicate: 'friends-of-dani',
          object: 'marco'
        }, {
          subject: 'daniele',
          predicate: 'friends-of-dani',
          object: 'matteo'
        }]

      , stream = db.nav('daniele')
                   .archOut('friend')
                   .as('a')
                   .triplesStream(pattern);

    stream.on('data', function(data) {
      expect(data).to.eql(triples.shift());
    });

    stream.on('end', function() {
      expect(triples).to.have.property('length', 0);
      done();
    });
  });

  it('should go to another vertex', function(done) {
    db.nav('marco')
      .archIn('friend')
      .as('a')
      .go('matteo')
      .archOut('friend')
      .as('b')
      .solutions(function(err, solutions) {

      expect(solutions).to.eql([{
        a: 'daniele',
        b: 'daniele'
      }, {
        a: 'lucio',
        b: 'daniele'
      }]);

      done();
    });
  });

  it('should go to another vertex as a variable', function(done) {
    db.nav('marco')
      .go()
      .as('a')
      .archOut('friend')
      .as('b')
      .bind('matteo')
      .solutions(function(err, solutions) {

        expect(solutions).to.eql([{
          a: 'daniele',
          b: 'matteo'
        }, {
          a: 'lucio',
          b: 'matteo'
        }]);

        done();
      });
  });

  it('should alias solutions to contexts', function() {
    var nav = db.nav('marco');
    expect(nav.contexts).to.eql(nav.solutions);
  });

  it('should alias solutionStream to contextStream', function() {
    var nav = db.nav('marco');
    expect(nav.contextStream).to.eql(nav.solutionStream);
  });
});
