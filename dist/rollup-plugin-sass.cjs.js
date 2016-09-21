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
    var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    var filter = rollupPluginutils.createFilter(options.include || ['**/*.sass', '**/*.scss'], options.exclude || 'node_modules/**');
    var insertFnName = '___$insertStyle';

    return {
        intro: function intro() {
            if (options.insert) {
                return insertStyle.toString().replace(/insertStyle/, insertFnName);
            }
        },
        transform: function transform(code, id) {
            var _this = this;

            return _asyncToGenerator(_regeneratorRuntime.mark(function _callee() {
                var paths, sassConfig, css;
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
                                sassConfig = _Object$assign({ data: code }, options.options);


                                sassConfig.includePaths = sassConfig.includePaths ? sassConfig.includePaths.concat(paths) : paths;

                                _context.prev = 5;
                                css = nodeSass.renderSync(sassConfig).css.toString();

                                if (!util.isString(options.output)) {
                                    _context.next = 13;
                                    break;
                                }

                                _context.next = 10;
                                return fs.writeFile(options.output, css);

                            case 10:
                                return _context.abrupt('return', _context.sent);

                            case 13:
                                if (!util.isFunction(options.output)) {
                                    _context.next = 17;
                                    break;
                                }

                                _context.next = 16;
                                return options.output(css, id);

                            case 16:
                                css = _context.sent;

                            case 17:

                                css = _JSON$stringify(css);

                                if (options.insert) {
                                    css = insertFnName + '(' + css + ')';
                                }

                                return _context.abrupt('return', {
                                    code: 'export default ' + css + ';',
                                    map: { mappings: '' }
                                });

                            case 20:
                                _context.next = 25;
                                break;

                            case 22:
                                _context.prev = 22;
                                _context.t0 = _context['catch'](5);
                                throw _context.t0;

                            case 25:
                            case 'end':
                                return _context.stop();
                        }
                    }
                }, _callee, _this, [[5, 22]]);
            }))();
        }
    };
};

module.exports = plugin;