import { promisify } from 'util';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

import * as sass from 'sass';
import { createFilter } from '@rollup/pluginutils';

/**
 * @warning Rollup is added as a "devDependency",
 *          so no actual symbols should be imported.
 *          Interfaces and non-concrete types are ok.
 */
import type {
  OutputBundle,
  Plugin as RollupPlugin,
  SourceMapInput,
} from 'rollup';

import type { RollupPluginSassOptions, RollupPluginSassState } from './types';
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
  const pluginOptions: RollupPluginSassOptions = {
    runtime: sass,
    output: false,
    insert: false,
    ...options,
  };

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

    /** @see https://rollupjs.org/plugin-development/#buildstart */
    buildStart() {
      pluginState.styles = [];
      pluginState.styleMaps = {};
    },

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

          const compileResult: sass.CompileResult = await (
            sassRuntime as typeof sass
          ).compileStringAsync(source, compileOptions);

          const codeResult = await processRenderResponse(
            pluginOptions,
            filePath,
            pluginState,
            compileResult.css.trim(),
          );

          const { loadedUrls, sourceMap } = compileResult;

          loadedUrls.forEach((filePath) => {
            this.addWatchFile(fileURLToPath(filePath));
          });

          return {
            code: codeResult || '',
            map: sourceMap
              ? (sourceMap as unknown as SourceMapInput)
              : undefined,
          };
        }

        case 'legacy':
        default: {
          const { options: incomingSassOptions } = pluginOptions;

          const renderOptions: sass.LegacyOptions<'async'> = {
            ...incomingSassOptions,

            file: filePath,
            data: incomingSassOptions?.data
              ? `${incomingSassOptions.data}${code}`
              : undefined,
            indentedSyntax: MATCH_SASS_FILENAME_RE.test(filePath),
            includePaths: (incomingSassOptions?.includePaths || []).concat(
              paths,
            ),
            importer: getImporterListLegacy(incomingSassOptions?.importer),
          };

          const res = (await promisify(
            (sassRuntime as typeof sass).render.bind(sassRuntime),
          )(renderOptions)) as sass.LegacyResult;

          const codeResult = await processRenderResponse(
            pluginOptions,
            filePath,
            pluginState,
            res.css.toString().trim(),
          );

          res.stats.includedFiles.forEach((filePath: string) => {
            this.addWatchFile(filePath);
          });

          // @note do not `catch` here - let error propagate to rollup level.
          return {
            code: codeResult || '',
            map: res.map
              ? ({ mappings: res.map.toString() } as SourceMapInput)
              : undefined,
          };
        }
      }
    },

    async generateBundle(outputOptions, bundle: OutputBundle, isWrite) {
      const { styles } = pluginState;
      const { output, insert } = pluginOptions;

      if (!isWrite || (!insert && (!styles.length || output === false))) {
        return;
      }

      const css = styles.map((style) => style.content).join('');

      // Branch 1: `output` is a string path - emit with that exact fileName.
      // Rollup honors `fileName` literally (relative to the rollup output dir).
      if (typeof output === 'string') {
        const outputDir = outputOptions.dir
          ? outputOptions.dir
          : outputOptions.file
            ? path.dirname(outputOptions.file)
            : process.cwd();
        const relPath = path.isAbsolute(output)
          ? path.relative(outputDir, output)
          : output;

        this.emitFile({
          type: 'asset',
          fileName: relPath,
          source: css,
        });
        return;
      }

      // Branch 2: `output` is a function - hand control to the user fn.
      // The user fn is responsible for writing the file itself (legacy
      // semantics preserved). We do NOT additionally emit an asset here -
      // emitting would surprise users who expect their fn to be the sole
      // recipient of the CSS, and would also add an unexpected asset to
      // rollup's `bundle`.
      if (typeof output === 'function') {
        await output(css, styles);
        return;
      }

      // Branch 3: `output === true` with `outputOptions.file` -
      // derive `<entry-stem>.css` and emit with `fileName` (literal,
      // sibling to the JS entry).
      if (!insert && outputOptions.file && output === true) {
        const parsed = path.parse(outputOptions.file);
        this.emitFile({
          type: 'asset',
          fileName: `${parsed.name}.css`,
          source: css,
        });
        return;
      }

      // Branch 4: `output === true` with `outputOptions.dir` -
      // derive from the entry chunk's fileName; emit with `name` so
      // rollup applies `assetFileNames` (and hashing).
      if (!insert && outputOptions.dir && output === true) {
        const entry = Object.values(bundle).find(
          (item) => item.type === 'chunk' && item.isEntry,
        );
        if (!entry) return;
        const baseName = path.parse(entry.fileName).name;
        this.emitFile({
          type: 'asset',
          name: `${baseName}.css`,
          source: css,
        });
        return;
      }
    },
  };
};
