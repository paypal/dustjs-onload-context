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


    t.test('with context', function (t) {
        var undo = contextify(dust);

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
            t.equal(dust.cache.index, undefined);
            t.equal(dust.load.name, 'cabbage');

            undo();

            t.equal(dust.load.name, '');
            setImmediate(t.end.bind(t));
        });

    });


    t.test('prime cache on load', function (t) {
        var undo = contextify(dust);

        t.plan(9);

        dust.onLoad = function (name, context, cb) {
            t.equals(name, 'index');
            t.equals(typeof context, 'object');
            t.equals(context.get('name'), 'world');
            t.equals(typeof cb, 'function');

            dust.loadSource(dust.compile('Hello, {name}!', 'index'));
            cb();
        };

        dust.render('index', { name: 'world' }, function (err, data) {
            t.error(err);
            t.equal(data, 'Hello, world!');
            t.equal(dust.cache.index, undefined);
            t.equal(dust.load.name, 'cabbage');

            undo();

            t.equal(dust.load.name, '');
            setImmediate(t.end.bind(t));
        });

    });


    t.test('non-cached fn on load', function (t) {
        var undo = contextify(dust);

        t.plan(9);

        dust.onLoad = function (name, context, cb) {
            t.equals(name, 'index');
            t.equals(typeof context, 'object');
            t.equals(context.get('name'), 'world');
            t.equals(typeof cb, 'function');

            var template = dust.loadSource(dust.compile('Hello, {name}!', 'index'));
            delete dust.cache['index'];
            setImmediate(cb.bind(null, null, template));
        };

        dust.render('index', { name: 'world' }, function (err, data) {
            t.error(err);
            t.equal(data, 'Hello, world!');
            t.equal(dust.cache.index, undefined);
            t.equal(dust.load.name, 'cabbage');

            undo();

            t.equal(dust.load.name, '');
            setImmediate(t.end.bind(t));
        });

    });


    t.test('compileFn templates', function (t) {
        var undo;

        t.plan(6);

        dust.onLoad = function (name, context, cb) {
            var template;

            switch (name) {
                case 'index':
                    template = 'Hello, {>"partial"/}';
                    break;
                case 'partial':
                    template = '{name}!';
                    break;
                default:
                    template = '';
            }

            setImmediate(cb.bind(null, null, dust.compileFn(template)));
        };

        undo = contextify(dust);
        dust.render('index', { name: 'world' }, function (err, data) {
            t.error(err);
            t.equal(data, 'Hello, world!');

            // Cache should be empty
            t.equal(dust.cache['index'], undefined);
            t.equal(dust.cache['partial'], undefined);
            t.equal(Object.keys(dust.cache).length, 0);
            t.strictEqual(undo(), true);
            t.end();
        });
    });


    t.test('compileFn templates with error', function (t) {
        var undo;

        t.plan(4);

        dust.onLoad = function (name, context, cb) {
            function fauxCompiled(context, cb) {
                cb(new Error('Failure'));
            }

            setImmediate(cb.bind(null, null, fauxCompiled));
        };

        undo = contextify(dust);
        dust.render('index', { name: 'world' }, function (err, data) {
            t.ok(err);
            t.notOk(data);

            // Cache should be empty
            t.equal(Object.keys(dust.cache).length, 0);
            t.strictEqual(undo(), true);
            t.end();
        });
    });


    t.test('error', function (t) {
        var undo = contextify(dust);

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

            undo();

            t.equal(dust.load.name, '');
            setImmediate(t.end.bind(t));
        });

    });


    t.test('primed template', function (t) {
        var undo = contextify(dust);

        t.plan(5);

        dust.onLoad = function (name, context, cb) {
            t.equal(name, 'index');
            t.equal(typeof context, 'object');
            t.equal(typeof cb, 'function');
            cb(null, 'Hello, {name}!');
        };

        // This should have no effect as cache is completely ignored.
        dust.loadSource(dust.compile('Hello, {name}!', 'index'));
        dust.render('index', { name: 'world' }, function (err, data) {
            t.error(err);
            t.equal(data, 'Hello, world!');

            undo();

            t.end();
        });

    });


    t.test('undo', function (t) {
        var undo = contextify(dust);

        t.plan(5);

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

            setImmediate(function () {
                t.strictEqual(undo(), true);
                t.equal(dust.load.name, '');
                t.end();
            });
        });

    });


    t.test('race conditions', function (t) {
        var undo = contextify(dust);

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

            cb(null, template);
        };

        function exec(done) {
            // Was already patched so *should* be a noop.
            var undo = contextify(dust);
            dust.render('index', { name: 'world' }, function (err, data) {
                t.error(err, 'no error');
                t.equal(data, 'Hello, <em>world</em>!', 'rendered correctly');
                t.equal(typeof undo(), 'boolean');
                setTimeout(done, getRandomInt(0, 500));
            });
        }

        function complete() {
            t.equal(dust.load.name, 'cabbage');
            t.strictEqual(undo(), true); // ensure subsequent `undo` is noop
            t.equal(dust.load.name, '');

            setImmediate(t.end.bind(t));
        }

        run(1000, exec, complete);

    });

    t.test('caching', function (t) {
        var undo = contextify(dust);

        t.plan(6);

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

            // Cache should be empty
            t.equal(dust.cache['index'], undefined);
            t.equal(dust.cache['partial'], undefined);
            t.equal(Object.keys(dust.cache).length, 0);
            t.strictEqual(undo(), true);
            t.end();
        });
    });


    t.test('alternate onLoad', function (t) {
        var undo;

        t.plan(12);

        // wrapper that delegates to default onLoad
        function onLoadWrapper(name, context, cb) {
            t.equal(typeof name, 'string');
            t.equal(typeof context, 'object');
            t.equal(typeof cb, 'function');
            dust.onLoad(name + '_test', context, cb);
        }

        dust.onLoad = function (name, context, cb) {
            var template;

            switch (name) {
                case 'index_test':
                    template = 'Hello, {>"partial"/}';
                    break;
                case 'partial_test':
                    template = '{name}!';
                    break;
                default:
                    template = '';
            }

            setImmediate(cb.bind(null, null, template));
        };

        undo = contextify(dust, onLoadWrapper);
        dust.render('index', { name: 'world' }, function (err, data) {
            t.error(err);
            t.equal(data, 'Hello, world!');

            // Cache should be empty
            t.equal(dust.cache['index_test'], undefined);
            t.equal(dust.cache['partial_test'], undefined);
            t.equal(Object.keys(dust.cache).length, 0);
            t.strictEqual(undo(), true);
            t.end();
        });
    });

});