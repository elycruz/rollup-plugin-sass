import type {
  LegacyOptions as SassLegacyOptions,
  Options as SassOptions,
} from 'sass';

/**
 * Minimal shape required from a sass-compatible runtime when using the
 * modern asynchronous API.  Anything exposing {@link import('sass').compileStringAsync}
 * (e.g. the `sass` module itself, or a compatible shim) satisfies this contract.
 */
export type SassRuntimeModern = Pick<typeof import('sass'), 'compileStringAsync'>;

/**
 * Minimal shape required from a sass-compatible runtime when using the
 * legacy asynchronous API.  Anything exposing {@link import('sass').render}
 * (e.g. the `sass` module itself, `node-sass`, or a compatible shim) satisfies
 * this contract.
 */
export type SassRuntimeLegacy = Pick<typeof import('sass'), 'render'>;

interface StyleSheetIdAndContent {
  id?: string;
  content?: string;
}

export type RollupPluginSassOutputFn = (
  styles: string,
  styleNodes: StyleSheetIdAndContent[],
) => unknown;

export type RollupPluginSassProcessorFnOutput =
  | string
  | {
      css: string;

      /** If provided, the default export of the CSS file will be the map returned here */
      cssModules?: Record<string, string>;

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
}

export type RollupPluginSassModernOptions = Omit<
  SassOptions<'async'>,
  'sourceMap' // sourcemaps are handled by rollup
> & {
  data?: string;
};

export type RollupPluginSassLegacyOptions = Omit<
  SassLegacyOptions<'async'>,
  'data' // data is assembled and always passed via plugin `transform`
> & {
  data?: string;
};

export type RollupPluginSassOptions =
  | (RollupPluginSassSharedOptions & {
      api: 'modern';
      options?: RollupPluginSassModernOptions;
      /**
       * Sass runtime instance - sass, or a compatible shim, exposing
       * {@link import('sass').compileStringAsync}.
       */
      runtime?: SassRuntimeModern;
    })
  | (RollupPluginSassSharedOptions & {
      api?: 'legacy';
      options?: RollupPluginSassLegacyOptions;
      /**
       * Sass runtime instance - sass, node-sass, or a compatible shim, exposing
       * {@link import('sass').render}.
       */
      runtime?: SassRuntimeLegacy;
    });

export type RollupPluginSassState = {
  // Stores interim bundle objects
  styles: StyleSheetIdAndContent[];

  // "";  Used, currently to ensure that we're not pushing style objects representing
  // the same file-path into `pluginState.styles` more than once.
  styleMaps: {
    [index: string]: StyleSheetIdAndContent;
  };
};
