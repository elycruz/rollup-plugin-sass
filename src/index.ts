import { promisify } from 'util';
import * as fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

import * as sass from 'sass';
import { createFilter } from '@rollup/pluginutils';

/**
 * @warning Rollup is added as a "devDependency",
 *          so no actual symbols should be imported.
 *          Interfaces and non-concrete types are ok.
 */
import type { Plugin as RollupPlugin, TransformResult } from 'rollup';

import type {
  RollupPluginSassOptions,
  RollupPluginSassOutputFn,
  RollupPluginSassState,
} from './types';
import {
  getImporterListLegacy,
  getImporterListModern,
} from './utils/getImporterList';
import {
  processRenderResponse,
  INSERT_STYLE_ID,
} from './utils/processRenderResponse';
import insertStyle from './insertStyle';

const MATCH_SASS_FILENAME_RE = /\.sass$/;

const defaultIncludes = ['**/*.sass', '**/*.scss'];
const defaultExcludes = 'node_modules/**';

// Typescript syntax for CommonJs "default exports" compatible export
// @reference https://www.typescriptlang.org/docs/handbook/modules.html#export--and-import--require
export = function plugin(
  options = {} as RollupPluginSassOptions,
): RollupPlugin {
  const pluginOptions = Object.assign(
    {
      runtime: sass,
      output: false,
      insert: false,
    },
    options,
  );

  const {
    include = defaultIncludes,
    exclude = defaultExcludes,
    runtime: sassRuntime,
  } = pluginOptions;

  const filter = createFilter(include, exclude);

  const pluginState: RollupPluginSassState = {
    styles: [],
    styleMaps: {},
  };

  return {
    name: 'rollup-plugin-sass',

    /** @see https://rollupjs.org/plugin-development/#resolveid */
    resolveId(source) {
      if (source === INSERT_STYLE_ID) {
        return INSERT_STYLE_ID;
      }
    },

    /** @see https://rollupjs.org/plugin-development/#load */
    load(id) {
      if (id === INSERT_STYLE_ID) {
        return `export default ${insertStyle.toString()}`;
      }
    },

    async transform(code, filePath) {
      if (!filter(filePath)) {
        return;
      }

      const paths = [path.dirname(filePath), process.cwd()];
      const { styleMaps, styles } = pluginState;

      // Setup resolved css output bundle tracking, for use later in `generateBundle` method.
      // ----
      if (!styleMaps[filePath]) {
        const mapEntry = {
          id: filePath,
          content: '', // Populated after sass compilation
        };
        styleMaps[filePath] = mapEntry;
        styles.push(mapEntry);
      }

      switch (pluginOptions.api) {
        case 'modern': {
          const { options: incomingSassOptions } = pluginOptions;

          const compileOptions: sass.StringOptions<'async'> = {
            ...incomingSassOptions,
            syntax: path.extname(filePath) === '.sass' ? 'indented' : 'scss',
            loadPaths: (incomingSassOptions?.loadPaths || []).concat(paths),
            importers: getImporterListModern(incomingSassOptions?.importers),
            url: pathToFileURL(filePath),
            /** force sourceMap because right now rollup outputOptions are not available */
            sourceMap: true,
          };

          /**
           * Using {@link compileStringAsync} to keep support of prepend information on each file,
           * basically `data` option
           */
          const source = incomingSassOptions?.data
            ? `${incomingSassOptions.data}${code}`
            : code;

          const compileResult: sass.CompileResult =
            await sassRuntime.compileStringAsync(source, compileOptions);

          const codeResult = await processRenderResponse(
            pluginOptions,
            filePath,
            pluginState,
            compileResult.css.toString().trim(),
          );

          const { loadedUrls, sourceMap } = compileResult;

          loadedUrls.forEach((filePath) => {
            this.addWatchFile(fileURLToPath(filePath));
          });

          return {
            code: codeResult || '',
            map: sourceMap ? sourceMap : undefined,
          } as TransformResult;
        }

        case 'legacy':
        default: {
          const { options: incomingSassOptions } = pluginOptions;

          const renderOptions: sass.LegacyOptions<'async'> = {
            ...incomingSassOptions,

            file: filePath,
            data:
              incomingSassOptions?.data && `${incomingSassOptions.data}${code}`,
            indentedSyntax: MATCH_SASS_FILENAME_RE.test(filePath),
            includePaths: (incomingSassOptions?.includePaths || []).concat(
              paths,
            ),
            importer: getImporterListLegacy(incomingSassOptions?.importer),
          };

          const res: sass.LegacyResult = await promisify(
            sassRuntime.render.bind(sassRuntime),
          )(renderOptions);

          const codeResult = await processRenderResponse(
            pluginOptions,
            filePath,
            pluginState,
            res.css.toString().trim(),
          );

          // @todo Do we need to filter this call so it only occurs when rollup is in 'watch' mode?
          res.stats.includedFiles.forEach((filePath: string) => {
            this.addWatchFile(filePath);
          });

          // @note do not `catch` here - let error propagate to rollup level.
          return {
            code: codeResult || '',
            map: { mappings: res.map ? res.map.toString() : '' },
          } as TransformResult;
        }
      }
    },

    generateBundle(outputOptions, _, isWrite) {
      const { styles } = pluginState;
      const { output, insert } = pluginOptions;

      if (!isWrite || (!insert && (!styles.length || output === false))) {
        return Promise.resolve();
      }

      const css = styles.map((style) => style.content).join('');

      if (typeof output === 'string') {
        return fs.promises
          .mkdir(path.dirname(output as string), { recursive: true })
          .then(() => fs.promises.writeFile(output as string, css));
      } else if (typeof output === 'function') {
        return Promise.resolve(
          (output as RollupPluginSassOutputFn)(css, styles),
        );
      } else if (!insert && outputOptions.file && output === true) {
        let dest = outputOptions.file;

        if (dest.endsWith('.js') || dest.endsWith('.ts')) {
          dest = dest.slice(0, -3);
        }
        dest = `${dest}.css`;
        return fs.promises
          .mkdir(path.dirname(dest), { recursive: true })
          .then(() => fs.promises.writeFile(dest, css));
      }

      return Promise.resolve(css);
    },
  };
};
