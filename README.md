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

[![Build Status](https://travis-ci.org/mcollina/node-levelgraph.png)](https://travis-ci.org/mcollina/node-levelgraph)
[![Project Status](http://githubkanban.herokuapp.com/images/mcollina_node-levelgraph.png)](http://bit.ly/ZJ9Qta)

## Install

```
npm install level levelgraph --save
```

At the moment it requires node v0.10.x, but the port to node v0.8.x
should be straighforward.
If you need it, just open a pull request.

## Usage

Initializing a database is very easy:
```
var levelup = require("level");
var levelgraph = require("../");
var db = levelgraph(level("yourdb"));
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

It also allows to generate a stream of triples, instead of a context:
```
  db.join([{
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

### Deleting

Deleting is easy too:
```
var triple = { subject: "a", predicate: "b", object: "c" };
db.del(triple, function(err) {
  // do something after the triple is deleted
});
```

<<<<<<< HEAD
## Navigator API

The Navigator API is a fluent API for LevelGraph, loosely inspired by
[Gremlin](http://markorodriguez.com/2011/06/15/graph-pattern-matching-with-gremlin-1-1/)
It allows to specify joins in a much more compact way and navigate
between vertexes in our graph.

Here is an example, using the same dataset as before:
```
    db.nav("matteo").archIn("friend").archOut("friend").
      contexts(function(err, results) {
      // prints:
      // [ { x0: 'daniele', x1: 'marco' },
      //   { x0: 'daniele', x1: 'matteo' },
      //   { x0: 'lucio', x1: 'marco' },
      //   { x0: 'lucio', x1: 'matteo' } ]
      console.log(results);
    });
```

The above example match the same triples of:
```
    db.join([{
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
```
    db.nav("matteo").archIn("friend").archOut("friend").
      values(function(err, results) {
      // prints [ 'marco', 'matteo' ]
      console.log(results);
    });
```

Variable names can also be specified, like so:
```
db.nav("marco").archIn("friend").as("a").archOut("friend").archOut("friend").as("a").
      contexts(function(err, friends) {
 
  console.log(friends); // will print [{ a: "daniele" }]
});
```

Variables can also be bound to a specific value, like so:
```
db.nav("matteo").archIn("friend").bind("lucio").archOut("friend").bind("marco").
      values(function(err, friends) {
  console.log(friends); // this will print ['marco']
});
```

A materialized join can also be produced, like so:
```
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
```
db.nav("marco").archIn("friend").as("a").go("matteo").archOut("friend").as("b").
      contexts(function(err, contexts) {

   //  contexs is: [{
   //    a: "daniele",
   //    b: "daniele"
   //   }, {
   //     a: "lucio", 
   //     b: "daniele"
   //   }]

=======
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
>>>>>>> write-streams
});
```

## TODO

There are plenty of things that this library is missing.
If you feel you want a feature added, just do it and __submit a
pull-request__.

Here are some ideas:

* [x] Return the matching triples in the JOIN results.
* [x] Support for Query Planning in JOIN.
* [x] Added a Sort-Join algorithm.
* [ ] Add more database operators (grouping, filtering).
* [ ] Browser support
  [#10](https://github.com/mcollina/node-levelgraph/issues/10)
* [ ] Live Joins 
  [#3](https://github.com/mcollina/node-levelgraph/issues/3)

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

## Credits

*LevelGraph builds on the excellent work on both the LevelUp community
and the LevelDB and Snappy teams from Google and additional contributors. 
LevelDB and Snappy are both issued under the [New BSD Licence](http://opensource.org/licenses/BSD-3-Clause).*

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
