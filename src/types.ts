import type {
  LegacyOptions as SassLegacyOptions,
  Options as SassOptions,
} from 'sass';

interface StyleSheetIdAndContent {
  id?: string;
  content?: string;
}

export type RollupPluginSassOutputFn = (
  styles: string,
  styleNodes: StyleSheetIdAndContent[],
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

export type RollupPluginSassModernOptions = SassOptions<'async'> & {
  data?: string;
};

export type RollupPluginSassLegacyOptions = Omit<
  SassLegacyOptions<'async'>,
  'data'
> & {
  data?: string;
};

export type RollupPluginSassOptions =
  | (RollupPluginSassSharedOptions & {
      api: 'modern';
      options?: RollupPluginSassModernOptions;
    })
  | (RollupPluginSassSharedOptions & {
      api?: 'legacy';
      options?: RollupPluginSassLegacyOptions;
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
