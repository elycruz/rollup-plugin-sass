import test from 'ava';
import { rollup } from "rollup";

import sass from "../src/index";
import { SassOptions } from '../src/types';
import { TEST_UTILS, TEST_GENERATE_OPTIONS } from "./utils";

test("should custom importer works", async (t) => {
  const outputBundle = await rollup({
      input: "test/fixtures/custom-importer/index.js",
      plugins: [
        sass({
          options: {
            outputStyle: "compressed",
            importer: [
              (url, prev, done) => {
                done({
                  file: url.replace("${name}", "actual_a"),
                });
              },
            ],
          } as SassOptions,
        }),
      ],
    })
    const { output } = await outputBundle.generate(TEST_GENERATE_OPTIONS);
    const result = TEST_UTILS.getOutputFirstChunkCode(output);

    t.snapshot(result);
});
