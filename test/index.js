import test from 'ava'
import { readFileSync, writeFileSync } from 'fs'
import { resolve as resolvePath } from 'path'
import { removeSync } from 'fs-extra'
import { rollup } from 'rollup'
import sass from '..'

const sassOptions = { outputStyle: 'compressed' }
const expectA = readFileSync('test/assets/expect_a.css').toString()
const expectB = readFileSync('test/assets/expect_b.css').toString()
const expectC = readFileSync('test/assets/expect_c.css').toString()
const expectD = readFileSync('test/assets/expect_d.css').toString()
const expectE = readFileSync('test/assets/expect_e.css').toString()

function squash(str) {
  return str.trim().replace(/\r/, '')
}

test('should import *.scss and *.sass files', t => {
  return rollup({
    entry: 'test/fixtures/basic/index.js',
    plugins: [
      sass({
        options: sassOptions
      })
    ]
  }).then(bundle => {
    const code = squash(bundle.generate().code)

    t.true(code.indexOf(squash(expectA)) > -1)
    t.true(code.indexOf(squash(expectB)) > -1)
    t.true(code.indexOf(squash(expectC)) > -1)
  })
})

test('should compress the dest CSS', t => {
  return rollup({
    entry: 'test/fixtures/compress/index.js',
    plugins: [
      sass({
        options: sassOptions
      })
    ]
  }).then(bundle => {
    const code = bundle.generate().code

    t.true(code.indexOf(squash(expectD)) > -1)
  })
})

test('should support options.data', t => {
  const jsVars = {
    'color_red': 'red'
  }
  const scssVars = Object.keys(jsVars).reduce((prev, key) => {
    return prev + `\$${key}:${jsVars[key]};`
  }, '')

  return rollup({
    entry: 'test/fixtures/data/index.js',
    plugins: [
      sass({
        options: Object.assign({
          data: scssVars
        }, sassOptions)
      })
    ]
  }).then(bundle => {
    const code = squash(bundle.generate().code)

    t.true(code.indexOf(squash(expectE)) > -1)
  })
})

test('should insert CSS into head tag', t => {
  return rollup({
    entry: 'test/fixtures/insert/index.js',
    plugins: [
      sass({
        insert: true,
        options: sassOptions
      })
    ]
  }).then(bundle => {
    const code = bundle.generate().code
    let count = 0

    global.window = {}
    global.document = {
      innerHTML: '',
      head: {
        appendChild (mockNode) {
          t.true(mockNode.hasOwnProperty('setAttribute'))

          if (count === 0) {
            t.is(squash(mockNode.innerHTML), squash(`${expectA}`))
          } else if (count === 1) {
            t.is(squash(mockNode.innerHTML), squash(`${expectB}`))
          }

          count++
        }
      },
      createElement () {
        return {
          setAttribute (key, value) {
            if (key === 'type') {
              t.is(value, 'text/css')
            }
          }
        }
      }
    }

    new Function(code)() // eslint-disable-line
  })
})

test('should support output as function', t => {
  let outputCode = ''

  return rollup({
    entry: 'test/fixtures/output-function/index.js',
    plugins: [
      sass({
        output(style) {
          outputCode = style
        },
        options: sassOptions
      })
    ]
  }).then(bundle => {
    const code = bundle.generate().code

    t.is(squash(code), '')
    t.is(squash(outputCode), squash(`${expectA}${expectB}`))
  })
})

test('should support output as (non-previously existent)-path', t => {
  let fullfile = 'test/fixtures/output-path/style.css'

  return rollup({
    entry: 'test/fixtures/output-path/index.js',
    plugins: [
      sass({
        output: fullfile,
        options: sassOptions
      })
    ]
  }).then(bundle => {
    const code = bundle.generate().code
    const output = readFileSync(fullfile).toString()

    removeSync(fullfile)
    t.is(squash(code), '')
    t.is(squash(output), squash(`${expectA}${expectB}`))
  })
})

test('should support output as true', t => {
  let fullfile = 'test/fixtures/output-true/index.css'

  return rollup({
    entry: 'test/fixtures/output-true/index.js',
    plugins: [
      sass({
        output: true,
        options: sassOptions
      })
    ]
  }).then(bundle => {
    const code = bundle.generate().code
    const output = readFileSync(fullfile).toString()

    removeSync(fullfile)
    t.is(squash(code), '')
    t.is(squash(output), squash(`${expectA}${expectB}`))
  })
})

test('should process code with processor', t => {
  let outputCode = []

  return rollup({
    entry: 'test/fixtures/processor/index.js',
    plugins: [
      sass({
        processor (code) {
          outputCode.push(code)
          return code
        },
        options: sassOptions
      })
    ]
  }).then(bundle => {
    t.is(squash(outputCode.join('')), squash(`${expectA}${expectB}`))
  })
})

test('should processor support promise', t => {
  let outputCode = []

  return rollup({
    entry: 'test/fixtures/processor-promise/index.js',
    plugins: [
      sass({
        processor (code) {
          return new Promise((resolve) => {
            setTimeout(() => {
              outputCode.push(code)
              resolve(code)
            }, 100)
          })
        },
        options: sassOptions
      })
    ]
  }).then(bundle => {
    t.is(squash(outputCode.join('')), squash(`${expectA}${expectB}`))
  })
})
