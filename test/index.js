import test, { afterEach } from 'ava';
import sinon from 'sinon';
import { readFileSync } from 'fs';
import { removeSync } from 'fs-extra';
import { rollup } from 'rollup';
import sassJs from 'sass';
import sass from '..';

const sassOptions = {
  outputStyle: 'compressed',
};
const inputOptions = {
  plugins: [
    sass({
      options: sassOptions,
    }),
  ],
};
const generateOptions = {
  format: 'es',
};
const outputOptions = {
  format: 'es',
  file: 'test/bundle.js',
};
const expectA = readFileSync('test/assets/expect_a.css').toString();
const expectB = readFileSync('test/assets/expect_b.css').toString();
const expectC = readFileSync('test/assets/expect_c.css').toString();
const expectD = readFileSync('test/assets/expect_d.css').toString();
const expectE = readFileSync('test/assets/expect_e.css').toString();

function squash(str) {
  return str.trim().replace(/[\n\r]/, '');
}

function reverse(str) {
  return str.split('').reverse().join('');
}

function unwrap(output) {
  return output[0].code;
}

afterEach(() => {
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
});

test('should compress the dest CSS', async t => {
  const outputBundle = await rollup({
    ...inputOptions,
    input: 'test/fixtures/compress/index.js',
  });
  const { output } = await outputBundle.generate(generateOptions);

  t.true(squash(unwrap(output)).indexOf(squash(expectD)) > -1);
});

test('should custom importer works', async t => {
  const outputBundle = await rollup({
    input: 'test/fixtures/custom-importer/index.js',
    plugins: [
      sass({
        options: {
          ...sassOptions,
          importer: [
            (url, prev) => {
              return {
                file: url.replace('${name}', 'actual_a'),
              };
            },
          ],
        },
      }),
    ],
  });
  const { output } = await outputBundle.generate(generateOptions);

  t.true(squash(unwrap(output)).indexOf(squash(expectA)) > -1);
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
  t.is(squash(readFileSync(outputOptions.file).toString()), '');
  t.true(outputSpy.calledWith(squash(`${expectA}${expectB}`)));
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

  await outputBundle.write(outputOptions);
  t.is(squash(readFileSync(outputOptions.file).toString()), '');
  t.is(squash(readFileSync(outputStylePath).toString()), squash(`${expectA}${expectB}`));
  removeSync(outputStylePath);
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
  t.is(squash(readFileSync(outputOptions.file).toString()), '');
  t.is(squash(readFileSync(outputOptions.file.replace('.js', '.css')).toString()), squash(`${expectA}${expectB}`));
  removeSync(outputOptions.file.replace('.js', '.css'));
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
});
