import {promises as fs} from 'fs';
import path from 'path';
import test, {after, before} from 'ava';
import sinon from 'sinon';
import {rollup} from 'rollup';
import sassJs from 'sass';
import sass from '../src/index';

const repoRoot = path.join(__dirname, '../'),

  tmpDir = path.join(repoRoot, '.tests-output/'),

  error = console.error.bind(console),
  log = console.log.bind(console),

  sassOptions = {
    outputStyle: 'compressed',
  },

  baseConfig = {
    plugins: [
      sass({
        options: sassOptions,
      }),
    ],
  },

  generateOptions = {
    format: 'es',
  },

  outputOptions = {
    format: 'es',
    file: path.join(tmpDir, 'bundle.js'),
  },

  squash = str => str.trim().replace(/[\n\r]/g, ''),

  reverse = str => str.split('').reverse().join(''),

  unwrap = output => output[0].code;

let expectA, expectB, expectC, expectD, expectE;

before(async () => {
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

// after(async () => {
//   return fs.rmdir(tmpDir, {recursive: true})
//     .then(() => log(`Test artifacts in '${tmpDir}' cleared out.`))
//     .catch(error);
// });

test('should import *.scss and *.sass files', async t => {
  const outputBundle = await rollup({
    ...baseConfig,
    input: 'test/fixtures/basic/index.js',
  });
  const { output } = await outputBundle.generate({format: 'es', file: path.join(tmpDir, 'import_scss_and_sass.js')});

  t.true(squash(unwrap(output)).indexOf(expectA) > -1);
  t.true(squash(unwrap(output)).indexOf(expectB) > -1);
  t.true(squash(unwrap(output)).indexOf(expectC) > -1);

  await outputBundle.close();
});

test('should compress the dest CSS', async t => {
  const outputBundle = await rollup({
    ...baseConfig,
    input: 'test/fixtures/compress/index.js',
  });
  const { output } = await outputBundle.generate(generateOptions);

  t.true(squash(unwrap(output)).indexOf(expectD) > -1);

  await outputBundle.close();
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
  });
  const { output } = await outputBundle.generate(generateOptions);

  t.true(squash(unwrap(output)).indexOf(expectA) > -1);

  await outputBundle.close();
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
  const { output } = await outputBundle.generate(generateOptions);

  t.true(squash(unwrap(output)).indexOf(expectE) > -1);

  await outputBundle.close();
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
  });
  const { output } = await outputBundle.generate(generateOptions);

  t.true(unwrap(output).includes('___$insertStyle("body{color:red}");'));
  t.true(unwrap(output).includes('___$insertStyle("body{color:green}");'));

  await outputBundle.close();
});

test('should support output as function', async t => {
  const outputSpy = sinon.spy();
  const outputBundle = await rollup({
    input: 'test/fixtures/output-function/index.js',
    plugins: [
      sass({
        output: outputSpy,
        options: sassOptions,
      }),
    ],
  });
  const file =  path.join(tmpDir, 'import_scss_and_sass.js');

  await outputBundle.write({...outputOptions, file});

  await fs.readFile(file)
    .then(() => t.true(outputSpy.calledWith(squash(`${expectA}${expectB}`))))
    .catch(() => t.true(false, `Trouble reading back written file "${file}".`));

  await outputBundle.close();
});

test('should support output as (non-previously existent) path', async t => {
  const outputStylePath = path.join(tmpDir, 'output-path/style.css');
  const outputBundle = await rollup({
    input: 'test/fixtures/output-path/index.js',
    plugins: [
      sass({
        output: outputStylePath,
        options: sassOptions,
      }),
    ],
  });
  const filePath = path.join(tmpDir, 'support_output_prev-non-exist.js');

  await outputBundle.write({...outputOptions, file: filePath});

  await fs.readFile(filePath)
    .then((rslt) => {
      t.is(squash(rslt.toString()), '');
    })
    .then(() => fs.readFile(outputStylePath))
    .then((rslt) => {
      t.not(squash(rslt.toString()).indexOf(expectA), -1);
      t.not(squash(rslt.toString()).indexOf(expectB), -1);
    });

  await outputBundle.close();
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
  });
  const filePath = path.join(tmpDir, 'support-output-as-true.js');

  await outputBundle.write({...outputOptions, file: filePath});

  await fs.readFile(filePath)
    .then(rslt => t.is(squash(rslt.toString()), ''))
    .then(() => fs.readFile(filePath.replace('.js', '.css')))
    .then(rslt => squash(rslt.toString()))
    .then(rslt => {
      t.not(rslt.indexOf(expectA), -1);
      t.not(rslt.indexOf(expectB), -1);
    });

  await outputBundle.close();
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
  });
  const { output } = await outputBundle.generate(generateOptions);

  t.true(squash(unwrap(output)).indexOf(reverse(expectA)) > -1);
  t.true(squash(unwrap(output)).indexOf(reverse(expectB)) > -1);

  await outputBundle.close();
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
  const { output } = await outputBundle.generate(generateOptions);

  t.true(squash(unwrap(output)).indexOf(expectA) > -1);
  t.true(squash(unwrap(output)).indexOf(expectB) > -1);
  t.true(squash(unwrap(output)).indexOf('foo') > -1);
  t.true(squash(unwrap(output)).indexOf('bar') > -1);

  await outputBundle.close();
});

test('should processor return as promise', async t => {
  const outputBundle = await rollup({
    input: 'test/fixtures/processor-promise/index.js',
    plugins: [
      sass({
        processor(css) {
          return new Promise(resolve => {
            setTimeout(() => {
              resolve(css);
            }, 100);
          });
        },
        options: sassOptions,
      }),
    ],
  });
  const { output } = await outputBundle.generate(generateOptions);

  t.true(squash(unwrap(output)).indexOf(expectA) > -1);
  t.true(squash(unwrap(output)).indexOf(expectB) > -1);

  await outputBundle.close();
});

test('should processor throw error', async t => {
  await t.throwsAsync(async () => {
    await rollup({
      input: 'test/fixtures/processor-error/index.js',
      plugins: [
        sass({
          processor: () => ({}),
          options: sassOptions,
        }),
      ],
    });
  }, {
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
  const { output } = await outputBundle.generate(generateOptions);

  t.true(squash(unwrap(output)).indexOf(expectA) > -1);
  t.true(squash(unwrap(output)).indexOf(expectB) > -1);
  t.true(squash(unwrap(output)).indexOf(expectC) > -1);

  await outputBundle.close();
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
  });
  const { output } = await outputBundle.generate(generateOptions);

  t.true(squash(unwrap(output)).indexOf(expectA) > -1);
  t.true(squash(unwrap(output)).indexOf(expectB) > -1);
  t.true(squash(unwrap(output)).indexOf(expectC) > -1);

  await outputBundle.close();
});
