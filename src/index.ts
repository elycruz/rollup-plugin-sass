import { promisify } from 'util';
import resolve from 'resolve';
import * as sass from 'sass';
import { dirname } from 'path';
import * as fs from 'fs';
import { createFilter } from '@rollup/pluginutils';
import type {
  SassImporterResult,
  RollupPluginSassOptions,
  RollupPluginSassOutputFn,
  SassOptions,
  RollupPluginSassProcessorFnOutput,
  SassRenderResult,
} from './types';
import { isFunction, isObject, isString, warn } from './utils';
import insertStyle from './insertStyle';

// @note Rollup is added as a "devDependency" so no actual symbols should be imported.
//  Interfaces and non-concrete types are ok.
import {
  Plugin as RollupPlugin,
  NormalizedOutputOptions as RollupNormalizedOutputOptions,
  OutputBundle as RollupOutputBundle,
} from 'rollup';
import { fileURLToPath } from 'url';

type PluginState = {
  // Stores interim bundle objects
  styles: { id?: string; content?: string }[];

  // "";  Used, currently to ensure that we're not pushing style objects representing
  // the same file-path into `pluginState.styles` more than once.
  styleMaps: {
    [index: string]: {
      id?: string;
      content?: string;
    };
  };
};

const MATCH_SASS_FILENAME_RE = /\.sass$/;
const MATCH_NODE_MODULE_RE = /^~([a-z0-9]|@).+/i;

const INSERT_STYLE_ID = '___$insertStyle';

/**
 * Returns a sass `importer` list:
 * @see https://sass-lang.com/documentation/js-api#importer
 */
const getImporterList = (importOption: SassOptions['importer']) => {
  // `Promise` to chain all `importer1` calls to;  E.g.,  subsequent `importer1` calls won't call `done` until previous `importer1` calls have called `done` (import order enforcement) - Required since importer below is actually 'async'.
  let lastResult = Promise.resolve();

  /**
   * Legacy Sass (*.scss/*.sass) file importer (works in new (< v2.0), and older, versions of `sass` (dart-sass) module).
   *
   * @see https://sass-lang.com/documentation/js-api/modules#LegacyAsyncImporter
   *
   * @param {string} url - Url found in `@import`/`@use`, found in parent sass file;  E.g., exactly as it appears in sass file.
   * @param {string} prevUrl - Url of file that contains '@import' rule for incoming file (`url`).
   * @param {(result: LegacyImporterResult | SassImporterResult) => void} done - Signals import completion.  Note: `LegacyImporterResult`, and `SassImporterResult`, are the same here - We've defined the type for our plugin, since older versions of sass don't have this type defined.
   * @note This importer may not work in dart-sass v2.0+ (which may be far off in the future, but is important to note: https://sass-lang.com/documentation/js-api/#legacy-api).
   * @returns {void}
   */
  const importer1 = (
    url: string,
    prevUrl: string,
    done: (rslt: SassImporterResult) => void,
  ): void | null => {
    if (!MATCH_NODE_MODULE_RE.test(url)) {
      return null;
    }

    const moduleUrl = url.slice(1);
    const resolveOptions = {
      basedir: dirname(prevUrl),
      extensions: ['.scss', '.sass'],
    };

    // @todo This block should run as a promise instead, will help ensure we're not blocking the thread it is
    //   running on, even though `sass` is probably already running the importer in one.
    try {
      const file = resolve.sync(moduleUrl, resolveOptions);
      lastResult = lastResult.then(() => done({ file }));
    } catch (err) {
      warn('[rollup-plugin-sass]: Recovered from error: ', err);
      // If importer has sibling importers then exit and allow one of the other
      //  importers to attempt file path resolution.
      if (Array.isArray(importOption) && importOption.length > 1) {
        lastResult = lastResult.then(() => done(null));
        return;
      }
      lastResult = lastResult.then(() =>
        done({
          file: url,
        }),
      );
    }
  };

  return [importer1].concat((importOption as never) || []);
};

const processRenderResponse = (
  rollupOptions: Pick<
    RollupPluginSassOptions,
    'insert' | 'processor' | 'output'
  >,
  file: string,
  state: PluginState,
  inCss: string,
) => {
  if (!inCss) return Promise.resolve();

  const { processor } = rollupOptions;

  return (
    Promise.resolve()
      .then(() =>
        !isFunction(processor) ? inCss + '' : processor(inCss, file),
      )
      // Gather output requirements
      .then((result: Partial<RollupPluginSassProcessorFnOutput>) => {
        if (!isObject(result)) {
          return [result, ''];
        }
        if (!isString(result.css)) {
          throw new Error(
            'You need to return the styles using the `css` property. ' +
              'See https://github.com/differui/rollup-plugin-sass#processor',
          );
        }
        const outCss = result.css;
        delete result.css;
        const restExports = Object.keys(result).reduce(
          (agg, name) =>
            agg + `export const ${name} = ${JSON.stringify(result[name])};\n`,
          '',
        );
        return [outCss, restExports];
      })

      // Compose output
      .then(([resolvedCss, restExports]) => {
        const { styleMaps } = state;

        // Update bundle tracking entry with resolved content
        styleMaps[file].content = resolvedCss;

        const out = JSON.stringify(resolvedCss);

        let defaultExport = `""`;
        let imports = '';

        if (rollupOptions.insert) {
          /**
           * Include import using {@link INSERT_STYLE_ID} as source.
           * It will be resolved to insert style function using `resolvedID` and `load` hooks;
           * e.g., the path will completely replaced, and re-generated (as a relative path)
           * by rollup.
           */
          imports = `import ${INSERT_STYLE_ID} from '${INSERT_STYLE_ID}';\n`;
          defaultExport = `${INSERT_STYLE_ID}(${out});`;
        } else if (!rollupOptions.output) {
          defaultExport = out;
        }

        return `${imports}export default ${defaultExport};\n${restExports}`;
      })
  ); // @note do not `catch` here - let error propagate to rollup level
};

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

  const filter = createFilter(include || '', exclude || '');

  const pluginState: PluginState = {
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
        return Promise.resolve();
      }
      const paths = [dirname(filePath), process.cwd()];
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

          const importers: sass.Options<'async'>['importers'] = [
            new sass.NodePackageImporter(),
          ];
          if (incomingSassOptions?.importers) {
            importers.push(...incomingSassOptions?.importers);
          }
          const resolvedOptions: sass.Options<'async'> = {
            ...incomingSassOptions,
            loadPaths: (incomingSassOptions?.loadPaths || []).concat(paths),
            importers,
          };

          const compileResult = await sass.compileAsync(
            filePath,
            resolvedOptions,
          );

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
          };
        }

        case 'legacy':
        default: {
          const { options: incomingSassOptions } = pluginOptions;

          const resolvedOptions: sass.LegacyOptions<'async'> = Object.assign(
            {},
            incomingSassOptions,
            {
              file: filePath,
              data:
                incomingSassOptions?.data &&
                `${incomingSassOptions.data}${code}`,
              indentedSyntax: MATCH_SASS_FILENAME_RE.test(filePath),
              includePaths: (incomingSassOptions?.includePaths || []).concat(
                paths,
              ),
              importer: getImporterList(incomingSassOptions?.importer),
            },
          );

          return promisify(sassRuntime.render.bind(sassRuntime))(
            resolvedOptions,
          )
            .then((res: SassRenderResult) =>
              processRenderResponse(
                pluginOptions,
                filePath,
                pluginState,
                res.css.toString().trim(),
              ).then((result) => [res, result]),
            )
            .then(
              ([res, codeResult]: [
                SassRenderResult,
                RollupPluginSassProcessorFnOutput,
              ]) => {
                // @todo Do we need to filter this call so it only occurs when rollup is in 'watch' mode?
                res.stats.includedFiles.forEach((filePath: string) => {
                  this.addWatchFile(filePath);
                });

                return {
                  code: codeResult || '',
                  map: { mappings: res.map ? res.map.toString() : '' },
                };
              },
            ); // @note do not `catch` here - let error propagate to rollup level.
        }
      }
    },

    generateBundle(
      generateOptions: RollupNormalizedOutputOptions,
      _: RollupOutputBundle,
      isWrite: boolean,
    ) {
      const { styles } = pluginState;
      const { output, insert } = pluginOptions;

      if (!isWrite || (!insert && (!styles.length || output === false))) {
        return Promise.resolve();
      }

      const css = styles.map((style) => style.content).join('');

      if (typeof output === 'string') {
        return fs.promises
          .mkdir(dirname(output as string), { recursive: true })
          .then(() => fs.promises.writeFile(output as string, css));
      } else if (typeof output === 'function') {
        return Promise.resolve(
          (output as RollupPluginSassOutputFn)(css, styles),
        );
      } else if (!insert && generateOptions.file && output === true) {
        let dest = generateOptions.file;

        if (dest.endsWith('.js') || dest.endsWith('.ts')) {
          dest = dest.slice(0, -3);
        }
        dest = `${dest}.css`;
        return fs.promises
          .mkdir(dirname(dest), { recursive: true })
          .then(() => fs.promises.writeFile(dest, css));
      }

      return Promise.resolve(css);
    },
  };
};
