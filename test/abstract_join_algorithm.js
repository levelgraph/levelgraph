
var levelgraph = require('../lib/levelgraph');
var level = require('memdb');

module.exports = function(joinAlgorithm) {

  var db;

  beforeEach(function(done) {
    db = levelgraph(level(), { joinAlgorithm: joinAlgorithm });
    db.put(require('./fixture/foaf'), done);
  });

  afterEach(function(done) {
    setImmediate(function() {
      db.close(done);
    });
  });

  it('should do a join with one results', function(done) {
    db.search([{
      subject: db.v('x'),
      predicate: 'friend',
      object: 'daniele'
    }], function(err, results) {
      expect(results).to.have.property('length', 1);
      expect(results[0]).to.have.property('x', 'matteo');
      done();
    });
  });

  it('should support non-array search parameter', function(done) {
    db.search({
      subject: db.v('x'),
      predicate: 'friend',
      object: 'daniele'
    }, function(err, results) {
      expect(results).to.have.property('length', 1);
      expect(results[0]).to.have.property('x', 'matteo');
      done();
    });
  });

  it('should do a join with two results', function(done) {
    db.search([{
      subject: db.v('x'),
      predicate: 'friend',
      object: 'marco'
    }, {
      subject: db.v('x'),
      predicate: 'friend',
      object: 'matteo'
    }], function(err, results) {
      expect(results).to.have.property('length', 2);
      expect(results[0]).to.have.property('x', 'daniele');
      expect(results[1]).to.have.property('x', 'lucio');
      done();
    });
  });

  it('should do a join with three conditions', function(done) {
    db.search([{
      subject: db.v('x'),
      predicate: 'friend',
      object: db.v('y')
    }, {
      subject: db.v('x'),
      predicate: 'friend',
      object: 'matteo'
    }, {
      subject: 'lucio',
      predicate: 'friend',
      object: db.v('y')
    }], function(err, results) {
      expect(results).to.have.property('length', 4);
      done();
    });
  });

  it('should return the two solutions through the searchStream interface', function(done) {
    var solutions = [{ x: 'daniele' }, { x: 'lucio' }]
      , stream = db.searchStream([{
          subject: db.v('x'),
          predicate: 'friend',
          object: 'marco'
        }, {
          subject: db.v('x'),
          predicate: 'friend',
          object: 'matteo'
        }]);

    stream.on('data', function(data) {
      expect(data).to.eql(solutions.shift());
    });

    stream.on('end', done);
  });

  it('should allow to find mutual friends', function(done) {
    var solutions = [{ x: 'daniele', y: 'matteo' }, { x: 'matteo', y: 'daniele' }]

      , stream = db.searchStream([{
          subject: db.v('x'),
          predicate: 'friend',
          object: db.v('y')
        }, {
          subject: db.v('y'),
          predicate: 'friend',
          object: db.v('x')
        }]);

    stream.on('data', function(data) {
      var solutionIndex = -1;

      solutions.forEach(function(solution, i) {
        var found = Object.keys(solutions).every(function(v) {
          return solution[v] === data[v];
        });
        if (found) {
          solutionIndex = i;
        }
      });

      if (solutionIndex !== -1) {
        solutions.splice(solutionIndex, 1);
      }
    });

    stream.on('end', function() {
      expect(solutions).to.have.property('length', 0);
      done();
    });
  });

  it('should allow to intersect common friends', function(done) {
    var solutions = [{ x: 'marco' }, { x: 'matteo' }]
      , stream = db.searchStream([{
          subject: 'lucio',
          predicate: 'friend',
          object: db.v('x')
        }, {
          subject: 'daniele',
          predicate: 'friend',
          object: db.v('x')
        }]);

    stream.on('data', function(data) {
      expect(data).to.eql(solutions.shift());
    });

    stream.on('end', function() {
      expect(solutions).to.have.property('length', 0);
      done();
    });
  });

  it('should support the friend of a friend scenario', function(done) {
    var solutions = [{ x: 'daniele', y: 'marco' }]
      , stream = db.searchStream([{
          subject: 'matteo',
          predicate: 'friend',
          object: db.v('x')
        }, {
          subject: db.v('x'),
          predicate: 'friend',
          object: db.v('y')
        }, {
          subject: db.v('y'),
          predicate: 'friend',
          object: 'davide'
        }]);

    stream.on('data', function(data) {
      expect(data).to.eql(solutions.shift());
    });

    stream.on('end', function() {
      expect(solutions).to.have.property('length', 0);
      done();
    });
  });

  it('should return triples from a join aka materialized API', function(done) {
    db.search([{
      subject: db.v('x'),
      predicate: 'friend',
      object: 'marco'
    }, {
      subject: db.v('x'),
      predicate: 'friend',
      object: 'matteo'
    }], {
      materialized: {
        subject: db.v('x'),
        predicate: 'newpredicate',
        object: 'abcde'
      }
    }, function(err, results) {
      expect(results).to.eql([{
        subject: 'daniele',
        predicate: 'newpredicate',
        object: 'abcde'
      }, {
        subject: 'lucio',
        predicate: 'newpredicate',
        object: 'abcde'
      }]);
      done();
    });
  });

  it('should support a friend-of-a-friend-of-a-friend scenario', function(done) {

    var solutions = [{ x: 'daniele', y: 'marco', z: 'davide' }, { x: 'daniele', y: 'matteo', z: 'daniele' }]

      , stream = db.searchStream([{
          subject: 'matteo',
          predicate: 'friend',
          object: db.v('x')
        }, {
          subject: db.v('x'),
          predicate: 'friend',
          object: db.v('y')
        }, {
          subject: db.v('y'),
          predicate: 'friend',
          object: db.v('z')
        }]);

    stream.on('data', function(data) {
      expect(data).to.eql(solutions.shift());
    });

    stream.on('end', function() {
      expect(solutions).to.have.property('length', 0);
      done();
    });
  });

  it('should emit triples from the stream interface aka materialized API', function(done) {
    var triples = [{
           subject: 'daniele'
         , predicate: 'newpredicate'
         , object: 'abcde'
        }]

      , stream = db.searchStream([{
          subject: 'matteo',
          predicate: 'friend',
          object: db.v('x')
        }, {
          subject: db.v('x'),
          predicate: 'friend',
          object: db.v('y')
        }, {
          subject: db.v('y'),
          predicate: 'friend',
          object: 'davide'
        }], {
          materialized: {
            subject: db.v('x'),
            predicate: 'newpredicate',
            object: 'abcde'
          }
        });

    stream.on('data', function(data) {
      expect(data).to.eql(triples.shift());
    });

    stream.on('end', function() {
      expect(triples).to.have.property('length', 0);
      done();
    });
  });

  it('should support filtering inside a condition', function(done) {
    db.search([{
      subject: db.v('x'),
      predicate: 'friend',
      object: 'daniele',
      filter: function(triple) { return triple.subject !== 'matteo'; }
    }], function(err, results) {
      expect(results).to.have.length(0);
      done();
    });
  });

  it('should support filtering inside a second-level condition', function(done) {
    db.search([{
      subject: 'matteo',
      predicate: 'friend',
      object: db.v('y'),
    }, {
      subject: db.v('y'),
      predicate: 'friend',
      object: db.v('x'),
      filter: function(triple) {
        return triple.object !== 'matteo';
      }
    }], function(err, results) {
      expect(results).to.eql([{
        'y': 'daniele',
        'x': 'marco'
      }]);
      done();
    });
  });

  it('should support solution filtering', function(done) {
    db.search([{
      subject: 'matteo',
      predicate: 'friend',
      object: db.v('y'),
    }, {
      subject: db.v('y'),
      predicate: 'friend',
      object: db.v('x')
    }], {
      filter: function(context, callback) {
        if (context.x !== 'matteo') {
          callback(null, context);
        } else {
          callback(null);
        }
      }
    }, function(err, results) {
      expect(results).to.eql([{
        'y': 'daniele',
        'x': 'marco'
      }]);
      done();
    });
  });

  it('should support solution filtering w/ 2 args', function(done) {
    // Who's a friend of matteo and aged 25.
    db.search([{
      subject: db.v('s'),
      predicate: 'age',
      object: db.v('age'),
    }, {
      subject: db.v('s'),
      predicate: 'friend',
      object: 'matteo'
    }], {
      filter: function(context, callback) {
        if (context.age === 25) {
          callback(null, context); // confirm
        } else {
          callback(null); // refute
        }
      }
    }, function(err, results) {
      expect(results).to.eql([{
        'age': 25,
        's': 'daniele'
      }]);
      done();
    });
  });

  it('should return only one solution with limit 1', function(done) {
    db.search([{
      subject: db.v('x'),
      predicate: 'friend',
      object: 'marco'
    }, {
      subject: db.v('x'),
      predicate: 'friend',
      object: 'matteo'
    }], { limit: 1 }, function(err, results) {
      expect(results).to.have.property('length', 1);
      expect(results[0]).to.have.property('x', 'daniele');
      done();
    });
  });

  it('should return only one solution with limit 1 (bis)', function(done) {
    db.search([{
      subject: 'lucio',
      predicate: 'friend',
      object: db.v('x')
    }, {
      subject: 'daniele',
      predicate: 'friend',
      object: db.v('x')
    }], { limit: 1 }, function(err, results) {
      expect(results).to.have.property('length', 1);
      expect(results[0]).to.have.property('x', 'marco');
      done();
    });
  });

  it('should return skip the first solution with offset 1', function(done) {
    db.search([{
      subject: db.v('x'),
      predicate: 'friend',
      object: 'marco'
    }, {
      subject: db.v('x'),
      predicate: 'friend',
      object: 'matteo'
    }], { offset: 1 }, function(err, results) {
      expect(results).to.have.property('length', 1);
      expect(results[0]).to.have.property('x', 'lucio');
      done();
    });
  });

  it('should find homes in paris', function(done) {
    // extracted from levelgraph-jsonld
    var paris = 'http://dbpedia.org/resource/Paris'
      , parisians = [{
          webid: 'http://bblfish.net/people/henry/card#me',
          name: '"Henry Story"'
        }, {
          webid: 'https://my-profile.eu/people/deiu/card#me',
          name: '"Andrei Vlad Sambra"'
        }];

    db.put(require('./fixture/homes_in_paris'), function() {
      db.search([{
        subject: 'http://manu.sporny.org#person',
        predicate: 'http://xmlns.com/foaf/0.1/knows',
        object: db.v('webid')
      }, {
        subject: db.v('webid'),
        predicate: 'http://xmlns.com/foaf/0.1/based_near',
        object: paris
      }, {
        subject: db.v('webid'),
        predicate: 'http://xmlns.com/foaf/0.1/name',
        object: db.v('name')
      }
      ], function(err, solution) {
        expect(solution).to.eql(parisians);
        done();
      });
    });
  });
};
