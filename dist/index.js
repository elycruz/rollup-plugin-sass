'use strict';

var _bindInstanceProperty = require('@babel/runtime-corejs3/core-js-stable/instance/bind');
var _Object$assign = require('@babel/runtime-corejs3/core-js-stable/object/assign');
var _concatInstanceProperty = require('@babel/runtime-corejs3/core-js-stable/instance/concat');
var _sliceInstanceProperty = require('@babel/runtime-corejs3/core-js-stable/instance/slice');
var _trimInstanceProperty = require('@babel/runtime-corejs3/core-js-stable/instance/trim');
var _mapInstanceProperty = require('@babel/runtime-corejs3/core-js-stable/instance/map');
var _Object$keys = require('@babel/runtime-corejs3/core-js-stable/object/keys');
var _JSON$stringify = require('@babel/runtime-corejs3/core-js-stable/json/stringify');
var _endsWithInstanceProperty = require('@babel/runtime-corejs3/core-js-stable/instance/ends-with');
var pify = require('pify');
var resolve = require('resolve');
var sass = require('sass');
var path = require('path');
var fs = require('fs');
var pluginutils = require('@rollup/pluginutils');
var style = require('./style.js');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var _bindInstanceProperty__default = /*#__PURE__*/_interopDefaultLegacy(_bindInstanceProperty);
var _Object$assign__default = /*#__PURE__*/_interopDefaultLegacy(_Object$assign);
var _concatInstanceProperty__default = /*#__PURE__*/_interopDefaultLegacy(_concatInstanceProperty);
var _sliceInstanceProperty__default = /*#__PURE__*/_interopDefaultLegacy(_sliceInstanceProperty);
var _trimInstanceProperty__default = /*#__PURE__*/_interopDefaultLegacy(_trimInstanceProperty);
var _mapInstanceProperty__default = /*#__PURE__*/_interopDefaultLegacy(_mapInstanceProperty);
var _Object$keys__default = /*#__PURE__*/_interopDefaultLegacy(_Object$keys);
var _JSON$stringify__default = /*#__PURE__*/_interopDefaultLegacy(_JSON$stringify);
var _endsWithInstanceProperty__default = /*#__PURE__*/_interopDefaultLegacy(_endsWithInstanceProperty);
var pify__default = /*#__PURE__*/_interopDefaultLegacy(pify);
var resolve__default = /*#__PURE__*/_interopDefaultLegacy(resolve);
var sass__default = /*#__PURE__*/_interopDefaultLegacy(sass);
var fs__default = /*#__PURE__*/_interopDefaultLegacy(fs);

const MATCH_SASS_FILENAME_RE = /\.sass$/;
const MATCH_NODE_MODULE_RE = /^~([a-z0-9]|@).+/i;

const isString = x => typeof x === 'string';

const isFunction = x => typeof x === 'function';

function plugin(options = {}) {
  const {
    include = ['**/*.sass', '**/*.scss'],
    exclude = 'node_modules/**'
  } = options;
  const filter = pluginutils.createFilter(include, exclude);
  const insertFnName = '___$insertStyle';
  const styles = [];
  const styleMaps = {};
  options.output = options.output || false;
  options.insert = options.insert || false;
  const sassRuntime = options.runtime || sass__default['default'];
  return {
    name: 'sass',

    intro() {
      if (options.insert) {
        return style.insertStyle.toString().replace(/insertStyle/, insertFnName);
      }
    },

    async transform(code, id) {
      if (!filter(id)) {
        return;
      }

      try {
        var _context, _context2, _context3, _context4;

        const paths = [path.dirname(id), process.cwd()];
        const customizedSassOptions = options.options || {};
        const res = await pify__default['default'](_bindInstanceProperty__default['default'](_context = sassRuntime.render).call(_context, sassRuntime))(_Object$assign__default['default']({}, customizedSassOptions, {
          file: id,
          data: customizedSassOptions.data && `${customizedSassOptions.data}${code}`,
          indentedSyntax: MATCH_SASS_FILENAME_RE.test(id),
          includePaths: customizedSassOptions.includePaths ? _concatInstanceProperty__default['default'](_context2 = customizedSassOptions.includePaths).call(_context2, paths) : paths,
          importer: _concatInstanceProperty__default['default'](_context3 = [(url, importer, done) => {
            if (!MATCH_NODE_MODULE_RE.test(url)) {
              return null;
            }

            const moduleUrl = _sliceInstanceProperty__default['default'](url).call(url, 1);

            const resolveOptions = {
              basedir: path.dirname(importer),
              extensions: ['.scss', '.sass']
            };

            try {
              done({
                file: resolve__default['default'].sync(moduleUrl, resolveOptions)
              });
            } catch (err) {
              if (customizedSassOptions.importer && customizedSassOptions.importer.length) {
                return null;
              }

              done({
                file: url
              });
            }
          }]).call(_context3, customizedSassOptions.importer || [])
        }));

        let css = _trimInstanceProperty__default['default'](_context4 = res.css.toString()).call(_context4);

        let defaultExport = '';
        let restExports;

        if (css) {
          if (isFunction(options.processor)) {
            const processResult = await options.processor(css, id);

            if (typeof processResult === 'object') {
              var _context5;

              if (typeof processResult.css !== 'string') {
                throw new Error('You need to return the styles using the `css` property. See https://github.com/differui/rollup-plugin-sass#processor');
              }

              css = processResult.css;
              delete processResult.css;
              restExports = _mapInstanceProperty__default['default'](_context5 = _Object$keys__default['default'](processResult)).call(_context5, name => `export const ${name} = ${_JSON$stringify__default['default'](processResult[name])};`);
            } else if (typeof processResult === 'string') {
              css = processResult;
            }
          }

          if (styleMaps[id]) {
            styleMaps[id].content = css;
          } else {
            styles.push(styleMaps[id] = {
              id: id,
              content: css
            });
          }

          if (options.insert === true) {
            defaultExport = `${insertFnName}(${_JSON$stringify__default['default'](css)});`;
          } else if (options.output === false) {
            defaultExport = _JSON$stringify__default['default'](css);
          } else {
            defaultExport = `"";`;
          }
        }

        return {
          code: [`export default ${defaultExport};`, ...(restExports || [])].join('\n'),
          map: {
            mappings: _mapInstanceProperty__default['default'](res) ? _mapInstanceProperty__default['default'](res).toString() : ''
          }
        };
      } catch (error) {
        throw error;
      }
    },

    async generateBundle(generateOptions, bundle, isWrite) {
      if (!options.insert && (!styles.length || options.output === false)) {
        return;
      }

      if (!isWrite) {
        return;
      }

      const css = _mapInstanceProperty__default['default'](styles).call(styles, style => style.content).join('');

      if (isString(options.output)) {
        return fs__default['default'].promises.mkdir(path.dirname(options.output), {
          recursive: true
        }).then(() => fs__default['default'].promises.writeFile(options.output, css));
      } else if (isFunction(options.output)) {
        return options.output(css, styles);
      } else if (!options.insert && generateOptions.file && options.output === true) {
        let dest = generateOptions.file;

        if (_endsWithInstanceProperty__default['default'](dest).call(dest, '.js') || _endsWithInstanceProperty__default['default'](dest).call(dest, '.ts')) {
          dest = _sliceInstanceProperty__default['default'](dest).call(dest, 0, -3);
        }

        dest = `${dest}.css`;
        return fs__default['default'].promises.mkdir(path.dirname(dest), {
          recursive: true
        }).then(() => fs__default['default'].promises.writeFile(dest, css));
      }
    }

  };
}

module.exports = plugin;
