# rollup-plugin-sass [![CI](https://github.com/elycruz/rollup-plugin-sass/actions/workflows/CI.yml/badge.svg)](https://github.com/elycruz/rollup-plugin-sass/actions/workflows/CI.yml) [![issues](https://img.shields.io/github/issues/elycruz/rollup-plugin-sass.svg?style=flat-square)](https://www.npmjs.com/package/rollup-plugin-sass) [![npm](https://img.shields.io/npm/v/rollup-plugin-sass.svg?style=flat-square)](https://www.npmjs.com/package/rollup-plugin-sass) [![mit](https://img.shields.io/npm/l/rollup-plugin-sass.svg?style=flat-square)](https://opensource.org/licenses/MIT) [![Coverage Status](https://coveralls.io/repos/github/elycruz/rollup-plugin-sass/badge.svg?branch=main)](https://coveralls.io/github/elycruz/rollup-plugin-sass?branch=main)

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
  plugins: [sass()],
};
```

### rollup.config.ts

Add `allowSyntheticDefaultImports`, or `esModuleInterop` (enables `allowSyntheticDefaultImports`), to tsconfig.json:

```json
{
  "compilerOptions": {
    "esModuleInterOp": true
  }
}
```

[`esModuleInterop` reference](https://www.typescriptlang.org/tsconfig#esModuleInterop)

Write rollup.config.ts:

```typescript
// rollup.config.ts
import sass from 'rollup-plugin-sass';

// ...
```

Profit.

## Options

### `output`

- Type: `Boolean|String|Function`
- Default: `false`

```js
sass({
  // Default behavior disable output
  output: false,

  // Write all styles to the bundle destination where .js is replaced by .css
  output: true,

  // Filename to write all styles
  output: 'bundle.css',

  // Callback that will be called on generate bundle with two arguments:
  // - styles: the concatenated styles in order of imported
  // - styleNodes: an array of style objects:
  //  [
  //    { id: './style1.scss', content: 'body { color: red };' },
  //    { id: './style2.scss', content: 'body { color: green };' }
  //  ]
  output(styles, styleNodes) {
    writeFileSync('bundle.css', styles);
  },
});
```

### `insert`

- Type: `Boolean`
- Default: `false`

If you specify `true`, the plugin will insert compiled CSS into `<head/>` tag, via utility function that it will output
in your build bundle.

```js
sass({
  insert: true,
});
```

### `processor`

- Type: `Function`

If you specify a function as processor which will be called with compiled css before generate phase.

```js
import autoprefixer from 'autoprefixer';
import postcss from 'postcss';

sass({
  // Processor will be called with two arguments:
  // - style: the compiled css
  // - id: import id
  processor: (css) =>
    postcss([autoprefixer])
      .process(css)
      .then((result) => result.css),
});
```

The `processor` also support object result. Reverse `css` filled for stylesheet, the rest of the properties can be customized.

```js
sass({
  processor(code) {
    return {
      css: '.body {}',
      foo: 'foo',
      bar: 'bar',
    };
  },
});
```

Otherwise, you could do:

```js
import style, { foo, bar } from 'stylesheet';
```

#### Create CSS modules using processor `cssModules` output

When returning a `cssModules` property inside a processor's output,
the plugin will change the module's default export to the value
of `cssModules` instead of the compiled CSS code.

The following example uses [`postcss-modules`](https://www.npmjs.com/package/postcss-modules) to create css modules:

```js
import postcss from 'postcss';
import postcssModules from 'postcss-modules';

sass({
  async processor(css, id) {
    let cssModules = {};
    const postcssProcessResult = await postcss([
      postcssModules({
        getJSON: (_, json) => {
          if (json) cssModules = json;
        },
      }),
    ]).process(css, { from: id });

    return { css: postcssProcessResult.css, cssModules };
  },
});
```

Which allows you to write something like:

```js
import style from 'stylesheet';

style['some-classes'];
```

#### Exporting sass variable to \*.js

Example showing how to use [`icss-utils`](https://www.npmjs.com/package/icss-utils) to extract resulting sass vars to your \*.js bundle:

```js
const config = {
  input: 'test/fixtures/processor-promise/with-icss-exports.js',
  plugins: [
    sass({
      processor: (css) => {
        const pcssRootNodeRslt = postcss.parse(css);
        const extractedIcss = extractICSS(pcssRootNodeRslt, true);
        const cleanedCss = pcssRootNodeRslt.toString();
        const out = { css: cleanedCss, ...extractedIcss.icssExports };
        // console.table(extractedIcss);
        // console.log(out);
        return out;
      },
    }),
  ],
};
```

See the [Input file](test/fixtures/processor-promise/with-icss-exports.js) for example on how to access
the exported vars.

### `runtime`

- Type: `Object`
- Default: `sass`

If you specify an object, it will be used instead of [sass](https://github.com/sass/dart-sass). You can use this to pass a different sass compiler (for example the `node-sass` npm package).

### `api`

- Type: `'legacy'|'modern'`
- Default: `'legacy'`

```js
sass(); // default to legacy

sass({ api: 'modern' });

sass({
  api: 'modern',
  options: {
    style: 'compressed',
  },
});
```

### `options`

- Type: `Object`

> [!NOTE]
> The content of `options` is sensible to the value specified in `api` option

Options for [sass](https://github.com/sass/dart-sass) or your own runtime sass compiler.

If you specify `data`, the plugin will treat as prepend sass string.
Since you can inject variables during sass compilation with node.

```js
sass({
  options: {
    data: '$color: #000;',
  },
});
```

---

> [!TIP]
> If your are working with npm packages, consider to use
> [NodePackageImporter](https://sass-lang.com/documentation/js-api/classes/nodepackageimporter/)
>
> ```js
> import * as sass from 'sass';
>
> sass({
>   options: {
>     importers: [new sass.NodePackageImporter()],
>   },
> });
> ```

### `include`

- Type: `string | string[]`
- Default: `['**/*.sass', '**/*.scss']`

Glob of sass/css files to be targeted.

```ts
sass({
  include: ['**/*.css', '**/*.sass', '**/*.scss'],
});
```

### `exclude`

- Type: `string | string[]`;
- Default: `'node_modules/**'`

Globs to exclude from processing.

```ts
sass({
  exclude: 'node_modules/**',
});
```

## License

[MIT](./LICENSE) [elycruz](https://github.com/elycruz),
[BinRui.Guan](mailto:differui@gmail.com)
