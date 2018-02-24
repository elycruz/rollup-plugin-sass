import babel from 'rollup-plugin-babel'

export default {
  input: './src/index.js',
  output: {
    format: 'cjs',
    file: 'dist/rollup-plugin-sass.js'
  },
  external: [
    'babel-runtime/regenerator',
    'babel-runtime/core-js/json/stringify',
    'babel-runtime/core-js/object/assign',
    'babel-runtime/helpers/asyncToGenerator',
    'path',
    'fs',
    'node-sass',
    'util',
    'rollup-pluginutils',
    'fs-extra'
  ],
  plugins: [
    babel({
      exclude: './node_modules/**',
      runtimeHelpers: true
    })
  ]
}
