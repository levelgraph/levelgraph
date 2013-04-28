
var KeyFilterStream = require("./lib/keyfilterstream");
var JoinStream = require("./lib/joinstream");
var WriteStream = require("./lib/writestream");
var Variable = require("./lib/variable");
var concat = require('concat-stream');
var genKey = require('./lib/utilities').genKey;
var defs = require('./lib/utilities').defs;

module.exports = function levelgraph(leveldb) {

  var db = {
    getStream: function(pattern) {
      var query = createQuery(pattern);
      return leveldb.createReadStream(query).
        pipe(KeyFilterStream(query));
    },
    get: wrapCallback('getStream'),
    putStream: doActionStream('put', leveldb),
    delStream: doActionStream('del', leveldb),
    put: doAction('put', leveldb),
    del: doAction('del', leveldb),
    close: leveldb.close.bind(leveldb),
    v: Variable,
    joinStream: function(query) {
      var that = this;
     
      var streams = query.map(function(triple) {
        var stream = new JoinStream({ triple: triple, db: that });
        return stream;
      });

      streams[0].end({});

      return streams.reduce(function(prev, current) {
        return prev.pipe(current);
      });
    },
    join: wrapCallback('joinStream')
  };

  return db;
};

function doActionStream(type, leveldb) {
  return function() {
    var levelStream = leveldb.createWriteStream();
    var writeStream = new WriteStream({ type: type });
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

function doAction(type, leveldb) {
  return function(triples, cb) {
    if(!triples.reduce) {
      triples = [triples];
    }

    var stream = this[type + "Stream"]();
    stream.on("error", cb);
    stream.on("close", cb);

    var doInserts = function() {
      triples.forEach(function(triple) {
        stream.write(triple);
      });
      stream.end();
    };

    if (leveldb.isOpen()) {
      doInserts();
    } else {
      leveldb.once("open", doInserts);
    }
  };
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

function wrapCallback(method) {
  return function(query, cb) {
    var stream = this[method](query);
    stream.pipe(reconcat(cb));
    stream.on("error", cb);
  };
}

function reconcat(cb) {
  return concat(function(err, list) {
    if(err) {
      cb(err);
      return;
    }

    cb(null, list || []);
  });
}
