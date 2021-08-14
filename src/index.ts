import {promisify} from 'util';
import resolve from 'resolve';
import sass from 'sass';
import {dirname} from 'path';
import * as fs from 'fs';
import {createFilter} from '@rollup/pluginutils';
import {insertStyle} from './style';

export interface RollupPluginSassOptions {
  exclude?: string | string[],
  include?: string | string[],
  insert?: any,
  options?: any
  output?: any,
  runtime?: any,
}

const MATCH_SASS_FILENAME_RE = /\.sass$/,
  MATCH_NODE_MODULE_RE = /^~([a-z0-9]|@).+/i,
  isString = x => typeof x === 'string',
  isFunction = x => typeof x === 'function',

  insertFnName = '___$insertStyle',

  getImporterList = sassOptions => {
    const importer1 = (url, importer, done) => {
      console.log(`loading ${url}`);

      if (!MATCH_NODE_MODULE_RE.test(url)) {
        return null;
      }

      const moduleUrl = url.slice(1);
      const resolveOptions = {
        basedir: dirname(importer),
        extensions: ['.scss', '.sass'],
      };

      // @todo use a promise here instead of try/catch (allows whole process to be async)
      try {
        console.log(`${url} loaded`)
        done({
          file: resolve.sync(moduleUrl, resolveOptions),
        });
      } catch (err) {
        console.log('default importer recovered from an error: ', err);
        if (sassOptions.importer && sassOptions.importer.length) {
          return null;
        }
        done({
          file: url,
        });
      }
    }
    return [importer1].concat(sassOptions.importer || [])
  },

  processRenderResponse = (rollupOptions, file, state, inCss) => {
    if (!inCss) return;

    const {processor} = rollupOptions;

    return Promise.resolve()
      .then(() => !isFunction(processor) ? '' : processor(inCss, file))
      .then(result => {
        if (typeof result === 'object') {
          if (typeof result.css !== 'string') {
            throw new Error('You need to return the styles using the `css` property. ' +
              'See https://github.com/differui/rollup-plugin-sass#processor');
          }
          const outCss = result.css;
          const restExports = Object.keys(result).reduce((agg, name) =>
              name === 'css' ? agg : agg + `export const ${name} = ${JSON.stringify(result[name])};\n`
            , ''
          );
          return [outCss, restExports];
        } else if (typeof result === 'string') {
          return [result];
        }
        return [];
      })
      .then(([resolvedCss, restExports]) => {
        console.log(resolvedCss, restExports);
        // @todo Break state changes into separate method
        const {styleMaps, styles} = state;
        if (styleMaps[file]) {
          styleMaps[file].content = resolvedCss;
        } else {
          const mapEntry = {
            id: file,
            content: resolvedCss,
          };
          styleMaps[file] = mapEntry;
          styles.push(mapEntry);
        }

        let defaultExport = `""`;
        if (rollupOptions.insert) {
          defaultExport = `${insertFnName}(${JSON.stringify(resolvedCss)});`;
        } else if (!rollupOptions.output) {
          defaultExport = JSON.stringify(resolvedCss);
        }

        return `export default ${defaultExport};\n${restExports || ''}`;
      })
      .catch(console.error);
  };

export default function plugin(options = {} as RollupPluginSassOptions) {
  const {
      include = ['**/*.sass', '**/*.scss'],
      exclude = 'node_modules/**',
    } = options,
    filter = createFilter(include, exclude),
    styles = [],
    styleMaps = {},
    sassRuntime = options.runtime || sass;

  options.output = options.output || false;
  options.insert = options.insert || false;

  const inSassOptions = options.options || {};

  return {
    name: 'sass',

    intro() {
      if (options.insert) {
        return insertStyle.toString().replace(/insertStyle/, insertFnName);
      }
    },

    transform(code, file): Promise<any> {
      if (!filter(file)) {
        return Promise.resolve();
      }

      const paths = [dirname(file), process.cwd()],

        resolvedOptions = Object.assign({}, inSassOptions, {
          file: file,
          data: inSassOptions.data && `${inSassOptions.data}${code}`,
          indentedSyntax: MATCH_SASS_FILENAME_RE.test(file),
          includePaths: (inSassOptions.includePaths || []).concat(paths),
          importer: getImporterList(inSassOptions),
        });

      return promisify(sassRuntime.render.bind(sassRuntime))(resolvedOptions)
        .then(res => processRenderResponse(options, file, {styleMaps, styles}, res.css.toString().trim())
          .then(result => [res, result])
        )
        // .then((...args) => (console.log('processed result: ', ...args), args))
        .then(([res, codeResult]) => ({
          code: codeResult,
          map: {mappings: res.map ? res.map.toString() : ''},
        }), console.error);
    },

    async generateBundle(generateOptions, bundle, isWrite) {
      if (!isWrite || (!options.insert && (!styles.length || options.output === false))) {
        return;
      }

      const css = styles.map(style => style.content).join('');

      if (isString(options.output)) {
        return fs.promises.mkdir(dirname(options.output), {recursive: true})
          .then(() => fs.promises.writeFile(options.output, css));
      } else if (isFunction(options.output)) {
        return options.output(css, styles);
      } else if (!options.insert && generateOptions.file && options.output === true) {
        let dest = generateOptions.file;

        if (dest.endsWith('.js') || dest.endsWith('.ts')) {
          dest = dest.slice(0, -3);
        }
        dest = `${dest}.css`;
        return fs.promises.mkdir(dirname(dest), {recursive: true})
          .then(() => fs.promises.writeFile(dest, css));
      }
    },
  };
}
