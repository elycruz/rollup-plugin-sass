import test from 'ava';
import insertStyle from '../src/insertStyle';
import Sinon from 'sinon';

/**
 * `happy-dom` (v20+) is ESM only, and this suite is compiled to CommonJS by
 * `ts-node` - so a static `import` of it, and a plain `await import()` (which
 * typescript downlevels to `require()`), both throw `ERR_REQUIRE_ESM`.
 * Building the dynamic import via `Function` keeps it out of typescript's
 * reach, leaving node to perform a genuine ESM import at runtime.
 */
const importEsm = new Function('specifier', 'return import(specifier)') as <T>(
  specifier: string,
) => Promise<T>;

const expectA = 'body{color:red}';

test.serial('insertStyle should work in a DOM environment', async (t) => {
  const { Browser } = await importEsm<typeof import('happy-dom')>('happy-dom');

  const browser = new Browser();
  const page = browser.newPage();

  page.url = 'https://example.com';
  page.content = `<html><head></head><body></body></html>`;

  // ---
  // use Sinon fake to augment the global scope with window and document from the happy dom page

  Sinon.define(global, 'window', page.mainFrame.window);
  Sinon.define(global, 'document', page.mainFrame.window.document);

  // ---
  // Remove overrides
  t.teardown(async () => {
    Sinon.restore();

    await browser.close();
  });

  // -----
  // Execute the actual test

  t.is(
    Array.from(document.styleSheets).length,
    0,
    'Should not have stylesheets',
  );

  const cssStr = insertStyle(expectA);

  t.is(
    Array.from(document.styleSheets).length,
    1,
    'Should include only `insertStyle` related stylesheet',
  );

  const styleSheet = document.head.querySelector('style')!;
  t.is(
    styleSheet.textContent,
    cssStr!,
    "stylesheet's content should equal returned css string",
  );
  t.is(
    styleSheet.hasAttribute('type'),
    false,
    'Should not set a redundant `type` attribute',
  );
});

test.serial("insertStyle shouldn't choke when window is undefined", (t) => {
  t.notThrows(() => insertStyle(expectA));
});
