import test from 'ava';
import Sinon from 'sinon';
import { readFileSync, promises as fs, constants as fsConstants } from 'fs';
import * as path from 'path';
import { rollup } from 'rollup';
import type {
  OutputOptions,
  RollupOutput,
  WarningHandlerWithDefault,
} from 'rollup';
import * as sassRuntime from 'sass';
import * as sassEmbeddedRuntime from 'sass-embedded';
import postcss from 'postcss';
import { extractICSS } from 'icss-utils';

import sass from '../src/index';
import { RollupPluginSassOutputFn } from '../src/types';
import { fileURLToPath, pathToFileURL } from 'url';

const repoRoot = path.join(__dirname, '../');

const TEST_OUTPUT_DIR = path.join(repoRoot, '.tests-output/modern');

const TEST_SASS_OPTIONS_DEFAULT: sassRuntime.Options<'async'> = {
  style: 'compressed',
};

const TEST_BASE_CONFIG = {
  plugins: [
    sass({
      api: 'modern',
      options: TEST_SASS_OPTIONS_DEFAULT,
    }),
  ],
};

const TEST_GENERATE_OPTIONS = {
  format: 'es',
} as OutputOptions;

const TEST_OUTPUT_OPTIONS = {
  format: 'es',
  file: path.join(TEST_OUTPUT_DIR, 'bundle.js'),
} as const;

function stripNewLines(str: string): string {
  return str.trim().replace(/[\n\r\f]/g, '');
}

function getFirstChunkCode(outputChunks: RollupOutput['output']): string {
  return outputChunks[0].code;
}

// test('should import *.scss and *.sass files', async (t) => {
//   const outputBundle = await rollup({
//     input: 'test/fixtures/basic/index.js',
//     ...TEST_BASE_CONFIG,
//   });
//   const { output } = await outputBundle.generate({
//     format: 'es',
//     file: path.join(TEST_OUTPUT_DIR, 'import_scss_and_sass.js'),
//   });
//   const result = getFirstChunkCode(output);

//   t.snapshot(result);
// });

// test('should compress the dest CSS', async (t) => {
//   const outputBundle = await rollup({
//     ...TEST_BASE_CONFIG,
//     input: 'test/fixtures/compress/index.js',
//   });
//   const { output } = await outputBundle.generate(TEST_GENERATE_OPTIONS);
//   const result = getFirstChunkCode(output);

//   t.snapshot(result);
// });

// test('should custom importer works', async (t) => {
//   const outputBundle = await rollup({
//     input: 'test/fixtures/custom-importer/index.js',
//     plugins: [
//       sass({
//         api: 'modern',
//         options: {
//           ...TEST_SASS_OPTIONS_DEFAULT,
//           importers: [
//             {
//               findFileUrl(url, context) {
//                 const folder = path.dirname(
//                   fileURLToPath(context.containingUrl!),
//                 );
//                 const filePath = path.join(
//                   folder,
//                   decodeURIComponent(url).replace('${name}', 'actual_a'),
//                 );

//                 return new URL(pathToFileURL(filePath));
//               },
//             },
//           ],
//         },
//       }),
//     ],
//   });
//   const { output } = await outputBundle.generate(TEST_GENERATE_OPTIONS);
//   const result = getFirstChunkCode(output);

//   t.snapshot(result);
// });

// test('should support options.data', async (t) => {
//   const jsVars = { color_red: 'red' };
//   const scssVars = Object.entries(jsVars).reduce(
//     (prev, [varName, varValue]) => `${prev}$${varName}:${varValue};`,
//     '',
//   );
//   const outputBundle = await rollup({
//     input: 'test/fixtures/data/index.js',
//     plugins: [
//       sass({
//         api: 'modern',
//         options: {
//           ...TEST_SASS_OPTIONS_DEFAULT,
//           data: scssVars,
//         },
//       }),
//     ],
//   });
//   const { output } = await outputBundle.generate(TEST_GENERATE_OPTIONS);
//   const result = getFirstChunkCode(output);

//   t.snapshot(result);
// });

// // #region insert option
// {
//   test('should insert CSS into head tag', async (t) => {
//     const outputBundle = await rollup({
//       input: 'test/fixtures/insert/index.js',
//       plugins: [
//         sass({
//           api: 'modern',
//           insert: true,
//           options: TEST_SASS_OPTIONS_DEFAULT,
//         }),
//       ],
//     });
//     const { output } = await outputBundle.generate(TEST_GENERATE_OPTIONS);

//     const outputFilePath = path.join(TEST_OUTPUT_DIR, 'insert-bundle');

//     await outputBundle.write({ dir: outputFilePath });

//     t.is(
//       output.length,
//       1,
//       'has 1 chunk (we are bundling all in one single file)',
//     );

//     const [{ moduleIds, modules }] = output;

//     t.is(
//       moduleIds.filter((it) => it.endsWith('insertStyle')).length,
//       1,
//       'include insertStyle one time',
//     );

//     const actualAModuleID = moduleIds.find((it) =>
//       it.endsWith('actual_a.scss'),
//     ) as string;
//     const actualAModule = modules[actualAModuleID];
//     t.truthy(actualAModule);
//     t.snapshot(
//       actualAModule.code,
//       'actual_a content is compiled with insertStyle',
//     );

//     const actualBModuleID = moduleIds.find((it) =>
//       it.endsWith('actual_b.scss'),
//     ) as string;
//     const actualBModule = modules[actualBModuleID];
//     t.truthy(actualBModule);
//     t.snapshot(
//       actualBModule.code,
//       'actual_b content is compiled with insertStyle',
//     );
//   });

//   test('should generate chunks with import insertStyle when `insert` is true', async (t) => {
//     const outputBundle = await rollup({
//       input: {
//         entryA: 'test/fixtures/multiple-entry-points/entryA.js',
//         entryB: 'test/fixtures/multiple-entry-points/entryB.js',
//       },
//       plugins: [
//         sass({
//           api: 'modern',
//           insert: true,
//           options: TEST_SASS_OPTIONS_DEFAULT,
//         }),
//       ],
//     });

//     const { output } = await outputBundle.generate({
//       ...TEST_GENERATE_OPTIONS,
//       preserveModules: true,
//       preserveModulesRoot: 'src',
//     });

//     const outputFilePath = path.join(TEST_OUTPUT_DIR, 'insert-multiple-entry');

//     await outputBundle.write({
//       dir: outputFilePath,
//       preserveModules: true,
//       preserveModulesRoot: 'src',
//     });

//     t.is(output.length, 5, 'has 5 chunks');

//     const outputFileNames = output.map((it) => it.fileName);

//     t.is(
//       outputFileNames.filter((it) => it.startsWith('entry')).length,
//       2,
//       '1 chunk for each entry (2)',
//     );
//     t.is(
//       outputFileNames.filter((it) => it.startsWith('assets/actual')).length,
//       2,
//       '1 chunk for each entry style import (2)',
//     );
//     t.is(
//       outputFileNames.filter((it) => it.endsWith('insertStyle.js')).length,
//       1,
//       '1 chunk for insertStyle helper',
//     );

//     const styleFiles = output.filter((it) =>
//       it.fileName.startsWith('assets/actual'),
//     );

//     t.true(
//       styleFiles.every((outputItem) => {
//         if (outputItem.type === 'chunk') {
//           const insertStyleImportsCount = outputItem.imports.filter((it) =>
//             it.endsWith('insertStyle.js'),
//           ).length;
//           return insertStyleImportsCount === 1;
//         }
//         // no asset should be present here
//         return false;
//       }),
//       'each chunk must include insertStyle once',
//     );
//   });
// }
// // #endregion

// #region output option
{
  const onwarn: WarningHandlerWithDefault = (warning, defaultHandler) => {
    if (warning.code === 'EMPTY_BUNDLE') {
      return;
    }
    defaultHandler(warning);
  };

  const [expectA, expectB] = [
    'test/assets/expect_a.css',
    'test/assets/expect_b.css',
  ].map((filePath) =>
    stripNewLines(readFileSync(filePath, { encoding: 'utf-8' })),
  );

  /**
   * @warning
   * Right now we can't use snapshot testing on this tests because sometimes rollup mess with the order of imports.
   * Detailed information can be found here: https://github.com/elycruz/rollup-plugin-sass/pull/143#issuecomment-2227274405
   */

  test('should support output as function', async (t) => {
    const outputSpy = Sinon.spy() as Sinon.SinonSpy<
      Parameters<RollupPluginSassOutputFn>,
      ReturnType<RollupPluginSassOutputFn>
    >;
    const outputFilePath = path.join(
      TEST_OUTPUT_DIR,
      'support_output_function.js',
    );

    const outputBundle = await rollup({
      input: 'test/fixtures/output-function/index.js',
      plugins: [
        sass({
          api: 'modern',
          output: outputSpy,
          options: TEST_SASS_OPTIONS_DEFAULT,
        }),
      ],
      onwarn,
    });

    await outputBundle.write({ ...TEST_OUTPUT_OPTIONS, file: outputFilePath });

    const result = await fs
      .readFile(outputFilePath)
      .catch(() =>
        t.true(false, `Trouble reading back written file "${outputFilePath}".`),
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
  });

  test('should support output as (non-previously existent) path', async (t) => {
    const outputStylePath = path.join(TEST_OUTPUT_DIR, 'output-path/style.css');

    const outputBundle = await rollup({
      input: 'test/fixtures/output-path/index.js',
      plugins: [
        sass({
          api: 'modern',
          output: outputStylePath,
          options: TEST_SASS_OPTIONS_DEFAULT,
        }),
      ],
      onwarn,
    });

    const outputFilePath = path.join(
      TEST_OUTPUT_DIR,
      'support_output_prev-non-exist.js',
    );
    await outputBundle.write({ ...TEST_OUTPUT_OPTIONS, file: outputFilePath });

    const outputFileContent = await fs.readFile(outputFilePath);
    t.is(stripNewLines(outputFileContent.toString()), '');

    const outputStyleContent = await fs.readFile(outputStylePath);
    t.true(stripNewLines(outputStyleContent.toString()).includes(expectA));
    t.true(stripNewLines(outputStyleContent.toString()).includes(expectB));
  });

  test('should support output as true', async (t) => {
    const outputBundle = await rollup({
      input: 'test/fixtures/output-true/index.js',
      plugins: [
        sass({
          api: 'modern',
          output: true,
          options: TEST_SASS_OPTIONS_DEFAULT,
        }),
      ],
      onwarn,
    });

    const outputFilePath = path.join(
      TEST_OUTPUT_DIR,
      'support-output-as-true.js',
    );
    await outputBundle.write({ ...TEST_OUTPUT_OPTIONS, file: outputFilePath });

    const outputFileContent = await fs.readFile(outputFilePath);
    t.is(stripNewLines(outputFileContent.toString()), '');

    const outputStylePath = outputFilePath.replace('.js', '.css');
    const outputStyleContent = await fs.readFile(outputStylePath);
    t.true(outputStyleContent.toString().includes(expectA));
    t.true(outputStyleContent.toString().includes(expectB));
  });
}
// #endregion

// #region processor option
test('should processor return as string', async (t) => {
  const reverse = (str: string): string => str.split('').reverse().join('');

  const outputBundle = await rollup({
    input: 'test/fixtures/processor-string/index.js',
    plugins: [
      sass({
        api: 'modern',
        processor: (css) => reverse(css),
        options: TEST_SASS_OPTIONS_DEFAULT,
      }),
    ],
  });
  const { output } = await outputBundle.generate(TEST_GENERATE_OPTIONS);
  const result = getFirstChunkCode(output);

  t.snapshot(result);
});

test('should processor return as object', async (t) => {
  const outputBundle = await rollup({
    input: 'test/fixtures/processor-object/index.js',
    plugins: [
      sass({
        api: 'modern',
        processor: (css) => ({
          css,
          foo: 'foo',
          bar: 'bar',
        }),
        options: TEST_SASS_OPTIONS_DEFAULT,
      }),
    ],
  });
  const { output } = await outputBundle.generate(TEST_GENERATE_OPTIONS);
  const result = getFirstChunkCode(output);

  t.snapshot(result);
});

test('should support processor return type `Promise<string>`', async (t) => {
  const outputBundle = await rollup({
    input: 'test/fixtures/processor-promise/index.js',
    plugins: [
      sass({
        api: 'modern',
        processor: (css) =>
          new Promise((resolve) => setTimeout(() => resolve(css), 100)),
        options: TEST_SASS_OPTIONS_DEFAULT,
      }),
    ],
  });
  const { output } = await outputBundle.generate(TEST_GENERATE_OPTIONS);
  const result = getFirstChunkCode(output);

  t.snapshot(result);
});

test('should support processor return type `Promise<{css: string, icssExport: {}, icssImport: {}}}>', async (t) => {
  const outputBundle = await rollup({
    input: 'test/fixtures/processor-promise/with-icss-exports.js',
    plugins: [
      sass({
        api: 'modern',
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
        options: TEST_SASS_OPTIONS_DEFAULT,
      }),
    ],
  });
  const { output } = await outputBundle.generate(TEST_GENERATE_OPTIONS);
  const result = getFirstChunkCode(output);

  t.snapshot(result);
});

test('should throw an error when processor returns an object type missing the `css` prop.', async (t) => {
  const sassPlugin = sass({
    api: 'modern',
    // @ts-expect-error - Ignoring incorrect type (for test).
    processor: () => ({}),
    options: TEST_SASS_OPTIONS_DEFAULT,
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
});
// #endregion

// #region node resolution
test('should resolve ~ as node_modules', async (t) => {
  const outputBundle = await rollup({
    input: 'test/fixtures/import/index.js',
    plugins: [
      sass({
        api: 'modern',
        options: TEST_SASS_OPTIONS_DEFAULT,
      }),
    ],
  });
  const { output } = await outputBundle.generate(TEST_GENERATE_OPTIONS);
  const result = getFirstChunkCode(output);

  t.snapshot(result);
});

test('should resolve ~ as node_modules and output javascript modules', async (t) => {
  const outputFilePathES = path.join(
    TEST_OUTPUT_DIR,
    'import_scss_and_sass.es.js',
  );
  const outputFilePathCJS = path.join(
    TEST_OUTPUT_DIR,
    'import_scss_and_sass.cjs.js',
  );

  const outputBundle = await rollup({
    input: 'test/fixtures/import/index.js',
    plugins: [
      sass({
        api: 'modern',
        options: TEST_SASS_OPTIONS_DEFAULT,
      }),
    ],
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
});
// #endregion

test('should support options.runtime', async (t) => {
  const outputBundle = await rollup({
    input: 'test/fixtures/runtime/index.js',
    plugins: [
      sass({
        api: 'modern',
        runtime: sassEmbeddedRuntime,
        options: TEST_SASS_OPTIONS_DEFAULT,
      }),
    ],
  });
  const { output } = await outputBundle.generate(TEST_GENERATE_OPTIONS);
  const result = getFirstChunkCode(output);

  t.snapshot(result);
});

// #region sourcemap
test("When `sourcemap` isn't set adjacent source map files should not be output, and rollup output chunk shouldn't contain a `map` entry", async (t) => {
  const outputFilePath = path.join(
    TEST_OUTPUT_DIR,
    'with-no-adjacent-source-map.js',
  );

  const bundle = await rollup({
    input: 'test/fixtures/basic/index.js',
    plugins: [
      sass({
        api: 'modern',
        options: TEST_SASS_OPTIONS_DEFAULT,
      }),
    ],
  });
  const sourceMapFilePath = `${outputFilePath}.map`;

  // Run test
  const writeResult = await bundle.write({
    file: outputFilePath,
    format: 'esm',
  });

  const writeResultOutput = writeResult.output;

  // Check for output chunk
  t.true(!!writeResult.output?.length, 'output should contain an output chunk');

  // Check absence of 'map' entry in chunk
  t.falsy(
    writeResultOutput[0].map,
    "output chunk's `map` property should not be set.  It should equal `null` or `undefined`",
  );

  // Check for absence of source map file
  await fs.access(sourceMapFilePath, fsConstants.R_OK).then(
    () => t.false(true, `'${sourceMapFilePath}' should not exist.`),
    () => t.true(true),
  );
});

test('When `sourcemap` is set, to `true`, adjacent source map file should be output, and rollup output chunk should contain `map` entry', async (t) => {
  const outputFilePath = path.join(
    TEST_OUTPUT_DIR,
    'with-adjacent-source-map.js',
  );
  const bundle = await rollup({
    input: 'test/fixtures/basic/index.js',
    plugins: [
      sass({
        api: 'modern',
        options: TEST_SASS_OPTIONS_DEFAULT,
      }),
    ],
  });
  const sourceMapFilePath = `${outputFilePath}.map`;

  const writeResult = await bundle.write({
    file: outputFilePath,
    sourcemap: true,
    format: 'esm',
  });

  // Check for output chunk
  t.true(!!writeResult.output?.length, 'output should contain an output chunk');

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
});
// #endregion

test('module stylesheets graph should be added to watch list', async (t) => {
  const inputFilePath = 'test/fixtures/dependencies/index.js';

  // Bundle our dependencies fixture module
  // ----
  const bundle = await rollup({
    input: inputFilePath,
    plugins: [
      sass({
        api: 'modern',
        options: TEST_SASS_OPTIONS_DEFAULT,
      }),
    ],
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
  bundle.watchFiles.forEach((filePath, i) => {
    const expectedTail = expectedWatchedFiles[i];
    t.true(
      filePath.endsWith(expectedTail),
      `${filePath} should end with ${expectedTail}`,
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
      (filePath) => !!expectedWatchedFiles.find((fp) => filePath.endsWith(fp)),
    ),
    '`bundle.cache.modules[0].transformDependencies` entries should each end with expected file-path tails',
  );

  // Test final content output
  // ----
  const expectedFinalContent = await fs.readFile(
    'test/fixtures/dependencies/expected.js',
  );
  t.is(targetModule.code.trim(), expectedFinalContent.toString().trim());
});
