import type {
  LegacyOptions as SassLegacyOptions,
  LegacyResult,
  types,
  Options as SassOptions,
} from 'sass';

export interface IdAndContentObject {
  id?: string;
  content?: string;
}

export type RollupPluginSassOutputFn = (
  styles: string,
  styleNodes: IdAndContentObject[],
) => any;

export type RollupPluginSassProcessorFnOutput =
  | string
  | {
      css: string;
      // User processor might add additional exports
      [key: string]: unknown;
    };
export type RollupPluginSassProcessorFn<T = RollupPluginSassProcessorFnOutput> =
  (styles: string, id: string) => Promise<T> | T;

interface RollupPluginSassSharedOptions {
  /**
   * File globs to "exclude" from processing.  Default 'node_modules/**'.
   */
  exclude?: string | string[];

  /**
   * File globs to include in processing.  Default  `['**\/*.sass', '**\/*.scss']`,
   */
  include?: string | string[];

  /**
   * Controls whether to insert generated styles into a style tag on (html) page's `head` or not.
   */
  insert?: boolean;

  processor?: RollupPluginSassProcessorFn;

  /**
   * Controls where sass output is generated to.  If `false`, the default, output is generated at the resolved location
   * by rollup;  E.g., content is output to your rollup `output` configs format, and location; E.g., @todo add example
   *
   * If `true` the bundle is output as '*.css' file, at location where bundle would've been generated to originally.
   *
   * If is a function, control of where, or how, the bundle is generated is left to the user;
   * ```typescript
   * output(styles: string[], styleNodes: {id: string, content: string}[]): void {
   *   writeFileSync('bundle.css', styles);
   * }
   * ```
   */
  output?: boolean | string | RollupPluginSassOutputFn;

  /**
   * Sass runtime instance - sass, node-sass or other etc..
   */
  runtime?: any;
}

export type RollupPluginSassOptions =
  | (RollupPluginSassSharedOptions & {
      api: 'modern';
      options?: SassOptions<'async'>;
    })
  | (RollupPluginSassSharedOptions & {
      api?: 'legacy';
      options?: SassLegacyOptions<'async'>;
    });

export type SassImporterResult =
  | { file: string }
  | { contents: string }
  | Error
  | null;

export type SassDoneFn<T extends SassImporterResult = SassImporterResult> = (
  result: T,
) => void | T;

/**
 * @deprecated - Use types directly from `sass` package instead.
 */
export type SassImporter<T extends SassImporterResult = SassImporterResult> = (
  url: string,
  prev: string,
  done: SassDoneFn<T>,
) => void | T;

/**
 * @deprecated - Use types directly from `sass` package instead.
 */
export interface SassFunctionsObject {
  [index: string]:
    | types.Color
    | types.Number
    | types.String
    | types.List
    | types.Map
    | types.Null;
}

/**
 * All option types taken from https://github.com/sass/node-sass#options -
 * **Note 1:** As noted by dart-sass project "When installed via npm, Dart Sass supports a JavaScript API that's
 * fully compatible with Node Sass (with a few exceptions listed below) ...".  See the (dart) sass npm page for more:
 * https://www.npmjs.com/package/sass
 *
 * **Note 2:** Our plugin only uses the "legacy" (async) API (internally) so `SassOptions` type below, for now,
 *  is the legacy type.
 *
 * @todo Update this if/when we update to the new sass API.
 */
export type SassOptionsOld = SassLegacyOptions<'async'>;
export { SassOptionsOld as SassOptions };

/**
 * @todo Update this if/when we update to the new sass API.
 */
export type SassRenderResult = LegacyResult;
