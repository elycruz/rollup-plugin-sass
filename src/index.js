import { dirname } from 'path';
import { writeFileSync } from 'fs';
import { renderSync } from 'node-sass';
import { isString, isFunction } from 'util';
import { createFilter } from 'rollup-pluginutils';
import { insertStyle } from './style.js';
import { ensureFileSync } from 'fs-extra';

const MATHC_SASS_FILENAME_RE = /\.sass$/;
const MATCH_NODE_MODULE_RE = /^~([a-z0-9]|@).+/i;

export default function plugin(options = {}) {
  const filter = createFilter(options.include || [ '**/*.sass', '**/*.scss' ], options.exclude || 'node_modules/**');
  const insertFnName = '___$insertStyle';
  const styles = [];
  const styleMaps = {};

  options.output = options.output || false;
  options.insert = options.insert || false;

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
        const res = renderSync(Object.assign({}, customizedSassOptions, {
          file: id,
          data: customizedSassOptions.data && `${customizedSassOptions.data}${code}`,
          indentedSyntax: MATHC_SASS_FILENAME_RE.test(id),
          includePaths: customizedSassOptions.includePaths
            ? customizedSassOptions.includePaths.concat(paths)
            : paths,
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

    async ongenerate(generateOptions) {
      if (!options.insert && (!styles.length || options.output === false)) {
        return;
      }

      const css = styles.map(style => style.content).join('');

      if (isString(options.output)) {
        ensureFileSync(options.output, (err) => {
          if (err) {
            throw err;
          }
        });
        return writeFileSync(options.output, css);
      } else if (isFunction(options.output)) {
        return options.output(css, styles);
      } else if (!options.insert && generateOptions.file) {
        let dest = generateOptions.file;

        if (dest.endsWith('.js') || dest.endsWith('.ts')) {
          dest = dest.slice(0, -3);
        }
        dest = `${dest}.css`;
        ensureFileSync(dest, (err) => {
          if (err) {
            throw err;
          }
        });
        return writeFileSync(dest, css);
      }
    },
  };
}
