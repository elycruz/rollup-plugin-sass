# Codebase Analysis — rollup-plugin-sass

_Date: 2026-05-25_

---

## Scope

Full analysis of `src/` for logic bugs, missed edge-cases, performance issues, and code quality
improvements.

---

## 🐛 Logic Bugs

### B1 — `isObject(null)` returns `true`

**File:** `src/utils/helpers.ts`

```ts
export const isObject = (x: unknown): x is object => typeof x === 'object';
```

`typeof null === 'object'` in JavaScript.  If a user's `processor` function returns `null`,
`processRenderResponse` enters the object branch and executes `null.css`, throwing an unguarded
`TypeError: Cannot read properties of null (reading 'css')` instead of the helpful, documented
error message.

**Fix:** Add a null-guard: `x !== null && typeof x === 'object'`.

---

### B2 — Async `output` function is never awaited

**File:** `src/index.ts` — `generateBundle` hook

```ts
if (typeof output === 'function') {
  output(css, styles);   // ← fire-and-forget
  return;
}
```

`RollupPluginSassOutputFn` return type is `unknown`, meaning the function may return a `Promise`.
The `generateBundle` hook is declared `async`, so if the user provides an async output handler
the bundle generation finishes before the CSS has been written.

**Fix:** `await output(css, styles)`.

---

### B3 — Modern API forces `sourceMap: true` unconditionally

**File:** `src/index.ts` — `case 'modern'`

```ts
/** force sourceMap because right now rollup outputOptions are not available */
sourceMap: true,
```

Source maps are always generated for the modern API path, even when the user has not enabled them
in rollup's output options.  This wastes CPU/memory during compilation and can silently attach
source-map metadata the user didn't request.

**Fix:** Only force `sourceMap` when not explicitly disabled by user options (short-term).  A
longer-term improvement is to read the rollup output `sourcemap` option — this would require
restructuring how `generateBundle` / `transform` coordinate.

---

### B4 — Legacy API returns `{ mappings: '' }` when no source map

**File:** `src/index.ts` — `case 'legacy'` / `default`

```ts
map: { mappings: res.map ? res.map.toString() : '' },
```

When `res.map` is absent, returning an object with an empty mappings string is treated by rollup
as a valid (empty) source-map object.  This can interfere with rollup's own source-map merging
pipeline.  The correct value when there is no source map is `null` or `undefined`.

**Fix:** `map: res.map ? { mappings: res.map.toString() } : undefined`.

---

### B5 — `output === true` silently does nothing with `outputOptions.dir`

**File:** `src/index.ts` — `generateBundle` hook

```ts
if (!insert && outputOptions.file && output === true) {
  let dest = outputOptions.file;
  // …
}
```

When rollup uses directory-based output (`outputOptions.dir`, common in multi-chunk / code-split
builds), `outputOptions.file` is `undefined`, so no CSS file is ever written and no diagnostic is
emitted.  Users relying on `output: true` in this scenario silently lose their CSS.

**Fix:** Add handling for `outputOptions.dir`, e.g. write `<dir>/<entryFileNames stem>.css`.

---

## ⚡ Performance / Optimizations

### P1 — `resolve.sync` blocks the event loop inside async importers

**File:** `src/utils/getImporterList.ts`

Both `importer1` (legacy) and `findFileUrl` (modern) call `resolve.sync(...)`, which performs a
synchronous filesystem walk.  These callbacks are invoked during sass compilation — using the
synchronous variant blocks the Node.js event loop for every `@import`/`@use` that matches a
node_modules path.

**Fix:** Use the async `resolve(moduleUrl, options, callback)` API (or its promisified form).

---

### P2 — `.toString()` is a no-op on modern `CompileResult.css`

**File:** `src/index.ts` — `case 'modern'`

```ts
compileResult.css.toString().trim()
```

`sass.CompileResult.css` is typed as `string` in the modern API; calling `.toString()` on a
`string` is a no-op that also misleads readers into thinking the value might be a `Buffer`.

**Fix:** Remove `.toString()`.

---

## 🔧 Code Quality / Maintainability

### Q1 — `Object.assign` in plugin factory

**File:** `src/index.ts`

```ts
const pluginOptions = Object.assign(
  { runtime: sass, output: false, insert: false },
  options,
);
```

Modern spread syntax (`{ runtime: sass, output: false, insert: false, ...options }`) is more
idiomatic and readable.

---

### Q2 — `as never` casts in `getImporterList.ts`

**File:** `src/utils/getImporterList.ts`

```ts
return [importer1].concat((importOption as never) || []);
return [importer].concat((importOption as never) || []);
```

These unsafe casts silence TypeScript's concat overload checks.  Using spread syntax removes the
need for the cast:

```ts
return [importer1, ...(importOption ? ([] as typeof importOption[]).concat(importOption) : [])];
// or simply:
return [importer1, ...((importOption as LegacyImporter<'async'>[]) ?? [])];
```

Or even cleaner — build the array with a spread and avoid `concat` entirely.

---

### Q3 — Stale `@todo` comment about watch mode in legacy path

**File:** `src/index.ts`

```ts
// @todo Do we need to filter this call so it only occurs when rollup is in 'watch' mode?
res.stats.includedFiles.forEach((filePath: string) => {
  this.addWatchFile(filePath);
});
```

Per rollup's documentation, `this.addWatchFile` is a no-op when not in watch mode, so the
`@todo` is misleading.  It can simply be removed.

---

### Q4 — `processRenderResponse` uses verbose Promise chaining

**File:** `src/utils/processRenderResponse.ts`

The function is a long `.then(…).then(…)` chain.  Converting to `async/await` would improve
readability and make stack traces easier to follow.

---

## Summary Table

| ID | Category | Severity | File |
|----|----------|----------|------|
| B1 | Bug | High | `src/utils/helpers.ts` |
| B2 | Bug | High | `src/index.ts` |
| B3 | Bug | Medium | `src/index.ts` |
| B4 | Bug | Medium | `src/index.ts` |
| B5 | Bug | Medium | `src/index.ts` |
| P1 | Perf | Low | `src/utils/getImporterList.ts` |
| P2 | Perf | Low | `src/index.ts` |
| Q1 | Quality | Low | `src/index.ts` |
| Q2 | Quality | Low | `src/utils/getImporterList.ts` |
| Q3 | Quality | Low | `src/index.ts` |
| Q4 | Quality | Low | `src/utils/processRenderResponse.ts` |
