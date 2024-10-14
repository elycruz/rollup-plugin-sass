# Snapshot report for `test/index.modern.test.ts`

The actual snapshot is saved in `index.modern.test.ts.snap`.

Generated by [AVA](https://avajs.dev).

## should import *.scss and *.sass files

> Snapshot 1

    `var atualA = "body{color:red}";␊
    ␊
    var atualB = "body{color:green}";␊
    ␊
    var atualC = "body{color:blue}";␊
    ␊
    var index = atualA + atualB + atualC;␊
    ␊
    export { index as default };␊
    `

## should compress the dest CSS

> Snapshot 1

    `var actualD = "body{color:red;background-color:green}";␊
    ␊
    export { actualD as default };␊
    `

## should custom importer works

> Snapshot 1

    `var style = "body{color:red}";␊
    ␊
    export { style as default };␊
    `

## should support options.data

> Snapshot 1

    `var actualE = "body{color:red}";␊
    ␊
    export { actualE as default };␊
    `

## should insert CSS into head tag

> actual_a content is compiled with insertStyle

    'insertStyle("body{color:red}");'

> actual_b content is compiled with insertStyle

    'insertStyle("body{color:green}");'

## should processor return as string

> Snapshot 1

    `var atualA = "}der:roloc{ydob";␊
    ␊
    var atualB = "}neerg:roloc{ydob";␊
    ␊
    var index = atualA + atualB;␊
    ␊
    export { index as default };␊
    `

## should processor return as object

> Snapshot 1

    `var atualA = "body{color:red}";␊
    const foo = "foo";␊
    ␊
    var atualB = "body{color:green}";␊
    const bar = "bar";␊
    ␊
    var index = atualA + atualB + foo + bar;␊
    ␊
    export { index as default };␊
    `

## should support processor return type `Promise<string>`

> Snapshot 1

    `var atualA = "body{color:red}";␊
    ␊
    var atualB = "body{color:green}";␊
    ␊
    var index = atualA + atualB;␊
    ␊
    export { index as default };␊
    `

## should support processor return type `Promise<{css: string, icssExport: {}, icssImport: {}}}>

> Snapshot 1

    `var actualA2 = "body{color:red;background:blue}";␊
    const color = "red";␊
    const color2 = "blue";␊
    ␊
    var actualB = "body{color:green}";␊
    ␊
    var withIcssExports = actualA2 + actualB;␊
    ␊
    export { color, color2, withIcssExports as default };␊
    `

## should import *.scss and *.sass files with default configuration

> Snapshot 1

    `var atualA = "body {\\n  color: red;\\n}";␊
    ␊
    var atualB = "body {\\n  color: green;\\n}";␊
    ␊
    var atualC = "body {\\n  color: blue;\\n}";␊
    ␊
    var index = atualA + atualB + atualC;␊
    ␊
    export { index as default };␊
    `