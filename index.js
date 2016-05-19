import { dirname } from 'path';
import { writeFile } from 'fs';
import { renderSync } from 'node-sass'
import { isString, isFunction } from 'util';
import { createFilter } from 'rollup-pluginutils';

export default function plugin(options = {}) {
    const filter = createFilter(options.include || [ '**/*.sass', '**/*.scss' ], options.exclude || 'node_modules/**');

    return {
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
                    code: `export default ${JSON.stringify(css.toString())};`,
                    map: { mappings: '' }
                };
            } catch (error) {
                throw error;
            }
        }
    };
};