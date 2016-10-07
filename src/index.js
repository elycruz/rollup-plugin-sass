import { dirname } from 'path';
import { writeFileSync } from 'fs';
import { renderSync } from 'node-sass'
import { isString, isFunction } from 'util';
import { createFilter } from 'rollup-pluginutils';
import { insertStyle } from './style.js'

export default function plugin(options = {}) {
    const filter = createFilter(options.include || [ '**/*.sass', '**/*.scss' ], options.exclude || 'node_modules/**');
    const insertFnName = '___$insertStyle';
    const styles = [];
    let dest = '';

    options.output = options.output || false;
    options.insert = options.insert || false;
    options.processor = options.processor || null;
    options.options = options.options || null;

    return {
        name: 'sass',

        intro() {
            if (options.insert) {
                return insertStyle.toString().replace(/insertStyle/, insertFnName);
            }
        },

        options(opts) {
            dest = opts.dest || opts.entry;
        },

        async transform(code, id) {
            if (!filter(id)) {
                return null;
            }

            const paths = [dirname(id), process.cwd()];
            const sassConfig = Object.assign({ data: code }, options.options);

            sassConfig.includePaths = sassConfig.includePaths
                ? sassConfig.includePaths.concat(paths)
                : paths;

            try {
                let css = renderSync(sassConfig).css.toString();

                if (css.trim()) {
                    if (isFunction(options.processor)) {
                        css = await options.processor(css, id);
                    }

                    styles.push({
                        id: id,
                        content: css
                    });

                    if (options.insert) {
                        css = `${insertFnName}(${css})`;
                    }
                }

                return {
                    code: `export default ${options.output === false ? JSON.stringify(css) : '\'\''};`,
                    map: { mappings: '' }
                };
            } catch (error) {
                throw error;
            }
        },

        async ongenerate(opts) {
            if (!styles.length || options.output === false) {
                return;
            }

            const css = styles.map((style) => {
                return style.content;
            }).join('');

            if (isString(options.output)) {
                return writeFileSync(options.output, css);
            } else if (isFunction(options.output)) {
                return options.output(css, styles);
            } else if (dest) {
                if (dest.endsWith('.js')) {
                    dest = dest.slice(0, -3);
                }

                return writeFileSync(`${dest}.css`, css);
            }
        }
    };
};
