test:
	./node_modules/.bin/mocha --recursive test

bail:
	./node_modules/.bin/mocha --recursive --bail --reporter spec test 

ci:
	./node_modules/.bin/mocha --recursive --watch test

jshint:
	find lib -name "*.js" -print0 | xargs -0 ./node_modules/.bin/jshint
	find test -name "*.js" -print0 | xargs -0 ./node_modules/.bin/jshint

.PHONY: test
