# Snapshot report for `test/nodeResolution.test.ts`

The actual snapshot is saved in `nodeResolution.test.ts.snap`.

Generated by [AVA](https://avajs.dev).

## should resolve ~ as node_modules

> Snapshot 1

    `var style = "body{color:red}body{color:green}body{color:blue}";␊
    ␊
    export { style as default };␊
    `

## should resolve ~ as node_modules and output javascript modules

> check output result code

    `var style = "body{color:red}body{color:green}body{color:blue}";␊
    ␊
    export { style as default };␊
    `

> Ensure content exist in ESM output file

    `var style = "body{color:red}body{color:green}body{color:blue}";␊
    ␊
    export { style as default };␊
    `

> Ensure content exist in CJS output file

    `'use strict';␊
    ␊
    var style = "body{color:red}body{color:green}body{color:blue}";␊
    ␊
    module.exports = style;␊
    `