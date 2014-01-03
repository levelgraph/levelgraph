
var Transform = require('readable-stream').Transform;

function SolutionsFilterStream(options) {
  if (!(this instanceof SolutionsFilterStream)) {
    return new SolutionsFilterStream(options);
  }

  options.objectMode = true;

  Transform.call(this, options);

  this._filter = options.filter;

  var that = this;
  this._doPush = function pushAndDone(err, context) {
    if (err) {
      that.emit('error', err);
      return;
    }

    if (context) {
      that.push(context);
    }

    if (that._lastDone) {
      that._lastDone();
      that._lastDone = null;
    }
  };
}

SolutionsFilterStream.prototype = Object.create(
  Transform.prototype,
  { constructor: { value: SolutionsFilterStream } }
);

SolutionsFilterStream.prototype._transform = function solutionsTransform(context, encoding, done) {
  this._lastDone = done;
  this._filter(context, this._doPush);
};

module.exports = SolutionsFilterStream;
