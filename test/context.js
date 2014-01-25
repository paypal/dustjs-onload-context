'use strict';


var test = require('tape'),
    dust = require('dustjs-linkedin'),
    contextify = require('../');


test('dustjs-onload-context', function (t) {

    function run(iterations, fn, complete) {
        var awaiting = 0;

        (function go() {

            awaiting += 1;
            fn(function () {
                awaiting -= 1;
                if (!iterations && !awaiting) {
                    complete();
                }
            });

            if (iterations) {
                setImmediate(go);
                iterations -= 1;
            }

        }());
    }

    // From: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1) + min);
    }


    t.test('original', function (t) {

        t.plan(4);

        dust.onLoad = function (name, cb) {
            t.equals(name, 'index');
            cb(null, 'Hello, {name}!');
        };

        dust.render('index', { name: 'world' }, function (err, data) {
            t.error(err);
            t.equal(data, 'Hello, world!');
            t.equal(typeof dust.cache.index, 'function');

            dust.cache = {};

            t.end();
        });

    });


    t.test('patched without context', function (t) {
        var undo = contextify();

        t.plan(7);

        dust.onLoad = function (name, cb) {
            t.equals(name, 'index');
            t.equals(typeof cb, 'function');
            cb(null, 'Hello, {name}!');
        };

        dust.render('index', { name: 'world' }, function (err, data) {
            t.error(err);
            t.equal(data, 'Hello, world!');
            t.equal(typeof dust.cache.index, 'function');
            t.equal(dust.load.name, 'cabbage');

            dust.cache = {};
            undo();

            t.equal(dust.load.name, '');
            t.end();
        });

    });


    t.test('with context', function (t) {
        var undo = contextify();

        t.plan(9);

        dust.onLoad = function (name, context, cb) {
            t.equals(name, 'index');
            t.equals(typeof context, 'object');
            t.equals(context.get('name'), 'world');
            t.equals(typeof cb, 'function');
            cb(null, 'Hello, {name}!');
        };

        dust.render('index', { name: 'world' }, function (err, data) {
            t.error(err);
            t.equal(data, 'Hello, world!');
            t.equal(typeof dust.cache.index, 'function');
            t.equal(dust.load.name, 'cabbage');

            dust.cache = {};
            undo();

            t.equal(dust.load.name, '');
            t.end();
        });

    });


    t.test('prime cache on load', function (t) {
        var undo = contextify();

        t.plan(9);

        dust.onLoad = function (name, context, cb) {
            t.equals(name, 'index');
            t.equals(typeof context, 'object');
            t.equals(context.get('name'), 'world');
            t.equals(typeof cb, 'function');

            dust.loadSource(dust.compile('Hello, {name}!', 'index'));
            cb(null);
        };

        dust.render('index', { name: 'world' }, function (err, data) {
            t.error(err);
            t.equal(data, 'Hello, world!');
            t.equal(typeof dust.cache.index, 'function');
            t.equal(dust.load.name, 'cabbage');

            dust.cache = {};
            undo();

            t.equal(dust.load.name, '');
            t.end();
        });

    });


    t.test('cache disabled', function (t) {
        var undo = contextify({ cache: false });

        t.plan(9);

        dust.onLoad = function (name, context, cb) {
            t.equals(name, 'index');
            t.equals(typeof context, 'object');
            t.equals(context.get('name'), 'world');
            t.equals(typeof cb, 'function');

            dust.loadSource(dust.compile('Hello, {name}!', 'index'));
            cb(null);
        };

        dust.render('index', { name: 'world' }, function (err, data) {
            t.error(err);
            t.equal(data, 'Hello, world!');
            t.equal(typeof dust.cache.index, 'undefined');
            t.equal(dust.load.name, 'cabbage');

            dust.cache = {};
            undo();

            t.equal(dust.load.name, '');
            t.end();
        });

    });


    t.test('error', function (t) {
        var undo = contextify();

        t.plan(7);

        dust.silenceErrors = true;
        dust.onLoad = function (name, context, cb) {
            t.ok(name);
            t.ok(context);
            t.ok(cb);
            cb(new Error('test'));
        };

        dust.render('index', { name: 'world' }, function (err, data) {
            t.ok(err);
            t.equal(data, undefined);
            t.equal(dust.load.name, 'cabbage');

            dust.cache = {};
            undo();

            t.equal(dust.load.name, '');
            t.end();
        });

    });


    t.test('cached template', function (t) {
        var undo = contextify();

        t.plan(2);

        dust.onLoad = function (name, context, cb) {
            cb(new Error('Should not be called'));
        };

        dust.loadSource(dust.compile('Hello, {name}!', 'index'));
        dust.render('index', { name: 'world' }, function (err, data) {
            t.error(err);
            t.equal(data, 'Hello, world!');

            dust.cache = {};
            undo();

            t.end();
        });

    });


    t.test('undo', function (t) {
        var undo = contextify();

        t.plan(9);

        dust.onLoad = function (name, context, cb) {
            switch (name) {
                case 'index':
                    setImmediate(cb.bind(null, null, 'Hello, {>"partial"/}!'));
                    break;
                case 'partial':
                    setImmediate(cb.bind(null, null, '{name}'));
                    break;
            }
        };

        dust.render('index', { name: 'world'}, function (err, data) {
            t.error(err);
            t.equal(data, 'Hello, world!');
            t.equal(dust.load.name, 'cabbage');
            t.strictEqual(undo(), false);
        });

        dust.render('index', { name: 'world'}, function (err, data) {
            t.error(err);
            t.equal(data, 'Hello, world!');
            t.equal(dust.load.name, 'cabbage');

            dust.cache = {};

            setImmediate(function () {
                t.strictEqual(undo(), true);
                t.equal(dust.load.name, '');
                t.end();
            });
        });

    });


    t.test('race conditions', function (t) {
        var undo = contextify();

        dust.onLoad = function (name, context, cb) {
            var template;

            switch (name) {
                case 'index':
                    template = 'Hello, {>"partial1"/}!';
                    break;
                case 'partial1':
                    template = '<em>{>"partial2"/}</em>';
                    break;
                case 'partial2':
                    template = '{name}';
                    break;
                default:
                    template = '';
            }

            // Introduce "entropy"-like variance.
            setTimeout(cb.bind(null, null, template), getRandomInt(0, 500));
        };

        function exec(done) {
            var undo = contextify();
            dust.render('index', { name: 'world' }, function (err, data) {
                t.error(err, 'no error');
                t.equal(data, 'Hello, <em>world</em>!', 'rendered correctly');
                t.equal(typeof undo(), 'boolean');
                done();
            });
        }

        function complete() {
            t.equal(dust.load.name, '');
            t.strictEqual(undo(), false); // ensure subsequent `undo` is noop
            t.equal(dust.load.name, '');

            dust.cache = {};

            t.end();
        }

        run(1000, exec, complete);

    });


    t.test('caching enabled', function (t) {
        var undo = contextify();

        t.plan(8);

        dust.onLoad = function (name, context, cb) {
            var template;

            switch (name) {
                case 'index':
                    template = 'Aloha, {>"partial"/}!';
                    break;
                case 'partial':
                    template = '{name}';
                    break;
                default:
                    template = '';
            }

            setImmediate(cb.bind(null, null, template));
        };

        dust.render('index', { name: 'world' }, function (err, data) {
            t.error(err);
            t.equal(data, 'Aloha, world!');

            t.equal(typeof dust.cache['index'], 'function');
            t.equal(typeof dust.cache['partial'], 'function');
            t.equal(Object.keys(dust.cache).length, 2);

            // Ensure templates exist in cache across completion.
            setImmediate(function () {
                t.equal(typeof dust.cache['index'], 'function');
                t.equal(typeof dust.cache['partial'], 'function');
                t.equal(Object.keys(dust.cache).length, 2);

                dust.cache = {};
                undo();

                t.end();
            });
        });
    });


    t.test('caching disabled', function (t) {
        var undo = contextify({ cache: false });

        t.plan(8);

        dust.onLoad = function (name, context, cb) {
            var template;

            switch (name) {
                case 'index':
                    template = 'Bonjour, {>"partial"/}';
                    break;
                case 'partial':
                    template = '{name}!';
                    break;
                default:
                    template = '';
            }

            setImmediate(cb.bind(null, null, template));
        };

        dust.render('index', { name: 'world' }, function (err, data) {
            t.error(err);
            t.equal(data, 'Bonjour, world!');

            // At this point, at least one template still exists in cache
            // since removal happens after this callback is invoked by dust
            // internally.
            t.equal(typeof dust.cache['index'], 'undefined');
            t.equal(typeof dust.cache['partial'], 'function');
            t.equal(Object.keys(dust.cache).length, 1);

            setImmediate(function () {
                t.equal(dust.cache['index'], undefined);
                t.equal(dust.cache['partial'], undefined);
                t.equal(Object.keys(dust.cache).length, 0);

                dust.cache = {};
                undo();

                t.end();
            });
        });
    });

});