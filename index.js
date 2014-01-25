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

function patch(load, options) {
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

                    return function faux(chunks, context) {

                        function onchunk(chunk) {
                            var args;

                            function onloaded(err, src) {
                                active -= 1;

                                if (err) {
                                    chunk.setError(err);
                                    return;
                                }

                                if (!self[name]) {
                                    dustjs.loadSource(dustjs.compile(src, name));
                                }

                                self[name](chunk, context).end();

                                if (!options.cache) {
                                    delete self[name];
                                }
                            }

                            args = [name, onloaded];
                            if (dustjs.onLoad.length === 3) {
                                args.splice(1, 0, context);
                            }

                            dustjs.onLoad.apply(null, args);
                        }

                        return chunks.map(onchunk);
                    };
                }

            });

        }

        return load(view, chunk, context);
    };
}



module.exports = function contextualize(options) {

    options = options || { cache: true };

    if (!orig) {
        orig = dustjs.load;
        dustjs.load = patch(orig, options);
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