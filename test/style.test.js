import test from 'ava';
import { readFileSync } from 'fs';
import { insertStyle } from '../dist/style';

const expectA = readFileSync('test/assets/expect_a.css').toString();

test('should insertStyle works', t => {
  global.window = {};
  global.document = {
    innerHTML: '',
    head: {
      appendChild(mockNode) {
        t.true(mockNode.hasOwnProperty('setAttribute'));
        t.is(mockNode.innerHTML, expectA);
      },
    },
    createElement() {
      return {
        setAttribute(key, value) {
          if (key === 'type') {
            t.is(value, 'text/css');
          }
        },
      };
    },
  };

  insertStyle(expectA);
});

