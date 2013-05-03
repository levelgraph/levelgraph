
var keyfilter = require("./keyfilterstream")
  , JoinStream = require("./joinstream")
  , materializer = require("./materializerstream")
  , Variable = require("./variable")
  , Navigator = require("./navigator")
  , extend = require("xtend")
  , utilities = require("./utilities")
  , PassThrough = require("stream").PassThrough;

var joinDefaults = {
  context: {}
};

function doAction(action, leveldb) {
  return function(triples, cb) {
    if(!triples.reduce) {
      triples = [triples];
    }

    var actions = triples.reduce(function(acc, triple) {
      return acc.concat(utilities.genActions(action, triple));
    }, []);

    leveldb.batch(actions, cb);
  };
}

module.exports = function levelgraph(leveldb) {

  var db = {
    getStream: function(pattern) {
      var query = utilities.createQuery(pattern);
      return leveldb.createReadStream(query).
        pipe(keyfilter(query));
    },
    get: utilities.wrapCallback("getStream"),
    put: doAction("put", leveldb),
    del: doAction("del", leveldb),
    close: leveldb.close.bind(leveldb),
    v: Variable,
    joinStream: function(query, options) {
      var that = this
        , stream = null
        , streams;
      options = extend(joinDefaults, options);

      if (!query || query.length === 0) {
        stream = new PassThrough({ objectMode: true });
        stream.end();
        return stream;
      }
     
      streams = query.map(function(triple) {
        return new JoinStream({ triple: triple, db: that });
      });

      streams[0].end(options.context);

      if (options.materialized) {
        streams.push(materializer({
          pattern: options.materialized
        }));
      }

      return streams.reduce(function(prev, current) {
        return prev.pipe(current);
      });
    },
    join: utilities.wrapCallback("joinStream"),
    nav: function(start) {
      return new Navigator({ start: start, db: this });
    }
  };

  return db;
};

