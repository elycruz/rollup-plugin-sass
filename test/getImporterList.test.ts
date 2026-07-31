import test, { ExecutionContext } from 'ava';
import { pathToFileURL } from 'url';
import Sinon from 'sinon';
import type { FileImporter, LegacyImporter } from 'sass';

import * as logger from '../src/utils/logger';
import {
  getImporterListLegacy,
  getImporterListModern,
} from '../src/utils/getImporterList';

const MISSING_MODULE = '~no-such-module-zzz-coverage-fixture/x';

type LegacyDoneResult = { file: string } | null;
type LegacyImporterCallable = (
  url: string,
  prev: string,
  done: (result: LegacyDoneResult) => void,
) => void;

const asCallable = (
  importer: LegacyImporter<'async'>,
): LegacyImporterCallable => importer as unknown as LegacyImporterCallable;

/**
 * Silences, and captures, the `warn` calls the importers make while recovering
 * from the module resolution failures these tests trigger on purpose - without
 * the stub the (expected) `MODULE_NOT_FOUND` stack traces get dumped into the
 * test output, where they read as unhandled errors.
 *
 * @note Tests using this must be `serial` - the stub replaces an export on a
 *  module shared by the whole test file.
 */
const stubWarn = (t: ExecutionContext): Sinon.SinonStub => {
  const warnStub = Sinon.stub(logger, 'warn');
  t.teardown(() => warnStub.restore());
  return warnStub;
};

/**
 * Asserts the deliberately triggered resolution error was logged (once), and
 * that it is the `MODULE_NOT_FOUND` error we expect - not some other failure.
 */
const assertLoggedMissingModule = (
  t: ExecutionContext,
  warnStub: Sinon.SinonStub,
) => {
  t.is(warnStub.callCount, 1, '`warn` should be called once, for our error');

  const [message, err] = warnStub.firstCall.args as [string, unknown];

  t.true(
    typeof message === 'string' && message.includes('rollup-plugin-sass'),
    'Logged message should be prefixed with the plugin name',
  );
  t.true(err instanceof Error, 'Logged value should be an `Error`');
  t.is(
    (err as NodeJS.ErrnoException).code,
    'MODULE_NOT_FOUND',
    'Logged error should be the expected module resolution failure',
  );
};

test.serial(
  'legacy importer1: resolve failure with no siblings falls back to original url',
  async (t) => {
    const warnStub = stubWarn(t);
    const importers = getImporterListLegacy(undefined);
    const importer1 = asCallable(importers[0]);
    const result = await new Promise<LegacyDoneResult>((resolve) => {
      importer1(MISSING_MODULE, __filename, resolve);
    });
    t.deepEqual(result, { file: MISSING_MODULE });
    assertLoggedMissingModule(t, warnStub);
  },
);

test.serial(
  'legacy importer1: resolve failure with sibling importers returns null',
  async (t) => {
    const warnStub = stubWarn(t);
    const noopImporter: LegacyImporter<'async'> = (_url, _prev, done) =>
      done(null);
    const importers = getImporterListLegacy([noopImporter, noopImporter]);
    const importer1 = asCallable(importers[0]);
    const result = await new Promise<LegacyDoneResult>((resolve) => {
      importer1(MISSING_MODULE, __filename, resolve);
    });
    t.is(result, null);
    assertLoggedMissingModule(t, warnStub);
  },
);

test.serial('modern findFileUrl: resolve failure returns null', async (t) => {
  const warnStub = stubWarn(t);
  const importers = getImporterListModern(undefined);
  const modern = importers[0] as FileImporter<'async'>;
  const result = await modern.findFileUrl(MISSING_MODULE, {
    containingUrl: pathToFileURL(__filename),
  } as never);
  t.is(result, null);
  assertLoggedMissingModule(t, warnStub);
});
