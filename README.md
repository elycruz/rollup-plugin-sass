rollup-plugin-sass
=====

## Installation

```bash
npm install rollup-plugin-sass
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

### output

Optional. Type: `String` or `Function`

If you specify a string, it will be the path to write the generated CSS.
If you specify a function, call it passing the generated CSS as an argument.

### options

Optional. Type: `Object`

Options for node-sass.

## License

MIT &copy; [BinRui.Guan](mailto:differui@gmail.com)