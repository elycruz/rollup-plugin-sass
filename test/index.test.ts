import test from 'ava';
import type { TitleFn } from 'ava';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath, pathToFileURL } from 'url';

import Sinon from 'sinon';
import { rollup } from 'rollup';
import type {
  OutputOptions,
  RollupOutput,
  WarningHandlerWithDefault,
} from 'rollup';
import * as sassRuntime from 'sass';
import postcss from 'postcss';
import { extractICSS } from 'icss-utils';

import sass from '../src/index';
import type {
  RollupPluginSassOutputFn,
  RollupPluginSassOptions,
} from '../src/types';

type ApiValue = Extract<RollupPluginSassOptions['api'], string>;

function normalizeAPIValue(value: RollupPluginSassOptions['api']): ApiValue {
  return value ?? 'legacy';
}

function getTestOutputDir(value: RollupPluginSassOptions['api']) {
  const repoRoot = path.join(__dirname, '../');

  return path.join(repoRoot, `.tests-output`, normalizeAPIValue(value));
}

// ======================================

const TEST_SASS_OPTIONS_DEFAULT_LEGACY = {
  outputStyle: 'compressed',
} as const;

const TEST_PLUGIN_OPTIONS_DEFAULT_LEGACY: RollupPluginSassOptions = {
  options: TEST_SASS_OPTIONS_DEFAULT_LEGACY,
};

// ======================================

const TEST_SASS_OPTIONS_DEFAULT_MODERN = { style: 'compressed' } as const;

const TEST_PLUGIN_OPTIONS_DEFAULT_MODERN: RollupPluginSassOptions = {
  api: 'modern',
  options: TEST_SASS_OPTIONS_DEFAULT_MODERN,
};

// ======================================

const TEST_GENERATE_OPTIONS = {
  format: 'es',
} as OutputOptions;

// ======================================

function stripNewLines(str: string): string {
  return str.trim().replace(/[\n\r\f]/g, '');
}

function getFirstChunkCode(outputChunks: RollupOutput['output']): string {
  return outputChunks[0].code;
}

// ======================================

test('should import *.scss and *.sass files with default option', async (t) => {
  const outputBundle = await rollup({
    input: 'test/fixtures/basic/index.js',
    plugins: [sass()],
  });

  const { output } = await outputBundle.generate({
    format: 'es',
    file: path.join(getTestOutputDir('legacy'), 'import_scss_and_sass.js'),
  });
  const result = getFirstChunkCode(output);

  t.snapshot(result);
});

test('should import *.scss and *.sass files with api srt to `modern` and no option', async (t) => {
  const outputBundle = await rollup({
    input: 'test/fixtures/basic/index.js',
    plugins: [sass({ api: 'modern' })],
  });

  const { output } = await outputBundle.generate({
    format: 'es',
    file: path.join(getTestOutputDir('modern'), 'import_scss_and_sass.js'),
  });
  const result = getFirstChunkCode(output);

  t.snapshot(result);
});

/**
 * @see https://github.com/avajs/ava/blob/main/docs/01-writing-tests.md#reusing-test-logic-through-macros
 */
/* Sample code for creating new test scenario
{
  const title = 'should import *.scss and *.sass files';

  const macro = test.macro<[RollupPluginSassOptions]>({
    async exec(t, pluginOptions) {
      // ...
    },
    title: createApiOptionTestCaseTitle,
  });

  test(title, macro, TEST_PLUGIN_OPTIONS_DEFAULT_LEGACY);
  test(title, macro, TEST_PLUGIN_OPTIONS_DEFAULT_MODERN);
}
*/
const createApiOptionTestCaseTitle: TitleFn<[RollupPluginSassOptions]> = (
  title,
  { api },
) => {
  const apiTextValue = api ? `'${api}'` : "'legacy' (implicit)";
  return `${title} using 'api' = ${apiTextValue}`.trim();
};

// #region basic tests
{
  const title = 'should import *.scss and *.sass files';

  const macro = test.macro<[RollupPluginSassOptions]>({
    async exec(t, pluginOptions) {
      const outputBundle = await rollup({
        input: 'test/fixtures/basic/index.js',
        plugins: [sass(pluginOptions)],
      });
      const { output } = await outputBundle.generate({
        format: 'es',
        file: getTestOutputDir(pluginOptions.api),
      });
      const result = getFirstChunkCode(output);

      t.snapshot(result);
    },
    title: createApiOptionTestCaseTitle,
  });

  test(title, macro, TEST_PLUGIN_OPTIONS_DEFAULT_LEGACY);
  test(title, macro, TEST_PLUGIN_OPTIONS_DEFAULT_MODERN);
}

{
  const title = 'should compress the dest CSS';

  const macro = test.macro<[RollupPluginSassOptions]>({
    async exec(t, pluginOptions) {
      const outputBundle = await rollup({
        input: 'test/fixtures/compress/index.js',
        plugins: [sass(pluginOptions)],
      });
      const { output } = await outputBundle.generate(TEST_GENERATE_OPTIONS);
      const result = getFirstChunkCode(output);

      t.snapshot(result);
    },
    title: createApiOptionTestCaseTitle,
  });

  test(title, macro, TEST_PLUGIN_OPTIONS_DEFAULT_LEGACY);
  test(title, macro, TEST_PLUGIN_OPTIONS_DEFAULT_MODERN);
}

{
  const title = 'should custom importer works';

  const macro = test.macro<[RollupPluginSassOptions]>({
    async exec(t, pluginOptions) {
      const outputBundle = await rollup({
        input: 'test/fixtures/custom-importer/index.js',
        plugins: [sass(pluginOptions)],
      });
      const { output } = await outputBundle.generate(TEST_GENERATE_OPTIONS);
      const result = getFirstChunkCode(output);

      t.snapshot(result);
    },
    title: createApiOptionTestCaseTitle,
  });

  test(title, macro, {
    options: {
      ...TEST_SASS_OPTIONS_DEFAULT_LEGACY,
      importer: [
        (url, _, done) => {
          done({
            file: url.replace('${name}', 'actual_a'),
          });
        },
      ],
    },
  });
  test(title, macro, {
    api: 'modern',
    options: {
      ...TEST_SASS_OPTIONS_DEFAULT_MODERN,
      importers: [
        {
          findFileUrl(url, context) {
            const folder = path.dirname(fileURLToPath(context.containingUrl!));
            const filePath = path.join(
              folder,
              decodeURIComponent(url).replace('${name}', 'actual_a'),
            );

            return new URL(pathToFileURL(filePath));
          },
        },
      ],
    },
  });
}

{
  const title = 'should support options.data';

  const macro = test.macro<[RollupPluginSassOptions]>({
    async exec(t, pluginOptions) {
      const outputBundle = await rollup({
        input: 'test/fixtures/data/index.js',
        plugins: [sass(pluginOptions)],
      });
      const { output } = await outputBundle.generate(TEST_GENERATE_OPTIONS);
      const result = getFirstChunkCode(output);

      t.snapshot(result);
    },
    title: createApiOptionTestCaseTitle,
  });

  const jsVars = { color_red: 'red' };
  const scssVars = Object.entries(jsVars).reduce(
    (prev, [varName, varValue]) => `${prev}$${varName}:${varValue};`,
    '',
  );

  test(title, macro, {
    options: {
      ...TEST_SASS_OPTIONS_DEFAULT_LEGACY,
      data: scssVars,
    },
  });
  test(title, macro, {
    api: 'modern',
    options: {
      ...TEST_SASS_OPTIONS_DEFAULT_MODERN,
      data: scssVars,
    },
  });
}
// #endregion

// #region insert option
{
  const title = 'should insert CSS into head tag';

  const macro = test.macro<[RollupPluginSassOptions]>({
    async exec(t, pluginOptions) {
      const outputBundle = await rollup({
        input: 'test/fixtures/insert/index.js',
        plugins: [sass({ ...pluginOptions, insert: true })],
      });
      const { output } = await outputBundle.generate(TEST_GENERATE_OPTIONS);

      const outputFilePath = path.join(
        getTestOutputDir(pluginOptions.api),
        'insert-bundle',
      );

      await outputBundle.write({ dir: outputFilePath });

      t.is(
        output.length,
        1,
        'has 1 chunk (we are bundling all in one single file)',
      );

      const [{ moduleIds, modules }] = output;

      t.is(
        moduleIds.filter((it) => it.endsWith('insertStyle')).length,
        1,
        'include insertStyle one time',
      );

      const actualAModuleID = moduleIds.find((it) =>
        it.endsWith('actual_a.scss'),
      ) as string;
      const actualAModule = modules[actualAModuleID];
      t.truthy(actualAModule);
      t.snapshot(
        actualAModule.code,
        'actual_a content is compiled with insertStyle',
      );

      const actualBModuleID = moduleIds.find((it) =>
        it.endsWith('actual_b.scss'),
      ) as string;
      const actualBModule = modules[actualBModuleID];
      t.truthy(actualBModule);
      t.snapshot(
        actualBModule.code,
        'actual_b content is compiled with insertStyle',
      );
    },
    title: createApiOptionTestCaseTitle,
  });

  test(title, macro, TEST_PLUGIN_OPTIONS_DEFAULT_LEGACY);
  test(title, macro, TEST_PLUGIN_OPTIONS_DEFAULT_MODERN);
}

{
  const title =
    'should generate chunks with import insertStyle when `insert` is true';

  const macro = test.macro<[RollupPluginSassOptions]>({
    async exec(t, pluginOptions) {
      const outputBundle = await rollup({
        input: {
          entryA: 'test/fixtures/multiple-entry-points/entryA.js',
          entryB: 'test/fixtures/multiple-entry-points/entryB.js',
        },
        plugins: [sass({ ...pluginOptions, insert: true })],
      });

      const { output } = await outputBundle.generate({
        ...TEST_GENERATE_OPTIONS,
        preserveModules: true,
        preserveModulesRoot: 'src',
      });

      const outputFilePath = path.join(
        getTestOutputDir(pluginOptions.api),
        'insert-multiple-entry',
      );

      await outputBundle.write({
        dir: outputFilePath,
        preserveModules: true,
        preserveModulesRoot: 'src',
      });

      t.is(output.length, 5, 'has 5 chunks');

      const outputFileNames = output.map((it) => it.fileName);

      t.is(
        outputFileNames.filter((it) => it.startsWith('entry')).length,
        2,
        '1 chunk for each entry (2)',
      );
      t.is(
        outputFileNames.filter((it) => it.startsWith('assets/actual')).length,
        2,
        '1 chunk for each entry style import (2)',
      );
      t.is(
        outputFileNames.filter((it) => it.endsWith('insertStyle.js')).length,
        1,
        '1 chunk for insertStyle helper',
      );

      const styleFiles = output.filter((it) =>
        it.fileName.startsWith('assets/actual'),
      );

      t.true(
        styleFiles.every((outputItem) => {
          if (outputItem.type === 'chunk') {
            const insertStyleImportsCount = outputItem.imports.filter((it) =>
              it.endsWith('insertStyle.js'),
            ).length;
            return insertStyleImportsCount === 1;
          }
          // no asset should be present here
          return false;
        }),
        'each chunk must include insertStyle once',
      );
    },
    title: createApiOptionTestCaseTitle,
  });

  test(title, macro, TEST_PLUGIN_OPTIONS_DEFAULT_LEGACY);
  test(title, macro, TEST_PLUGIN_OPTIONS_DEFAULT_MODERN);
}
// #endregion

// #region output option
{
  const onwarn: WarningHandlerWithDefault = (warning, defaultHandler) => {
    if (warning.code === 'EMPTY_BUNDLE') {
      return;
    }
    defaultHandler(warning);
  };

  let expectA: string;
  let expectB: string;

  test.before(async () => {
    expectA = stripNewLines(
      await fs.readFile('test/assets/expect_a.css', { encoding: 'utf-8' }),
    );
    expectB = stripNewLines(
      await fs.readFile('test/assets/expect_b.css', { encoding: 'utf-8' }),
    );
  });

  /**
   * @warning
   * Right now we can't use snapshot testing on this tests because sometimes rollup mess with the order of imports.
   * Detailed information can be found here: https://github.com/elycruz/rollup-plugin-sass/pull/143#issuecomment-2227274405
   */

  {
    const title = 'should support output as function';

    const macro = test.macro<[RollupPluginSassOptions]>({
      async exec(t, pluginOptions) {
        const outputSpy = Sinon.spy() as Sinon.SinonSpy<
          Parameters<RollupPluginSassOutputFn>,
          ReturnType<RollupPluginSassOutputFn>
        >;
        const outputFilePath = path.join(
          getTestOutputDir(pluginOptions.api),
          'support_output_function.js',
        );

        const outputBundle = await rollup({
          input: 'test/fixtures/output-function/index.js',
          plugins: [sass({ ...pluginOptions, output: outputSpy })],
          onwarn,
        });

        await outputBundle.write({
          ...TEST_GENERATE_OPTIONS,
          file: outputFilePath,
        });

        const result = await fs
          .readFile(outputFilePath)
          .catch(() =>
            t.true(
              false,
              `Trouble reading back written file "${outputFilePath}".`,
            ),
          );

        t.is(stripNewLines(result.toString()), '', 'JS bundle mus be empty');

        t.true(outputSpy.calledOnce, 'output function has been called');

        const [actualCSSstring, ...otherOutputParams] = outputSpy.args[0];

        [expectA, expectB].forEach((expectedChunkCSS) => {
          t.true(
            actualCSSstring.includes(expectedChunkCSS),
            [
              `expect "${actualCSSstring}" to include "${expectedChunkCSS}"`,
              `Additional params are: ${JSON.stringify(otherOutputParams)}`,
            ].join('\n'),
          );
        });
      },
      title: createApiOptionTestCaseTitle,
    });

    test(title, macro, TEST_PLUGIN_OPTIONS_DEFAULT_LEGACY);
    test(title, macro, TEST_PLUGIN_OPTIONS_DEFAULT_MODERN);
  }

  {
    const title = 'should support output as (non-previously existent) path';

    const macro = test.macro<[RollupPluginSassOptions]>({
      async exec(t, pluginOptions) {
        const outputStylePath = path.join(
          getTestOutputDir(pluginOptions.api),
          'output-path/style.css',
        );

        const outputBundle = await rollup({
          input: 'test/fixtures/output-path/index.js',
          plugins: [
            sass({
              ...pluginOptions,
              output: outputStylePath,
            }),
          ],
          onwarn,
        });

        const outputFilePath = path.join(
          getTestOutputDir(pluginOptions.api),
          'support_output_prev-non-exist.js',
        );
        await outputBundle.write({
          ...TEST_GENERATE_OPTIONS,
          file: outputFilePath,
        });

        const outputFileContent = await fs.readFile(outputFilePath);
        t.is(stripNewLines(outputFileContent.toString()), '');

        const outputStyleContent = await fs.readFile(outputStylePath);
        t.true(stripNewLines(outputStyleContent.toString()).includes(expectA));
        t.true(stripNewLines(outputStyleContent.toString()).includes(expectB));
      },
      title: createApiOptionTestCaseTitle,
    });

    test(title, macro, TEST_PLUGIN_OPTIONS_DEFAULT_LEGACY);
    test(title, macro, TEST_PLUGIN_OPTIONS_DEFAULT_MODERN);
  }

  {
    const title = 'should support output as true';

    const macro = test.macro<[RollupPluginSassOptions]>({
      async exec(t, pluginOptions) {
        const outputBundle = await rollup({
          input: 'test/fixtures/output-true/index.js',
          plugins: [sass({ ...pluginOptions, output: true })],
          onwarn,
        });

        const outputFilePath = path.join(
          getTestOutputDir(pluginOptions.api),
          'support-output-as-true.js',
        );
        await outputBundle.write({
          ...TEST_GENERATE_OPTIONS,
          file: outputFilePath,
        });

        const outputFileContent = await fs.readFile(outputFilePath);
        t.is(stripNewLines(outputFileContent.toString()), '');

        const outputStylePath = outputFilePath.replace('.js', '.css');
        const outputStyleContent = await fs.readFile(outputStylePath);
        t.true(outputStyleContent.toString().includes(expectA));
        t.true(outputStyleContent.toString().includes(expectB));
      },
      title: createApiOptionTestCaseTitle,
    });

    test(title, macro, TEST_PLUGIN_OPTIONS_DEFAULT_LEGACY);
    test(title, macro, TEST_PLUGIN_OPTIONS_DEFAULT_MODERN);
  }
}
// #endregion

// #region processor option
{
  const title = 'should processor return as string';

  const macro = test.macro<[RollupPluginSassOptions]>({
    async exec(t, pluginOptions) {
      const reverse = (str: string): string => str.split('').reverse().join('');

      const outputBundle = await rollup({
        input: 'test/fixtures/processor-string/index.js',
        plugins: [sass({ ...pluginOptions, processor: (css) => reverse(css) })],
      });
      const { output } = await outputBundle.generate(TEST_GENERATE_OPTIONS);
      const result = getFirstChunkCode(output);

      t.snapshot(result);
    },
    title: createApiOptionTestCaseTitle,
  });

  test(title, macro, TEST_PLUGIN_OPTIONS_DEFAULT_LEGACY);
  test(title, macro, TEST_PLUGIN_OPTIONS_DEFAULT_MODERN);
}

{
  const title = 'should processor return as object';

  const macro = test.macro<[RollupPluginSassOptions]>({
    async exec(t, pluginOptions) {
      const outputBundle = await rollup({
        input: 'test/fixtures/processor-object/index.js',
        plugins: [
          sass({
            ...pluginOptions,
            processor: (css) => ({
              css,
              foo: 'foo',
              bar: 'bar',
            }),
          }),
        ],
      });
      const { output } = await outputBundle.generate(TEST_GENERATE_OPTIONS);
      const result = getFirstChunkCode(output);

      t.snapshot(result);
    },
    title: createApiOptionTestCaseTitle,
  });

  test(title, macro, TEST_PLUGIN_OPTIONS_DEFAULT_LEGACY);
  test(title, macro, TEST_PLUGIN_OPTIONS_DEFAULT_MODERN);
}

{
  const title = 'should support processor return type `Promise<string>`';

  const macro = test.macro<[RollupPluginSassOptions]>({
    async exec(t, pluginOptions) {
      const outputBundle = await rollup({
        input: 'test/fixtures/processor-promise/index.js',
        plugins: [
          sass({
            ...pluginOptions,
            processor: (css) =>
              new Promise((resolve) => setTimeout(() => resolve(css), 100)),
          }),
        ],
      });
      const { output } = await outputBundle.generate(TEST_GENERATE_OPTIONS);
      const result = getFirstChunkCode(output);

      t.snapshot(result);
    },
    title: createApiOptionTestCaseTitle,
  });

  test(title, macro, TEST_PLUGIN_OPTIONS_DEFAULT_LEGACY);
  test(title, macro, TEST_PLUGIN_OPTIONS_DEFAULT_MODERN);
}

{
  const title =
    'should support processor return type `Promise<{css: string, icssExport: {}, icssImport: {}}}>';

  const macro = test.macro<[RollupPluginSassOptions]>({
    async exec(t, pluginOptions) {
      const outputBundle = await rollup({
        input: 'test/fixtures/processor-promise/with-icss-exports.js',
        plugins: [
          sass({
            ...pluginOptions,
            processor: (css) => {
              const pcssRootNodeRslt = postcss.parse(css);
              const extractedIcss = extractICSS(pcssRootNodeRslt, true);
              const cleanedCss = pcssRootNodeRslt.toString();
              const out = {
                ...extractedIcss.icssExports,
                css: cleanedCss,
              };
              // console.table(extractedIcss);
              // console.log(out);
              return out;
            },
          }),
        ],
      });
      const { output } = await outputBundle.generate(TEST_GENERATE_OPTIONS);
      const result = getFirstChunkCode(output);

      t.snapshot(result);
    },
    title: createApiOptionTestCaseTitle,
  });

  test(title, macro, TEST_PLUGIN_OPTIONS_DEFAULT_LEGACY);
  test(title, macro, TEST_PLUGIN_OPTIONS_DEFAULT_MODERN);
}

{
  const title =
    'should throw an error when processor returns an object type missing the `css` prop.';

  const macro = test.macro<[RollupPluginSassOptions]>({
    async exec(t, pluginOptions) {
      const sassPlugin = sass({
        ...pluginOptions,
        // @ts-expect-error - Ignoring incorrect type (for test).
        processor: () => ({}),
      });
      const message =
        'You need to return the styles using the `css` property. See https://github.com/differui/rollup-plugin-sass#processor';

      await t.throwsAsync(
        () =>
          rollup({
            input: 'test/fixtures/processor-error/index.js',
            plugins: [sassPlugin],
          }),
        { message },
      );
    },
    title: createApiOptionTestCaseTitle,
  });

  test(title, macro, TEST_PLUGIN_OPTIONS_DEFAULT_LEGACY);
  test(title, macro, TEST_PLUGIN_OPTIONS_DEFAULT_MODERN);
}
// #endregion

// #region node resolution
{
  const title = 'should resolve ~ as node_modules';

  const macro = test.macro<[RollupPluginSassOptions]>({
    async exec(t, pluginOptions) {
      const outputBundle = await rollup({
        input: 'test/fixtures/import/index.js',
        plugins: [sass(pluginOptions)],
      });
      const { output } = await outputBundle.generate(TEST_GENERATE_OPTIONS);
      const result = getFirstChunkCode(output);

      t.snapshot(result);
    },
    title: createApiOptionTestCaseTitle,
  });

  test(title, macro, TEST_PLUGIN_OPTIONS_DEFAULT_LEGACY);
  test(title, macro, TEST_PLUGIN_OPTIONS_DEFAULT_MODERN);
}

{
  const title =
    'should resolve ~ as node_modules and output javascript modules';

  const macro = test.macro<[RollupPluginSassOptions]>({
    async exec(t, pluginOptions) {
      const outputFilePathES = path.join(
        getTestOutputDir(pluginOptions.api),
        'import_scss_and_sass.es.js',
      );
      const outputFilePathCJS = path.join(
        getTestOutputDir(pluginOptions.api),
        'import_scss_and_sass.cjs.js',
      );

      const outputBundle = await rollup({
        input: 'test/fixtures/import/index.js',
        plugins: [sass(pluginOptions)],
      });
      const { output } = await outputBundle.generate(TEST_GENERATE_OPTIONS);
      const result = getFirstChunkCode(output);

      t.snapshot(result, 'check output result code');

      // Test 'es' module output
      // ----
      await outputBundle.write({
        format: 'es',
        file: outputFilePathES,
      });

      const esFileContent = await fs.readFile(outputFilePathES);
      t.snapshot(
        esFileContent.toString(),
        'Ensure content exist in ESM output file',
      );

      // Test 'cjs' module output
      // ----
      await outputBundle.write({
        format: 'cjs',
        file: outputFilePathCJS,
      });

      const cjsFileContent = await fs.readFile(outputFilePathCJS);
      t.snapshot(
        cjsFileContent.toString(),
        'Ensure content exist in CJS output file',
      );
    },
    title: createApiOptionTestCaseTitle,
  });

  test(title, macro, TEST_PLUGIN_OPTIONS_DEFAULT_LEGACY);
  test(title, macro, TEST_PLUGIN_OPTIONS_DEFAULT_MODERN);
}
// #endregion

{
  const title = 'should support options.runtime';

  const macro = test.macro<[RollupPluginSassOptions]>({
    async exec(t, pluginOptions) {
      const outputBundle = await rollup({
        input: 'test/fixtures/runtime/index.js',
        plugins: [
          sass({
            ...pluginOptions,
            runtime: sassRuntime,
          }),
        ],
      });
      const { output } = await outputBundle.generate(TEST_GENERATE_OPTIONS);
      const result = getFirstChunkCode(output);

      t.snapshot(result);
    },
    title: createApiOptionTestCaseTitle,
  });

  test(title, macro, TEST_PLUGIN_OPTIONS_DEFAULT_LEGACY);
  test(title, macro, TEST_PLUGIN_OPTIONS_DEFAULT_MODERN);
}

// #region sourcemap
{
  const title =
    "When `sourcemap` isn't set adjacent source map files should not be output, and rollup output chunk shouldn't contain a `map` entry";

  const macro = test.macro<[RollupPluginSassOptions]>({
    async exec(t, pluginOptions) {
      const outputFilePath = path.join(
        getTestOutputDir(pluginOptions.api),
        'with-no-adjacent-source-map.js',
      );

      const bundle = await rollup({
        input: 'test/fixtures/basic/index.js',
        plugins: [sass(pluginOptions)],
      });
      const sourceMapFilePath = `${outputFilePath}.map`;

      // Run test
      const writeResult = await bundle.write({
        file: outputFilePath,
        format: 'esm',
      });

      const writeResultOutput = writeResult.output;

      // Check for output chunk
      t.true(
        !!writeResult.output?.length,
        'output should contain an output chunk',
      );

      // Check absence of 'map' entry in chunk
      t.falsy(
        writeResultOutput[0].map,
        "output chunk's `map` property should not be set.  It should equal `null` or `undefined`",
      );

      // Check for absence of source map file
      await fs.access(sourceMapFilePath, fs.constants.R_OK).then(
        () => t.false(true, `'${sourceMapFilePath}' should not exist.`),
        () => t.true(true),
      );
    },
    title: createApiOptionTestCaseTitle,
  });

  test(title, macro, TEST_PLUGIN_OPTIONS_DEFAULT_LEGACY);
  test(title, macro, TEST_PLUGIN_OPTIONS_DEFAULT_MODERN);
}

{
  const title =
    'When `sourcemap` is set, to `true`, adjacent source map file should be output, and rollup output chunk should contain `map` entry';

  const macro = test.macro<[RollupPluginSassOptions]>({
    async exec(t, pluginOptions) {
      const outputFilePath = path.join(
        getTestOutputDir(pluginOptions.api),
        'with-adjacent-source-map.js',
      );
      const bundle = await rollup({
        input: 'test/fixtures/basic/index.js',
        plugins: [sass(pluginOptions)],
      });
      const sourceMapFilePath = `${outputFilePath}.map`;

      const writeResult = await bundle.write({
        file: outputFilePath,
        sourcemap: true,
        format: 'esm',
      });

      // Check for output chunk
      t.true(
        !!writeResult.output?.length,
        'output should contain an output chunk',
      );

      // Check for 'map' entry in chunk
      t.true(
        !!writeResult.output[0].map,
        "rollup output output chunk's `map` property should be set",
      );

      // Check for source map file
      const contents = await fs.readFile(sourceMapFilePath);

      t.true(
        !!contents.toString(),
        `${sourceMapFilePath} should have been written.`,
      );
    },
    title: createApiOptionTestCaseTitle,
  });

  test(title, macro, TEST_PLUGIN_OPTIONS_DEFAULT_LEGACY);
  test(title, macro, TEST_PLUGIN_OPTIONS_DEFAULT_MODERN);
}
// #endregion

{
  const title = 'module stylesheets graph should be added to watch list';

  const macro = test.macro<[RollupPluginSassOptions]>({
    async exec(t, pluginOptions) {
      const inputFilePath = 'test/fixtures/dependencies/index.js';

      // Bundle our dependencies fixture module
      // ----
      const bundle = await rollup({
        input: inputFilePath,
        plugins: [sass(pluginOptions)],
      });

      // List of nested stylesheets paths
      // ----
      const nestedFilePaths = [
        'test/fixtures/dependencies/style1.scss',
        'test/fixtures/dependencies/empty-style1.scss',
        'test/fixtures/dependencies/style2.sass',
        'test/fixtures/dependencies/style3.scss',
        'test/fixtures/dependencies/empty-style3.scss',
        'test/fixtures/dependencies/empty-style2.sass',
      ];

      const expectedWatchedFiles = [
        'test/fixtures/dependencies/index.js',
        ...nestedFilePaths,
      ];

      // Run tests
      // ----

      // Check `watchFiles` count (watched ones plus 'index.js' one)
      t.deepEqual(
        bundle.watchFiles.length,
        expectedWatchedFiles.length,
        'should contain expected number of "watched" files',
      );

      // Ensure our initial 'index.js' module is being watched
      t.true(
        bundle.watchFiles[0].endsWith(inputFilePath),
        'Expected `bundle.watchFiles[0]` to end with "index.js"',
      );

      // Ensure 'index.js' module, and other files in dep tree are watched
      expectedWatchedFiles.forEach((filePath) => {
        t.true(
          bundle.watchFiles.some((it) => it.endsWith(filePath)),
          `${filePath} should be included among "bundle.watchFiles"`,
        );
      });

      // Get target module.
      // ----
      const targetModule = bundle?.cache?.modules[0]!;
      t.true(!!targetModule, 'Expected bundle data');

      // Ensure target module transform dependencies indeed end with expected file path tails.
      // ----
      t.true(
        targetModule.transformDependencies?.every(
          (filePath) =>
            !!expectedWatchedFiles.find((fp) => filePath.endsWith(fp)),
        ),
        '`bundle.cache.modules[0].transformDependencies` entries should each end with expected file-path tails',
      );

      // Test final content output
      // ----
      const expectedFinalContent = await fs.readFile(
        'test/fixtures/dependencies/expected.js',
      );
      t.is(targetModule.code.trim(), expectedFinalContent.toString().trim());
    },
    title: createApiOptionTestCaseTitle,
  });

  test(title, macro, TEST_PLUGIN_OPTIONS_DEFAULT_LEGACY);
  test(title, macro, TEST_PLUGIN_OPTIONS_DEFAULT_MODERN);
}
