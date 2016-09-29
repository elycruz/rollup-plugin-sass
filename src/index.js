import { dirname } from 'path';
import { writeFileSync } from 'fs';
import { renderSync } from 'node-sass'
import { isString, isFunction } from 'util';
import { createFilter } from 'rollup-pluginutils';
import { insertStyle } from './style.js'

export default function plugin(options = {}) {
    const filter = createFilter(options.include || [ '**/*.sass', '**/*.scss' ], options.exclude || 'node_modules/**');
    const insertFnName = '___$insertStyle';

    return {
        intro() {
            if (options.insert) {
                return insertStyle.toString().replace(/insertStyle/, insertFnName);
            }
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

                if (isString(options.output)) {
                    writeFileSync(options.output, css);

                    code = 'export default "";';
                } else {
                    if (isFunction(options.output)) {
                        css = await options.output(css, id);
                    }

                    css = JSON.stringify(css);

                    if (options.insert) {
                        css = `${insertFnName}(${css})`;
                    }

                    code = `export default ${css};`;
                }

                return {
                    code: code,
                    map: { mappings: '' }
                };
            } catch (error) {
                throw error;
            }
        }
    };
};