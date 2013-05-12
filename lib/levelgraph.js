
var keyfilter = require("./keyfilterstream")
  , JoinStream = require("./joinstream")
  , materializer = require("./materializerstream")
  , Variable = require("./variable")
  , Navigator = require("./navigator")
  , extend = require("xtend")
  , utilities = require("./utilities")
  , queryplanner = require("./queryplanner")
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

  var planner = queryplanner(leveldb)
    , db = {
        getStream: function(pattern) {
          var query = utilities.createQuery(pattern);
          return leveldb.createReadStream(query).
            pipe(keyfilter(query));
        }
      , get: utilities.wrapCallback("getStream")
      , put: doAction("put", leveldb)
      , del: doAction("del", leveldb)
      , close: leveldb.close.bind(leveldb)
      , v: Variable
      , joinStream: function(query, options) {
          var that = this
            , result = new PassThrough({ objectMode: true });

          options = extend(joinDefaults, options);

          if (!query || query.length === 0) {
            result.end();
          } else {

            planner(query, function(err, newquery) {
              if (err) {
                result.emit("error", err);
                return;
              }

              var streams = newquery.map(function(triple) {
                return new JoinStream({ triple: triple, db: that });
              });

              streams[0].end(options.context);

              if (options.materialized) {
                streams.push(materializer({
                  pattern: options.materialized
                }));
              }

              streams.reduce(function(prev, current) {
                return prev.pipe(current);
              }).pipe(result);
            });
          }

          return result;
        }
    , join: utilities.wrapCallback("joinStream")
    , nav: function(start) {
        return new Navigator({ start: start, db: this });
      }
  };

  return db;
};

