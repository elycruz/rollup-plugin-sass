import pify from 'pify'
import resolve from 'resolve';
import sass from 'sass';
import { dirname } from 'path';
import fs from 'fs';
import { createFilter } from '@rollup/pluginutils';
import { insertStyle } from './style.js';

const MATCH_SASS_FILENAME_RE = /\.sass$/;
const MATCH_NODE_MODULE_RE = /^~([a-z0-9]|@).+/i;
const isString = x => typeof x === 'string';
const isFunction = x => typeof x === 'function';

export default function plugin(options = {}) {
  const {
    include = [ '**/*.sass', '**/*.scss' ],
    exclude = 'node_modules/**',
  } = options;
  const filter = createFilter(include, exclude);
  const insertFnName = '___$insertStyle';
  const styles = [];
  const styleMaps = {};

  options.output = options.output || false;
  options.insert = options.insert || false;

  const sassRuntime = options.runtime || sass;

  return {
    name: 'sass',

    intro() {
      if (options.insert) {
        return insertStyle.toString().replace(/insertStyle/, insertFnName);
      }
    },

    async transform(code, id) {
      if (!filter(id)) {
        return;
      }

      try {
        const paths = [dirname(id), process.cwd()];
        const customizedSassOptions = options.options || {};
        const res = await pify(sassRuntime.render.bind(sassRuntime))(Object.assign({}, customizedSassOptions, {
          file: id,
          data: customizedSassOptions.data && `${customizedSassOptions.data}${code}`,
          indentedSyntax: MATCH_SASS_FILENAME_RE.test(id),
          includePaths: customizedSassOptions.includePaths
            ? customizedSassOptions.includePaths.concat(paths)
            : paths,
          importer: [
            (url, importer, done) => {
              if (!MATCH_NODE_MODULE_RE.test(url)) {
                return null;
              }

              const moduleUrl = url.slice(1);
              const resolveOptions = {
                basedir: dirname(importer),
                extensions: ['.scss', '.sass'],
              };

              try {
                done({
                  file: resolve.sync(moduleUrl, resolveOptions),
                });
              } catch (err) {
                if (customizedSassOptions.importer && customizedSassOptions.importer.length) {
                  return null;
                }
                done({
                  file: url,
                });
              }
            },
          ].concat(customizedSassOptions.importer || []),
        }));
        let css = res.css.toString().trim();
        let defaultExport = '';
        let restExports;

        if (css) {
          if (isFunction(options.processor)) {
            const processResult = await options.processor(css, id);

            if (typeof processResult === 'object') {
              if (typeof processResult.css !== 'string') {
                throw new Error('You need to return the styles using the `css` property. See https://github.com/differui/rollup-plugin-sass#processor');
              }
              css = processResult.css;
              delete processResult.css;
              restExports = Object.keys(processResult).map(name => `export const ${name} = ${JSON.stringify(processResult[name])};`);
            } else if (typeof processResult === 'string') {
              css = processResult;
            }
          }
          if (styleMaps[id]) {
            styleMaps[id].content = css;
          } else {
            styles.push(styleMaps[id] = {
              id: id,
              content: css,
            });
          }
          if (options.insert === true) {
            defaultExport = `${insertFnName}(${JSON.stringify(css)});`;
          } else if (options.output === false) {
            defaultExport = JSON.stringify(css);
          } else {
            defaultExport = `"";`;
          }
        }
        return {
          code: [
            `export default ${defaultExport};`,
            ...(restExports || []),
          ].join('\n'),
          map: {
            mappings: res.map
              ? res.map.toString()
              : '',
          },
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
