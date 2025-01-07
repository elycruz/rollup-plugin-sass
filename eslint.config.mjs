import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import avaPlugin from 'eslint-plugin-ava';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'ts3.5',
      '.tests-output',
      'scripts',
      'test/fixtures',
      'coverage',
      'eslint.config.mjs',
    ],
  },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  avaPlugin.configs['flat/recommended'],
);
