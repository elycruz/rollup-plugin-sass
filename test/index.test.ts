import test from 'ava';
import {promises as fs, constants as fsConstants} from 'fs';
import * as path from 'path';
import sinon from 'sinon';
import {OutputOptions, rollup, RollupOutput} from 'rollup';
import * as sassJs from 'sass';
import postcss from "postcss";
import {extractICSS} from "icss-utils";

import sass from "../src/index";
import { SassOptions } from "../src/types";

const repoRoot = path.join(__dirname, '../'),

  tmpDir = path.join(repoRoot, '.tests-output/'),

  sassOptions = {
    outputStyle: 'compressed',
  } as SassOptions,

  baseConfig = {
    plugins: [
      sass({
        options: sassOptions,
      }),
    ],
  },

  generateOptions = {
    format: 'es',
  } as OutputOptions,

  outputOptions = {
    format: 'es',
    file: path.join(tmpDir, 'bundle.js'),
  },

  squash = str => str.trim().replace(/[\n\r\f]/g, ''),

  reverse = str => str.split('').reverse().join(''),

  unwrap = output => output[0].code;

let expectA, expectA2, expectB, expectC, expectD, expectE;

test.before(async () => {
  const mkDir = () => fs.mkdir(tmpDir);

  // @note Conditional check here since we have a relaxed 'package.json.engines.node' value,
  //   and `fs.rmdir` is being deprecated in later versions of node (node v18+).
  // ----
  await (fs.rm ? fs.rm : fs.rmdir)(tmpDir, {recursive: true})
    .then(mkDir, mkDir)
    .then(() => Promise.all([
        'test/assets/expect_a.css',
        'test/assets/expect_a--with-icss-exports.css',
        'test/assets/expect_b.css',
        'test/assets/expect_c.css',
        'test/assets/expect_d.css',
        'test/assets/expect_e.css'
      ]
        .map(xs => fs.readFile(xs).then(buff => buff.toString()))
    ))
    .then(([a, a2, b, c, d, e]) => {
      expectA = squash(a);
      expectA2 = squash(a2);
      expectB = squash(b);
      expectC = squash(c);
      expectD = squash(d);
      expectE = squash(e);
    });
});

test('should import *.scss and *.sass files', async t => {
  const outputBundle = await rollup({
      ...baseConfig,
      input: 'test/fixtures/basic/index.js',
    }),

    {output} = await outputBundle.generate({
      format: 'es',
      file: path.join(tmpDir, 'import_scss_and_sass.js')
    }),
    rslt = squash(unwrap(output));

  t.true([expectA, expectB, expectC].every(xs => rslt.includes(xs)));
});

test("should import *.scss and *.sass files with default configuration", async (t) => {
  const outputBundle = await rollup({
      input: "test/fixtures/basic/index.js",
      plugins: [
        sass(),
      ],
    }),
    { output } = await outputBundle.generate({
      format: "es",
      file: path.join(tmpDir, "import_scss_and_sass_default_options.js"),
    }),
    rslt = squash(unwrap(output));

    t.snapshot(rslt)
});

test('should compress the dest CSS', async t => {
  const outputBundle = await rollup({
      ...baseConfig,
      input: 'test/fixtures/compress/index.js',
    }),
    {output} = await outputBundle.generate(generateOptions);

  t.true(squash(unwrap(output)).indexOf(expectD) > -1);
});

test('should custom importer works', async t => {
  const outputBundle = await rollup({
      input: 'test/fixtures/custom-importer/index.js',
      plugins: [
        sass({
          options: {
            ...sassOptions,
            importer: [
              (url, prev, done) => {
                done({
                  file: url.replace('${name}', 'actual_a'),
                });
              },
            ],
          }
        }),
      ],
    }),
    {output} = await outputBundle.generate(generateOptions);

  t.true(squash(unwrap(output)).indexOf(expectA) > -1);
});

test('should support options.data', async t => {
  const jsVars = {
    color_red: 'red',
  };
  const scssVars = Object.keys(jsVars).reduce((prev, key) => `${prev}$${key}:${jsVars[key]};`, '');
  const outputBundle = await rollup({
    input: 'test/fixtures/data/index.js',
    plugins: [
      sass({
        options: {
          ...sassOptions,
          data: scssVars,
        },
      }),
    ],
  });
  const {output} = await outputBundle.generate(generateOptions);

  t.true(squash(unwrap(output)).indexOf(expectE) > -1);
});

test('should insert CSS into head tag', async t => {
  const outputBundle = await rollup({
      input: 'test/fixtures/insert/index.js',
      plugins: [
        sass({
          insert: true,
          options: sassOptions,
        }),
      ],
    }),
    {output} = await outputBundle.generate(generateOptions);

    t.snapshot(unwrap(output));
});

test("should generate chunks with import insertStyle when `insert` is true", async (t) => {
  const outputBundle = await rollup({
    input: {
      entryA: "test/fixtures/multiple-entry-points/entryA.js",
      entryB: "test/fixtures/multiple-entry-points/entryB.js",
    },
    plugins: [
      sass({
        insert: true,
        options: sassOptions,
      }),
    ],
    output: {
      preserveModules: true,
      preserveModulesRoot: "src",
    },
    external: [/\/insertStyle\.js$/],
  });

  const { output } = await outputBundle.generate(generateOptions);

  t.is(output.length, 2, "has 2 chunks");
  t.true(
    output.every(
      (outputItem) => {
        if (outputItem.type === "chunk") {
          const insertStyleImportsCount = outputItem.imports.filter((it) =>
            it.includes("/insertStyle.js")
          ).length;
          return insertStyleImportsCount === 1;
        }
        // if is an assets there is no need to check imports
        return true;
      }
    ),
    "each chunk must include insertStyle once"
  );

  // outputBundle.write({
  //   format: 'es',
  //   dir: path.join(tmpDir, 'insert-style-preserve-modules'),
  // });
});

test('should support output as function', async t => {
  const outputSpy = sinon.spy(),
    file = path.join(tmpDir, 'import_scss_and_sass.js'),
    outputBundle = await rollup({
      input: 'test/fixtures/output-function/index.js',
      plugins: [
        sass({
          output: outputSpy,
          options: sassOptions,
        }),
      ],
    }),
    expectedSpyArg = squash(`${expectA}${expectB}`);

  await outputBundle.write({...outputOptions, file} as OutputOptions);

  await fs.readFile(file)
    .then(rslt => t.true(squash(rslt.toString()) === ''))
    .then(() => t.true(
      outputSpy.calledWith(expectedSpyArg),
      `\`outputSpy\` should've been called with \`${expectedSpyArg}\`.  `+
      `Spy called with \`${outputSpy.args[0][0]}\`, other args ` +
      `${JSON.stringify(outputSpy.args[0].slice(1))}`
    ))
    .catch(() => t.true(false, `Trouble reading back written file "${file}".`));
});

test('should support output as (non-previously existent) path', async t => {
  const outputStylePath = path.join(tmpDir, 'output-path/style.css'),
    outputBundle = await rollup({
      input: 'test/fixtures/output-path/index.js',
      plugins: [
        sass({
          output: outputStylePath,
          options: sassOptions,
        }),
      ],
    }),
    filePath = path.join(tmpDir, 'support_output_prev-non-exist.js');

  await outputBundle.write({...outputOptions, file: filePath} as OutputOptions);

  await fs.readFile(filePath)
    .then((rslt) => {
      t.is(squash(rslt.toString()), '');
    })
    .then(() => fs.readFile(outputStylePath))
    .then((rslt) => {
      t.not(squash(rslt.toString()).indexOf(expectA), -1);
      t.not(squash(rslt.toString()).indexOf(expectB), -1);
    });
});

test('should support output as true', async t => {
  const outputBundle = await rollup({
      input: 'test/fixtures/output-true/index.js',
      plugins: [
        sass({
          output: true,
          options: sassOptions,
        }),
      ],
    }),
    filePath = path.join(tmpDir, 'support-output-as-true.js');

  await outputBundle.write({...outputOptions, file: filePath} as OutputOptions);

  await fs.readFile(filePath)
    .then(rslt => t.is(squash(rslt.toString()), ''))
    .then(() => fs.readFile(filePath.replace('.js', '.css')))
    .then(rslt => squash(rslt.toString()))
    .then(rslt => {
      t.not(rslt.indexOf(expectA), -1);
      t.not(rslt.indexOf(expectB), -1);
    });
});

test('should processor return as string', async t => {
  const outputBundle = await rollup({
      input: 'test/fixtures/processor-string/index.js',
      plugins: [
        sass({
          processor: css => reverse(css),
          options: sassOptions,
        }),
      ],
    }),
    {output} = await outputBundle.generate(generateOptions);

  t.true(squash(unwrap(output)).indexOf(reverse(expectA)) > -1);
  t.true(squash(unwrap(output)).indexOf(reverse(expectB)) > -1);
});

test('should processor return as object', async t => {
  const outputBundle = await rollup({
    input: 'test/fixtures/processor-object/index.js',
    plugins: [
      sass({
        processor(css) {
          return {
            css,
            foo: 'foo',
            bar: 'bar',
          };
        },
        options: sassOptions,
      }),
    ],
  });
  const {output} = await outputBundle.generate(generateOptions);

  t.true(squash(unwrap(output)).indexOf(expectA) > -1);
  t.true(squash(unwrap(output)).indexOf(expectB) > -1);
  t.true(squash(unwrap(output)).indexOf('foo') > -1);
  t.true(squash(unwrap(output)).indexOf('bar') > -1);
});

test('should support processor return type `Promise<string>`', async t => {
  const outputBundle = await rollup({
      input: 'test/fixtures/processor-promise/index.js',
      plugins: [
        sass({
          processor: (css) => new Promise(resolve =>
            setTimeout(() => resolve(css), 100)),
          options: sassOptions,
        }),
      ],
    }),
    {output} = await outputBundle.generate(generateOptions);

  t.true(squash(unwrap(output)).indexOf(expectA) > -1);
  t.true(squash(unwrap(output)).indexOf(expectB) > -1);
});

test('should support processor return type `Promise<{css: string, icssExport: {}, icssImport: {}}}>', async t => {
  const outputBundle = await rollup({
      input: 'test/fixtures/processor-promise/with-icss-exports.js',
      plugins: [
        sass({
          processor: (css) => new Promise((resolve) => {
            const pcssRootNodeRslt = postcss.parse(css),
              extractedIcss = extractICSS(pcssRootNodeRslt, true),
              cleanedCss = pcssRootNodeRslt.toString(),
              out = Object.assign({}, extractedIcss.icssExports, {
                css: cleanedCss,
              });
            // console.table(extractedIcss);
            // console.log(out);
            resolve(out);
          }),
          options: sassOptions,
        }),
      ],
    }),
    {output} = await outputBundle.generate(generateOptions),
    rslt = squash(unwrap(output));

  t.true(rslt.includes(expectA2));
  t.true(rslt.includes(expectB));
});

test('should throw an error when processor returns an object type missing the `css` prop.', async t => {
  await t.throwsAsync(async () => rollup({
    input: 'test/fixtures/processor-error/index.js',
    plugins: [
      sass({
        // @ts-ignore - Ignoring incorrect type (for test).
        processor: () => ({}),
        options: sassOptions,
      }),
    ],
  }), {
    message: 'You need to return the styles using the `css` property. See https://github.com/differui/rollup-plugin-sass#processor',
  });
});

test('should resolve ~ as node_modules', async t => {
  const outputBundle = await rollup({
    input: 'test/fixtures/import/index.js',
    plugins: [
      sass({
        options: sassOptions,
      }),
    ],
  });
  const {output} = await outputBundle.generate(generateOptions);

  t.true(squash(unwrap(output)).indexOf(expectA) > -1);
  t.true(squash(unwrap(output)).indexOf(expectB) > -1);
  t.true(squash(unwrap(output)).indexOf(expectC) > -1);
});

test('should resolve ~ as node_modules and output javascript modules', async t => {
  const outputBundle = await rollup({
      input: 'test/fixtures/import/index.js',
      plugins: [
        sass({
          options: sassOptions,
        }),
      ],
    }),
    outputFilePath = path.join(tmpDir, 'import_scss_and_sass.es.js'),
    outputFilePath2 = path.join(tmpDir, 'import_scss_and_sass.cjs.js'),
    expectedInOutput = `${expectA + expectB + expectC}`,
    {output} = await outputBundle.generate(generateOptions),
    outputRslt = squash(unwrap(output));

  t.true(outputRslt.includes(expectedInOutput),
    `${JSON.stringify(outputRslt)}.includes(\`${expectedInOutput}\`)`);

  // Test 'es' module output
  // ----
  await Promise.all([
    outputBundle.write({
      format: 'es',
      file: outputFilePath
    })
      .then(() => fs.readFile(outputFilePath))
      .then(data => {
        const rslt = squash(data.toString());

        // Ensure content exist in output file
        t.true(rslt.includes(expectedInOutput),
          `${JSON.stringify(rslt)}.includes(\`${expectedInOutput}\`)`)
      }),

    // Test 'cjs' module output
    // ----
    outputBundle.write({
      format: 'cjs',
      file: outputFilePath2
    })
      .then(() => fs.readFile(outputFilePath2))
      .then(data => {
        const rslt = squash(data.toString());

        // Ensure content exist in output file
        t.true(rslt.includes(expectedInOutput),
          `${JSON.stringify(rslt)}.includes(\`${expectedInOutput}\`)`)
      })
  ]);
});

test('should support options.runtime', async t => {
  const outputBundle = await rollup({
      input: 'test/fixtures/runtime/index.js',
      plugins: [
        sass({
          runtime: sassJs,
          options: sassOptions,
        }),
      ],
    }),
    {output} = await outputBundle.generate(generateOptions),
    rslt = squash(unwrap(output));

  t.true([expectA, expectB, expectC].every(xs => rslt.includes(xs)));
});

test('When `sourcemap` isn\'t set adjacent source map files should not be output, and ' +
  'rollup output chunk shouldn\'t contain a `map` entry', async t => {
  const outputFilePath = path.join(tmpDir, 'with-no-adjacent-source-map.js'),

    bundle = await rollup({
      input: 'test/fixtures/basic/index.js',
      plugins: [
        sass({
          options: sassOptions
        }),
      ],
    }),

    sourceMapFilePath = `${outputFilePath}.map`;

  // Run test
  await bundle.write({file: outputFilePath, format: 'esm'})
    .then((rslt: RollupOutput): Promise<any> => {
      // Check for output chunk
      t.true(rslt && rslt.output && !!rslt.output.length, 'output should contain an output chunk');

      // Check absence of 'map' entry in chunk
      t.true(rslt.output[0].map === null || rslt.output[0].map === undefined,
        'output chunk\'s `map` property should not be set.  It should equal `null` or `undefined`');

      // Check for absence of source map file
      return fs.access(sourceMapFilePath, fsConstants.R_OK)
        .then(() => t.false(true, `'${sourceMapFilePath}' should not exist.`),
          () => t.true(true)
        );
    });
});

test('When `sourcemap` is set, to `true`, adjacent source map file should be output, and ' +
  'rollup output chunk should contain `map` entry', async t => {
  const outputFilePath = path.join(tmpDir, 'with-adjacent-source-map.js'),

    bundle = await rollup({
      input: 'test/fixtures/basic/index.js',
      plugins: [
        sass({
          options: sassOptions
        }),
      ],
    }),

    sourceMapFilePath = `${outputFilePath}.map`;

  await bundle.write({file: outputFilePath, sourcemap: true, format: 'esm'})
    .then((rslt: RollupOutput): Promise<any> => {
      // Check for output chunk
      t.true(rslt && rslt.output && !!rslt.output.length, 'output should contain an output chunk');

      // Check for 'map' entry in chunk
      t.true(!!rslt.output[0].map, 'rollup output output chunk\'s `map` property should be set');

      // Check for source map file
      return fs.readFile(sourceMapFilePath)
        .then(contents => {
          t.true(!!contents.toString(), `${sourceMapFilePath} should have been written.`);
        });
    });
});

test('module stylesheets graph should be added to watch list', t => {
  const inputFilePath = 'test/fixtures/dependencies/index.js';

  // Bundle our dependencies fixture module
  // ----
  return rollup({
    input: inputFilePath,
    plugins: [
      sass({
        options: sassOptions
      })
    ]
  })
    // Load nested style sheet contents and return associated list of filename and content tuples
    // ----
    .then(bundle => {
      return Promise.all([
          'test/fixtures/dependencies/style1.scss',
          'test/fixtures/dependencies/empty-style1.scss',
          'test/fixtures/dependencies/style2.sass',
          'test/fixtures/dependencies/style3.scss',
          'test/fixtures/dependencies/empty-style3.scss',
          'test/fixtures/dependencies/empty-style2.sass',
        ]
          .map(filePath => fs.readFile(filePath).then(buf => [filePath, squash(buf.toString())]))
      )
        // Run tests
        // ----
        .then(async nestedFilePathsAndContents => {
          const expectedWatchedFiles = ['test/fixtures/dependencies/index.js']
            .concat(nestedFilePathsAndContents.map(([fp]) => fp));

          // Check `watchFiles` count (watched ones plus 'index.js' one)
          t.deepEqual(bundle.watchFiles.length, expectedWatchedFiles.length, 'should contain expected number of "watched" files');

          // Ensure 'index.js' module, and other files in dep tree are watched
          bundle.watchFiles.forEach((filePath, i) => {
            const expectedTail = expectedWatchedFiles[i];
            t.true(filePath.endsWith(expectedTail), `${filePath} should end with ${expectedTail}`);
          });

          // Get target module.
          // ----
          const targetModule = bundle?.cache?.modules[0];
          t.true(!!targetModule, 'Expected bundle data');

          // Ensure target module transform dependencies indeed end with expected file path tails.
          // ----
          t.true(targetModule.transformDependencies?.every(filePath => {
            return !!expectedWatchedFiles.find(fp => filePath.endsWith(fp));
          }), '`bundle.cache.modules[0].transformDependencies` entries should' +
            ' each end with expected file-path tails');

          // Test final content output
          // ----
          const expectedFinalContent = await fs.readFile('test/fixtures/dependencies/expected.js')
            .then(x => x.toString());

          t.is(targetModule.code.trim(), expectedFinalContent.trim());
        });
    });
});
