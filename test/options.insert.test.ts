import test from "ava";
import { rollup } from "rollup";
import type { WarningHandlerWithDefault } from "rollup";

import sass from "../src/index";
import {
  TEST_UTILS,
  TEST_SASS_OPTIONS_DEFAULT,
  TEST_GENERATE_OPTIONS,
} from "./utils";

/**
 * In unit tests we are targeting `src` folder,
 * so there is no `insertStyle.js` file so `rollup` issues a warning
 * that we can silence.
 */
const onwarn: WarningHandlerWithDefault = (warning, defaultHandler) => {
  if (
    warning.code === "UNRESOLVED_IMPORT" &&
    warning.exporter?.includes("insertStyle.js")
  ) {
    return;
  }
  defaultHandler(warning);
};

test("should insert CSS into head tag", async (t) => {
  const outputBundle = await rollup({
    input: "test/fixtures/insert/index.js",
    plugins: [
      sass({
        insert: true,
        options: TEST_SASS_OPTIONS_DEFAULT,
      }),
    ],
    onwarn,
  });
  const { output } = await outputBundle.generate(TEST_GENERATE_OPTIONS);
  const result = TEST_UTILS.getOutputFirstChunkCode(output);

  t.snapshot(result);
});

test("should generate chunks with import insertStyle when `insert` is true", async (t) => {
  const outputBundle = await rollup({
    input: {
      entryA: "test/fixtures/multiple-entry-points/entryA.js",
      entryB: "test/fixtures/multiple-entry-points/entryB.js",
    },
    plugins: [
      sass({
        insert: true,
        options: TEST_SASS_OPTIONS_DEFAULT,
      }),
    ],
    output: {
      preserveModules: true,
      preserveModulesRoot: "src",
    },
    onwarn,
  });

  const { output } = await outputBundle.generate(TEST_GENERATE_OPTIONS);

  t.is(output.length, 2, "has 2 chunks");
  t.true(
    output.every((outputItem) => {
      if (outputItem.type === "chunk") {
        const insertStyleImportsCount = outputItem.imports.filter((it) =>
          it.includes("/insertStyle.js")
        ).length;
        return insertStyleImportsCount === 1;
      }
      // if is an assets there is no need to check imports
      return true;
    }),
    "each chunk must include insertStyle once"
  );
});
