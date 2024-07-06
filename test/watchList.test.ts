import test from "ava";
import { rollup } from "rollup";
import { promises as fs } from "fs";

import sass from "../src/index";
import { TEST_UTILS, TEST_SASS_OPTIONS_DEFAULT } from "./utils";

test("module stylesheets graph should be added to watch list", async (t) => {
  const inputFilePath = "test/fixtures/dependencies/index.js";

  // Bundle our dependencies fixture module
  // ----
  const bundle = await rollup({
    input: inputFilePath,
    plugins: [
      sass({
        options: TEST_SASS_OPTIONS_DEFAULT,
      }),
    ],
  });

  // Load nested style sheet contents and return associated list of filename and content tuples
  // ----
  const nestedFilePathsAndContents = await Promise.all(
    [
      "test/fixtures/dependencies/style1.scss",
      "test/fixtures/dependencies/style2.scss",
      "test/fixtures/dependencies/style3.scss",
    ].map((filePath) =>
      fs
        .readFile(filePath)
        .then((buf) => [filePath, TEST_UTILS.squash(buf.toString())])
    )
  );

  // Run tests
  // ----
  // Check `watchFiles` count (three above, and 'index.js' module one)
  t.true(
    bundle.watchFiles.length === 4,
    'should contain expected number of "watched" files'
  );

  // Ensure our initial 'index.js' module is being watched
  t.true(
    bundle.watchFiles[0].endsWith(inputFilePath),
    'Expected `bundle.watchFiles[0]` to end with "index.js"'
  );

  // Skip 'index.js' file and ensure remaining nested files are also watched.
  // ----
  bundle.watchFiles.slice(1).forEach((filePath, i) => {
    const [expectedTail] = nestedFilePathsAndContents[i];
    t.true(
      filePath.endsWith(expectedTail),
      `${filePath} should end with ${expectedTail}`
    );
  });

  // Get target module.
  // ----
  const targetModule = bundle?.cache?.modules[0]!;
  t.true(!!targetModule, "Expected bundle data");

  // Ensure target module transform dependencies indeed end with expected file path tails.
  // ----
  t.true(
    targetModule.transformDependencies?.every((filePath, i) => {
      const [expectedTail] = nestedFilePathsAndContents[i];
      const result = filePath.endsWith(expectedTail);
      t.true(result, `${filePath} should end with ${expectedTail}`);
      return result;
    }),
    "`bundle.cache.modules[0].transformDependencies` entries should" +
      " each end with expected file-path tails"
  );

  // Test final content output
  // ----
  const expectedFinalContent = await fs
    .readFile("test/fixtures/dependencies/expected.js")
    .then((x) => x.toString());

  t.is(targetModule.code.trim(), expectedFinalContent.trim());
});
