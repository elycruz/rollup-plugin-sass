import test from "ava";
import { rollup } from "rollup";
import * as sassRuntime from "sass";

import sass from "../src/index";
import {
  TEST_UTILS,
  TEST_SASS_OPTIONS_DEFAULT,
  TEST_GENERATE_OPTIONS,
} from "./utils";

test("should support options.runtime", async (t) => {
  const outputBundle = await rollup({
    input: "test/fixtures/runtime/index.js",
    plugins: [
      sass({
        runtime: sassRuntime,
        options: TEST_SASS_OPTIONS_DEFAULT,
      }),
    ],
  });
  const { output } = await outputBundle.generate(TEST_GENERATE_OPTIONS);
  const result = TEST_UTILS.getOutputFirstChunkCode(output);

  t.snapshot(result);
});
