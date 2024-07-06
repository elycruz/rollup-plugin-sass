import test from "ava";
import { rollup } from "rollup";
import * as path from "path";
import { promises as fs } from "fs";

import sass from "../src/index";
import {
  TEST_UTILS,
  TEST_SASS_OPTIONS_DEFAULT,
  TEST_GENERATE_OPTIONS,
  TEST_OUTPUT_DIR,
} from "./utils";

test("should resolve ~ as node_modules", async (t) => {
  const outputBundle = await rollup({
    input: "test/fixtures/import/index.js",
    plugins: [
      sass({
        options: TEST_SASS_OPTIONS_DEFAULT,
      }),
    ],
  });
  const { output } = await outputBundle.generate(TEST_GENERATE_OPTIONS);
  const result = TEST_UTILS.getOutputFirstChunkCode(output);

  t.snapshot(result);
});

test("should resolve ~ as node_modules and output javascript modules", async (t) => {
  const outputFilePathES = path.join(
    TEST_OUTPUT_DIR,
    "import_scss_and_sass.es.js"
  );
  const outputFilePathCJS = path.join(
    TEST_OUTPUT_DIR,
    "import_scss_and_sass.cjs.js"
  );

  const outputBundle = await rollup({
    input: "test/fixtures/import/index.js",
    plugins: [
      sass({
        options: TEST_SASS_OPTIONS_DEFAULT,
      }),
    ],
  });
  const { output } = await outputBundle.generate(TEST_GENERATE_OPTIONS);
  const result = TEST_UTILS.getOutputFirstChunkCode(output);

  t.snapshot(result, "check output result code");

  // Test 'es' module output
  // ----
  await outputBundle
    .write({
      format: "es",
      file: outputFilePathES,
    })
    .then(() => fs.readFile(outputFilePathES))
    .then((data) => {
      t.snapshot(data.toString(), "Ensure content exist in ESM output file");
    });

  // Test 'cjs' module output
  // ----
  await outputBundle
    .write({
      format: "cjs",
      file: outputFilePathCJS,
    })
    .then(() => fs.readFile(outputFilePathCJS))
    .then((data) => {
      t.snapshot(data.toString(), "Ensure content exist in CJS output file");
    });
});
