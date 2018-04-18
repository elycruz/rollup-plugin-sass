'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var _regeneratorRuntime = _interopDefault(require('babel-runtime/regenerator'));
var _JSON$stringify = _interopDefault(require('babel-runtime/core-js/json/stringify'));
var _Object$assign = _interopDefault(require('babel-runtime/core-js/object/assign'));
var _asyncToGenerator = _interopDefault(require('babel-runtime/helpers/asyncToGenerator'));
var path = require('path');
var fs = require('fs');
var nodeSass = require('node-sass');
var util = require('util');
var rollupPluginutils = require('rollup-pluginutils');
var fsExtra = require('fs-extra');

/*
 * Create a style tag and append to head tag
 *
 * @param {String} css style
 * @return {String} css style
 */
function insertStyle(css) {
  if (!css) {
    return;
  }
  if (typeof window === 'undefined') {
    return;
  }

  var style = document.createElement('style');

  style.setAttribute('type', 'text/css');
  style.innerHTML = css;
  document.head.appendChild(style);

  return css;
}

function plugin() {
  var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

  var filter = rollupPluginutils.createFilter(options.include || ['**/*.sass', '**/*.scss'], options.exclude || 'node_modules/**');
  var insertFnName = '___$insertStyle';
  var styles = [];
  var styleMaps = {};
  var prependSass = '';

  options.output = options.output || false;
  options.insert = options.insert || false;
  options.processor = options.processor || null;
  options.options = options.options || null;

  if (options.options && options.options.data) {
    prependSass = options.options.data;
    delete options.options.data;
  }

  return {
    name: 'sass',

    intro: function intro() {
      if (options.insert) {
        return insertStyle.toString().replace(/insertStyle/, insertFnName);
      }
    },
    transform: function () {
      var _ref = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee(code, id) {
        var paths, baseConfig, sassConfig, result, _code, css, map;

        return _regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                if (filter(id)) {
                  _context.next = 2;
                  break;
                }

                return _context.abrupt('return', null);

              case 2:
                paths = [path.dirname(id), process.cwd()];
                baseConfig = prependSass ? { data: '' + prependSass + code } : { file: id };
                sassConfig = _Object$assign(baseConfig, options.options);


                sassConfig.includePaths = sassConfig.includePaths ? sassConfig.includePaths.concat(paths) : paths;
                _context.prev = 6;
                result = nodeSass.renderSync(sassConfig);
                _code = '';
                css = result.css, map = result.map;


                console.log(sassConfig);
                console.log(result);

                css = css.toString();
                map = map && map.toString();

                if (!css.trim()) {
                  _context.next = 22;
                  break;
                }

                if (!util.isFunction(options.processor)) {
                  _context.next = 19;
                  break;
                }

                _context.next = 18;
                return options.processor(css, id);

              case 18:
                css = _context.sent;

              case 19:
                if (styleMaps[id]) {
                  styleMaps[id].content = css;
                } else {
                  styles.push(styleMaps[id] = {
                    id: id,
                    content: css
                  });
                }
                css = _JSON$stringify(css);
                if (options.insert === true) {
                  _code = insertFnName + '(' + css + ');';
                } else if (options.output === false) {
                  _code = css;
                } else {
                  _code = '"";';
                }

              case 22:
                return _context.abrupt('return', {
                  code: 'export default ' + _code + ';',
                  map: { mappings: '' }
                });

              case 25:
                _context.prev = 25;
                _context.t0 = _context['catch'](6);
                throw _context.t0;

              case 28:
              case 'end':
                return _context.stop();
            }
          }
        }, _callee, this, [[6, 25]]);
      }));

      function transform(_x2, _x3) {
        return _ref.apply(this, arguments);
      }

      return transform;
    }(),
    ongenerate: function () {
      var _ref2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee2(opts) {
        var css, dest;
        return _regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                if (!(!options.insert && (!styles.length || options.output === false))) {
                  _context2.next = 2;
                  break;
                }

                return _context2.abrupt('return');

              case 2:
                css = styles.map(function (style) {
                  return style.content;
                }).join('');
                dest = opts.file;

                if (!util.isString(options.output)) {
                  _context2.next = 9;
                  break;
                }

                fsExtra.ensureFileSync(options.output, function (err) {
                  if (err) {
                    throw err;
                  }
                });
                return _context2.abrupt('return', fs.writeFileSync(options.output, css));

              case 9:
                if (!util.isFunction(options.output)) {
                  _context2.next = 13;
                  break;
                }

                return _context2.abrupt('return', options.output(css, styles));

              case 13:
                if (!(!options.insert && dest)) {
                  _context2.next = 18;
                  break;
                }

                if (dest.endsWith('.js') || dest.endsWith('.ts')) {
                  dest = dest.slice(0, -3);
                }
                dest = dest + '.css';
                fsExtra.ensureFileSync(dest, function (err) {
                  if (err) {
                    throw err;
                  }
                });
                return _context2.abrupt('return', fs.writeFileSync(dest, css));

              case 18:
              case 'end':
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function ongenerate(_x4) {
        return _ref2.apply(this, arguments);
      }

      return ongenerate;
    }()
  };
}

module.exports = plugin;
