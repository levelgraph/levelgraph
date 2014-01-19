
History
======

## 0.8.2

* Exposed `generateBatch()` method
  [#62](https://github.com/mcollina/levelgraph/issues/62).

## 0.8.1

* Fixed deferred open support for searches over IndexedDB.

## 0.8.0

* Store false values correctly [#55](https://github.com/mcollina/levelgraph/issues/55).
* Dependencies upgrade, including Browserify 3.
* Performance optimizations, +75% for `getStream`, and +25% for sort
  `search`.

## 0.7.2

* Sublevel Support [#52](https://github.com/mcollina/levelgraph/pull/52).

## 0.7.1


* Fixed two bugs in the sort search algorithm:
  1. The first was highlighted in levelgraph-jsonld and it created the
     'homes in paris' test case. It was caused by a too early close of
     the internal stream.
  2. The second was caused by a wrong skipping of triples in the merge
     sort implementation.
* Added deprecation warnings for `join()` and `joinStream()`.

## 0.7.0

* Rename the term context into solution,
  as it's more clear [#31](https://github.com/mcollina/levelgraph/pull/31).
* Rename `join()` to `search()`.
* Move from " to '.
* Introduce filtering in `search()` and `get()` [#49](https://github.com/mcollina/levelgraph/pull/49).
* Introduce a `'limit'` and `'offset'` option in `search()` and `get()`
  [#49](https://github.com/mcollina/levelgraph/pull/49).
* Callback to avoid deferred open #46.
  [#46](https://github.com/mcollina/levelgraph/pull/46).
* Saucelabs testing.
* Performance optimization of searches.

## 0.6.12

* README update [#44](https://github.com/mcollina/levelgraph/pull/44).

## 0.6.11

* Fixed memory leak by upgrading to LevelUp 0.18 and LevelDown 0.10.
* Upgraded all testing dependencies.
* Formatting to proper jshint.
* Firefox support.

## 0.6.10

* Do not include vim undo files in the package.
* Added support for LevelUp 0.17
* Added support for LevelDown 0.9

## 0.6.9

* Get now returns exact matches
  [#38](https://github.com/mcollina/levelgraph/issues/38).

## 0.6.8

* Better browserify build.
* Depending on LevelDOWN directly.

## 0.6.7

* LevelUp 0.16.0.
* Fixed browserify build.

## 0.6.6

* Fixed package.json entry point.

## 0.6.5

* Support up to levelup 0.15.0.
* Removed useless index.js.

## 0.6.4

* Support up to levelup 0.14.0.

## 0.6.3

* Widened level and levelup peerDependencies starting from 0.10.0 to
  0.13.0 included.

## 0.6.2

* Bumped level peerDependency to 0.12.0.

## 0.6.1

* Bumped level peerDependency to 0.10.0.
* Renamed repo into levelgraph from node-levelgraph.

## 0.6.0

* Browser and browserify support.
* Removed the usage of setImmediate.

## 0.5.3

* Fixed installation instructions in the README,
  thanks to @jez0990.

## 0.5.2

* Fixed example in the README.

## 0.5.1

* Improved README.

## 0.5.0

* Upgrade to levelup 0.9 through as a peer depedency
* Sort-Join algorithm for faster joins (3x)
* Added a `putStream` and a `delStream`

## 0.3.0

* Basic query planner based on levelup's approximateSize
* Extracted CallbackStream in a separate module

## 0.2.0

* Navigator API, in Gremlin style, see
  https://github.com/mcollina/node-levelgraph/pull/4.

## 0.1.2

* Updated the README.md

## 0.1.1

* Updated the README.md

## 0.1.0

* Initial release
* Getting, putting and deleting triples
* Join Support
