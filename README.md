rollup-plugin-sass
=====

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

### insert

+ Default: `false`
+ Type: `Boolean`

If you specify `true`, the plugin will insert compiled CSS into `<head/>` tag.

### output

+ Type: `String|Function`

If you specify a string, it will be the path to write the generated CSS.
If you specify a function, call it passing the generated CSS as an argument.

### options

+ Type: `Object`

Options for [node-sass](https://github.com/sass/node-sass#options).

## License

MIT &copy; [BinRui.Guan](mailto:differui@gmail.com)