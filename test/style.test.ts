import test, {before} from 'ava';
import {readFileSync} from 'fs';
import {insertStyle} from '../src/style';
import jsdom from 'jsdom';

const expectA = readFileSync('test/assets/expect_a.css').toString();
const newLineRegex = /[\n\r\f\t]+/g;

before(async () => {
  const dom = new jsdom.JSDOM(`<!Doctype html>
    <html>
      <head></head>
      <body></body>
    </html>
    `);

  global['window'] = dom.window;
  global['document'] = dom.window.document;
});

test('should insertStyle works', t => {
  const cssStr = insertStyle(expectA).replace(newLineRegex, '');
  const styleSheet = document.head.querySelector('style');
  t.true(styleSheet.textContent.replace(newLineRegex, '') === cssStr, 'stylesheet\'s content should equal returned css string');
  t.true(styleSheet.type === 'text/css', 'Should contain `type` attrib. equal to "text/css"');
});
