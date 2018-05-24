import { dirname } from 'path';
import { writeFileSync } from 'fs';
import { renderSync } from 'node-sass';
import { isString, isFunction } from 'util';
import { createFilter } from 'rollup-pluginutils';
import { insertStyle } from './style.js';
import { ensureFileSync } from 'fs-extra';

export default function plugin(options = {}) {
  const filter = createFilter(options.include || [ '**/*.sass', '**/*.scss' ], options.exclude || 'node_modules/**');
  const insertFnName = '___$insertStyle';
  const styles = [];
  const styleMaps = {};
  let prependSass = '';

  options.output = options.output || false;
  options.insert = options.insert || false;

  if (options.options && options.options.data) {
    prependSass = options.options.data;
    delete options.options.data;
  }

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

      const paths = [dirname(id), process.cwd()];
      const baseSassOptions = prependSass
        ? { data: `${prependSass}${code}` }
        : { file: id };
      const sassOptions = Object.assign(baseSassOptions, options.options);

      sassOptions.includePaths = sassOptions.includePaths
        ? sassOptions.includePaths.concat(paths)
        : paths;

      try {
        let css = renderSync(sassOptions).css.toString().trim();
        let code = '';
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
            code = `${insertFnName}(${JSON.stringify(css)});`;
          } else if (options.output === false) {
            code = JSON.stringify(css);
          } else {
            code = `"";`;
          }
        }
        return {
          code: [
            `export default ${code};`,
            ...(restExports || []),
          ].join('\n'),
          map: { mappings: '' },
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
