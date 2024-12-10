import path from 'path';

import { makeLegalIdentifier } from '@rollup/pluginutils';

import {
  RollupPluginSassOptions,
  RollupPluginSassState,
  RollupPluginSassProcessorFnOutput,
} from '../types';

import { isFunction, isObject, isString } from './helpers';

export const INSERT_STYLE_ID = '___$insertStyle';

export const processRenderResponse = (
  rollupOptions: Pick<
    RollupPluginSassOptions,
    'insert' | 'processor' | 'output'
  >,
  fileId: string,
  state: RollupPluginSassState,
  inCss: string,
) => {
  if (!inCss) return Promise.resolve();

  const { processor } = rollupOptions;

  return (
    Promise.resolve()
      .then(() =>
        !isFunction(processor) ? inCss + '' : processor(inCss, fileId),
      )
      // Gather output requirements
      .then(
        (
          result: Partial<RollupPluginSassProcessorFnOutput>,
        ): [string, Record<string, unknown>, Record<string, string>?] => {
          if (!isObject(result)) {
            return [result, {}];
          }

          if (!isString(result.css)) {
            /** @todo consider using rollup utils to throw this error */
            throw new Error(
              'You need to return the styles using the `css` property. ' +
                'See https://github.com/elycruz/rollup-plugin-sass#processor',
            );
          }

          if (result.cssModules && !isObject(result.cssModules)) {
            /** @todo consider using rollup utils to throw this error */
            throw new Error(
              'You need to provide a js object as `cssModules` property. ' +
                'See https://github.com/elycruz/rollup-plugin-sass#processor',
            );
          }

          const { css, cssModules, ...namedExports } = result;
          return [css, namedExports, cssModules];
        },
      )

      // Compose output
      .then(([resolvedCss, namedExports, cssModules]) => {
        const { styleMaps } = state;

        // Update bundle tracking entry with resolved content
        styleMaps[fileId].content = resolvedCss;

        let defaultExport = `""`;
        let cssCode = JSON.stringify(resolvedCss);
        let imports: string[] = [];

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

          `var ${variableName} = ${defaultExport};`,
          `export default ${cssModules ? JSON.stringify(cssModules) : variableName};`,

          ...Object.entries(namedExports).map(
            ([n, v]) => `export const ${n} = ${JSON.stringify(v)};`,
          ),
        ];

        return codeOutput.join('\n');
      })
  ); // @note do not `catch` here - let error propagate to rollup level
};
