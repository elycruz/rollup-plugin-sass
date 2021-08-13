'use strict';

var _sliceInstanceProperty = require('@babel/runtime-corejs3/core-js-stable/instance/slice');
var _concatInstanceProperty = require('@babel/runtime-corejs3/core-js-stable/instance/concat');
var _Promise = require('@babel/runtime-corejs3/core-js-stable/promise');
var _reduceInstanceProperty = require('@babel/runtime-corejs3/core-js-stable/instance/reduce');
var _Object$keys = require('@babel/runtime-corejs3/core-js-stable/object/keys');
var _JSON$stringify = require('@babel/runtime-corejs3/core-js-stable/json/stringify');
var _Object$assign = require('@babel/runtime-corejs3/core-js-stable/object/assign');
var _bindInstanceProperty = require('@babel/runtime-corejs3/core-js-stable/instance/bind');
var _trimInstanceProperty = require('@babel/runtime-corejs3/core-js-stable/instance/trim');
var _mapInstanceProperty = require('@babel/runtime-corejs3/core-js-stable/instance/map');
var _endsWithInstanceProperty = require('@babel/runtime-corejs3/core-js-stable/instance/ends-with');
var util = require('util');
var resolve = require('resolve');
var sass = require('sass');
var path = require('path');
var fs = require('fs');
var pluginutils = require('@rollup/pluginutils');
var style = require('./style.js');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var _sliceInstanceProperty__default = /*#__PURE__*/_interopDefaultLegacy(_sliceInstanceProperty);
var _concatInstanceProperty__default = /*#__PURE__*/_interopDefaultLegacy(_concatInstanceProperty);
var _Promise__default = /*#__PURE__*/_interopDefaultLegacy(_Promise);
var _reduceInstanceProperty__default = /*#__PURE__*/_interopDefaultLegacy(_reduceInstanceProperty);
var _Object$keys__default = /*#__PURE__*/_interopDefaultLegacy(_Object$keys);
var _JSON$stringify__default = /*#__PURE__*/_interopDefaultLegacy(_JSON$stringify);
var _Object$assign__default = /*#__PURE__*/_interopDefaultLegacy(_Object$assign);
var _bindInstanceProperty__default = /*#__PURE__*/_interopDefaultLegacy(_bindInstanceProperty);
var _trimInstanceProperty__default = /*#__PURE__*/_interopDefaultLegacy(_trimInstanceProperty);
var _mapInstanceProperty__default = /*#__PURE__*/_interopDefaultLegacy(_mapInstanceProperty);
var _endsWithInstanceProperty__default = /*#__PURE__*/_interopDefaultLegacy(_endsWithInstanceProperty);
var resolve__default = /*#__PURE__*/_interopDefaultLegacy(resolve);
var sass__default = /*#__PURE__*/_interopDefaultLegacy(sass);
var fs__default = /*#__PURE__*/_interopDefaultLegacy(fs);

const MATCH_SASS_FILENAME_RE = /\.sass$/,
      MATCH_NODE_MODULE_RE = /^~([a-z0-9]|@).+/i,
      isString = x => typeof x === 'string',
      isFunction = x => typeof x === 'function',
      insertFnName = '___$insertStyle',
      getImporterList = sassOptions => {
  var _context;

  const importer1 = (url, importer, done) => {
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
      if (sassOptions.importer && sassOptions.importer.length) {
        return null;
      }

      done({
        file: url
      });
    }
  };

  return _concatInstanceProperty__default['default'](_context = [importer1]).call(_context, sassOptions.importer || []);
},
      processRenderResponse = (sassOptions, paths, file, state, inCss) => {
  if (!inCss) return;
  const {
    processor
  } = sassOptions;
  return _Promise__default['default'].resolve().then(() => !isFunction(processor) ? '' : processor(inCss, file)).then(result => {
    if (typeof result === 'object') {
      var _context2;

      if (typeof result.css !== 'string') {
        throw new Error('You need to return the styles using the `css` property. ' + 'See https://github.com/differui/rollup-plugin-sass#processor');
      }

      const outCss = result.css;

      const restExports = _reduceInstanceProperty__default['default'](_context2 = _Object$keys__default['default'](result)).call(_context2, (agg, name) => {
        if (name === 'css') return agg;
        return agg + `export const ${name} = ${_JSON$stringify__default['default'](result[name])};\n`;
      }, '');

      return [outCss, restExports];
    } else if (typeof result === 'string') {
      return [result];
    }
  }).then(([resolvedCss, restExports]) => {
    // @todo Break state changes into separate method
    const {
      styleMaps,
      styles
    } = state;

    if (styleMaps[file]) {
      styleMaps[file].content = resolvedCss;
    } else {
      const mapEntry = {
        id: file,
        content: resolvedCss
      };
      styleMaps[file] = mapEntry;
      styles.push(mapEntry);
    }

    let defaultExport = `"";`;

    if (sassOptions.insert === true) {
      defaultExport = `${insertFnName}(${_JSON$stringify__default['default'](resolvedCss)});`;
    } else if (sassOptions.output === false) {
      defaultExport = _JSON$stringify__default['default'](resolvedCss);
    }

    return `export default ${defaultExport};\n${restExports || ''}`;
  });
};

function plugin(options = {}) {
  const {
    include = ['**/*.sass', '**/*.scss'],
    exclude = 'node_modules/**'
  } = options,
        filter = pluginutils.createFilter(include, exclude),
        styles = [],
        styleMaps = {},
        sassRuntime = options.runtime || sass__default['default'];
  options.output = options.output || false;
  options.insert = options.insert || false;
  const incomingSassOptions = options.options || {};
  return {
    name: 'sass',

    intro() {
      if (options.insert) {
        return style.insertStyle.toString().replace(/insertStyle/, insertFnName);
      }
    },

    transform(code, file) {
      var _context3, _context4;

      if (!filter(file)) {
        return _Promise__default['default'].resolve();
      }

      const paths = [path.dirname(file), process.cwd()],
            resolvedOptions = _Object$assign__default['default']({}, incomingSassOptions, {
        file: file,
        data: incomingSassOptions.data && `${incomingSassOptions.data}${code}`,
        indentedSyntax: MATCH_SASS_FILENAME_RE.test(file),
        includePaths: incomingSassOptions.includePaths ? _concatInstanceProperty__default['default'](_context3 = incomingSassOptions.includePaths).call(_context3, paths) : paths,
        importer: getImporterList(incomingSassOptions)
      });

      return util.promisify(_bindInstanceProperty__default['default'](_context4 = sassRuntime.render).call(_context4, sassRuntime))(resolvedOptions).then(res => {
        var _context5;

        return [res, processRenderResponse(options, paths, file, {
          styleMaps,
          styles
        }, _trimInstanceProperty__default['default'](_context5 = res.css.toString()).call(_context5))];
      }).then(([res, codeResult]) => ({
        code: codeResult,
        map: {
          mappings: _mapInstanceProperty__default['default'](res) ? _mapInstanceProperty__default['default'](res).toString() : ''
        }
      })).catch(console.error);
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
