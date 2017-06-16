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
    entry: 'test/fixtures/basic/index.js',
    plugins: [
      sass({
        options: sassOptions
      })
    ]
  }).then(bundle => {
    const code = squash(bundle.generate().code)
    const style1 = readFileSync('test/fixtures/basic/style1.scss').toString()
    const style2 = readFileSync('test/fixtures/basic/style2.sass').toString()

    t.true(code.indexOf(squash(style1)) > -1)
    t.true(code.indexOf(squash(style2)) > -1)
  })
})

test('should process code with processor', t => {
  let outputCode = ''

  return rollup({
    entry: 'test/fixtures/processor/index.js',
    plugins: [
      sass({
        processor (code) {
          return (outputCode = code)
        },
        options: sassOptions
      })
    ]
  }).then(bundle => {
    const style = readFileSync('test/fixtures/processor/style.scss').toString()

    t.truthy(outputCode)
    t.is(squash(outputCode), `${squash(style)}`)
  })
})

test('should processor support promise', t => {
  let outputCode = ''

  return rollup({
    entry: 'test/fixtures/processor-promise/index.js',
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
    const style = readFileSync('test/fixtures/processor-promise/style.scss').toString()

    t.truthy(outputCode)
    t.is(squash(outputCode), `${squash(style)}`)
  })
})

test('should support output as (non-previously existent)-path', t => {
  let testPath = 'test/fixtures/output-path/build/'
  let fullfile = `${testPath}styles/style.css`

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
    const style1 = readFileSync('test/fixtures/output-path/style1.scss').toString()
    const style2 = readFileSync('test/fixtures/output-path/style2.scss').toString()
    const output = readFileSync(fullfile).toString()

    removeSync(testPath)
    t.is(squash(code), '')
    t.is(squash(output), squash(`${style1}${style2}`))
  })
})

test('should support output as function', t => {
  let outputCode = ''

  return rollup({
    entry: 'test/fixtures/output-function/index.js',
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
    const style1 = readFileSync('test/fixtures/output-function/style1.scss').toString()
    const style2 = readFileSync('test/fixtures/output-function/style2.scss').toString()

    t.is(squash(code), '')
    t.is(squash(outputCode), squash(`${style1}${style2}`))
  })
})

test('should support output as true', t => {
  writeFileSync('test/fixtures/output-true/output.css', '')

  return rollup({
    entry: 'test/fixtures/output-true/index.js',
    dest: 'test/fixtures/output-true/output.js',
    plugins: [
      sass({
        output: true,
        options: sassOptions
      })
    ]
  }).then(bundle => {
    const code = bundle.generate().code
    const style1 = readFileSync('test/fixtures/output-true/style1.scss').toString()
    const style2 = readFileSync('test/fixtures/output-true/style2.scss').toString()
    const output = readFileSync('test/fixtures/output-true/output.css').toString()

    t.is(squash(code), '')
    t.is(squash(output), squash(`${style1}${style2}`))
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
    const style1 = readFileSync('test/fixtures/insert/style1.scss').toString()
    const style2 = readFileSync('test/fixtures/insert/style2.scss').toString()
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
  let testPath = 'test/fixtures/compress/build/';
  let fullfile = `${testPath}styles/style.css`;

  return rollup({
    entry: 'test/fixtures/compress/index.js',
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
    const style = readFileSync('test/fixtures/compress/style.scss').toString()
    const output = readFileSync(fullfile).toString()

    removeSync(testPath)
    t.is(squash(code), '')
    t.is(squash(output), compress(`${style}`))
  })
})

test('should support options.data', t => {
  const preDefined = {
    'fore-color': '#000',
    'bg-color': '#fff'
  }

  return rollup({
    entry: 'test/fixtures/data/index.js',
    plugins: [
      sass({
        options: Object.assign({
          data: Object.keys(preDefined).reduce((prev, cur) => {
            return prev += `\$${cur}:${preDefined[cur]};`
          }, '')
        }, sassOptions)
      })
    ]
  }).then(bundle => {
    const code = squash(bundle.generate().code)

    t.true(squash(code).indexOf('body{color:#000;background-color:#fff}') > -1)
  })
})
