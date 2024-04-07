var pump           = require('pump')
  , IteratorStream = require('level-iterator-stream')
  , Transform      = require('readable-stream').Transform
  , inherits       = require('inherits')
  ;

function TransformStream(cb) {
  if (!(this instanceof TransformStream)) {
    return new TransformStream(cb);
  }
  Transform.call(this, { objectMode: true });
  this._transform = cb;
}
inherits(TransformStream, Transform);

module.exports = module.exports || {};

module.exports.createReadStream = function(leveldb, options) {
  if (leveldb.createReadStream) {
    return leveldb.createReadStream(options);
  }
  var stream = new IteratorStream(leveldb.iterator(options));
  stream = pump(stream, new TransformStream(function(chunk, encoding, done) {
    if (options.keyEncoding   === 'json') { chunk.key   = JSON.parse(chunk.key  ); }
    if (options.valueEncoding === 'json') { chunk.value = JSON.parse(chunk.value); }
    this.push(chunk);
    done();
  }));
  return stream;
};

module.exports.createValueStream = function(leveldb, options) {
  if (leveldb.createValueStream) {
    return leveldb.createValueStream(options);
  }
  var stream = module.exports.createReadStream(leveldb, options);
  stream = pump(stream, new TransformStream(function(chunk, encoding, done) {
    this.push(chunk.value);
    done();
  }));
  return stream;
};

module.exports.createKeyStream = function(leveldb, options) {
  if (leveldb.createValueStream) {
    return leveldb.createKeyStream(options);
  }
  var stream = module.exports.createReadStream(leveldb, options);
  stream = pump(stream, new TransformStream(function(chunk, encoding, done) {
    this.push(chunk.key);
    done();
  }));
  return stream;
};
