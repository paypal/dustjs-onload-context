'use strict';

var dustjs = require('dustjs-linkedin');


var RESERVED = '☃';
var active = 0;

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
    var load;

    options = options || { cache: true };

    load = dustjs.load;
    dustjs.load = patch(load, options);

    return function undo() {
        if (dustjs.load === load) {
            return;
        }

        if (!active) {
            dustjs.load = load;
            return;
        }

        setImmediate(undo);
    };
};