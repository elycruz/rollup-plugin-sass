import {promises as fs} from 'fs';
import path, {dirname} from 'path';
import test, {after, before} from 'ava';
import sinon from 'sinon';
import {OutputOptions, rollup} from 'rollup';
import sassJs from 'sass';
import sass from '../src/index';
import {SassOptions} from "../src/types";
import {log, error} from "../src/utils";

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

before(async () => {
  const mkDir = () => fs.mkdir(tmpDir);

  await fs.rm(tmpDir, {recursive: true})
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
    });

  // log('output', output);

  t.true(squash(unwrap(output)).indexOf(expectA) > -1);
  t.true(squash(unwrap(output)).indexOf(expectB) > -1);
  t.true(squash(unwrap(output)).indexOf(expectC) > -1);
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
    });

  await outputBundle.write({...outputOptions, file} as OutputOptions);

  await fs.readFile(file)
    .then(() => t.true(outputSpy.args[0][0] === squash(`${expectA}${expectB}`)))
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
    {output} = await outputBundle.generate(generateOptions);

  t.true(squash(unwrap(output)).indexOf(expectA) > -1);
  t.true(squash(unwrap(output)).indexOf(expectB) > -1);
  t.true(squash(unwrap(output)).indexOf(expectC) > -1);
});

after(async (): Promise<any> => {
  return fs.rm(tmpDir, {recursive: true})
    .catch(error);
});
