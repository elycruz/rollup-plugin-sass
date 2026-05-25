import path from 'path';

import { makeLegalIdentifier } from '@rollup/pluginutils';

import {
  RollupPluginSassOptions,
  RollupPluginSassState,
  RollupPluginSassProcessorFnOutput,
} from '../types';

import { isObject, isString } from './helpers';

export const INSERT_STYLE_ID = '___$insertStyle';

export const processRenderResponse = async (
  rollupOptions: Pick<
    RollupPluginSassOptions,
    'insert' | 'processor' | 'output'
  >,
  fileId: string,
  state: RollupPluginSassState,
  inCss: string,
) => {
  if (!inCss) return;

  const { processor } = rollupOptions;

  const result: Partial<RollupPluginSassProcessorFnOutput> = await (processor
    ? processor(inCss, fileId)
    : inCss);

  // Gather output requirements
  let resolvedCss: string;
  let namedExports: Record<string, unknown>;
  let cssModules: Record<string, string> | undefined;

  if (!isObject(result)) {
    resolvedCss = result as string;
    namedExports = {};
  } else {
    if (!isString((result as { css?: unknown }).css)) {
      /** @todo consider using rollup utils to throw this error */
      throw new Error(
        'You need to return the styles using the `css` property. ' +
          'See https://github.com/elycruz/rollup-plugin-sass#processor',
      );
    }

    const objResult = result as {
      css: string;
      cssModules?: Record<string, string>;
      [key: string]: unknown;
    };

    if (objResult.cssModules && !isObject(objResult.cssModules)) {
      /** @todo consider using rollup utils to throw this error */
      throw new Error(
        'You need to provide a js object as `cssModules` property. ' +
          'See https://github.com/elycruz/rollup-plugin-sass#processor',
      );
    }

    const { css, cssModules: cm, ...rest } = objResult;
    resolvedCss = css;
    cssModules = cm;
    namedExports = rest;
  }

  // Compose output
  const { styleMaps } = state;

  // Update bundle tracking entry with resolved content
  styleMaps[fileId].content = resolvedCss;

  let defaultExport = `""`;
  let cssCode = JSON.stringify(resolvedCss);
  const imports: string[] = [];

  if (rollupOptions.insert) {
    /**
     * Include import using {@link INSERT_STYLE_ID} as source.
     * It will be resolved to insert style function using `resolvedID` and `load` hooks;
     * e.g., the path will completely replaced, and re-generated (as a relative path)
     * by rollup.
     */
    imports.push(`import ${INSERT_STYLE_ID} from '${INSERT_STYLE_ID}';`);
    cssCode = `${INSERT_STYLE_ID}(${cssCode})`;
    defaultExport = cssCode;
  } else if (!rollupOptions.output) {
    defaultExport = cssCode;
  }

  const variableName = makeLegalIdentifier(
    path.basename(fileId, path.extname(fileId)),
  );

  const codeOutput: string[] = [
    ...imports,

    `const ${variableName} = ${defaultExport}`,
    `export default ${cssModules ? JSON.stringify(cssModules) : variableName}`,

    ...Object.entries(namedExports).map(
      ([n, v]) => `export const ${n} = ${JSON.stringify(v)}`,
    ),
  ];

  return codeOutput.join(';\n');
}; // @note do not `catch` here - let error propagate to rollup level
