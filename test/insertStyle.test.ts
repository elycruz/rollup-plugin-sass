import test from 'ava';
import insertStyle from '../src/insertStyle';
import { Browser } from 'happy-dom';
import Sinon from 'sinon';

const expectA = 'body{color:red}';

test.serial('insertStyle should work in a DOM environment', (t) => {
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
    styleSheet.type,
    'text/css',
    'Should contain `type` attrib. equal to "text/css"',
  );
});

test.serial("insertStyle shouldn't choke when window is undefined", (t) => {
  t.notThrows(() => insertStyle(expectA));
});
