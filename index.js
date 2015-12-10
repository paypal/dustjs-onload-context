/*───────────────────────────────────────────────────────────────────────────*\
 │  Copyright (C) 2014 PayPal                                                 │
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

var RESERVED = '☃';
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


function patch(dust, onload) {
    var load;

    function cabbage(name, chunk, context) {

        if (dust.cache.hasOwnProperty(name)) {
            // Using this module means no internal caching is supported
            // so ensure nothing exists for this template.
            delete dust.cache[name];
        }

        Object.defineProperty(dust.cache, RESERVED, {

            configurable: true,

            get: function () {
                var cache;

                // Remove the getter immediately (must delete as it's a
                // getter. setting it to undefined will fail.)
                cache = this;
                delete this[RESERVED];
                cabbage.active += 1;

                return function fauxTemplate(chunks, context) {

                    function onchunk(chunk) {

                        // Used when `dust.onLoad` result is arbitrary
                        // renderer or created using compileFn
                        function onrendered(err, data) {
                            if (err) {
                                chunk.setError(err);
                                return;
                            }
                            chunk.write(data).end();
                        }

                        // Continuation callback passed to dustjs.onLoad
                        function onloaded(err, src) {
                            var template;

                            cabbage.active -= 1;

                            if (err) {
                                chunk.setError(err);
                                delete cache[name];
                                return;
                            }

                            template = cache[name] || ((typeof src === 'function') ? src : dust.loadSource(dust.compile(src, name)));
                            delete cache[name];

                            // Handle arbitrary functions or functions created via `dust.compileFn`
                            if (!template.name || !template.name.match(/^body_/)) {
                                template(context, onrendered);
                                return;
                            }

                            // Templates stored in cache or compiled via `dust.compile`
                            template(chunk, context).end();
                        }

                        async(onload.bind(null, name, context), onloaded);
                    }

                    return chunks.map(onchunk);
                };
            }

        });

        return load(RESERVED, chunk, context);
    }


    load = dust.load;
    cabbage.active = 0;
    dust.load = cabbage;
    return load;
}


/**
 * A default wrapper for intercepting calls to `dust.onLoad`
 * @param dust
 */
function noop(dust) {
    return function (name, context, cb) {
        // Assigning onLoad to a variable named noop
        // will not work because we have no control
        // over when dust.onLoad is assigned, thus
        // we need to reference it at runtime.
        dust.onLoad.apply(null, arguments);
    };
}



module.exports = function contextualize(dust, onload) {
    var orig;

    if (dust.load.name !== 'cabbage') {
        orig = patch(dust, onload || noop(dust));
    }

    return function undo() {
        if (orig && dust.load !== orig && dust.load.active === 0) {
            dust.load = orig;
            orig = undefined;
            return true;
        }
        return false;
    };
};