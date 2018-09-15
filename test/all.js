/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/*eslint-env mocha*/
/*global define,run*/

<<<<<<< HEAD
var assert = require('assert');
var path = require('path');
var glob = require('glob');
var istanbul = require('istanbul');
var i_remap = require('remap-istanbul/lib/remap');
var jsdom = require('jsdom-no-contextify');
var minimatch = require('minimatch');
var fs = require('fs');
var vm = require('vm');
var TEST_GLOB = '**/test/**/*.test.js';

var optimist = require('optimist')
=======
var assert = require('assert'),
	path = require('path'),
	glob = require('glob'),
	istanbul = require('istanbul'),
	jsdom = require('jsdom-no-contextify'),
	minimatch = require('minimatch'),
	async = require('async'),
	TEST_GLOB = '**/test/**/*.test.js',
	optimist = require('optimist')
>>>>>>> commit
	.usage('Run the Code tests. All mocha options apply.')
	.describe('build', 'Run from out-build').boolean('build')
	.describe('run', 'Run a single file').string('run')
	.describe('coverage', 'Generate a coverage report').boolean('coverage')
	.describe('only-monaco-editor', 'Run only monaco editor tests').boolean('only-monaco-editor')
	.describe('forceLoad', 'Force loading').boolean('forceLoad')
	.describe('browser', 'Run tests in a browser').boolean('browser')
	.alias('h', 'help').boolean('h')
	.describe('h', 'Show help'),
	argv = optimist.argv;
if (argv.help) {
	optimist.showHelp();
	process.exit(1);
}
function main() {
	process.on('uncaughtException', function (e) {console.error(e.stack || e);});
	var loaderConfig = {
		nodeRequire: require,
		nodeMain: __filename,
		baseUrl: path.join(path.dirname(__dirname), 'src'),
		paths: {
			'vs/css': '../test/css.mock',
			'vs': `../${ out }/vs`,
			'lib': `../${ out }/lib`,
			'bootstrap-fork': `../${ out }/bootstrap-fork`
		},
		catchError: true
	};
	if (argv.coverage) {
		var instrumenter = new istanbul.Instrumenter();
			// The remapped coverage comes out with broken paths
			var toUpperDriveLetter = function(str) {
				if (/^[a-z]:/.test(str)) {
					return str.charAt(0).toUpperCase() + str.substr(1);
				}
				return str;
			};
			var toLowerDriveLetter = function(str) {
				if (/^[A-Z]:/.test(str)) {
					return str.charAt(0).toLowerCase() + str.substr(1);
				}
				return str;
			};

			var REPO_PATH = toUpperDriveLetter(path.join(__dirname, '..'));
			var fixPath = function(brokenPath) {
				var startIndex = brokenPath.indexOf(REPO_PATH);
				if (startIndex === -1) {
					return toLowerDriveLetter(brokenPath);
				}
				return toLowerDriveLetter(brokenPath.substr(startIndex));
			};

			var finalCoverage = {};
			for (var entryKey in remappedCoverage) {
				var entry = remappedCoverage[entryKey];
				entry.path = fixPath(entry.path);
				finalCoverage[fixPath(entryKey)] = entry;
			}

			var collector = new istanbul.Collector();
			collector.add(finalCoverage);

			var coveragePath = path.join(path.dirname(__dirname), '.build', 'coverage');
			var reportTypes = [];
			if (argv.run || argv.runGlob) {
				// single file running
				coveragePath += '-single';
				reportTypes = ['lcovonly'];
			} else {
				reportTypes = ['json', 'lcov', 'html'];
			}
			var reporter = new istanbul.Reporter(null, coveragePath);
			reporter.addAll(reportTypes);
			reporter.write(collector, true, function () {});
		});
	}
	loader.config(loaderConfig);
	global.define = loader;
	global.document = jsdom.jsdom('<!doctype html><html><body></body></html>');
	global.self = global.window = global.document.parentWindow;
	global.Element = global.window.Element;
	global.HTMLElement = global.window.HTMLElement;
	global.Node = global.window.Node;
	global.navigator = global.window.navigator;
	global.XMLHttpRequest = global.window.XMLHttpRequest;
	var didErr = false,write = process.stderr.write;
	process.stderr.write = function (data) {
		didErr = didErr || !!data;
		write.apply(process.stderr, arguments);
	};
					return test.replace(/(\.js)|(\.d\.ts)|(\.js\.map)$/, '');
				});
				define(modulesToLoad, () => cb(null), cb);
			};

			glob(argv.runGlob, { cwd: src }, function (err, files) { doRun(files); });
		};
	} else if (argv.run) {
		var tests = (typeof argv.run === 'string') ? [argv.run] : argv.run;
		var modulesToLoad = tests.map(function(test) {
			return path.relative(src, path.resolve(test)).replace(/(\.js)|(\.d\.ts)|(\.js\.map)$/, '');
		});
		loadFunc = cb => {
			define(modulesToLoad, () => cb(null), cb);
		};
	} else if (argv['only-monaco-editor']) {
		loadFunc = function(cb) {
			glob(TEST_GLOB, { cwd: src }, function (err, files) {
				var modulesToLoad = files.map(function (file) {
					return file.replace(/\.js$/, '');
				});
				modulesToLoad = modulesToLoad.filter(function(module) {
					if (/^vs\/workbench\//.test(module)) {
						return false;
					}
					// platform tests drag in the workbench.
					// see https://github.com/Microsoft/vscode/commit/12eaba2f64c69247de105c3d9c47308ac6e44bc9
					// and cry a little
					if (/^vs\/platform\//.test(module)) {
						return false;
					}
					return !/(\/|\\)node(\/|\\)/.test(module);
				});
				console.log(JSON.stringify(modulesToLoad, null, '\t'));
				define(modulesToLoad, function () { cb(null); }, cb);
			});
		};
	} else {
		loadFunc = function(cb) {
			glob(TEST_GLOB, { cwd: src }, function (err, files) {
				var modulesToLoad = files.map(function (file) {
					return file.replace(/\.js$/, '');
				});
				define(modulesToLoad, function () { cb(null); }, cb);
			});
		};
	}
		if (err) {
			console.error(err);
			return process.exit(1);
		}
		process.stderr.write = write;

			// set up last test
			suite('Loader', function () {
				test('should not explode while loading', function () {
					assert.ok(!didErr, 'should not explode while loading');
				});
			});
		}
		// report failing test for every unexpected error during any of the tests
		var unexpectedErrors = [];
		suite('Errors', function () {
			test('should not have unexpected errors in tests', function () {
				if (unexpectedErrors.length) {
					unexpectedErrors.forEach(function (stack) {
						console.error('');
						console.error(stack);
					})
					assert.ok(false);
				}
			});
		});
		// replace the default unexpected error handler to be useful during tests
		loader(['vs/base/common/errors'], function(errors) {
			errors.setUnexpectedErrorHandler(function (err) {
		});
	});
};if (process.argv.some(function (a) { return /^--browser/.test(a); })){require('./browser');} else {main();}
