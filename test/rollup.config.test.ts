// Should pass `tsc` dry-run (`tsc ... --noEmit`) with no errors.
// (Since this file is used only to test types it is excluded from ava execution)

import sass from '../src/index';

const instance = sass();
