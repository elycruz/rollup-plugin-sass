import babel from '@rollup/plugin-babel';

export default {
  input: './src/index.js',
  output: {
    format: 'cjs',
    dir: './dist',
    exports: 'auto',
    preserveModules: true,
    preserveModulesRoot: 'src',
  },
  // exclude: ['node_modules/'],
  external: [
    '@rollup/pluginutils',
    '@babel/plugin-transform-runtime',
    'resolve',
    'pify',
    'sass',
    'fs-extra',
  ],
  plugins: [
    babel({
      exclude: './node_modules/**',
      babelHelpers: 'runtime'
    }),
  ],
  preserveEntrySignatures: 'strict'
};
