dustjs-onload-context extends dustjs to support `dust.onLoad` callbacks which accept the current rendering context.

[![Build Status](https://travis-ci.org/totherik/dustjs-onload-context.png)](https://travis-ci.org/totherik/dustjs-onload-context)

#### Basic Usage
```javascript
'use strict';

var dust = require('dustjs-linkedin'),
    contextify = require('dustjs-onload-context');

var undo = contextify();
dust.onLoad = function (name, context, cb) {
    var str;

    // context.get('foo');
    // do stuff ...

    cb(null, str);
};
```