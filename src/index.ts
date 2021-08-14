import {promisify} from 'util';
import resolve from 'resolve';
import sass from 'sass';
import {dirname} from 'path';
import * as fs from 'fs';
import {createFilter} from '@rollup/pluginutils';
import {insertStyle} from './style';
import {RollupPluginSassOptions, RollupPluginSassOutputFn, SassOptions} from "./types";
import {error, log, peekAndLast} from "./utils";

const MATCH_SASS_FILENAME_RE = /\.sass$/,
  MATCH_NODE_MODULE_RE = /^~([a-z0-9]|@).+/i,

  insertFnName = '___$insertStyle',

  getImporterList = sassOptions => {
    const importer1 = (url, importer, done) => {
      // log(`loading ${url}`);

      if (!MATCH_NODE_MODULE_RE.test(url)) {
        return null;
      }

      const moduleUrl = url.slice(1);
      const resolveOptions = {
        basedir: dirname(importer),
        extensions: ['.scss', '.sass'],
      };

      try {
        log(`${url} loaded`)
        done({
          file: resolve.sync(moduleUrl, resolveOptions), // @todo can we make this async
        });
      } catch (err) {
        log('default importer recovered from an error: ', err);

        // If has other importers exit this one and allow one of the other
        //  ones to attempt file load.
        if (sassOptions.importer && sassOptions.importer.length > 1) {
          return null;
        }
        done({
          file: url,
        });
      }
    }
    return [importer1].concat(sassOptions.importer || [])
  },

  processRenderResponse = (rollupOptions, file, sassOptions, state, inCss) => {
    if (!inCss) return;

    const {processor} = sassOptions;

    return Promise.resolve()
      .then(() => typeof processor !== 'function' ? inCss + '' : processor(inCss, file))
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
        }
        return [result];
      })
      .then(([resolvedCss, restExports]) => {
        // @todo Break state changes into separate method
        const {styleMaps, styles} = state;
        if (styleMaps[file]) {
          styleMaps[file].content = resolvedCss;
          if (styles.indexOf(styleMaps[file] === -1)) {
            styles.push(styleMaps[file]);
          }
        } else {
          const mapEntry = {
            id: file,
            content: resolvedCss,
          };
          styleMaps[file] = mapEntry;
          styles.push(mapEntry);
        }

        const out = JSON.stringify(resolvedCss);
        let defaultExport = `""`;
        if (rollupOptions.insert) {
          defaultExport = `${insertFnName}(${out});`;
        } else if (!rollupOptions.output) {
          defaultExport = out;
        }

        return `export default ${defaultExport};\n${restExports || ''}`;
      })
      .catch(error);
  };

export default function plugin(options = {} as RollupPluginSassOptions) {
  const pluginOptions = Object.assign({
      runtime: sass,
      include: ['**/*.sass', '**/*.scss'],
      exclude: 'node_modules/**',
      output: false,
      insert: false
    }, options),
    {include, exclude, runtime: sassRuntime, options: sassOptions = {}} = pluginOptions,
    filter = createFilter(include, exclude),
    styles = [],
    styleMaps = {};

  return {
    name: 'rollup-plugin-sass',

    intro() {
      if (pluginOptions.insert) {
        return insertStyle.toString().replace(/insertStyle/, insertFnName);
      }
    },

    transform(code, file): Promise<any> {
      if (!filter(file)) {
        return Promise.resolve();
      }

      const paths = [dirname(file), process.cwd()],

        resolvedOptions = Object.assign({}, sassOptions, {
          file,
          data: sassOptions.data && `${sassOptions.data}${code}`,
          indentedSyntax: MATCH_SASS_FILENAME_RE.test(file),
          includePaths: (sassOptions.includePaths || []).concat(paths),
          importer: getImporterList(sassOptions),
        });

      return promisify(sassRuntime.render.bind(sassRuntime))(resolvedOptions)
        .then(res => processRenderResponse(pluginOptions, file, sassOptions, {styleMaps, styles}, res.css.toString().trim())
          .then(result => [res, result])
        )
        .then(([res, codeResult]) => ({
          code: codeResult,
          map: {mappings: res.map ? res.map.toString() : ''},
        }), error);
    },

    generateBundle(generateOptions, bundle, isWrite): Promise<any> {
      if (!isWrite || (!pluginOptions.insert && (!styles.length || pluginOptions.output === false))) {
        return Promise.resolve();
      }

      // log('bundle', bundle);

      const css = styles.map(style => style.content).join(''),
        {output, insert} = pluginOptions;

      if (typeof output === 'string') {
        return fs.promises.mkdir(dirname(output as string), {recursive: true})
          .then(() => fs.promises.writeFile(output as string, css));
      } else if (typeof output === 'function') {
        return Promise.resolve((output as RollupPluginSassOutputFn)(css, styles));
      } else if (!insert && generateOptions.file && output === true) {
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
