'use strict';


var test = require('tape'),
    dust = require('dustjs-linkedin'),
    contextify = require('../');


test('dustjs-onload-context', function (t) {

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


    t.test('primed cache', function (t) {
        var undo = contextify();

        t.plan(9);

        dust.onLoad = function (name, context, cb) {
            t.equals(name, 'index');
            t.equals(typeof context, 'object');
            t.equals(context.get('name'), 'world');
            t.equals(typeof cb, 'function');

            dust.loadSource(dust.compile("Hello, {name}!", "index"));
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

            dust.loadSource(dust.compile("Hello, {name}!", "index"));
            cb(null);
        };

        dust.render('index', { name: 'world' }, function (err, data) {
            t.error(err);
            t.equal(data, 'Hello, world!');
            t.equal(typeof dust.cache.index, "undefined");
            t.equal(dust.load.name, 'cabbage');

            dust.cache = {};
            undo();

            t.equal(dust.load.name, '');
            t.end();
        });
    });


    t.test('error', function (t) {
        var undo = contextify();

        dust.silenceErrors = true;
        dust.onLoad = function (name, context, cb) {
            console.log('load');
            cb(new Error('test'));
        };

        dust.render('index', { name: 'world' }, function (err, data) {
            undo();
            t.ok(err);
            t.equal(data, undefined);
            t.end();
        });
    });

});