# Implementation Plan — Bug Fixes & Improvements

_Based on: [2026-05-25-codebase-analysis.md](../analyses/2026-05-25-codebase-analysis.md)_
_Date: 2026-05-25_

---

## Approach

Address all findings from the analysis in order of severity.  Each change is tested by running
the existing test suite (`npm test`).  No new tooling is introduced.

---

## Todos

### Phase 1 — Logic Bugs (High)

**fix-is-object**
Fix `isObject` to guard against `null`.
- File: `src/utils/helpers.ts`
- Change: `typeof x === 'object'` → `x !== null && typeof x === 'object'`

**fix-await-output-fn**
Await the `output` function in `generateBundle`.
- File: `src/index.ts`
- Change: `output(css, styles)` → `await output(css, styles)`
- Note: `RollupPluginSassOutputFn` return type should be updated to `unknown | Promise<unknown>`
  to signal this intent, though the runtime fix is the critical part.

### Phase 2 — Logic Bugs (Medium)

**fix-legacy-map-return**
Return `undefined` instead of `{ mappings: '' }` when no source map exists in the legacy path.
- File: `src/index.ts`
- Change: `map: { mappings: res.map ? res.map.toString() : '' }` →
  `map: res.map ? { mappings: res.map.toString() } : undefined`

**fix-modern-sourcemap**
Only force `sourceMap: true` in the modern path when the user has not explicitly disabled it.
- File: `src/index.ts`
- Change: Gate `sourceMap: true` on `incomingSassOptions?.sourceMap !== false`

**fix-output-dir**
Handle `outputOptions.dir` when `output === true`.
- File: `src/index.ts`
- Change: After the existing `outputOptions.file` block, add a branch for `outputOptions.dir`:
  write `<dir>/<bundle-name>.css` (use the first entry file name as the stem, or a configurable
  default).

### Phase 3 — Performance

**perf-remove-tostring**
Remove no-op `.toString()` on modern CSS result.
- File: `src/index.ts`
- Change: `compileResult.css.toString().trim()` → `compileResult.css.trim()`

**perf-resolve-async** _(optional / follow-up)_
Switch `resolve.sync` to the async `resolve` API in both importers.
- File: `src/utils/getImporterList.ts`
- Note: Requires converting the importer callbacks to properly async variants; verify sass
  async-importer contract before changing.

### Phase 4 — Code Quality

**quality-spread-options**
Replace `Object.assign` with spread in plugin factory.
- File: `src/index.ts`

**quality-importer-types**
Replace `as never` casts with explicit spread/nullish coalescing.
- File: `src/utils/getImporterList.ts`

**quality-remove-todo**
Remove stale `@todo` comment about watch mode.
- File: `src/index.ts`

**quality-processRenderResponse** _(optional / follow-up)_
Convert `processRenderResponse` Promise chain to `async/await`.
- File: `src/utils/processRenderResponse.ts`

---

## Files Changed

| File | Changes |
|------|---------|
| `src/utils/helpers.ts` | B1 |
| `src/index.ts` | B2, B3, B4, B5, P2, Q1, Q3 |
| `src/utils/getImporterList.ts` | P1 (optional), Q2 |
| `src/utils/processRenderResponse.ts` | Q4 (optional) |

---

## Validation

Run `npm test` after each phase to confirm no regressions.

---

## Backward-Compatibility-Safe Work

_Added 2026-05-25 (follow-up). Cross-references the [follow-up analysis](../analyses/2026-05-25-codebase-analysis-followup.md)._

This section enumerates **only** items that can ship under SemVer **PATCH** or **MINOR** — no breaking changes to public API, CLI flags, file outputs, or supported runtimes.

### Explicitly excluded from this section (require MAJOR)

- **P3** Switch `output: true` / `output: string` to `this.emitFile(...)` — changes output naming/placement (hashing, `assetFileNames` integration). Defer to v2.
- **Q6** Bump `engines.node` from `>=10` to match the CI matrix — drops users on Node 10–19.
- **B5 (full)** Adding `outputOptions.dir` handling via `emitFile` — couple with P3 above.
- **B3 (full)** Reading `sourceMap` from rollup's `outputOptions.sourcemap` — silently changes whether source maps are emitted for users who never opted in.

### PATCH — bug fixes, no API surface change

| ID | File | Change | Risk |
|----|------|--------|------|
| **B1** | `src/utils/helpers.ts` | `isObject`: add `x !== null && typeof x === 'object'`. | Very low — restores the documented "you must return `css` property" error path. |
| **B2** | `src/index.ts:199` | `await output(css, styles)`. | Very low — `RollupPluginSassOutputFn` return type is already `unknown` (permits Promise). Output is more reliable; never less. |
| **B4** | `src/index.ts:175` | `map: res.map ? { mappings: res.map.toString() } : undefined`. | Low — fixes rollup's source-map merging; no user-facing breakage expected. |
| **B6** | `src/index.ts` (add `buildStart` hook) | Reset `pluginState.styles` and `styleMaps` at build start. | Low — eliminates stale-CSS bug in watch mode and partially mitigates P4 (multi-output). |
| **B7** | `src/index.ts:206-209` | Strip extension via `path.parse(dest)` so `.mjs`/`.cjs`/`.jsx`/`.tsx` produce `<name>.css` instead of `<name>.<ext>.css`. | Low — current output filenames are clearly wrong; no plausible reliance. |
| **B8** | `src/index.ts:147-148` | Mirror modern path: `data: incomingSassOptions?.data ? \`${incomingSassOptions.data}${code}\` : undefined`. | Very low — fixes `data: ''` edge case. |
| **B9** | `src/utils/helpers.ts:3-4` | `isString`: use `typeof x === 'string'`. | Very low — internal helper. |
| **P1** | `src/utils/getImporterList.ts:45, 87` | `resolve.sync` → async `resolve` (callback or promisified). | Low — sass already runs importers async; serial ordering preserved by existing `lastResult` chain. Pair with Q8. |
| **P2** | `src/index.ts:124` | Remove no-op `.toString()` on `compileResult.css`. | None — typed `string`. |
| **Q1** | `src/index.ts:37` | `Object.assign({...defaults}, options)` → `{ ...defaults, ...options }`. | None — identical semantics. |
| **Q2** | `src/utils/getImporterList.ts:63, 96` | Replace `(importOption as never)` with typed spread/`??`. | None — type-level only. |
| **Q3** | `src/index.ts:167` | Remove stale `@todo` about watch-mode filtering. | None — comment only. |
| **Q4** | `src/utils/processRenderResponse.ts` | `Promise.resolve().then(...).then(...)` → `async/await`. | Low — behavior preserved; improves stack traces. |
| **Q5** _(narrow)_ | `src/types.ts:67-68` | Tighten the *internal* usage of `runtime` (cast at call sites or introduce an internal alias) **without changing the exported `runtime?: any`**. | None — public type unchanged. Full tightening of the exported type is MINOR/MAJOR and out of scope here. |
| **Q7** | `src/insertStyle.ts:16-17` | Drop `setAttribute('type', 'text/css')`; switch `innerHTML` → `textContent`. | Very low — behavior identical for valid CSS; CSP-friendly. |
| **Q8** | `package.json` (devDependencies) | Bump `@types/resolve` from `^0.0.8` to `^1.20.0`. | None — devDep only, enables P1. |
| **Q9** | `src/index.ts:136, 175-176` | After B4 lands, drop `as TransformResult` casts. | None — type cleanup. |
| **Q10** | `src/utils/processRenderResponse.ts:31` | Remove `inCss + ''` no-op coercion; flip ternary to positive form. | None — readability only. |

### MINOR — additive only (new behavior under new conditions, no change to existing)

| ID | File | Change | Notes |
|----|------|--------|-------|
| **B5** _(scoped)_ | `src/index.ts:203` | When `output === true` **and** `outputOptions.dir` is set **and** `outputOptions.file` is not, write `<dir>/<entryName>.css` using the existing `fs.writeFile` flow. | Strict additive: only triggers in a case that today produces *zero* output, so no existing user observes a change. The cleaner `emitFile` rewrite stays deferred to v2 (P3). |

### Suggested release sequencing

1. **PATCH release A** — pure local fixes: B1, B2, B4, B7, B8, B9, P2, Q1, Q2, Q3, Q4, Q5(narrow), Q7, Q9, Q10. One PR, low risk.
2. **PATCH release B** — B6 (watch-mode reset). Separate PR so the watch-mode behavior change is easy to bisect if regressions surface.
3. **PATCH release C** — P1 + Q8 (async resolve + type bump). Bundle because P1 depends on Q8's typings.
4. **MINOR release** — B5 (scoped `outputOptions.dir` support).
5. **(Deferred → v2)** — B3 full, B5 full (emitFile), P3, P4 full, Q5 full, Q6.

### Validation per release

- Run `npm run lint && npm run format && npm test` after each PR.
- For release B (B6), add a watch-mode test that removes a `.scss` import between rebuilds and asserts the removed file's CSS is not in the next bundle.
- For release C (P1), confirm no regression on the existing `should resolve ~ as node_modules…` tests in `test/index.test.ts`.
- For the MINOR release (B5 scoped), add a test using `output: { dir: ..., entryFileNames: '...' }` with `output: true`.
