rollup-plugin-sass [![Build and Test](https://github.com/elycruz/rollup-plugin-sass/actions/workflows/build-and-test.yml/badge.svg)](https://github.com/elycruz/rollup-plugin-sass/actions/workflows/build-and-test.yml) [![issues](https://img.shields.io/github/issues/elycruz/rollup-plugin-sass.svg?style=flat-square)](https://www.npmjs.com/package/rollup-plugin-sass) [![npm](https://img.shields.io/npm/v/rollup-plugin-sass.svg?style=flat-square)](https://www.npmjs.com/package/rollup-plugin-sass) [![mit](https://img.shields.io/npm/l/rollup-plugin-sass.svg?style=flat-square)](https://opensource.org/licenses/MIT) [![Coverage Status](https://coveralls.io/repos/github/elycruz/rollup-plugin-sass/badge.svg?branch=master)](https://coveralls.io/github/elycruz/rollup-plugin-sass?branch=master)
=====

## Installation

```bash
npm install rollup-plugin-sass -D
```

## Usage

```js
// rollup.config.js
import sass from 'rollup-plugin-sass';

export default {
  input: 'index.js',
  output: {
    file: 'bundle.js',
    format: 'cjs',
  },
  plugins: [
    sass()
  ]
}
```

#### rollup.config.ts

Add `allowSyntheticDefaultImports`, or `esModuleInterop` (enables `allowSyntheticDefaultImports`), to tsconfig.json:

```json
{
  "compilerOptions": {
    "esModuleInterOp": true
  }
}
```

Reference: (https://www.typescriptlang.org/tsconfig#esModuleInterop)

Write rollup.config.ts:

```typescript
// rollup.config.ts
import sass from 'rollup-plugin-sass';

// ...
```

Profit.

## Options

### `output`

+ Type: `Boolean|String|Function` _(default: false)_

```js
sass({
  // Default behaviour disable output
  output: false,

  // Write all styles to the bundle destination where .js is replaced by .css
  output: true,

  // Filename to write all styles
  output: 'bundle.css',

  // Callback that will be called ongenerate with two arguments:
  // - styles: the concatenated styles in order of imported
  // - styleNodes: an array of style objects:
  //  [
  //    { id: './style1.scss', content: 'body { color: red };' },
  //    { id: './style2.scss', content: 'body { color: green };' }
  //  ]
  output(styles, styleNodes) {
    writeFileSync('bundle.css', styles);
  }
})
```

### `insert`

+ Type: `Boolean` _(default: false)_

If you specify `true`, the plugin will insert compiled CSS into `<head/>` tag.

```js
sass({
  insert: true
})
```

### `processor`

+ Type: `Function`

If you specify a function as processor which will be called with compiled css before generate phase.

```js
import autoprefixer from 'autoprefixer';
import postcss from 'postcss';

sass({
  // Processor will be called with two arguments:
  // - style: the compiled css
  // - id: import id
  processor: css => postcss([autoprefixer])
    .process(css)
    .then(result => result.css)
})
```

The `processor` also support object result. Reverse `css` filed for stylesheet, the rest properties can be customized.

```js
sass({
  processor(code) {
    return {
       css: '.body {}',
       foo: 'foo',
       bar: 'bar',
    };
  },
})
```

Otherwise, you could do:

```js
import style, { foo, bar } from 'stylesheet';
```

### `runtime`

+ Type: `Object` _(default: sass)_

If you specify an object, it will be used instead of [sass](https://github.com/sass/dart-sass). You can use this to pass a different sass compiler (for example the `node-sass` npm package).

### `options`

+ Type: `Object`

Options for [sass](https://github.com/sass/dart-sass) or your own runtime sass compiler.

If you specify `data`, the plugin will treat as prepend sass string.
Since you can inject variables during sass compilation with node.

```js
sass({
  options: {
    data: '$color: #000;'
  }
})
```

## License

[MIT](./LICENSE) [elycruz](https://github.com/elycruz), 
[BinRui.Guan](mailto:differui@gmail.com)
