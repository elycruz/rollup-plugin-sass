import test from "ava";
import { rollup } from "rollup";
import * as path from "path";

import sass from "../src/index";
import {
  TEST_UTILS,
  TEST_BASE_CONFIG,
  TEST_SASS_OPTIONS_DEFAULT,
  TEST_GENERATE_OPTIONS,
  TEST_OUTPUT_DIR,
} from "./utils";

test("should import *.scss and *.sass files", async (t) => {
  const outputBundle = await rollup({
    input: "test/fixtures/basic/index.js",
    ...TEST_BASE_CONFIG,
  });
  const { output } = await outputBundle.generate({
    format: "es",
    file: path.join(TEST_OUTPUT_DIR, "import_scss_and_sass.js"),
  });
  const result = TEST_UTILS.getOutputFirstChunkCode(output);

  t.snapshot(result);
});

test("should import *.scss and *.sass files with default configuration", async (t) => {
  const outputBundle = await rollup({
    input: "test/fixtures/basic/index.js",
    plugins: [sass()],
  });
  const { output } = await outputBundle.generate({
    ...TEST_GENERATE_OPTIONS,
    file: path.join(TEST_OUTPUT_DIR, "import_scss_and_sass_default_options.js"),
  });
  const result = TEST_UTILS.getOutputFirstChunkCode(output);

  t.snapshot(result);
});

test("should compress the dest CSS", async (t) => {
  const outputBundle = await rollup({
    ...TEST_BASE_CONFIG,
    input: "test/fixtures/compress/index.js",
  });
  const { output } = await outputBundle.generate(TEST_GENERATE_OPTIONS);
  const result = TEST_UTILS.getOutputFirstChunkCode(output);

  t.snapshot(result);
});

test("should support options.data", async (t) => {
  const jsVars = {
    color_red: "red",
  };
  const scssVars = Object.entries(jsVars).reduce(
    (prev, [varName, varValue]) => `${prev}$${varName}:${varValue};`,
    ""
  );
  const outputBundle = await rollup({
    input: "test/fixtures/data/index.js",
    plugins: [
      sass({
        options: {
          ...TEST_SASS_OPTIONS_DEFAULT,
          data: scssVars,
        },
      }),
    ],
  });
  const { output } = await outputBundle.generate(TEST_GENERATE_OPTIONS);
  const result = TEST_UTILS.getOutputFirstChunkCode(output);

  t.snapshot(result);
});
