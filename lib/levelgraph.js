/*
Copyright (c) 2013-2017 Matteo Collina and LevelGraph Contributors

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.
*/

// require stream before anything else
// or browserify will fail to load it
require('stream');

var filterStream = require('./filterstream')
  , materializer = require('./materializerstream')
  , Variable = require('./variable')
  , Navigator = require('./navigator')
  , extend = require('xtend')
  , utilities = require('./utilities')
  , queryplanner = require('./queryplanner')
  , PassThrough = require('readable-stream').PassThrough
  , WriteStream = require('./writestream')
  , pump = require('pump')
  , levelWriteStream = require('level-ws')
  , Leveljs
  , searchStream
  , doAction
  , doActionStream;

var joinDefaults = {
  solution: {}
};

module.exports = function levelgraph(leveldb, options) {

  var db;

  options = options || {};

  db = {
    getStream: function(pattern, options) {
      var query = utilities.createQuery(pattern, options)
        , stream = leveldb.createValueStream(query);

      if (pattern.filter || pattern.offset) {
        stream = pump(stream, filterStream({
            filter: pattern.filter
          , offset: pattern.offset
        }));
      }

      return stream;
    }
    , get: utilities.wrapCallback('getStream')
    , createQuery: utilities.createQuery
    , put: doAction('put', leveldb)
    , del: doAction('del', leveldb)
    , putStream: doActionStream('put', leveldb)
    , delStream: doActionStream('del', leveldb)
    , close: function(callback) {
        if (typeof leveldb.close === 'function') {
          leveldb.close(callback);
        } else if(typeof callback === 'function') {
          callback();
        }
      }
    , v: Variable
    , searchStream: searchStream(leveldb, options)
    , search: utilities.wrapCallback('searchStream')
    , isOpen: function() {
        return leveldb.isOpen();
      }
    , nav: function(start) {
      return new Navigator({ start: start, db: this });
    }
    , generateBatch: utilities.generateBatch
  };

  db.joinStream = function(a, b, c) {
    console.warn('joinStream is deprecated, use searchStream instead');
    return db.searchStream(a, b, c);
  };

  db.join = function(a, b, c) {
    console.warn('join is deprecated, use search instead');
    return db.search(a, b, c);
  };

  db.approximateSize = function(pattern, callback) {
    var query = utilities.createQuery(utilities.queryMask(pattern));
    leveldb.db.approximateSize(query.start, query.end, function (error, size) {
      callback(error, error ? null : size >> 8);
    });
  };

  return db;
};

searchStream = function(db, options) {
  options = extend({ joinAlgorithm: 'sort' }, options);

  var planner = queryplanner(db, options);

  return function(query, options) {
    var that = this
      , result = new PassThrough({ objectMode: true });

    options = extend(joinDefaults, options);

    if (!query || query.length === 0) {
      result.end();
      return result;
    } else if (!Array.isArray(query)) {
      query = [ query ];
    }

    planner(query, function(err, newquery) {
      if (err) {
        result.emit('error', err);
        return;
      }

      var streams = newquery.map(function(triple) {
        var stream = triple.stream
          , index  = triple.index;

        delete triple.stream;
        delete triple.index;
        return stream({ triple: triple, db: that, index: index });
      });

      streams[0].start = true;
      streams[0].end(options.solution);

      if (options.limit) {
        streams[streams.length - 1].limit = options.limit;
      }

      if (options.filter || options.offset) {
        streams.push(filterStream({
            filter: options.filter
          , offset: options.offset
        }));
      }

      if (options.materialized) {
        streams.push(materializer({
          pattern: options.materialized
        }));
      }

      streams.push(result);
      pump.apply(null, streams);
    });

    return result;
  };
};

doAction = function(action, leveldb) {
  return function(triples, options, cb) {
    if ('function' === typeof options) {
      cb = options;
      options = {};
    }

    if(!triples.reduce) {
      triples = [triples];
    }

    var actions = triples.reduce(function(acc, triple) {
      return acc.concat(utilities.generateBatch(triple, action));
    }, []);

    leveldb.batch(actions, options, cb);
  };
};

doActionStream = function(type, leveldb) {

  // also check leveldb.isClient for multilevel compatibility
  if (!leveldb.createWriteStream || leveldb.isClient) {
    leveldb = levelWriteStream(leveldb);
  }

  return function() {
    var levelStream = leveldb.createWriteStream({ type: type });
    var writeStream = new WriteStream();
    writeStream.pipe(levelStream);
    levelStream.on('error', function(err) {
      writeStream.emit('error', err);
    });
    levelStream.on('close', function() {
      writeStream.emit('close');
    });
    return writeStream;
  };
};
