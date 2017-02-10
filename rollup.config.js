import babel from 'rollup-plugin-babel'

export default {
  entry: './src/index.js',
  format: 'cjs',
  dest: 'dist/rollup-plugin-sass.js',
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
}
