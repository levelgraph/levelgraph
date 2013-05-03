
var keyfilter = require("./keyfilterstream")
  , JoinStream = require("./joinstream")
  , SortJoinStream = require("./sortjoinstream")
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
    getStream: function(pattern, options) {
      var query = utilities.createQuery(pattern, options);
      //console.log(query);
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
        , stream
        , streams = [];
      options = extend(joinDefaults, options);

      if (!query || query.length === 0) {
        stream = new PassThrough({ objectMode: true });
        stream.end();
        return stream;
      }
     
      query.forEach(function(triple, i) {
        var prev = streams[i - 1]
          , streamBuilder
          , possibleIndexes = utilities.possibleIndexes(Object.keys(utilities.queryMask(triple)))
          , index
          , same = prev && true; 

        if (same) {
          index = possibleIndexes.reduce(function(acc, pi) {
            return acc || utilities.defs[pi].reduce(function(acc, key, i) {
              var otherKey = prev.triple[key];
              console.log(key, otherKey, triple[key]);
              return acc && otherKey && (otherKey === triple[key] || otherKey.name === triple[key].name && i === 2);
            }, true) && pi;
          }, false);
          console.log(index);
          same = index && true;
        }

        if (same) {
          streamBuilder = SortJoinStream;
        } else {
          streamBuilder = JoinStream;
        }

        console.log(streamBuilder);

        streams.push(streamBuilder({ triple: triple, db: that, preferiteIndex: index }));
      });

      streams[0].start = true;
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

