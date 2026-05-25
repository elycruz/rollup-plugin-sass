import test from 'ava';
import { pathToFileURL } from 'url';
import type { FileImporter, LegacyImporter } from 'sass';

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

test('legacy importer1: resolve failure with no siblings falls back to original url', async (t) => {
  const importers = getImporterListLegacy(undefined);
  const importer1 = asCallable(importers[0]);
  const result = await new Promise<LegacyDoneResult>((resolve) => {
    importer1(MISSING_MODULE, __filename, resolve);
  });
  t.deepEqual(result, { file: MISSING_MODULE });
});

test('legacy importer1: resolve failure with sibling importers returns null', async (t) => {
  const noopImporter: LegacyImporter<'async'> = (_url, _prev, done) =>
    done(null);
  const importers = getImporterListLegacy([noopImporter, noopImporter]);
  const importer1 = asCallable(importers[0]);
  const result = await new Promise<LegacyDoneResult>((resolve) => {
    importer1(MISSING_MODULE, __filename, resolve);
  });
  t.is(result, null);
});

test('modern findFileUrl: resolve failure returns null', async (t) => {
  const importers = getImporterListModern(undefined);
  const modern = importers[0] as FileImporter<'async'>;
  const result = await modern.findFileUrl(MISSING_MODULE, {
    containingUrl: pathToFileURL(__filename),
  } as never);
  t.is(result, null);
});
