import test from "ava";
import { rollup } from "rollup";
import type { WarningHandlerWithDefault } from "rollup";
import * as path from "path";
import { promises as fs, readFileSync } from "fs";
import Sinon from "sinon";

import sass from "../src/index";
import { RollupPluginSassOutputFn } from "../src/types";
import {
  TEST_UTILS,
  TEST_SASS_OPTIONS_DEFAULT,
  TEST_OUTPUT_DIR,
  TEST_OUTPUT_OPTIONS,
} from "./utils";

const onwarn: WarningHandlerWithDefault = (warning, defaultHandler) => {
  if (warning.code === "EMPTY_BUNDLE") {
    return;
  }
  defaultHandler(warning);
};

const [expectA, expectB] = [
  "test/assets/expect_a.css",
  "test/assets/expect_b.css",
].map((filePath) =>
  TEST_UTILS.squash(readFileSync(filePath, { encoding: "utf-8" }))
);

test("should support output as function", async (t) => {
  const outputSpy = Sinon.spy() as Sinon.SinonSpy<
    Parameters<RollupPluginSassOutputFn>,
    ReturnType<RollupPluginSassOutputFn>
  >;
  const outputFilePath = path.join(
    TEST_OUTPUT_DIR,
    "support_output_function.js"
  );

  const outputBundle = await rollup({
    input: "test/fixtures/output-function/index.js",
    plugins: [
      sass({
        output: outputSpy,
        options: TEST_SASS_OPTIONS_DEFAULT,
      }),
    ],
    onwarn,
  });

  await outputBundle.write({ ...TEST_OUTPUT_OPTIONS, file: outputFilePath });

  const result = await fs
    .readFile(outputFilePath)
    .catch(() =>
      t.true(false, `Trouble reading back written file "${outputFilePath}".`)
    );

  t.is(TEST_UTILS.squash(result.toString()), "", "JS bundle mus be empty");

  t.true(outputSpy.calledOnce, "output function has been called");

  const [actualCSSstring, ...otherOutputParams] = outputSpy.args[0];

  [expectA, expectB].forEach((expectedChunkCSS) => {
    t.true(
      actualCSSstring.includes(expectedChunkCSS),
      [
        `expect "${actualCSSstring}" to include "${expectedChunkCSS}"`,
        `Additional params are: ${JSON.stringify(otherOutputParams)}`,
      ].join("\n")
    );
  });
});

test("should support output as (non-previously existent) path", async (t) => {
  const outputStylePath = path.join(TEST_OUTPUT_DIR, "output-path/style.css");
  const outputBundle = await rollup({
    input: "test/fixtures/output-path/index.js",
    plugins: [
      sass({
        output: outputStylePath,
        options: TEST_SASS_OPTIONS_DEFAULT,
      }),
    ],
    onwarn,
  });
  const filePath = path.join(
    TEST_OUTPUT_DIR,
    "support_output_prev-non-exist.js"
  );

  await outputBundle.write({ ...TEST_OUTPUT_OPTIONS, file: filePath });

  await fs
    .readFile(filePath)
    .then((result) => {
      t.is(TEST_UTILS.squash(result.toString()), "");
    })
    .then(() => fs.readFile(outputStylePath))
    .then((result) => {
      t.not(TEST_UTILS.squash(result.toString()).indexOf(expectA), -1);
      t.not(TEST_UTILS.squash(result.toString()).indexOf(expectB), -1);
    });
});

test("should support output as true", async (t) => {
  const outputBundle = await rollup({
    input: "test/fixtures/output-true/index.js",
    plugins: [
      sass({
        output: true,
        options: TEST_SASS_OPTIONS_DEFAULT,
      }),
    ],
    onwarn,
  });
  const filePath = path.join(TEST_OUTPUT_DIR, "support-output-as-true.js");

  await outputBundle.write({ ...TEST_OUTPUT_OPTIONS, file: filePath });

  await fs
    .readFile(filePath)
    .then((result) => t.is(TEST_UTILS.squash(result.toString()), ""))
    .then(() => fs.readFile(filePath.replace(".js", ".css")))
    .then((result) => TEST_UTILS.squash(result.toString()))
    .then((result) => {
      t.not(result.indexOf(expectA), -1);
      t.not(result.indexOf(expectB), -1);
    });
});
