#! /bin/sh

rm -rf build
mkdir build
./node_modules/.bin/browserify -s level node_modules/level-browserify/browser.js > build/levelgraph.js
./node_modules/.bin/browserify -s levelgraph ./lib/levelgraph.js >> build/levelgraph.js
./node_modules/.bin/uglifyjs build/levelgraph.js > build/levelgraph.min.js
gzip -c build/levelgraph.min.js > build/levelgraph.min.js.gz
du -h build/*
