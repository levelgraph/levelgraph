
var keyfilter = require("./keyfilterstream")
  , materializer = require("./materializerstream")
  , Variable = require("./variable")
  , Navigator = require("./navigator")
  , extend = require("xtend")
  , utilities = require("./utilities")
  , queryplanner = require("./queryplanner")
  , PassThrough = require("./streamwrapper").PassThrough
  , WriteStream = require("./writestream")
  , levelup = require("levelup")
  , Leveljs
  , joinStream
  , doAction
  , doActionStream;

var joinDefaults = {
  context: {}
};

module.exports = function levelgraph(leveldb, options) {

  options = options || {};

  var name = leveldb
    , db;
  
  if (typeof leveldb === "string") {
    // we are using LevelDown on node or level-js in the Browser
    if (typeof window !== "undefined" && !options.db) {
      Leveljs = require("level-js")
      options.db = function(l) { return new Leveljs(l); };
    }
    leveldb = levelup(name, options);
  }
  
  db = {
      getStream: function(pattern, options) {
        var query = utilities.createQuery(pattern, options);
        return leveldb.createReadStream(query).
          pipe(keyfilter(query));
      }
    , get: utilities.wrapCallback("getStream")
    , put: doAction("put", leveldb)
    , del: doAction("del", leveldb)
    , putStream: doActionStream('put', leveldb)
    , delStream: doActionStream('del', leveldb)
    , close: leveldb.close.bind(leveldb)
    , v: Variable
    , joinStream: joinStream(leveldb, options)
    , join: utilities.wrapCallback("joinStream")
    , nav: function(start) {
        return new Navigator({ start: start, db: this });
      }
  };

  return db;
};

joinStream = function(db, options) {
  options = extend({ joinAlgorithm: "sort" }, options);

  var planner = queryplanner(db, options);

  return function(query, options) {
    var that = this
      , result = new PassThrough({ objectMode: true });


    options = extend(joinDefaults, options);

    if (!query || query.length === 0) {
      result.end();
      return result;
    }

    planner(query, function(err, newquery) {
      if (err) {
        result.emit("error", err);
        return;
      }

      var streams = newquery.map(function(triple) {
        var stream = triple.stream
          , index  = triple.index
        delete triple.stream;
        delete triple.index;
        return stream({ triple: triple, db: that, index: index });
      });

      streams[0].start = true;
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

    return result;
  };
};

doAction = function(action, leveldb) {
  return function(triples, cb) {
    if(!triples.reduce) {
      triples = [triples];
    }

    var actions = triples.reduce(function(acc, triple) {
      return acc.concat(utilities.genActions(action, triple));
    }, []);

    leveldb.batch(actions, cb);
  };
};

doActionStream = function(type, leveldb) {
  return function() {
    var levelStream = leveldb.createWriteStream({ type: type });
    var writeStream = new WriteStream();
    writeStream.pipe(levelStream);
    levelStream.on("error", function(err) {
      writeStream.emit("error", err);
    });
    levelStream.on("close", function() {
      writeStream.emit("close");
    });
    return writeStream;
  };
}
