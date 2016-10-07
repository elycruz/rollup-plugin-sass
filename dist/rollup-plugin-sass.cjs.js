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
    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    var filter = rollupPluginutils.createFilter(options.include || ['**/*.sass', '**/*.scss'], options.exclude || 'node_modules/**');
    var insertFnName = '___$insertStyle';
    var styles = [];
    var dest = '';

    options.output = options.output || false;
    options.insert = options.insert || false;
    options.processor = options.processor || null;
    options.options = options.options || null;

    return {
        name: 'sass',

        intro: function intro() {
            if (options.insert) {
                return insertStyle.toString().replace(/insertStyle/, insertFnName);
            }
        },
        options: function options(opts) {
            dest = opts.dest || opts.entry;
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

                                if (!css.trim()) {
                                    _context.next = 14;
                                    break;
                                }

                                if (!util.isFunction(options.processor)) {
                                    _context.next = 12;
                                    break;
                                }

                                _context.next = 11;
                                return options.processor(css, id);

                            case 11:
                                css = _context.sent;

                            case 12:

                                styles.push({
                                    id: id,
                                    content: css
                                });

                                if (options.insert) {
                                    css = insertFnName + '(' + css + ')';
                                }

                            case 14:
                                return _context.abrupt('return', {
                                    code: 'export default ' + (options.output === false ? _JSON$stringify(css) : '\'\'') + ';',
                                    map: { mappings: '' }
                                });

                            case 17:
                                _context.prev = 17;
                                _context.t0 = _context['catch'](5);
                                throw _context.t0;

                            case 20:
                            case 'end':
                                return _context.stop();
                        }
                    }
                }, _callee, _this, [[5, 17]]);
            }))();
        },
        ongenerate: function ongenerate(opts) {
            var _this2 = this;

            return _asyncToGenerator(_regeneratorRuntime.mark(function _callee2() {
                var css;
                return _regeneratorRuntime.wrap(function _callee2$(_context2) {
                    while (1) {
                        switch (_context2.prev = _context2.next) {
                            case 0:
                                if (!(!styles.length || options.output === false)) {
                                    _context2.next = 2;
                                    break;
                                }

                                return _context2.abrupt('return');

                            case 2:
                                css = styles.map(function (style) {
                                    return style.content;
                                }).join('');

                                if (!util.isString(options.output)) {
                                    _context2.next = 7;
                                    break;
                                }

                                return _context2.abrupt('return', fs.writeFileSync(options.output, css));

                            case 7:
                                if (!util.isFunction(options.output)) {
                                    _context2.next = 11;
                                    break;
                                }

                                return _context2.abrupt('return', options.output(css, styles));

                            case 11:
                                if (!dest) {
                                    _context2.next = 14;
                                    break;
                                }

                                if (dest.endsWith('.js')) {
                                    dest = dest.slice(0, -3);
                                }

                                return _context2.abrupt('return', fs.writeFileSync(dest + '.css', css));

                            case 14:
                            case 'end':
                                return _context2.stop();
                        }
                    }
                }, _callee2, _this2);
            }))();
        }
    };
}

module.exports = plugin;
