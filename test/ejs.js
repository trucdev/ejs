/* jshint mocha: true */
/* eslint-env node, mocha */

/**
 * Module dependencies.
 */

var ejs = require('..');
var fs = require('fs');
var read = fs.readFileSync;
var assert = require('assert');
let lf = process.platform !== 'win32' ? '\n' : '\r\n';

try {
  fs.mkdirSync(__dirname + '/tmp');
} catch (ex) {
  if (ex.code !== 'EEXIST') {
    throw ex;
  }
}

// From https://gist.github.com/pguillory/729616
function hook_stdio(stream, callback) {
  var old_write = stream.write;

  stream.write = (function() {
    return function(string, encoding, fd) {
      callback(string, encoding, fd);
    };
  })(stream.write);

  return function() {
    stream.write = old_write;
  };
}

/**
 * Load fixture `name`.
 */

function fixture(name) {
  return read('test/fixtures/' + name, 'utf8');
}

/**
 * User fixtures.
 */

var users = [];
users.push({name: 'geddy'});
users.push({name: 'neil'});
users.push({name: 'alex'});


suite('client mode', function () {

  test('have a working client option', function () {
    var fn;
    var str;
    var preFn;
    fn = ejs.compile('<p><%= locals.foo %></p>', {client: true});
    str = fn.toString();
    if (!process.env.running_under_istanbul) {
      eval('var preFn = ' + str);
      assert.equal(preFn({foo: 'bar'}), '<p>bar</p>');
    }
  });

  test('support client mode without locals', function () {
    var fn;
    var str;
    var preFn;
    fn = ejs.compile('<p><%= "foo" %></p>', {client: true});
    str = fn.toString();
    if (!process.env.running_under_istanbul) {
      eval('var preFn = ' + str);
      assert.equal(preFn(), '<p>foo</p>');
    }
  });

  test('not include rethrow() in client mode if compileDebug is false', function () {
    var fn = ejs.compile('<p><%= "foo" %></p>', {
      client: true,
      compileDebug: false
    });
    // There could be a `rethrow` in the function declaration
    assert((fn.toString().match(/rethrow/g) || []).length <= 1);
  });

  test('support custom escape function in client mode', function () {
    var customEscape;
    var fn;
    var str;
    customEscape = function customEscape(str) {
      return !str ? '' : str.toUpperCase();
    };
    fn = ejs.compile('HELLO <%= locals.name %>', {escape: customEscape, client: true});
    str = fn.toString();
    if (!process.env.running_under_istanbul) {
      eval('var preFn = ' + str);
      assert.equal(preFn({name: 'world'}), 'HELLO WORLD'); // eslint-disable-line no-undef
    }
  });

  test('escape filename in errors in client mode', function () {
    assert.throws(function () {
      var fn = ejs.compile('<% throw new Error("whoops"); %>', {client: true, filename: '<script>'});
      fn();
    }, /Error: &lt;script&gt;/);
  });
});

/* Old API -- remove when this shim goes away */
suite('ejs.render(str, dataAndOpts)', function () {
  test('render the template with data/opts passed together', function () {
    assert.equal(ejs.render('<p><?= locals.foo ?></p>', {foo: 'yay', delimiter: '?'}),
      '<p>yay</p>');
  });

  test('disallow unsafe opts passed along in data', function () {
    assert.equal(ejs.render('<p><?= locals.foo ?></p>',
      // localsName should not get reset because it's blacklisted
      {_with: false, foo: 'yay', delimiter: '?', localsName: '_'}),
    '<p>yay</p>');
  });
});

suite('ejs.render(str, data, opts)', function () {
  test('render the template', function () {
    assert.equal(ejs.render('<p>yay</p>'), '<p>yay</p>');
  });

  test('empty input works', function () {
    assert.equal(ejs.render(''), '');
  });

  test('undefined renders nothing escaped', function () {
    assert.equal(ejs.render('<%= undefined %>'), '');
  });

  test('undefined renders nothing raw', function () {
    assert.equal(ejs.render('<%- undefined %>'), '');
  });

  test('null renders nothing escaped', function () {
    assert.equal(ejs.render('<%= null %>'), '');
  });

  test('null renders nothing raw', function () {
    assert.equal(ejs.render('<%- null %>'), '');
  });

  test('zero-value data item renders something escaped', function () {
    assert.equal(ejs.render('<%= 0 %>'), '0');
  });

  test('zero-value data object renders something raw', function () {
    assert.equal(ejs.render('<%- 0 %>'), '0');
  });

  test('accept locals', function () {
    assert.equal(ejs.render('<p><%= locals.name %></p>', {name: 'geddy'}),
      '<p>geddy</p>');
  });

  test('accept locals without using with() {}', function () {
    assert.equal(ejs.render('<p><%= locals.name %></p>', {name: 'geddy'},
      {_with: false}),
    '<p>geddy</p>');
    assert.throws(function() {
      ejs.render('<p><%= name %></p>', {name: 'geddy'},
        {_with: false});
    }, /name is not defined/);
  });

  test('accept custom name for locals', function () {
    ejs.localsName = 'it';
    assert.equal(ejs.render('<p><%= it.name %></p>', {name: 'geddy'},
      {_with: false}),
    '<p>geddy</p>');
    assert.throws(function() {
      ejs.render('<p><%= name %></p>', {name: 'geddy'},
        {_with: false});
    }, /name is not defined/);
    ejs.localsName = 'locals';
  });

  test('support caching', function () {
    var result = ejs.render('<p><%= locals.name %></p>', {name: 'geddy'}, {cache: true, filename: 'test'});
    assert.equal(result, '<p>geddy</p>');

    var func = ejs.cache.get('test');
    assert.equal(func({name: 'geddy'}), '<p>geddy</p>');
  });
});

suite('<%', function () {
  test('without semicolons', function () {
    assert.equal(ejs.render(fixture('no.semicolons.ejs')),
      fixture('no.semicolons.html'));
  });
});

suite('<%=', function () {
  test('should not throw an error with a // comment on the final line', function () {
    assert.equal(ejs.render('<%=\n// a comment\nlocals.name\n// another comment %>', {name: '&nbsp;<script>'}),
      '&amp;nbsp;&lt;script&gt;');
  });

  test('escape &amp;<script>', function () {
    assert.equal(ejs.render('<%= locals.name %>', {name: '&nbsp;<script>'}),
      '&amp;nbsp;&lt;script&gt;');
  });

  test('should escape \'', function () {
    assert.equal(ejs.render('<%= locals.name %>', {name: 'The Jones\'s'}),
      'The Jones&#39;s');
  });

  test('should escape &foo_bar;', function () {
    assert.equal(ejs.render('<%= locals.name %>', {name: '&foo_bar;'}),
      '&amp;foo_bar;');
  });

  test('should accept custom function', function() {

    var customEscape = function customEscape(str) {
      return !str ? '' : str.toUpperCase();
    };

    assert.equal(
      ejs.render('<%= locals.name %>', {name: 'The Jones\'s'}, {escape: customEscape}),
      'THE JONES\'S'
    );
  });
});

suite('<%-', function () {
  test('should not throw an error with a // comment on the final line', function () {
    assert.equal(ejs.render('<%-\n// a comment\nlocals.name\n// another comment %>', {name: '&nbsp;<script>'}),
      '&nbsp;<script>');
  });

  test('not escape', function () {
    assert.equal(ejs.render('<%- locals.name %>', {name: '<script>'}),
      '<script>');
  });

  test('terminate gracefully if no close tag is found', function () {
    try {
      ejs.compile('<h1>oops</h1><%- name ->');
      throw new Error('Expected parse failure');
    }
    catch (err) {
      assert.ok(err.message.indexOf('Could not find matching close tag for') > -1);
    }
  });
});

suite('%>', function () {
  test('produce newlines', function () {
    assert.equal(ejs.render(fixture('newlines.ejs'), {users: users}),
      fixture('newlines.html'));
  });
  test('works with `-%>` interspersed', function () {
    assert.equal(ejs.render(fixture('newlines.mixed.ejs'), {users: users}),
      fixture('newlines.mixed.html'));
  });
  test('consecutive tags work', function () {
    assert.equal(ejs.render(fixture('consecutive-tags.ejs')),
      fixture('consecutive-tags.html'));
  });
});

suite('-%>', function () {
  test('not produce newlines', function () {
    assert.equal(ejs.render(fixture('no.newlines.ejs'), {users: users}),
      fixture('no.newlines.html'));
  });
  test('stack traces work', function () {
    try {
      ejs.render(fixture('no.newlines.error.ejs'));
    }
    catch (e) {
      if (e.message.indexOf('>> 4| <%= qdata %>') > -1) {
        return;
      }
      throw e;
    }
    throw new Error('Expected ReferenceError');
  });

  test('works with unix style', function () {
    var content = '<ul><% -%>\n'
    + '<% locals.users.forEach(function(user){ -%>\n'
    + '<li><%= user.name -%></li>\n'
    + '<% }) -%>\n'
    + '</ul><% -%>\n';

    var expectedResult = '<ul><li>geddy</li>\n<li>neil</li>\n<li>alex</li>\n</ul>';
    var fn;
    fn = ejs.compile(content);
    assert.equal(fn({users: users}),
      expectedResult);
  });

  test('works with windows style', function () {
    var content = '<ul><% -%>\r\n'
    + '<% locals.users.forEach(function(user){ -%>\r\n'
    + '<li><%= user.name -%></li>\r\n'
    + '<% }) -%>\r\n'
    + '</ul><% -%>\r\n';

    var expectedResult = '<ul><li>geddy</li>\r\n<li>neil</li>\r\n<li>alex</li>\r\n</ul>';
    var fn;
    fn = ejs.compile(content);
    assert.equal(fn({users: users}),
      expectedResult);
  });
});

suite('<%%', function () {
  test('produce literals', function () {
    assert.equal(ejs.render('<%%- "foo" %>'),
      '<%- "foo" %>');
  });
  test('work without an end tag', function () {
    assert.equal(ejs.render('<%%'), '<%');
    assert.equal(ejs.render(fixture('literal.ejs'), {}, {delimiter: ' '}),
      fixture('literal.html'));
  });
});

suite('%%>', function () {
  test('produce literal', function () {
    assert.equal(ejs.render('%%>'),
      '%>');
    assert.equal(ejs.render('  >', {}, {delimiter: ' '}),
      ' >');
  });
});

suite('<%_ and _%>', function () {
  test('slurps spaces and tabs', function () {
    assert.equal(ejs.render(fixture('space-and-tab-slurp.ejs'), {users: users}),
      fixture('space-and-tab-slurp.html'));
  });
});

suite('single quotes', function () {
  test('not mess up the constructed function', function () {
    assert.equal(ejs.render(fixture('single-quote.ejs')),
      fixture('single-quote.html'));
  });
});

suite('double quotes', function () {
  test('not mess up the constructed function', function () {
    assert.equal(ejs.render(fixture('double-quote.ejs')),
      fixture('double-quote.html'));
  });
});

suite('backslashes', function () {
  test('escape', function () {
    assert.equal(ejs.render(fixture('backslash.ejs')),
      fixture('backslash.html'));
  });
});

suite('messed up whitespace', function () {
  test('work', function () {
    assert.equal(ejs.render(fixture('messed.ejs'), {users: users}),
      fixture('messed.html'));
  });
});

suite('exceptions', function () {
  test('produce useful stack traces', function () {
    try {
      ejs.render(fixture('error.ejs'), {}, {filename: 'error.ejs'});
    }
    catch (err) {
      assert.equal(err.path, 'error.ejs');
      var errstck = err.stack.split('\n').slice(0, 8).join('\n');
      errstck = errstck.replace(/\n/g,lf);
      errstck = errstck.replace(/\r\r\n/g,lf);
      assert.equal(errstck, fixture('error.out'));
      return;
    }
    throw new Error('no error reported when there should be');
  });

  test('not include fancy stack info if compileDebug is false', function () {
    try {
      ejs.render(fixture('error.ejs'), {}, {
        filename: 'error.ejs',
        compileDebug: false
      });
    }
    catch (err) {
      assert.ok(!err.path);
      var errstck = err.stack.split('\n').slice(0, 8).join('\n');
      errstck = errstck.replace(/\n/g,lf);
      errstck = errstck.replace(/\r\r\n/g,lf);
      assert.notEqual(errstck, fixture('error.out'));
      return;
    }
    throw new Error('no error reported when there should be');
  });

  var unhook = null;
  test('log JS source when debug is set', function (done) {
    var out = '';
    var needToExit = false;
    unhook = hook_stdio(process.stdout, function (str) {
      out += str;
      if (needToExit) {
        return;
      }
      if (out.indexOf('__output')) {
        needToExit = true;
        unhook();
        unhook = null;
        return done();
      }
    });
    ejs.render(fixture('hello-world.ejs'), {}, {debug: true});
  });

  test('escape filename in errors', function () {
    assert.throws(function () {
      ejs.render('<% throw new Error("whoops"); %>', {}, {filename: '<script>'});
    }, /Error: &lt;script&gt;/);
  });

  test('filename in errors uses custom escape', function () {
    assert.throws(function () {
      ejs.render('<% throw new Error("whoops"); %>', {}, {
        filename: '<script>',
        escape: function () { return 'zooby'; }
      });
    }, /Error: zooby/);
  });

  teardown(function() {
    if (!unhook) {
      return;
    }
    unhook();
    unhook = null;
  });
});

suite('rmWhitespace', function () {
  test('works', function () {
    var outp = ejs.render(fixture('rmWhitespace.ejs'), {}, {rmWhitespace: true});
    assert.equal(outp.replace(/\n/g,lf), fixture('rmWhitespace.html'));
  });
});

suite('comments', function () {
  test('fully render with comments removed', function () {
    assert.equal(ejs.render(fixture('comments.ejs')),
      fixture('comments.html'));
  });
});


suite('meta information', function () {
  test('has a version', function () {
    assert.strictEqual(ejs.VERSION, require('../package.json').version);
  });

  test('had a name', function () {
    assert.strictEqual(ejs.name, 'ejs');
  });
});

suite('identifier validation', function () {
  test('invalid outputFunctionName', function() {
    assert.throws(function() {
      ejs.compile('<p>yay</p>', {outputFunctionName: 'x;console.log(1);x'});
    }, /outputFunctionName is not a valid JS identifier/);
  });

  test('invalid localsName', function() {
    var locals = Object.create(null);
    void(locals); // For linting;
    assert.throws(function() {
      ejs.compile('<p>yay</p>', {
        localsName: 'function(){console.log(1);return locals;}()'});
    }, /localsName is not a valid JS identifier/);
  });

  test('invalid destructuredLocals', function() {
    var locals = {};
    void(locals); // For linting;
    assert.throws(function() {
      ejs.compile('<p>yay</p>', {
        destructuredLocals: [
          'console.log(1); //'
        ]});
    }, /destructuredLocals\[0\] is not a valid JS identifier/);
  });
});
