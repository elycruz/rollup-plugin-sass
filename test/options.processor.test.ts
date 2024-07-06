import test from "ava";
import { rollup } from "rollup";
import postcss from "postcss";
import { extractICSS } from "icss-utils";

import sass from "../src/index";
import {
  TEST_UTILS,
  TEST_SASS_OPTIONS_DEFAULT,
  TEST_GENERATE_OPTIONS,
} from "./utils";

test("should processor return as string", async (t) => {
  const reverse = (str: string): string => str.split("").reverse().join("");

  const outputBundle = await rollup({
    input: "test/fixtures/processor-string/index.js",
    plugins: [
      sass({
        processor: (css) => reverse(css),
        options: TEST_SASS_OPTIONS_DEFAULT,
      }),
    ],
  });
  const { output } = await outputBundle.generate(TEST_GENERATE_OPTIONS);
  const result = TEST_UTILS.getOutputFirstChunkCode(output);

  t.snapshot(result);
});

test("should processor return as object", async (t) => {
  const outputBundle = await rollup({
    input: "test/fixtures/processor-object/index.js",
    plugins: [
      sass({
        processor: (css) => ({
          css,
          foo: "foo",
          bar: "bar",
        }),
        options: TEST_SASS_OPTIONS_DEFAULT,
      }),
    ],
  });
  const { output } = await outputBundle.generate(TEST_GENERATE_OPTIONS);
  const result = TEST_UTILS.getOutputFirstChunkCode(output);

  t.snapshot(result);
});

test("should support processor return type `Promise<string>`", async (t) => {
  const outputBundle = await rollup({
    input: "test/fixtures/processor-promise/index.js",
    plugins: [
      sass({
        processor: (css) =>
          new Promise((resolve) => setTimeout(() => resolve(css), 100)),
        options: TEST_SASS_OPTIONS_DEFAULT,
      }),
    ],
  });
  const { output } = await outputBundle.generate(TEST_GENERATE_OPTIONS);
  const result = TEST_UTILS.getOutputFirstChunkCode(output);

  t.snapshot(result);
});

test("should support processor return type `Promise<{css: string, icssExport: {}, icssImport: {}}}>", async (t) => {
  const outputBundle = await rollup({
    input: "test/fixtures/processor-promise/with-icss-exports.js",
    plugins: [
      sass({
        processor: (css) => {
          const pcssRootNodeRslt = postcss.parse(css);
          const extractedIcss = extractICSS(pcssRootNodeRslt, true);
          const cleanedCss = pcssRootNodeRslt.toString();
          const out = {
            ...extractedIcss.icssExports,
            css: cleanedCss,
          };
          // console.table(extractedIcss);
          // console.log(out);
          return out;
        },
        options: TEST_SASS_OPTIONS_DEFAULT,
      }),
    ],
  });
  const { output } = await outputBundle.generate(TEST_GENERATE_OPTIONS);
  const result = TEST_UTILS.getOutputFirstChunkCode(output);

  t.snapshot(result);
});

test("should throw an error when processor returns an object type missing the `css` prop.", async (t) => {
  const sassPlugin = sass({
    // @ts-expect-error - Ignoring incorrect type (for test).
    processor: () => ({}),
    options: TEST_SASS_OPTIONS_DEFAULT,
  });
  const message =
    "You need to return the styles using the `css` property. See https://github.com/differui/rollup-plugin-sass#processor";

  await t.throwsAsync(
    () =>
      rollup({
        input: "test/fixtures/processor-error/index.js",
        plugins: [sassPlugin],
      }),
    { message }
  );
});
