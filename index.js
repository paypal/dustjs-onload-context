/*───────────────────────────────────────────────────────────────────────────*\
 │  Copyright (C) 2014 eBay Software Foundation                               │
 │                                                                            │
 │  Licensed under the Apache License, Version 2.0 (the "License");           │
 │  you may not use this file except in compliance with the License.          │
 │  You may obtain a copy of the License at                                   │
 │                                                                            │
 │    http://www.apache.org/licenses/LICENSE-2.0                              │
 │                                                                            │
 │  Unless required by applicable law or agreed to in writing, software       │
 │  distributed under the License is distributed on an "AS IS" BASIS,         │
 │  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.  │
 │  See the License for the specific language governing permissions and       │
 │  limitations under the License.                                            │
 \*───────────────────────────────────────────────────────────────────────────*/
'use strict';

var dust = require('dustjs-linkedin');


var RESERVED = '☃';
var active = 0;
var orig;
var slice = Function.prototype.call.bind(Array.prototype.slice);


/**
 * Inspired by http://blog.izs.me/post/59142742143/designing-apis-for-asynchrony
 * @param fn the method which it's not know if it's sync or async
 * @param cb the callback to be invoked upon resolution of fn
 */
function async(fn, cb) {
    var sync;

    function wrapper() {
        var args, complete;

        args = slice(arguments);
        args.unshift(null);

        complete = Function.prototype.bind.apply(cb, args);
        if (sync) {
            setImmediate(complete);
            return;
        }
        complete();
    }

    sync = true;
    fn(wrapper);
    sync = false;
}


function patch(load, onload) {

    return function cabbage(name, chunk, context) {
        var view, cached;

        view = name;
        cached = !!dust.cache[view];

        if (!cached) {

            view = RESERVED;

            Object.defineProperty(dust.cache, view, {

                configurable: true,

                get: function () {
                    var self;

                    // Remove the getter immediately (must delete as it's a
                    // getter. setting it to undefined will fail.)
                    self = this;
                    delete this[view];
                    active += 1;

                    return function fauxTemplate(chunks, context) {

                        function onchunk(chunk) {

                            function onloaded(err, src) {
                                var template;

                                active -= 1;

                                if (err) {
                                    chunk.setError(err);
                                    delete self[name];
                                    return;
                                }

                                template = self[name];
                                if (!template) {
                                    dust.loadSource(dust.compile(src, name));
                                    template = self[name];
                                }

                                delete self[name];
                                template(chunk, context).end();
                            }

                            async(onload.bind(null, name, context), onloaded);
                        }

                        return chunks.map(onchunk);
                    };
                }

            });

        }

        return load(view, chunk, context);
    };
}


/**
 * A default wrapper for intercepting calls to `dust.onLoad`
 * @param name
 * @param context
 * @param cb
 */
function noop(name, context, cb) {
    // Assigning onLoad to a variable named noop
    // will not work because we have no control
    // over when dust.onLoad is assigned, thus
    // we need to reference it at runtime.
    dust.onLoad.apply(null, arguments);
}



module.exports = function contextualize(options) {
    options = options || {};

    if (!orig) {
        orig = dust.load;
        dust.load = patch(orig, options.onLoad || noop);
    }

    return function undo() {
        if (!active && orig && dust.load !== orig) {
            dust.load = orig;
            orig = undefined;
            return true;
        }
        return false;
    };
};