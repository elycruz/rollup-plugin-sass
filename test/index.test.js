import test, { afterEach, before } from 'ava';
import sinon from 'sinon';
import fs from 'fs';
import { removeSync, remove as removeAsync } from 'fs-extra';
import { rollup } from 'rollup';
import sassJs from 'sass';
import sass from '../dist/index';

const sassOptions = {
    outputStyle: 'compressed',
  },

  inputOptions = {
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
    file: 'test/bundle.js',
  };

function squash(str) {
  return str.trim().replace(/[\n\r]/g, '');
}

function reverse(str) {
  return str.split('').reverse().join('');
}

function unwrap(output) {
  return output[0].code;
}

let expectA, expectB, expectC, expectD, expectE;

before(async () => {
  await Promise.all([
      'test/assets/expect_a.css',
      'test/assets/expect_b.css',
      'test/assets/expect_c.css',
      'test/assets/expect_d.css',
      'test/assets/expect_e.css'
    ]
      .map(xs => fs.promises.readFile(xs))
  )
    .then(rslts => rslts.map(xs => xs.toString()))
    .then(([a, b, c, d, e]) => {
      expectA = a;
      expectB = b;
      expectC = c;
      expectD = d;
      expectE = e;
    });
});

afterEach(  () => {
  removeSync(outputOptions.file);
});

test('should import *.scss and *.sass files', async t => {
  const outputBundle = await rollup({
    ...inputOptions,
    input: 'test/fixtures/basic/index.js',
  });
  const { output } = await outputBundle.generate(generateOptions);

  t.true(squash(unwrap(output)).indexOf(squash(expectA)) > -1);
  t.true(squash(unwrap(output)).indexOf(squash(expectB)) > -1);
  t.true(squash(unwrap(output)).indexOf(squash(expectC)) > -1);

  await outputBundle.close();
});

test('should compress the dest CSS', async t => {
  const outputBundle = await rollup({
    ...inputOptions,
    input: 'test/fixtures/compress/index.js',
  });
  const { output } = await outputBundle.generate(generateOptions);

  t.true(squash(unwrap(output)).indexOf(squash(expectD)) > -1);

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

  t.true(squash(unwrap(output)).indexOf(squash(expectA)) > -1);

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

  t.true(squash(unwrap(output)).indexOf(squash(expectE)) > -1);

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

  await outputBundle.write(outputOptions);
  await fs.promises.readFile(outputOptions.file)
    .then(rslt => {
      t.is(squash(rslt.toString()), '');
      t.true(outputSpy.calledWith(squash(`${expectB}${expectA}`)));
    });

  await outputBundle.close();
});

test('should support output as (non-previously existent) path', async t => {
  const outputStylePath = 'test/fixtures/output-path/style.css';
  const outputBundle = await rollup({
    input: 'test/fixtures/output-path/index.js',
    plugins: [
      sass({
        output: outputStylePath,
        options: sassOptions,
      }),
    ],
  });

  await outputBundle.write(outputOptions)
    .then(rslt => {
      rslt;
    });
  await fs.promises.readFile(outputOptions.file)
    .then((rslt) => {
      t.is(squash(rslt.toString()), '');
    })
    .then(() => fs.promises.readFile(outputStylePath))
    .then((rslt) => {
      t.is(squash(rslt.toString()), squash(`${expectA}${expectB}`));
    });

  await outputBundle.close();
  await removeAsync(outputStylePath);
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

  await outputBundle.write(outputOptions);
  await fs.promises.readFile(outputOptions.file)
    .then(rslt => t.is(squash(rslt.toString()), ''))
    .then(() => fs.promises.readFile(outputOptions.file.replace('.js', '.css')))
    .then(rslt => t.is(squash(rslt.toString()), squash(`${expectA}${expectB}`)));

  await outputBundle.close();
  await removeAsync(outputOptions.file.replace('.js', '.css'));
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

  t.true(squash(unwrap(output)).indexOf(reverse(squash(expectA))) > -1);
  t.true(squash(unwrap(output)).indexOf(reverse(squash(expectB))) > -1);

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

  t.true(squash(unwrap(output)).indexOf(squash(expectA)) > -1);
  t.true(squash(unwrap(output)).indexOf(squash(expectB)) > -1);
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

  t.true(squash(unwrap(output)).indexOf(squash(expectA)) > -1);
  t.true(squash(unwrap(output)).indexOf(squash(expectB)) > -1);

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

  t.true(squash(unwrap(output)).indexOf(squash(expectA)) > -1);
  t.true(squash(unwrap(output)).indexOf(squash(expectB)) > -1);
  t.true(squash(unwrap(output)).indexOf(squash(expectC)) > -1);

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

  t.true(squash(unwrap(output)).indexOf(squash(expectA)) > -1);
  t.true(squash(unwrap(output)).indexOf(squash(expectB)) > -1);
  t.true(squash(unwrap(output)).indexOf(squash(expectC)) > -1);

  await outputBundle.close();
});
