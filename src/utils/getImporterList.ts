import { dirname } from 'path';

import {
  LegacyOptions,
  LegacyImporter,
  Options,
  FileImporter,
} from 'sass';
import resolve from 'resolve';

import { warn } from './logger';
import { fileURLToPath, pathToFileURL } from 'url';

const MATCH_NODE_MODULE_RE = /^~([a-z0-9]|@).+/i;

/**
 * Returns a sass `importer` list:
 * @see https://sass-lang.com/documentation/js-api#importer
 */
export const getImporterListLegacy = (
  importOption: LegacyOptions<'async'>['importer'],
) => {
  // `Promise` to chain all `importer1` calls to;  E.g.,  subsequent `importer1` calls won't call `done` until previous `importer1` calls have called `done` (import order enforcement) - Required since importer below is actually 'async'.
  let lastResult = Promise.resolve();

  /**
   * Legacy Sass (*.scss/*.sass) file importer (works in new (< v2.0), and older, versions of `sass` (dart-sass) module).
   *
   * @see https://sass-lang.com/documentation/js-api/modules#LegacyAsyncImporter
   *
   * @param url - Url found in `@import`/`@use`, found in parent sass file;  E.g., exactly as it appears in sass file.
   * @param prevUrl - Url of file that contains '@import' rule for incoming file (`url`).
   * @param done - Signals import completion.  Note: `LegacyImporterResult`, and `SassImporterResult`, are the same here - We've defined the type for our plugin, since older versions of sass don't have this type defined.
   * @note This importer may not work in dart-sass v2.0+ (which may be far off in the future, but is important to note: https://sass-lang.com/documentation/js-api/#legacy-api).
   */
  const importer1: LegacyImporter<'async'> = (url, prevUrl, done) => {
    if (!MATCH_NODE_MODULE_RE.test(url)) {
      return null;
    }

    const moduleUrl = url.slice(1);
    const resolveOptions = {
      basedir: dirname(prevUrl),
      extensions: ['.scss', '.sass'],
    };

    // @todo This block should run as a promise instead, will help ensure we're not blocking the thread it is
    //   running on, even though `sass` is probably already running the importer in one.
    try {
      const file = resolve.sync(moduleUrl, resolveOptions);
      lastResult = lastResult.then(() => done({ file }));
    } catch (err) {
      warn('[rollup-plugin-sass]: Recovered from error: ', err);
      // If importer has sibling importers then exit and allow one of the other
      //  importers to attempt file path resolution.
      if (Array.isArray(importOption) && importOption.length > 1) {
        lastResult = lastResult.then(() => done(null));
        return;
      }
      lastResult = lastResult.then(() =>
        done({
          file: url,
        }),
      );
    }
  };

  return [importer1].concat((importOption as never) || []);
};

/**
 * Returns a sass `importer` list:
 * @see https://sass-lang.com/documentation/js-api/interfaces/importer/
 */
export const getImporterListModern = (
  importOption: Options<'async'>['importers'],
) => {
  const importer: FileImporter<'async'> = {
    findFileUrl(url, context) {
      if (!MATCH_NODE_MODULE_RE.test(url)) {
        return null;
      }

      const moduleUrl = url.slice(1);

      const resolveOptions = {
        basedir: dirname(fileURLToPath(context.containingUrl!)),
        extensions: ['.scss', '.sass'],
      };

      try {
        const file = resolve.sync(moduleUrl, resolveOptions);
        return pathToFileURL(file);
      } catch (err) {
        warn('[rollup-plugin-sass]: error resolving import path: ', err);
        return null;
      }
    },
  };

  return [importer].concat((importOption as never) || []);
};
