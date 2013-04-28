LevelGraph
===========

![Logo](https://github.com/mcollina/node-levelgraph/raw/master/logo.png)

__LevelGraph__ is a Graph Database. Unlike many other graph database,
__LevelGraph__ is built on the uber-fast key-value store
[LevelDB](http://code.google.com/p/leveldb/) through the powerful
[LevelUp](https://github.com/rvagg/node-levelup) library.
You can use it inside your node.js application.

__LevelGraph__ loosely follows the __Hexastore__ approach as presente in the article:
[Hexastore: sextuple indexing for semantic web data management
C Weiss, P Karras, A Bernstein - Proceedings of the VLDB Endowment,
2008](http://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.140.8776&rep=rep1&type=pdf).
Following this approach, __LevelGraph__ uses six indices for every triple,
in order to access them as fast as it is possible.

## Install

[![Build
Status](https://travis-ci.org/mcollina/node-levelgraph.png)](https://travis-ci.org/mcollina/node-levelgraph)

```
npm install levelup levelgraph --save
```

At the moment it requires node v0.10.x, but the port to node v0.8.x
should be straighforward.
If you need it, just open a pull request.

## Usage

Initializing a database is very easy:
```
var levelup = require("levelup");
var levelgraph = require("../");
var db = levelgraph(levelup(dir));
```

### Get and Put

Inserting a triple in the database is extremey easy:
```
var triple = { subject: "a", predicate: "b", object: "c" };
db.put(triple, function(err) {
  // do something after the triple is inserted
});
```

Retrieving it through pattern-matching is extremely easy:
```
db.get({ subject: "a" }, function(err, list) {
  expect(list).to.eql([triple]);
  done();
});
```

It even support a Stream interface:
```
var stream = db.getStream({ predicate: "b" });
stream.on("data", function(data) {
  expect(data).to.eql(triple);
});
stream.on("end", done);
```

### Multiple Puts

__LevelGraph__ also supports adding putting multiple triples:
```
var triple1 = { subject: "a1", predicate: "b", object: "c" };
var triple2 = { subject: "a2", predicate: "b", object: "d" };
db.put([triple1, triple2],  function(err) {
  // do something after the triples are inserted
});
```

### Joins

__LevelGraph__ also supports joins:
```
db.put([{
  subject: "matteo",
  predicate: "friend",
  object: "daniele"
}, {
  subject: "daniele",
  predicate: "friend",
  object: "matteo"
}, {
  subject: "daniele",
  predicate: "friend",
  object: "marco"
}, {
  subject: "lucio",
  predicate: "friend",
  object: "matteo"
}, {
  subject: "lucio",
  predicate: "friend",
  object: "marco"
}, {
  subject: "marco",
  predicate: "friend",
  object: "davide"
}], function () {

  var stream = db.joinStream([{
    subject: "matteo",
    predicate: "friend",
    object: db.v("x")
  }, {
    subject: db.v("x"),
    predicate: "friend",
    object: db.v("y")
  }, {
    subject: db.v("y"),
    predicate: "friend",
    object: "davide"
  }]);

  stream.on("data", function(data) {
    // this will print "{ x: 'daniele', y: 'marco' }"
    console.log(data);
  });
});
```

It also support a similar API without streams:
```
db.put([{
 ...
}], function () {

  db.join([{
    subject: "matteo",
    predicate: "friend",
    object: db.v("x")
  }, {
    subject: db.v("x"),
    predicate: "friend",
    object: db.v("y")
  }, {
    subject: db.v("y"),
    predicate: "friend",
    object: "davide"
  }], function(err, results) {
    // this will print "[{ x: 'daniele', y: 'marco' }]"
    console.log(results);
  });
});
```

### Deleting

Deleting is easy too:
```
var triple = { subject: "a", predicate: "b", object: "c" };
db.del(triple, function(err) {
  // do something after the triple is deleted
});
```

### Putting and Deleting through Streams

It is also possible to `put` or `del` triples from the store
using a `Stream2` interface:

```
var t1 = { subject: "a", predicate: "b", object: "c" };
var t2 = { subject: "a", predicate: "b", object: "d" };
var stream = db.putStream();

stream.write(t1);
stream.end(t2);

stream.on("close", function() {
  // do something, the writes are done
});
```

## TODO

There are plenty of things that this library is missing.
If you feel you want a feature added, just do it and __submit a
pull-request__.

Here are some ideas:

* [ ] Return the matching triples in the JOIN results.
* [ ] Support for Query Planning in JOIN.
* [ ] Design and implement a nicer query interface using promises.
* [ ] Add more database operators.

## Contributing to LevelGraph 

* Check out the latest master to make sure the feature hasn't been
  implemented or the bug hasn't been fixed yet
* Check out the issue tracker to make sure someone already hasn't
  requested it and/or contributed it
* Fork the project
* Start a feature/bugfix branch
* Commit and push until you are happy with your contribution
* Make sure to add tests for it. This is important so I don't break it
  in a future version unintentionally.
* Please try not to mess with the Makefile and package.json. If you
  want to have your own version, or is otherwise necessary, that is
  fine, but please isolate to its own commit so I can cherry-pick around
  it.

## LICENSE - "MIT License"

Copyright (c) 2013 Matteo Collina, http://matteocollina.com

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
