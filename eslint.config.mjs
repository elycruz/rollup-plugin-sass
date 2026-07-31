import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import avaPlugin from 'eslint-plugin-ava';

export default tseslint.config(
  {
    ignores: [
      // Git worktrees for other branches - each carries its own copy of the
      //  paths ignored below (`dist`, `ts3.5`, fixtures, etc.).
      '.claude/worktrees',
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
