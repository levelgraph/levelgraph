LevelGraph&nbsp;&nbsp;&nbsp;[![Build Status](https://travis-ci.org/mcollina/levelgraph.png)](https://travis-ci.org/mcollina/levelgraph)&nbsp;[![Coverage Status](https://coveralls.io/repos/mcollina/levelgraph/badge.png)](https://coveralls.io/r/mcollina/levelgraph)&nbsp;[![Dependency Status](https://david-dm.org/mcollina/levelgraph.png?theme=shields.io)](https://david-dm.org/mcollina/levelgraph)
===========

![Logo](https://github.com/mcollina/node-levelgraph/raw/master/logo.png)

[![NPM](https://nodei.co/npm/levelgraph.png)](https://nodei.co/npm/levelgraph/)

[![NPM](https://nodei.co/npm-dl/levelgraph.png)](https://nodei.co/npm/levelgraph/)

[![Browser support](https://saucelabs.com/browser-matrix/levelgraph.svg)](https://saucelabs.com/u/levelgraph)

__LevelGraph__ is a Graph Database. Unlike many other graph database,
__LevelGraph__ is built on the uber-fast key-value store
[LevelDB](http://code.google.com/p/leveldb/) through the powerful
[LevelUp](https://github.com/rvagg/node-levelup) library.
You can use it inside your node.js application or in any
IndexedDB-powered Browser. PhoneGap support coming soon (late fall).

__LevelGraph__ loosely follows the __Hexastore__ approach as presented in the article:
[Hexastore: sextuple indexing for semantic web data management
C Weiss, P Karras, A Bernstein - Proceedings of the VLDB Endowment,
2008](http://www.vldb.org/pvldb/1/1453965.pdf).
Following this approach, __LevelGraph__ uses six indices for every triple,
in order to access them as fast as it is possible.

Check out a [slideshow](http://nodejsconfit.levelgraph.io)
that introduces you to LevelGraph by
[@matteocollina](http://twitter.com/matteocollina) at
http://nodejsconf.it.

**LevelGraph** is an **OPEN Open Source Project**, see the <a href="#contributing">Contributing</a> section to find out what this means.

## Install on Node.js

```
npm install levelgraph --save
```

At the moment it requires node v0.10.x, but the port to node v0.8.x
should be straighforward.
If you need it, just open a pull request.

## Install in the Browser

Just download
[levelgraph.min.js](https://github.com/mcollina/levelgraph/blob/master/build/levelgraph.min.js)
and you are done!

## Usage

The LevelGraph API remains the same for Node.js and the browsers,
however the initialization change slightly.

Initializing a database is very easy:
```javascript
var levelgraph = require("levelgraph"); // not needed in the Browser
var db = levelgraph("yourdb");
```

### Get and Put

Inserting a triple in the database is extremely easy:
```javascript
var triple = { subject: "a", predicate: "b", object: "c" };
db.put(triple, function(err) {
  // do something after the triple is inserted
});
```

Retrieving it through pattern-matching is extremely easy:
```javascript
db.get({ subject: "a" }, function(err, list) {
  console.log(list);
});
```

It even support a Stream interface:
```javascript
var stream = db.getStream({ predicate: "b" });
stream.on("data", function(data) {
  console.log(data);
});
```

#### Triple Properties

LevelGraph support adding properties to triples with very
little overhead (a part from storage costs), it is very easy:
```javascript
var triple = { subject: "a", predicate: "b", object: "c", "someStuff": 42 };
db.put(triple, function() {
  db.get({ subject: "a" }, function(err, list) {
    console.log(list);
  });
});
```

#### Limit and Offset

It is possible to implement pagination of get results by using
`'offset'` and `'limit'`, like so:

```javascript
db.get({ subject: "a", limit: 4, offset: 2}, function(err, list) {
  console.log(list);
});
```

#### Reverse Order

It is possible to get results in reverse lexicographical order
using the `'reverse'` option. This option is only supported by
`get()` and `getStream()` and not available in `search()`.  

```javascript
db.get({ predicate: "b", reverse: true }, function (err, list) {
  console.log(list);
});
```


#### Updating

__LevelGraph__ does not support in-place update, as there are no
constraint in the graph.
In order to update a triple, you should first delete it:
```javascript
var triple = { subject: "a", predicate: "b", object: "c" };
db.put(triple, function(err) {
  db.del(triple, function(err) {
    triple.object = 'd';
    db.put(triple, function(err) {
      // do something with your update
    });
  });
});
```

#### Multiple Puts

__LevelGraph__ also supports adding putting multiple triples:
```javascript
var triple1 = { subject: "a1", predicate: "b", object: "c" };
var triple2 = { subject: "a2", predicate: "b", object: "d" };
db.put([triple1, triple2],  function(err) {
  // do something after the triples are inserted
});
```

### Searches

__LevelGraph__ also supports searches:
```javascript
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

  var stream = db.searchStream([{
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

#### Search Streams

It also support a similar API without streams:
```javascript
db.put([{
 //...
}], function () {

  db.search([{
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

#### Triple Generation

It also allows to generate a stream of triples, instead of a solution:
```javascript
  db.search([{
    subject: db.v("a"),
    predicate: "friend",
    object: db.v("x")
  }, {
    subject: db.v("x"),
    predicate: "friend",
    object: db.v("y")
  }, {
    subject: db.v("y"),
    predicate: "friend",
    object: db.v("b")
  }], {
    materialized: {
      subject: db.v("a"),
      predicate: "friend-of-a-friend",
      object: db.v("b")
    }
  }, function(err, results) {
    // this will print all the 'friend of a friend triples..'
    // like so: {
    //   subject: "lucio",
    //   predicate: "friend-of-a-friend",
    //   object: "daniele"
    // }
  });
```

#### Limit and Offset

It is possible to implement pagination of search results by using
`'offset'` and `'limit'`, like so:

```javascript
db.search([{
    subject: db.v("a"),
    predicate: "friend",
    object: db.v("x")
  }, {
    subject: db.v("x"),
    predicate: "friend",
    object: db.v("y")
  }], { limit: 4, offset: 2 }, function(err, list) {

  console.log(list);
});
```

### Deleting

Deleting is easy too:
```javascript
var triple = { subject: "a", predicate: "b", object: "c" };
db.del(triple, function(err) {
  // do something after the triple is deleted
});
```

### Filtering

__LevelGraph__ supports filtering of triples when calling `get()`
 and solutions when calling `search()`, and streams are supported too.

It is possible to filter the matching triples during a `get()`:
```javascript
db.get({
    subject: 'matteo'
  , predicate: 'friend'
  , filter: function filter(triple) {
      return triple.object !== 'daniele';
    }
}, function process(err, results) {
  // results will not contain any triples that
  // have 'daniele' as object
});
```

Moreover, it is possible to filter the triples during a `search()`
```javascript
db.search({
    subject: 'matteo'
  , predicate: 'friend'
  , object: db.v('x')
  , filter: function filter(triple) {
      return triple.object !== 'daniele';
    }
}, function process(err, solutions) {
  // results will not contain any solutions that
  // have { x: 'daniele' }
});
```

Finally, __LevelGraph__ supports filtering full solutions:
```javascript
db.search({
    subject: 'matteo'
  , predicate: 'friend'
  , object: db.v('x')
}, {
    filter: function filter(solution, callback) {
      if (solution.x !== 'daniele') {
        // confirm the solution
        callback(null, solution);
      } else {
        // refute the solution
        callback(null);
      }
    }
}, function process(err, solutions) {
  // results will not contain any solutions that
  // have { x: 'daniele' }
});
```

Thanks to solultion filtering, it is possible to implement a negation:
```javascript
db.search({
    subject: 'matteo'
  , predicate: 'friend'
  , object: db.v('x')
}, {
    filter: function filter(solution, callback) {
      db.get({
          subject: solution.x
        , predicate: 'friend'
        , object: 'marco'
      }, function (err, results) {
        if (err) {
          callback(err);
          return;
        }
        if (results.length > 0) {
          // confirm the solution
          callback(null, solution);
        } else {
          // refute the solution
          callback();
        }
      });
    }
}, function process(err, solutions) {
  // results will not contain any solutions that
  // do not satisfy the filter
});
```

The heavier method is filtering solutions, so we recommend filtering the
triples whenever possible.

## Navigator API

The Navigator API is a fluent API for LevelGraph, loosely inspired by
[Gremlin](http://markorodriguez.com/2011/06/15/graph-pattern-matching-with-gremlin-1-1/)
It allows to specify how to search our graph in a much more compact way and navigate
between vertexes.

Here is an example, using the same dataset as before:
```javascript
    db.nav("matteo").archIn("friend").archOut("friend").
      solutions(function(err, results) {
      // prints:
      // [ { x0: 'daniele', x1: 'marco' },
      //   { x0: 'daniele', x1: 'matteo' },
      //   { x0: 'lucio', x1: 'marco' },
      //   { x0: 'lucio', x1: 'matteo' } ]
      console.log(results);
    });
```

The above example match the same triples of:
```javascript
    db.search([{
      subject: db.v("x0"),
      predicate: 'friend',
      object: 'matteo'
    }, {
      subject: db.v("x0"),
      predicate: 'friend',
      object: db.v("x1")
    }], function(err, results) {
      // prints:
      // [ { x0: 'daniele', x1: 'marco' },
      //   { x0: 'daniele', x1: 'matteo' },
      //   { x0: 'lucio', x1: 'marco' },
      //   { x0: 'lucio', x1: 'matteo' } ]
      console.log(results);
    });
```

It allows to see just the last reached vertex:
```javascript
    db.nav("matteo").archIn("friend").archOut("friend").
      values(function(err, results) {
      // prints [ 'marco', 'matteo' ]
      console.log(results);
    });
```

Variable names can also be specified, like so:
```javascript
db.nav("marco").archIn("friend").as("a").archOut("friend").archOut("friend").as("a").
      solutions(function(err, friends) {

  console.log(friends); // will print [{ a: "daniele" }]
});
```

Variables can also be bound to a specific value, like so:
```javascript
db.nav("matteo").archIn("friend").bind("lucio").archOut("friend").bind("marco").
      values(function(err, friends) {
  console.log(friends); // this will print ['marco']
});
```

A materialized search can also be produced, like so:
```javascript
db.nav("matteo").archOut("friend").bind("lucio").archOut("friend").bind("marco").
      triples({:
        materialized: {
        subject: db.v("a"),
        predicate: "friend-of-a-friend",
        object: db.v("b")
      }
    }, function(err, results) {

  // this will return all the 'friend of a friend triples..'
  // like so: {
  //   subject: "lucio",
  //   predicate: "friend-of-a-friend",
  //   object: "daniele"
  // }

  console.log(results);
});
```

It is also possible to change the current vertex:
```javascript
db.nav("marco").archIn("friend").as("a").go("matteo").archOut("friend").as("b").
      solutions(function(err, solutions) {

   //  solutions is: [{
   //    a: "daniele",
   //    b: "daniele"
   //   }, {
   //     a: "lucio",
   //     b: "daniele"
   //   }]

});
```

### Putting and Deleting through Streams

It is also possible to `put` or `del` triples from the store
using a `Stream2` interface:

```javascript
var t1 = { subject: "a", predicate: "b", object: "c" };
var t2 = { subject: "a", predicate: "b", object: "d" };
var stream = db.putStream();

stream.write(t1);
stream.end(t2);

stream.on("close", function() {
  // do something, the writes are done
});
```

### Generate batch operations

You can also generate a `put` and `del` batch, so you can
manage the batching yourself:

```javascript
var triple = { subject: "a", predicate: "b", object: "c" };

// Produces a batch of put operations
var putBatch = db.generateBatch(triple);

// Produces a batch of del operations
var delBatch = db.generateBatch(triple, 'del');
```

## LevelUp integration

LevelGraph allows to leverage the full power of all
[LevelUp](https://github.com/rvagg/node-levelup) plugins.

Initializing a database with LevelUp support is very easy:
```javascript
var levelup = require("level");
var levelgraph = require("levelgraph");
var db = levelgraph(levelup("yourdb"));
```

### Usage with SubLevel

An extremely powerful usage of LevelGraph is to partition your
LevelDB with [SubLevel](http://npm.im/level-sublevel):

```javascript
var levelup = require("level");
var sublevel = require("level-sublevel");
var levelgraph = require("levelgraph");
var db = sublevel(levelup("yourdb"));
var graph = levelgraph(db.sublevel('graph'));
```

## Browserify

You can use [browserify](https://github.com/substack/node-browserify) to bundle your module and all the dependencies, including levelgraph, into a single script-tag friendly js file for use in webpages. For the convenience of people unfamiliar with browserify, a pre-bundled version of levelgraph is included in the build folder.

Simply `require("levelgraph")` in your browser modules and use [level.js](https://github.com/maxogden/level.js) instead of `level`:

```javascript
var levelgraph = require("levelgraph");
var leveljs = require("level-js");
var levelup = require("levelup");
var factory = function (location) { return new leveljs(location) };

var db = levelgraph(levelup("yourdb", { db: factory }));
```

### Testling

Follow the [Testling install instructions](https://github.com/substack/testling#install) and run `testling` in the levelgraph directory to run the test suite against a headless browser using level.js

## RDF support

__LevelGraph__ does not support out of the box loading serialized RDF or storing it. Such functionality is provided by extensions:
* [LevelGraph-N3](https://github.com/mcollina/levelgraph-n3) - __N3/Turtle__
* [LevelGraph-JSONLD](https://github.com/mcollina/levelgraph-jsonld) - __JSON-LD__

## Extensions

You can use multiple extensions at the same time. Just check if one depends on another one
to nest them in correct order! *(LevelGraph-N3 and LevelGraph-JSONLD are
independent)*

```javascript
var lg = require('levelgraph');
var lgN3 = require('levelgraph-n3');
var lgJSONLD = require('levelgraph-jsonld');

var db = lgJSONLD(lgN3(lg("yourdb")));
// gives same result as
var db = lgN3(lgJSONLD(lg("yourdb")));
```

## TODO

There are plenty of things that this library is missing.
If you feel you want a feature added, just do it and __submit a
pull-request__.

Here are some ideas:

* [x] Return the matching triples in the search results.
* [x] Support for Query Planning in search.
* [x] Added a Sort-Join algorithm.
* [ ] Add more database operators (grouping, filtering).
* [x] Browser support
  [#10](https://github.com/mcollina/levelgraph/issues/10)
* [ ] Live searches
  [#3](https://github.com/mcollina/node-levelgraph/issues/3)
* Extensions
  * [ ] RDFa
  * [ ] RDF/XML
  * [ ] Microdata

## Contributing

LevelGraph is an **OPEN Open Source Project**. This means that:

> Individuals making significant and valuable contributions are given commit-access to the project to contribute as they see fit. This project is more like an open wiki than a standard guarded open source project.

See the [CONTRIBUTING.md](https://github.com/mcollina/levelgraph/blob/master/CONTRIBUTING.md) file for more details.

## Credits

*LevelGraph builds on the excellent work on both the LevelUp community
and the LevelDB and Snappy teams from Google and additional contributors.
LevelDB and Snappy are both issued under the [New BSD Licence](http://opensource.org/licenses/BSD-3-Clause).*

## Contributors

LevelGraph is only possible due to the excellent work of the following contributors:

<table><tbody>
<tr><th align="left">Matteo Collina</th><td><a href="https://github.com/mcollina">GitHub/mcollina</a></td><td><a href="https://twitter.com/matteocollina">Twitter/@matteocollina</a></td></tr>
<tr><th align="left">Jeremy Taylor</th><td><a
href="https://github.com/jez0990">GitHub/jez0990</a></td></tr>
<tr><th align="left">Elf Pavlik</th><td><a href="https://github.com/elf-pavlik">GitHub/elf-pavlik</a></td><td><a href="https://twitter.com/elfpavlik">Twitter/@elfpavlik</a></td></tr>
<tr><th align="left">Riceball LEE</th><td><a href="https://github.com/snowyu">GitHub/snowyu</a></td><td></td></tr>
</tbody></table>

## LICENSE - "MIT License"

Copyright (c) 2013-2014 Matteo Collina and LevelGraph Contributors

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
