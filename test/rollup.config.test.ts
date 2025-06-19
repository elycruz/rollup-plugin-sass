// Should pass `tsc` dry-run (`tsc ... --noEmit`) with no errors.
// (Since this file is used only to test types it is excluded from ava execution)

import sass from '../src/index';

sass();

// should default to legacy when `api` is not specified
sass({ options: { outputStyle: 'compact' } });

// @ts-expect-error should error when LegacyOptions are used with `api: 'modern'`
sass({ api: 'modern', options: { outputStyle: 'compact' } });

// should only accept api parameter
sass({ api: 'modern' });

// should correctly infer modern API options
sass({ api: 'modern', options: { style: 'compressed' } });
