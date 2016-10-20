rollup-plugin-sass
=====

<p>
    <a href="LICENSE">
        <img src="https://img.shields.io/badge/license-MIT-brightgreen.svg" alt="Software License" />
    </a>
    <a href="https://github.com/baza-fe/rollup-plugin-sass/issues">
        <img src="https://img.shields.io/github/issues/baza-fe/rollup-plugin-sass.svg" alt="Issues" />
    </a>
    <a href="http://standardjs.com/">
        <img src="https://img.shields.io/badge/code%20style-standard-brightgreen.svg" alt="JavaScript Style Guide" />
    </a>
    <a href="https://npmjs.org/package/rollup-plugin-sass">
        <img src="https://img.shields.io/npm/v/rollup-plugin-sass.svg?style=flat-squar" alt="NPM" />
    </a>
    <a href="https://github.com/baza-fe/rollup-plugin-sass/releases">
        <img src="https://img.shields.io/github/release/baza-fe/rollup-plugin-sass.svg" alt="Latest Version" />
    </a>
    <a href="https://travis-ci.org/baza-fe/rollup-plugin-sass">
        <img src="https://travis-ci.org/baza-fe/rollup-plugin-sass.svg?branch=master" />
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

### `insert`

+ Type: `Boolean` _(default: false)_

If you specify `true`, the plugin will insert compiled CSS into `<head/>` tag.

### `output`

+ Type: `String|Function`

If you specify a string, it will be the path to write the generated CSS.<br/>
If you specify a function, call it passing the generated CSS as an argument.

### `options`

+ Type: `Object` _(default: null)_

Options for [node-sass](https://github.com/sass/node-sass#options).

## License

MIT &copy; [BinRui.Guan](mailto:differui@gmail.com)
