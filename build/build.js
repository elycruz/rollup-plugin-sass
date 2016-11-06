const rollup = require('rollup').rollup
const babel = require('rollup-plugin-babel')

rollup({
  entry: './src/index.js',
  external: [
    'babel-runtime/core-js/json/stringify',
    'babel-runtime/core-js/object/assign',
    'babel-runtime/helpers/asyncToGenerator',
    'babel-runtime/regenerator',
    'fs',
    'util',
    'path',
    'node-sass',
    'rollup-pluginutils',
    'fs-extra'
  ],
  plugins: [
    babel({
      runtimeHelpers: true
    })
  ]
}).then(function (bundle) {
  bundle.write({
    dest: 'dist/rollup-plugin-sass.js',
    format: 'cjs'
  })
}).catch(console.error)
