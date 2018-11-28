import test from 'ava';
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
const outputOptions = {
  format: 'es',
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

test('should import *.scss and *.sass files', async t => {
  const bundle = await rollup({
    ...inputOptions,
    input: 'test/fixtures/basic/index.js',
  });
  const { code } = await bundle.generate(outputOptions);

  t.true(squash(code).indexOf(squash(expectA)) > -1);
  t.true(squash(code).indexOf(squash(expectB)) > -1);
  t.true(squash(code).indexOf(squash(expectC)) > -1);
});

test('should compress the dest CSS', async t => {
  const bundle = await rollup({
    ...inputOptions,
    input: 'test/fixtures/compress/index.js',
  });
  const { code } = await bundle.generate(outputOptions);

  t.true(squash(code).indexOf(squash(expectD)) > -1);
});

test('should custom importer running', async t => {
  const bundle = await rollup({
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
    ]
  });
  const { code } = await bundle.generate(outputOptions);

  t.true(squash(code).indexOf(squash(expectA)) > -1);
});

test('should support options.data', async t => {
  const jsVars = {
    'color_red': 'red',
  };
  const scssVars = Object.keys(jsVars).reduce((prev, key) => `${prev}$${key}:${jsVars[key]};`, '');
  const bundle = await rollup({
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
  const { code } = await bundle.generate(outputOptions);

  t.true(squash(code).indexOf(squash(expectE)) > -1);
});

test('should insert CSS into head tag', async t => {
  const bundle = await rollup({
    input: 'test/fixtures/insert/index.js',
    plugins: [
      sass({
        insert: true,
        options: sassOptions,
      }),
    ],
  });
  const { code } = await bundle.generate(outputOptions);
  let count = 0;

  global.window = {};
  global.document = {
    innerHTML: '',
    head: {
      appendChild (mockNode) {
        t.true(mockNode.hasOwnProperty('setAttribute'));

        if (count === 0) {
          t.is(squash(mockNode.innerHTML), squash(`${expectA}`));
        } else if (count === 1) {
          t.is(squash(mockNode.innerHTML), squash(`${expectB}`));
        }
        count += 1;
      },
    },
    createElement () {
      return {
        setAttribute (key, value) {
          if (key === 'type') {
            t.is(value, 'text/css');
          }
        },
      };
    },
  };
  new Function(code)(); // eslint-disable-line
});

test('should support output as function', async t => {
  let outputCode = '';
  const bundle = await rollup({
    input: 'test/fixtures/output-function/index.js',
    plugins: [
      sass({
        output(style) {
          outputCode = style;
        },
        options: sassOptions,
      }),
    ],
  });
  const { code } = await bundle.generate(outputOptions);

  t.is(squash(code), '');
  t.is(squash(outputCode), squash(`${expectA}${expectB}`));
});

test('should support output as (non-previously existent) path', async t => {
  const fullfile = 'test/fixtures/output-path/style.css';
  const bundle = await rollup({
    input: 'test/fixtures/output-path/index.js',
    plugins: [
      sass({
        output: fullfile,
        options: sassOptions,
      }),
    ],
  });
  const { code } = await bundle.generate(outputOptions);
  const output = readFileSync(fullfile).toString();

  removeSync(fullfile);
  t.is(squash(code), '');
  t.is(squash(output), squash(`${expectA}${expectB}`));
});

test('should support output as true', async t => {
  const fullfile = 'test/fixtures/output-true/bundle.js';
  const bundle = await rollup({
    input: 'test/fixtures/output-true/index.js',
    plugins: [
      sass({
        output: true,
        options: sassOptions,
      }),
    ],
  });
  const { code } = await bundle.generate({
    ...outputOptions,
    file: fullfile,
  });
  const output = readFileSync(fullfile.replace('.js', '.css')).toString();

  removeSync(fullfile);
  t.is(squash(code), '');
  t.is(squash(output), squash(`${expectA}${expectB}`));
});

test('should processor return as string', async t => {
  const bundle = await rollup({
    input: 'test/fixtures/processor-string/index.js',
    plugins: [
      sass({
        processor: css => reverse(css),
        options: sassOptions,
      }),
    ],
  });
  const { code } = await bundle.generate(outputOptions);

  t.true(squash(code).indexOf(reverse(squash(expectA))) > -1);
  t.true(squash(code).indexOf(reverse(squash(expectB))) > -1);
});

test('should processor return as object', async t => {
  const bundle = await rollup({
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
  const { code } = await bundle.generate(outputOptions);

  t.true(squash(code).indexOf(squash(expectA)) > -1);
  t.true(squash(code).indexOf(squash(expectB)) > -1);
  t.true(squash(code).indexOf('foo') > -1);
  t.true(squash(code).indexOf('bar') > -1);
});

test('should processor return as promise', async t => {
  const bundle = await rollup({
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
  const { code } = await bundle.generate(outputOptions);

  t.true(squash(code).indexOf(squash(expectA)) > -1);
  t.true(squash(code).indexOf(squash(expectB)) > -1);
});

test('should processor throw error', async t => {
  await t.throws(async () => {
    await rollup({
      input: 'test/fixtures/processor-error/index.js',
      plugins: [
        sass({
          processor: code => ({}),
          options: sassOptions,
        }),
      ],
    });
  }, {
    message: 'You need to return the styles using the `css` property. See https://github.com/differui/rollup-plugin-sass#processor',
  });
});

test('should resolve ~ as node_modules', async t => {
  const bundle = await rollup({
    input: 'test/fixtures/import/index.js',
    plugins: [
      sass({
        options: sassOptions,
      }),
    ],
  });
  const { code } = await bundle.generate(outputOptions);

  t.true(squash(code).indexOf(squash(expectA)) > -1);
  t.true(squash(code).indexOf(squash(expectB)) > -1);
  t.true(squash(code).indexOf(squash(expectC)) > -1);
});

test('should support options.runtime', async t => {
  const bundle = await rollup({
    input: 'test/fixtures/runtime/index.js',
    plugins: [
      sass({
        runtime: sassJs,
        options: sassOptions,
      }),
    ],
  });
  const { code } = await bundle.generate(outputOptions);

  t.true(squash(code).indexOf(squash(expectA)) > -1);
  t.true(squash(code).indexOf(squash(expectB)) > -1);
  t.true(squash(code).indexOf(squash(expectC)) > -1);
});
