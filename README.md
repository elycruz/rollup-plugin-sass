rollup-plugin-sass
=====

<p>
    <a href="LICENSE">
        <img src="https://img.shields.io/badge/license-MIT-brightgreen.svg" alt="Software License" />
    </a>
    <a href="https://github.com/differui/rollup-plugin-sass/issues">
        <img src="https://img.shields.io/github/issues/differui/rollup-plugin-sass.svg" alt="Issues" />
    </a>
    <a href="http://standardjs.com/">
        <img src="https://img.shields.io/badge/code%20style-standard-brightgreen.svg" alt="JavaScript Style Guide" />
    </a>
    <a href="https://npmjs.org/package/rollup-plugin-sass">
        <img src="https://img.shields.io/npm/v/rollup-plugin-sass.svg?style=flat-squar" alt="NPM" />
    </a>
    <a href="https://travis-ci.org/differui/rollup-plugin-sass">
        <img src="https://travis-ci.org/differui/rollup-plugin-sass.svg?branch=master" />
    </a>
</p>

## Installation

```bash
npm install rollup-plugin-sass -D
```

## Usage

```js
import { rollup } from 'rollup';
import sass from 'rollup-plugin-sass';

rollup({
  entry: 'main.js',
  plugins: [
    sass()
  ]
}).then(...)
```

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
  // - styles: the concatentated styles in order of imported
  // - styleNodes: an array of style objects:
  //  [
  //    { id: './style1.scss', content: 'body { color: red };' },
  //    { id: './style2.scss', content: 'body { color: green };' }
  //  ]
  output(styles, styleNodes) {
    writeFileSync('bundle.css', styles);
  }
});
```

### `insert`

+ Type: `Boolean` _(default: false)_

If you specify `true`, the plugin will insert compiled CSS into `<head/>` tag.

### `processor`

+ Type: `Function` _(default: null)_

If you specify a function as processor which will be called with compiled css before generate phase.

```js
import sass from 'rollup-plugin-sass'
import autoprefixer from 'autoprefixer'
import postcss from 'postcss'

sass({
  // Processor will be called with two arguments:
  // - style: the compiled css
  // - id: import id
  processor: css => postcss([autoprefixer])
    .process(css)
    .then(result => result.css)
});
```

### `options`

+ Type: `Object` _(default: null)_

Options for [node-sass](https://github.com/sass/node-sass#options).

If you specfiy `data`, the plugin will treat as prepend sass string.
Since you can inject variables during sass compilation with node.

```js
sass({
  options: {
    data: '$color: #000;'
  }
})
```

## License

MIT &copy; [BinRui.Guan](mailto:differui@gmail.com)
