import type { OutputOptions, RollupOutput } from "rollup";
import path from "path";

import sass from "../../src/index";
import type { SassOptions } from "../../src/types";

//#region Constants
const repoRoot = path.join(__dirname, "../../");

export const TEST_OUTPUT_DIR = path.join(repoRoot, ".tests-output/");

export const TEST_SASS_OPTIONS_DEFAULT = {
  outputStyle: "compressed",
} as SassOptions;

export const TEST_BASE_CONFIG = {
  plugins: [
    sass({
      options: TEST_SASS_OPTIONS_DEFAULT,
    }),
  ],
};

export const TEST_GENERATE_OPTIONS: OutputOptions = {
  format: "es",
};

export const TEST_OUTPUT_OPTIONS = {
  format: "es",
  file: path.join(TEST_OUTPUT_DIR, "bundle.js"),
} as const;
//#endregion

//#region UTILS
function getOutputFirstChunkCode(output: RollupOutput["output"]): string {
  return output[0].code;
}

function squash(str: string): string {
  return str.trim().replace(/[\n\r\f]/g, "");
}

export const TEST_UTILS = {
  getOutputFirstChunkCode,
  squash,
};
//#endregion
