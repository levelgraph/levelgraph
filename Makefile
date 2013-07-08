test:
	./node_modules/.bin/mocha --recursive test

bail:
	./node_modules/.bin/mocha --recursive --bail --reporter spec test 

ci:
	./node_modules/.bin/mocha --recursive --watch test

jshint:
	find lib -name "*.js" -print0 | xargs -0 ./node_modules/.bin/jshint
	find test -name "*.js" -print0 | xargs -0 ./node_modules/.bin/jshint

browserify:
	rm -rf build
	mkdir build
	./node_modules/.bin/browserify browser.js -s levelgraph -r ./index.js:levelgraph -r level-js -r levelup > build/levelgraph.js
	./node_modules/.bin/uglifyjs build/levelgraph.js > build/levelgraph.min.js
	gzip -c build/levelgraph.min.js > build/levelgraph.min.js.gz
	du -h build/*

.PHONY: test
