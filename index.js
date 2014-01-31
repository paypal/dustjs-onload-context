/*───────────────────────────────────────────────────────────────────────────*\
 │  Copyright (C) 2013 eBay Software Foundation                               │
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

var dustjs = require('dustjs-linkedin');


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

    function wrap(fn) {
        return function wrapper() {
            var args, complete;

            args = slice(arguments);
            args.unshift(null);

            complete = Function.prototype.bind.apply(fn, args);
            if (sync) {
                setImmediate(complete);
                return;
            }
            complete();
        };
    }

    sync = true;
    fn(wrap(cb));
    sync = false;
}


function patch(load) {
    return function cabbage(name, chunk, context) {
        var view, cached;

        view = name;
        cached = !!dustjs.cache[view];

        if (!cached) {

            view = RESERVED;

            Object.defineProperty(dustjs.cache, view, {

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
                                    dustjs.loadSource(dustjs.compile(src, name));
                                    template = self[name];
                                }

                                delete self[name];
                                template(chunk, context).end();
                            }

                            async(dustjs.onLoad.bind(null, name, context), onloaded);
                        }

                        return chunks.map(onchunk);
                    };
                }

            });

        }

        return load(view, chunk, context);
    };
}



module.exports = function contextualize() {
    if (!orig) {
        orig = dustjs.load;
        dustjs.load = patch(orig);
    }

    return function undo() {
        if (!active && orig && dustjs.load !== orig) {
            dustjs.load = orig;
            orig = undefined;
            return true;
        }
        return false;
    };
};