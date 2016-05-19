import _regeneratorRuntime from 'babel-runtime/regenerator';
import _JSON$stringify from 'babel-runtime/core-js/json/stringify';
import _Object$assign from 'babel-runtime/core-js/object/assign';
import _asyncToGenerator from 'babel-runtime/helpers/asyncToGenerator';
import { dirname } from 'path';
import 'fs';
import { renderSync } from 'node-sass';
import { isString, isFunction } from 'util';
import { createFilter } from 'rollup-pluginutils';

function plugin() {
    var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    var filter = createFilter(options.include || ['**/*.sass', '**/*.scss'], options.exclude || 'node_modules/**');

    return {
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
                                paths = [dirname(id), process.cwd()];
                                sassConfig = _Object$assign({ data: code }, options.options);


                                sassConfig.includePaths = sassConfig.includePaths ? sassConfig.includePaths.concat(paths) : paths;

                                _context.prev = 5;
                                css = renderSync(sassConfig).css.toString();

                                if (!isFunction(options.output)) {
                                    _context.next = 11;
                                    break;
                                }

                                _context.next = 10;
                                return options.output(css, id);

                            case 10:
                                css = _context.sent;

                            case 11:
                                if (!isString(options.output)) {
                                    _context.next = 15;
                                    break;
                                }

                                _context.next = 14;
                                return fs.writeFile(options.output, css);

                            case 14:
                                return _context.abrupt('return', _context.sent);

                            case 15:
                                return _context.abrupt('return', {
                                    code: 'export default ' + _JSON$stringify(css.toString()) + ';',
                                    map: { mappings: '' }
                                });

                            case 18:
                                _context.prev = 18;
                                _context.t0 = _context['catch'](5);
                                throw _context.t0;

                            case 21:
                            case 'end':
                                return _context.stop();
                        }
                    }
                }, _callee, _this, [[5, 18]]);
            }))();
        }
    };
};

export default plugin;