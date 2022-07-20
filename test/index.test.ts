import {promises as fs, constants as fsConstants} from 'fs';
import * as path from 'path';
import test from 'ava';
import sinon from 'sinon';
import {OutputOptions, rollup, RollupOutput} from 'rollup';
import * as sassJs from 'sass';
import sass from '../src/index';
import {SassOptions} from "../src/types";
import {error} from "../src/utils";

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

let expectA, expectB, expectC, expectD, expectE;

test.before(async () => {
  const mkDir = () => fs.mkdir(tmpDir);

  await fs.rmdir(tmpDir, {recursive: true})
    .then(mkDir, mkDir)
    .then(() => Promise.all([
        'test/assets/expect_a.css',
        'test/assets/expect_b.css',
        'test/assets/expect_c.css',
        'test/assets/expect_d.css',
        'test/assets/expect_e.css'
      ]
        .map(xs => fs.readFile(xs).then(buff => buff.toString()))
    ))
    .then(([a, b, c, d, e]) => {
      expectA = squash(a);
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

  t.true(unwrap(output).includes('___$insertStyle("body{color:red}");'));
  t.true(unwrap(output).includes('___$insertStyle("body{color:green}");'));
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

test('should processor return as promise', async t => {
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

test('should processor throw error', async t => {
  await t.throwsAsync(async () => rollup({
    input: 'test/fixtures/processor-error/index.js',
    plugins: [
      sass({
        // @ts-ignore
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

test.after(async (): Promise<any> => {
  return fs.rmdir(tmpDir, {recursive: true})
    .catch(error);
});
