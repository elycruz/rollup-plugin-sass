import { dirname } from 'path';
import { writeFile } from 'fs';
import { renderSync } from 'node-sass'
import { isString, isFunction } from 'util';
import { createFilter } from 'rollup-pluginutils';
import { insertStyle } from './src/style.js'

export default function plugin(options = {}) {
    const filter = createFilter(options.include || [ '**/*.sass', '**/*.scss' ], options.exclude || 'node_modules/**');
    const injectFnName = '___$styleInject'

    return {
        intro() {
            return insertStyle.toString().replace(/insertStyle/, injectFnName);
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

                if (isFunction(options.output)) {
                    css = await options.output(css, id);
                }

                if (isString(options.output)) {
                    return await fs.writeFile(options.output, css);
                }

                return {
                    code: `export default ${injectFnName}(${JSON.stringify(css.toString())});`,
                    map: { mappings: '' }
                };
            } catch (error) {
                throw error;
            }
        }
    };
};