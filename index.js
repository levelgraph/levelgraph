
var defs = {
  spo: ["subject", "predicate", "object"],
  sop: ["subject", "object", "predicate"],
  pso: ["predicate", "object", "subject"],
  pos: ["predicate", "subject", "object"],
  ops: ["object", "predicate", "subject"],
  osp: ["object", "subject", "predicate"]
};

module.exports = function levelgraph(leveldb) {

  var db = {
    get: function(pattern, cb) {
      var result = [];
      var query = createQuery(pattern);
      var stream = leveldb.createReadStream(query);

      stream.on("data", function(data) {
        if (data.key.indexOf(query.start) < 0) {
          stream.destroy();
          return;
        }
        result.push(JSON.parse(data.value));
      });
      stream.on("end", function() {
        cb(null, result);
      });
      stream.on("error", cb);
    },
    put: doAction('put', leveldb),
    del: doAction('del', leveldb),
    close: leveldb.close.bind(leveldb)
  };

  return db;
};

function doAction(action, leveldb) {
  return function(triples, cb) {
    if(!triples.reduce) {
      triples = [triples];
    }

    var actions = triples.reduce(function(acc, triple) {
      return acc.concat(genActions(action, triple));
    }, []);

    leveldb.batch(actions, cb);
  };
}

function genKey(key, triple) {
  return [key].concat(defs[key].map(function(t) {
    return triple[t];
  })).filter(function(e) {
    return e !== null && e !== undefined;
  }).join("::");
}

function genKeys(triple) {
  return Object.keys(defs).map(function(key) {
    return genKey(key, triple);
  });
}

function genActions(action, triple) {
  return genKeys(triple).map(function(key) {
    return { type: action, key: key, value: JSON.stringify(triple) };
  });
}

function filterDefsGiven(types) {
  var result = Object.keys(defs).filter(function(key) {
    return types.every(function (e, i) {
      return defs[key][i] == e;
    });
  });

  return result;
}

function createQuery(pattern) {
  var types = Object.keys(pattern);
  var possibleDefs = filterDefsGiven(types);
  var key = genKey(possibleDefs[0], pattern);
  var query = {
    start: key
  };

  return query;
}
