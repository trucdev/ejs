## Installation

```bash
$ npm install react-native-ejs
```

## Features
  * Support React native
  * Control flow with `<% %>`
  * Escaped output with `<%= %>` (escape function configurable)
  * Unescaped raw output with `<%- %>`
  * Newline-trim mode ('newline slurping') with `-%>` ending tag
  * Whitespace-trim mode (slurp all whitespace) for control flow with `<%_ _%>`
  * Custom delimiters (e.g. `[? ?]` instead of `<% %>`)
  * Client-side support
  * Running only with strict mode. Read ejs document with strict is true

## Example

```ejs
<% if (locals.user) { %>
  <h2><%= locals.user.name %></h2>
<% } %>
```

Try EJS online at: https://ionicabizau.github.io/ejs-playground/.

## Basic usage

```javascript
let template = ejs.compile(str, options);
template(data);
// => Rendered HTML string

ejs.render(str, data, options);
// => Rendered HTML string

ejs.renderFile(filename, data, options, function(err, str){
    // str => Rendered HTML string
});
```

It is also possible to use `ejs.render(dataAndOptions);` where you pass
everything in a single object. In that case, you'll end up with local variables
for all the passed options. However, be aware that your code could break if we
add an option with the same name as one of your data object's properties.
Therefore, we do not recommend using this shortcut.

### Important
You should never give end-users unfettered access to the EJS render method, If you do so you are using EJS in an inherently un-secure way. 

### Options

  - `cache`                 Compiled functions are cached, requires `filename`
  - `filename`              The name of the file being rendered. Not required if you
    are using `renderFile()`. Used by `cache` to key caches, and for includes.
  - `root`                  Set template root(s) for includes with an absolute path (e.g, /file.ejs).
    Can be array to try to resolve include from multiple directories.
  - `views`                 An array of paths to use when resolving includes with relative paths.
  - `context`               Function execution context
  - `compileDebug`          When `false` no debug instrumentation is compiled
  - `client`                When `true`, compiles a function that can be rendered
    in the browser without needing to load the EJS Runtime
    ([ejs.min.js](https://github.com/mde/ejs/releases/latest)).
  - `delimiter`             Character to use for inner delimiter, by default '%'
  - `openDelimiter`         Character to use for opening delimiter, by default '<'
  - `closeDelimiter`        Character to use for closing delimiter, by default '>'
  - `debug`                 Outputs generated function body
  - `strict`                When set to `true`, generated function is in strict mode
  - `_with`                 Whether or not to use `with() {}` constructs. If `false`
    then the locals will be stored in the `locals` object. Set to `false` in strict mode.
  - `destructuredLocals`    An array of local variables that are always destructured from
    the locals object, available even in strict mode.
  - `localsName`            Name to use for the object storing local variables when not using
    `with` Defaults to `locals`
  - `rmWhitespace`          Remove all safe-to-remove whitespace, including leading
    and trailing whitespace. It also enables a safer version of `-%>` line
    slurping for all scriptlet tags (it does not strip new lines of tags in
    the middle of a line).
  - `escape`                The escaping function used with `<%=` construct. It is
    used in rendering and is `.toString()`ed in the generation of client functions.
    (By default escapes XML).
  - `outputFunctionName`    Set to a string (e.g., 'echo' or 'print') for a function to print
    output inside scriptlet tags.
  - `async`                 When `true`, EJS will use an async function for rendering. (Depends
    on async/await support in the JS runtime).
  - `includer`              Custom function to handle EJS includes, receives `(originalPath, parsedPath)`
    parameters, where `originalPath` is the path in include as-is and `parsedPath` is the
    previously resolved path. Should return an object `{ filename, template }`,
    you may return only one of the properties, where `filename` is the final parsed path and `template`
    is the included content.

This project uses [JSDoc](http://usejsdoc.org/). For the full public API
documentation, clone the repository and run `jake doc`. This will run JSDoc
with the proper options and output the documentation to `out/`. If you want
the both the public & private API docs, run `jake devdoc` instead.

### Tags

  - `<%`              'Scriptlet' tag, for control-flow, no output
  - `<%_`             'Whitespace Slurping' Scriptlet tag, strips all whitespace before it
  - `<%=`             Outputs the value into the template (escaped)
  - `<%-`             Outputs the unescaped value into the template
  - `<%#`             Comment tag, no execution, no output
  - `<%%`             Outputs a literal '<%'
  - `%%>`             Outputs a literal '%>'
  - `%>`              Plain ending tag
  - `-%>`             Trim-mode ('newline slurp') tag, trims following newline
  - `_%>`             'Whitespace Slurping' ending tag, removes all whitespace after it

For the full syntax documentation, please see [docs/syntax.md](https://github.com/mde/ejs/blob/master/docs/syntax.md).

### Includes

Includes either have to be an absolute path, or, if not, are assumed as
relative to the template with the `include` call. For example if you are
including `./views/user/show.ejs` from `./views/users.ejs` you would
use `<%- include('user/show') %>`.

You must specify the `filename` option for the template with the `include`
call unless you are using `renderFile()`.

You'll likely want to use the raw output tag (`<%-`) with your include to avoid
double-escaping the HTML output.

```ejs
<ul>
  <% users.forEach(function(user){ %>
    <%- include('user/show', {user: user}) %>
  <% }); %>
</ul>
```

Includes are inserted at runtime, so you can use variables for the path in the
`include` call (for example `<%- include(somePath) %>`). Variables in your
top-level data object are available to all your includes, but local variables
need to be passed down.

NOTE: Include preprocessor directives (`<% include user/show %>`) are
not supported in v3.0+.

## Custom delimiters

Custom delimiters can be applied on a per-template basis, or globally:

```javascript
let ejs = require('ejs'),
    users = ['geddy', 'neil', 'alex'];

// Just one template
ejs.render('<p>[?= users.join(" | "); ?]</p>', {users: users}, {delimiter: '?', openDelimiter: '[', closeDelimiter: ']'});
// => '<p>geddy | neil | alex</p>'

// Or globally
ejs.delimiter = '?';
ejs.openDelimiter = '[';
ejs.closeDelimiter = ']';
ejs.render('<p>[?= users.join(" | "); ?]</p>', {users: users});
// => '<p>geddy | neil | alex</p>'
```

## Client-side support ONLY WORK WITH strict mode

Go to the [Latest Release](https://github.com/mde/ejs/releases/latest), download
`./ejs.js` or `./ejs.min.js`. Alternately, you can compile it yourself by cloning
the repository and running `jake build` (or `$(npm bin)/jake build` if jake is
not installed globally).

Include one of these files on your page, and `ejs` should be available globally.

### Example

```html
<div id="output"></div>
<script src="ejs.min.js"></script>
<script>
  let people = ['geddy', 'neil', 'alex'],
      html = ejs.render('<%= people.join(", "); %>', {people: people});
  // With jQuery:
  $('#output').html(html);
  // Vanilla JS:
  document.getElementById('output').innerHTML = html;
</script>
```

### Caveats

Most of EJS will work as expected; however, there are a few things to note:

1. Obviously, since you do not have access to the filesystem, `ejs.renderFile()` won't work.
2. For the same reason, `include`s do not work unless you use an `include callback`. Here is an example:
  ```javascript
  let str = "Hello <%= include('file', {person: 'John'}); %>",
      fn = ejs.compile(str, {client: true});

  fn(data, null, function(path, d){ // include callback
    // path -> 'file'
    // d -> {person: 'John'}
    // Put your code here
    // Return the contents of file as a string
  }); // returns rendered string
  ```

## License

Licensed under the Apache License, Version 2.0
(<http://www.apache.org/licenses/LICENSE-2.0>)

- - -
EJS Embedded JavaScript templates copyright 2112
mde@fleegix.org.
