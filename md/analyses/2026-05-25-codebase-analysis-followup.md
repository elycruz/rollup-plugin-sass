# Codebase Analysis — Follow-up

_Date: 2026-05-25_
_Builds on: [2026-05-25-codebase-analysis.md](./2026-05-25-codebase-analysis.md)_

---

## Part 1 — Validation of prior findings

Each prior finding re-checked against the current `src/` tree. Status is one of:

- **CONFIRMED** — issue is still present and the description is accurate.
- **CONFIRMED w/ caveat** — issue is present but the proposed fix needs adjustment.
- **FIXED** — issue is no longer in the tree.
- **NOT REPRODUCED** — could not reproduce, see notes.

| ID | Status | Notes |
|----|--------|-------|
| B1 | CONFIRMED | `src/utils/helpers.ts:6` — still `typeof x === 'object'`. Reachable via `processRenderResponse` line 38: if `processor` returns `null`, the `!isObject(result)` guard returns `false` and the code then dereferences `result.css` on `null`. Note inconsistency: `isString` already calls `isset` for a null-guard. |
| B2 | CONFIRMED | `src/index.ts:199` — `output(css, styles)` not awaited despite `RollupPluginSassOutputFn` returning `unknown` (which may resolve to a Promise). |
| B3 | CONFIRMED w/ caveat | `src/index.ts:106` — `sourceMap: true` is still hardcoded. **Caveat:** the proposed fix ("gate on `incomingSassOptions?.sourceMap !== false`") will not type-check because `RollupPluginSassModernOptions` `Omit`s `'sourceMap'` (`src/types.ts:73`). Either widen the type or, better, drive `sourceMap` from `outputOptions.sourcemap` (which is what the inline comment already hints at). |
| B4 | CONFIRMED | `src/index.ts:175` — `map: { mappings: res.map ? res.map.toString() : '' }`. Returning an empty-but-shaped map object pollutes rollup's source-map pipeline. |
| B5 | CONFIRMED | `src/index.ts:203` — only `outputOptions.file` is handled. **Better fix than the one proposed:** emit via `this.emitFile({ type: 'asset', ... })` so rollup handles asset placement, hashing, and `assetFileNames`. The `fs.writeFile` path bypasses all of that. Apply this same restructure to the `output: true` *and* `output: string` branches. |
| P1 | CONFIRMED | `src/utils/getImporterList.ts:45, 87` — both importers still call `resolve.sync`. The legacy importer's `lastResult` chain already serialises async work, so async `resolve` integrates cleanly. |
| P2 | CONFIRMED | `src/index.ts:124` — `compileResult.css` is typed `string` in the modern API. `.toString()` is a no-op. |
| Q1 | CONFIRMED | `src/index.ts:37` — `Object.assign(...)` for defaults; spread is more idiomatic. |
| Q2 | CONFIRMED | `src/utils/getImporterList.ts:63, 96` — `(importOption as never)` to silence `Array.prototype.concat` overload errors. |
| Q3 | CONFIRMED | `src/index.ts:167` — stale `@todo`. Per rollup docs, `addWatchFile` is already a no-op outside watch mode. |
| Q4 | CONFIRMED | `src/utils/processRenderResponse.ts` — `Promise.resolve().then(...).then(...).then(...)`. Conversion to `async/await` improves both readability and stack traces. |

None of the findings have been fixed in the current tree.

---

## Part 2 — Additional findings

### 🐛 New logic bugs

#### B6 — Stale `pluginState.styles` in rollup watch mode

**File:** `src/index.ts:54-57, 86-93, 181-215`

`pluginState` is created once at plugin construction and persists across all rebuilds. `transform` only appends to `styles`/`styleMaps` when `styleMaps[filePath]` is missing. If a `.scss` file is removed from the dependency graph (or even just renamed) in watch mode, its `StyleSheetIdAndContent` entry is **never evicted**, and the next `generateBundle` still concatenates its stale `content` into the output CSS.

**Fix:** Reset/repopulate `styles` and `styleMaps` at the start of each build. Rollup's `buildStart` hook is the right place.

---

#### B7 — `output === true` filename stripping miscounts non-`.js` extensions

**File:** `src/index.ts:206-209`

```ts
if (dest.endsWith('.js') || dest.endsWith('.ts')) {
  dest = dest.slice(0, -3);
}
dest = `${dest}.css`;
```

The check only matches exactly `.js` / `.ts` (3 chars), so `bundle.mjs`, `bundle.cjs`, `bundle.jsx`, `bundle.tsx` fall through and produce `bundle.mjs.css`, `bundle.cjs.css`, etc. instead of `bundle.css`.

**Fix:** strip via `path.parse(dest)` and rebuild with `.css`, or test against a wider extension list (`.js`, `.mjs`, `.cjs`, `.ts`, `.tsx`, `.jsx`). The `emitFile` rewrite (see B5 above) eliminates the problem entirely.

---

#### B8 — Empty-string `data` swallows `code` in legacy path

**File:** `src/index.ts:147-148`

```ts
data:
  incomingSassOptions?.data && `${incomingSassOptions.data}${code}`,
```

If a user explicitly passes `data: ''`, the `&&` short-circuits and `data` becomes `''` — but the intent of the surrounding code is "prepend user data to file contents." Compare with the modern path (`src/index.ts:113-115`) which uses `?` to express the same thing and is correct.

Practically harmless because `data: ''` is unusual, but the inconsistency between the two paths is real.

**Fix:** mirror the modern path: `data: incomingSassOptions?.data ? \`${incomingSassOptions.data}${code}\` : undefined,` — or just always set `data` and let sass handle it (the `file` option is also present, so sass uses both).

---

#### B9 — `isString` rejects strings created with `new String()`

**File:** `src/utils/helpers.ts:3-4`

```ts
export const isString = (x: unknown): x is string =>
  isset(x) && (x as object).constructor === String;
```

This passes primitive strings (autoboxed to `String` wrapper) but uses the wrong narrowing for a runtime check. Use `typeof x === 'string'` — it's both faster and the canonical predicate.

Severity is low (no realistic caller passes `new String(...)`), but the current implementation is needlessly fragile to cross-realm objects (where `constructor === String` is false even for real strings).

---

### ⚡ New performance / architecture

#### P3 — `fs.writeFile` bypasses rollup's asset pipeline

**File:** `src/index.ts:192-193, 211-213`

Writing CSS through `fs.promises.writeFile` skips rollup's asset emission system. Consequences:

- No automatic hashing (no respect for `output.assetFileNames`).
- Output isn't represented in the rollup `bundle` object, so downstream plugins can't inspect or further transform it.
- No coordinated handling of `output.dir` vs `output.file` (see B5).

**Fix:** use `this.emitFile({ type: 'asset', fileName: ..., source: css })`. This solves B5, P3, and structurally simplifies the three `output` branches.

---

#### P4 — Plugin-scoped state breaks parallel/multi-output builds

**File:** `src/index.ts:54-57, 181-215`

When a single rollup configuration emits to multiple outputs (`output: [...]`), `generateBundle` fires once per output, all sharing the same `pluginState.styles`. Each fire writes the same CSS again to whichever `output` target is configured. If `output: 'fixed-path.css'`, that's a redundant rewrite; if `output: true`, paths differ but stale state from B6 still bleeds across.

Combined with B6, the right structural fix is: rebuild `styles` in `buildStart`, emit via `emitFile` in `generateBundle` (so rollup deals with per-output bookkeeping).

---

### 🔧 New quality / maintainability

#### Q5 — `runtime: any` defeats type-checking through the runtime

**File:** `src/types.ts:67-68`

```ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
runtime?: any;
```

The lint suppression hides the fact that every `sassRuntime.compileStringAsync(...)` and `sassRuntime.render(...)` call in `src/index.ts` is unchecked. A typed alternative: `runtime?: Pick<typeof import('sass'), 'compileStringAsync' | 'render'>` (or a discriminated type per `api`).

---

#### Q6 — `engines.node: ">=10"` is stale and misleading

**File:** `package.json`

`engines.node` claims `>=10` but the CI matrix only tests 20.x / 22.x / 24.x, and `logger.ts:1` still carries a comment about Node 10–12 compatibility. Anyone running this on Node 12 is unsupported in practice.

**Fix:** bump `engines.node` to match the matrix (`>=20.0.0`) and drop the related comment in `logger.ts` (the `console.log.bind(console)` workaround is also unnecessary on modern Node).

---

#### Q7 — `insertStyle` uses `innerHTML` and a redundant `type` attribute

**File:** `src/insertStyle.ts:16-17`

```ts
style.setAttribute('type', 'text/css');
style.innerHTML = css;
```

- `type="text/css"` is the default on `<style>` in HTML5; the attribute can go.
- For a `<style>` tag, prefer `style.textContent = css`. Browsers parse `<style>` content as CSS regardless, so functionality is identical, but `textContent` is the canonical, lint-friendly choice and avoids any future tightening of CSP/Trusted-Types policies that may flag `innerHTML`.

---

#### Q8 — `@types/resolve@^0.0.8` is severely outdated

**File:** `package.json` (`devDependencies`)

The package itself runs on `resolve@^1.5.0`, but its type stubs are pinned to a near-zero version (`@types/resolve@^0.0.8`). Current `@types/resolve` is 1.20.x and includes the `resolve.async` overload typing this project would need for the P1 fix.

**Fix:** bump to `@types/resolve@^1.20.0` and adjust call sites.

---

#### Q9 — `as TransformResult` casts hide return-type drift

**File:** `src/index.ts:136, 176`

Both branches `return { ... } as TransformResult`. The cast is needed because the inline object isn't structurally compatible with rollup's `TransformResult` union (likely the loose `map` typing — `{ mappings: '' }` doesn't match `SourceMapInput`).

Tightening the `map` value (fix B4) and properly typing `loadedUrls`/`sourceMap` returns will eliminate the need for the cast.

---

#### Q10 — Inconsistent handling of `processor` in `processRenderResponse`

**File:** `src/utils/processRenderResponse.ts:31`

```ts
.then(() => !isFunction(processor) ? inCss + '' : processor(inCss, fileId))
```

- `inCss + ''` is a no-op coercion on an already-string value (`inCss` is typed `string`).
- The ternary is harder to scan than `processor ? processor(inCss, fileId) : inCss`.

Minor, but worth tidying when Q4 (async/await refactor) lands.

---

## Updated severity matrix (additions only)

| ID | Category | Severity | File |
|----|----------|----------|------|
| B6 | Bug | High | `src/index.ts` |
| B7 | Bug | Medium | `src/index.ts` |
| B8 | Bug | Low | `src/index.ts` |
| B9 | Bug | Low | `src/utils/helpers.ts` |
| P3 | Perf/Arch | Medium | `src/index.ts` |
| P4 | Perf/Arch | Medium | `src/index.ts` |
| Q5 | Quality | Low | `src/types.ts` |
| Q6 | Quality | Low | `package.json`, `src/utils/logger.ts` |
| Q7 | Quality | Low | `src/insertStyle.ts` |
| Q8 | Quality | Low | `package.json` |
| Q9 | Quality | Low | `src/index.ts` |
| Q10| Quality | Low | `src/utils/processRenderResponse.ts` |

---

## Recommended bundling for a single PR

If addressing in one pass, the highest-value bundle is:

1. **B1, B2, B4** — fast, isolated bug fixes with clear test coverage paths.
2. **B5 + B7 + P3 + P4** — converge on `this.emitFile` and `buildStart`-reset state; these four are tangled enough that fixing them together is cleaner than separately.
3. **B6** — `buildStart` reset (subset of the above; can be its own PR if the `emitFile` rewrite is deferred).
4. **B3** — separate PR because it requires touching `RollupPluginSassModernOptions` and coordinating with rollup's `sourcemap` option.
5. Q-tier items — group at end as a "cleanup" PR.

P1 and Q8 pair naturally (bump types, then use async resolve).
