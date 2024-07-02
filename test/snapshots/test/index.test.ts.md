# Snapshot report for `test/index.test.ts`

The actual snapshot is saved in `index.test.ts.snap`.

Generated by [AVA](https://avajs.dev).

## should import *.scss and *.sass files with default configuration

> Snapshot 1

    'var atualA = "body {\\n  color: red;\\n}";var atualB = "body {\\n  color: green;\\n}";var atualC = "body {\\n  color: blue;\\n}";var index = atualA + atualB + atualC;export { index as default };'

## should insert CSS into head tag

> Snapshot 1

    `import ___$insertStyle from '../../../src/insertStyle.js';␊
    ␊
    ___$insertStyle("body{color:red}");␊
    ␊
    ___$insertStyle("body{color:green}");␊
    `