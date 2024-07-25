import test from "ava";
import insertStyle from "../src/insertStyle";
import { Browser } from "happy-dom";

const expectA = "body{color:red}";

test("should insertStyle works", async (t) => {
  const browser = new Browser();
  const page = browser.newPage();

  page.url = "https://example.com";
  page.content = `<html><head></head><body></body></html>`;

  // @ts-expect-error
  global["window"] = page.mainFrame.window;
  // @ts-expect-error
  global["document"] = page.mainFrame.window.document;

  const cssStr = insertStyle(expectA);

  const styleSheet = document.head.querySelector("style")!;
  t.is(
    styleSheet.textContent,
    cssStr!,
    "stylesheet's content should equal returned css string"
  );
  t.is(
    styleSheet.type,
    "text/css",
    'Should contain `type` attrib. equal to "text/css"'
  );

  await browser.close();
});

test("insertStyle shouldn't choke when window is undefined", (t) => {
  delete global["window"];
  t.throws(() => !window);
  t.true(typeof window === "undefined");
  t.notThrows(() => insertStyle("css"));
});
