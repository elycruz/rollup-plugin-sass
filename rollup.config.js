import babel from 'rollup-plugin-babel';

const base = {
  external: [
    './style.js',
    'babel-runtime/regenerator',
    'babel-runtime/core-js/json/stringify',
    'babel-runtime/core-js/object/assign',
    'babel-runtime/core-js/object/keys',
    'babel-runtime/helpers/asyncToGenerator',
    'babel-runtime/helpers/toConsumableArray',
    'babel-runtime/helpers/typeof',
    'path',
    'fs',
    'resolve',
    'pify',
    'sass',
    'util',
    'rollup-pluginutils',
    'fs-extra'
  ],
  plugins: [
    babel({
      exclude: './node_modules/**',
      runtimeHelpers: true
    })
  ],
};

export default [
  {
    input: './src/index.js',
    output: {
      format: 'cjs',
      file: 'dist/index.js',
    },
    ...base,
  },
  {
    input: './src/style.js',
    output: {
      format: 'cjs',
      file: 'dist/style.js',
    },
    ...base,
  },
];
