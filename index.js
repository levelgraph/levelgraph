
var KeyFilterStream = require("./lib/keyfilterstream");
var JoinStream = require("./lib/joinstream");
var MaterializerStream = require("./lib/materializerstream");
var Variable = require("./lib/variable");
var navigator = require('./lib/navigator');
var extend = require("xtend");
var wrapCallback = require("./lib/utilities").wrapCallback;
var PassThrough = require("stream").PassThrough;

var defs = {
  spo: ["subject", "predicate", "object"],
  sop: ["subject", "object", "predicate"],
  pso: ["predicate", "object", "subject"],
  pos: ["predicate", "subject", "object"],
  ops: ["object", "predicate", "subject"],
  osp: ["object", "subject", "predicate"]
};

var joinDefaults = {
  context: {}
};

module.exports = function levelgraph(leveldb) {

  var db = {
    getStream: function(pattern) {
      var query = createQuery(pattern);
      return leveldb.createReadStream(query).
        pipe(KeyFilterStream(query));
    },
    get: wrapCallback('getStream'),
    put: doAction('put', leveldb),
    del: doAction('del', leveldb),
    close: leveldb.close.bind(leveldb),
    v: Variable,
    joinStream: function(query, options) {
      var that = this, stream = null;
      options = extend(joinDefaults, options);

      if (!query || query.length === 0) {
        stream = new PassThrough({ objectMode: true });
        stream.end();
        return stream;
      }
     
      var streams = query.map(function(triple) {
        var stream = new JoinStream({ triple: triple, db: that });
        return stream;
      });

      streams[0].end(options.context);

      if (options.materialized) {
        streams.push(MaterializerStream({
          pattern: options.materialized
        }));
      }

      return streams.reduce(function(prev, current) {
        return prev.pipe(current);
      });
    },
    join: wrapCallback('joinStream'),
    nav: function(start) {
      return navigator({ start: start, db: this });
    }
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
  var json = JSON.stringify(triple);
  return genKeys(triple).map(function(key) {
    return { type: action, key: key, value: json };
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
    start: key,
    fillCache: true
  };

  return query;
}
