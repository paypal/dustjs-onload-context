`dustjs-onload-context` extends dustjs to support `dust.onLoad` callbacks which accept the current rendering context as the second
parameter. This can be useful when it's necessary to resolve templates based on state in the render context.

[![Build Status](https://travis-ci.org/totherik/dustjs-onload-context.png)](https://travis-ci.org/totherik/dustjs-onload-context)

#### Example
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


#### Usage
To enable support for the `context` argument, simply require `dustjs-onload-context` and invoke the exported function
(which will decorate dustjs). Then, you can assign a function which accepts three arguments to the `onLoad` dust property.
Functions assigned to `onLoad` which only accept 2 arguments are considered a noop and are treated the same as the
original dust `onLoad` API.

To revert dust back to its original functional, this module returns a function once invoked. Invoking this function will
revert dust and `onLoad` to their original behavior.

```
NOTE: The `dustjs-linkedin` module is required, but is not an explicit dependency of this module.
```


#### Options
- `cache` (*Boolish*, optional) Defaults to `true`. This flag indicates whether templates resolve by the defined `onLoad`
should be placed into the internal dust cache or not.



#### Tests
```bash
$ npm test
```


#### Coverage
````bash
$ npm run-script cover && open coverage/lcov-report/index.html
```