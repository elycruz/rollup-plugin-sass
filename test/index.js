import test from 'ava'
import { readFileSync, writeFileSync } from 'fs'
import { removeSync } from 'fs-extra'
import { rollup } from 'rollup'
import sass from '..'

const sassOptions = {
  outputStyle: 'compressed'
}

function squash(str) {
  return str.trim().replace(/\r/, '')
}

function compress(str) {
  return str.trim().replace(/[\n\r\s]/g, '').replace(/;}$/, '}');
}

test('should import *.scss and *.sass files', t => {
  return rollup({
    entry: 'fixtures/basic/index.js',
    plugins: [
      sass({
        options: sassOptions
      })
    ]
  }).then(bundle => {
    const code = squash(bundle.generate().code)
    const style1 = readFileSync('fixtures/basic/style1.scss').toString()
    const style2 = readFileSync('fixtures/basic/style2.sass').toString()

    t.true(code.indexOf(squash(style1)) > -1)
    t.true(code.indexOf(squash(style2)) > -1)
  })
})

test('should process code with processor', t => {
  let outputCode = ''

  return rollup({
    entry: 'fixtures/processor/index.js',
    plugins: [
      sass({
        processor (code) {
          return (outputCode = code)
        },
        options: sassOptions
      })
    ]
  }).then(bundle => {
    const style = readFileSync('fixtures/processor/style.scss').toString()

    t.truthy(outputCode)
    t.is(squash(outputCode), `${squash(style)}`)
  })
})

test('should processor support promise', t => {
  let outputCode = ''

  return rollup({
    entry: 'fixtures/processor-promise/index.js',
    plugins: [
      sass({
        processor (code) {
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve(outputCode = code)
            }, 100)
          })
        },
        options: sassOptions
      })
    ]
  }).then(bundle => {
    const style = readFileSync('fixtures/processor-promise/style.scss').toString()

    t.truthy(outputCode)
    t.is(squash(outputCode), `${squash(style)}`)
  })
})

test('should support output as (non-previously existent)-path', t => {
  let testPath = 'fixtures/output-path/build/'
  let fullfile = `${testPath}styles/style.css`

  return rollup({
    entry: 'fixtures/output-path/index.js',
    plugins: [
      sass({
        output: fullfile,
        options: sassOptions
      })
    ]
  }).then(bundle => {
    const code = bundle.generate().code
    const style1 = readFileSync('fixtures/output-path/style1.scss').toString()
    const style2 = readFileSync('fixtures/output-path/style2.scss').toString()
    const output = readFileSync(fullfile).toString()

    removeSync(testPath)
    t.is(squash(code), '')
    t.is(squash(output), squash(`${style1}${style2}`))
  })
})

test('should support output as function', t => {
  let outputCode = ''

  return rollup({
    entry: 'fixtures/output-function/index.js',
    plugins: [
      sass({
        output (style) {
          outputCode = style
        },
        options: sassOptions
      })
    ]
  }).then(bundle => {
    const code = bundle.generate().code
    const style1 = readFileSync('fixtures/output-function/style1.scss').toString()
    const style2 = readFileSync('fixtures/output-function/style2.scss').toString()

    t.is(squash(code), '')
    t.is(squash(outputCode), squash(`${style1}${style2}`))
  })
})

test('should support output as true', t => {
  writeFileSync('fixtures/output-true/output.css', '')

  return rollup({
    entry: 'fixtures/output-true/index.js',
    dest: 'fixtures/output-true/output.js',
    plugins: [
      sass({
        output: true,
        options: sassOptions
      })
    ]
  }).then(bundle => {
    const code = bundle.generate().code
    const style1 = readFileSync('fixtures/output-true/style1.scss').toString()
    const style2 = readFileSync('fixtures/output-true/style2.scss').toString()
    const output = readFileSync('fixtures/output-true/output.css').toString()

    t.is(squash(code), '')
    t.is(squash(output), squash(`${style1}${style2}`))
  })
})

test('should insert CSS into head tag', t => {
  return rollup({
    entry: 'fixtures/insert/index.js',
    plugins: [
      sass({
        insert: true,
        options: sassOptions
      })
    ]
  }).then(bundle => {
    const code = bundle.generate().code
    const style1 = readFileSync('fixtures/insert/style1.scss').toString()
    const style2 = readFileSync('fixtures/insert/style2.scss').toString()
    let count = 0

    global.window = {}
    global.document = {
      innerHTML: '',
      head: {
        appendChild (mockNode) {
          t.true(mockNode.hasOwnProperty('setAttribute'))

          if (count === 0) {
            t.is(squash(mockNode.innerHTML), squash(`${style1}`))
          } else if (count === 1) {
            t.is(squash(mockNode.innerHTML), squash(`${style2}`))
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

test('should compress the dest CSS', t => {
  let testPath = 'fixtures/compress/build/';
  let fullfile = `${testPath}styles/style.css`;

  return rollup({
    entry: 'fixtures/compress/index.js',
    plugins: [
      sass({
        output: fullfile,
        options: {
          outputStyle: 'compressed',
          sourceMap: false
        }
      })
    ]
  }).then(bundle => {
    const code = bundle.generate().code
    const style = readFileSync('fixtures/compress/style.scss').toString()
    const output = readFileSync(fullfile).toString()

    removeSync(testPath)
    t.is(squash(code), '')
    t.is(squash(output), compress(`${style}`))
  })
})
