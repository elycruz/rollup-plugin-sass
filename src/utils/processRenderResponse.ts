import { isFunction, isObject, isString } from "./index";
import { RollupPluginSassOptions, RollupPluginSassState, RollupPluginSassProcessorFnOutput } from "../types";

export const INSERT_STYLE_ID = '___$insertStyle';

export const processRenderResponse = (
  rollupOptions: Pick<
    RollupPluginSassOptions,
    'insert' | 'processor' | 'output'
  >,
  file: string,
  state: RollupPluginSassState,
  inCss: string,
) => {
  if (!inCss) return Promise.resolve();

  const { processor } = rollupOptions;

  return (
    Promise.resolve()
      .then(() =>
        !isFunction(processor) ? inCss + '' : processor(inCss, file),
      )
      // Gather output requirements
      .then((result: Partial<RollupPluginSassProcessorFnOutput>) => {
        if (!isObject(result)) {
          return [result, ''];
        }
        if (!isString(result.css)) {
          throw new Error(
            'You need to return the styles using the `css` property. ' +
              'See https://github.com/differui/rollup-plugin-sass#processor',
          );
        }
        const outCss = result.css;
        delete result.css;
        const restExports = Object.keys(result).reduce(
          (agg, name) =>
            agg + `export const ${name} = ${JSON.stringify(result[name])};\n`,
          '',
        );
        return [outCss, restExports];
      })

      // Compose output
      .then(([resolvedCss, restExports]) => {
        const { styleMaps } = state;

        // Update bundle tracking entry with resolved content
        styleMaps[file].content = resolvedCss;

        const out = JSON.stringify(resolvedCss);

        let defaultExport = `""`;
        let imports = '';

        if (rollupOptions.insert) {
          /**
           * Include import using {@link INSERT_STYLE_ID} as source.
           * It will be resolved to insert style function using `resolvedID` and `load` hooks;
           * e.g., the path will completely replaced, and re-generated (as a relative path)
           * by rollup.
           */
          imports = `import ${INSERT_STYLE_ID} from '${INSERT_STYLE_ID}';\n`;
          defaultExport = `${INSERT_STYLE_ID}(${out});`;
        } else if (!rollupOptions.output) {
          defaultExport = out;
        }

        return `${imports}export default ${defaultExport};\n${restExports}`;
      })
  ); // @note do not `catch` here - let error propagate to rollup level
};
