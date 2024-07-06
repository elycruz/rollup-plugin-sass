import test from "ava";
import { rollup } from "rollup";
import type { RollupOutput } from "rollup";
import * as path from "path";
import { promises as fs, constants as fsConstants } from "fs";

import sass from "../src/index";
import { TEST_SASS_OPTIONS_DEFAULT, TEST_OUTPUT_DIR } from "./utils";

test("When `sourcemap` isn't set adjacent source map files should not be output, and rollup output chunk shouldn't contain a `map` entry", async (t) => {
  const outputFilePath = path.join(
    TEST_OUTPUT_DIR,
    "with-no-adjacent-source-map.js"
  );

  const bundle = await rollup({
    input: "test/fixtures/basic/index.js",
    plugins: [
      sass({
        options: TEST_SASS_OPTIONS_DEFAULT,
      }),
    ],
  });
  const sourceMapFilePath = `${outputFilePath}.map`;

  // Run test
  const writeResult = await bundle.write({
    file: outputFilePath,
    format: "esm",
  });

  // Check for output chunk
  t.true(
    writeResult && writeResult.output && !!writeResult.output.length,
    "output should contain an output chunk"
  );

  // Check absence of 'map' entry in chunk
  t.true(
    writeResult.output[0].map === null ||
      writeResult.output[0].map === undefined,
    "output chunk's `map` property should not be set.  It should equal `null` or `undefined`"
  );

  // Check for absence of source map file
  await fs.access(sourceMapFilePath, fsConstants.R_OK).then(
    () => t.false(true, `'${sourceMapFilePath}' should not exist.`),
    () => t.true(true)
  );
});

test(
  "When `sourcemap` is set, to `true`, adjacent source map file should be output, and " +
    "rollup output chunk should contain `map` entry",
  async (t) => {
    const outputFilePath = path.join(
        TEST_OUTPUT_DIR,
        "with-adjacent-source-map.js"
      ),
      bundle = await rollup({
        input: "test/fixtures/basic/index.js",
        plugins: [
          sass({
            options: TEST_SASS_OPTIONS_DEFAULT,
          }),
        ],
      }),
      sourceMapFilePath = `${outputFilePath}.map`;

    const writeResult = await bundle.write({
      file: outputFilePath,
      sourcemap: true,
      format: "esm",
    });

    // Check for output chunk
    t.true(
      writeResult && writeResult.output && !!writeResult.output.length,
      "output should contain an output chunk"
    );

    // Check for 'map' entry in chunk
    t.true(
      !!writeResult.output[0].map,
      "rollup output output chunk's `map` property should be set"
    );

    // Check for source map file
    const contents = await fs.readFile(sourceMapFilePath);

    t.true(
      !!contents.toString(),
      `${sourceMapFilePath} should have been written.`
    );
  }
);
