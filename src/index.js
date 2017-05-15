import { dirname } from 'path'
import { writeFileSync } from 'fs'
import { renderSync } from 'node-sass'
import { isString, isFunction } from 'util'
import { createFilter } from 'rollup-pluginutils'
import { insertStyle } from './style.js'
import { ensureFileSync } from 'fs-extra'

export default function plugin (options = {}) {
  const filter = createFilter(options.include || [ '**/*.sass', '**/*.scss' ], options.exclude || 'node_modules/**')
  const insertFnName = '___$insertStyle'
  const styles = []
  const styleMaps = {}
  let dest = ''
  let prependSass = ''

  options.output = options.output || false
  options.insert = options.insert || false
  options.processor = options.processor || null
  options.options = options.options || null

  if (options.options && options.options.data) {
    prependSass = options.options.data
    delete options.options.data
  }

  return {
    name: 'sass',

    intro () {
      if (options.insert) {
        return insertStyle.toString().replace(/insertStyle/, insertFnName)
      }
    },

    options (opts) {
      dest = opts.dest || opts.entry
    },

    async transform (code, id) {
      if (!filter(id)) {
        return null
      }

      const paths = [dirname(id), process.cwd()]
      const sassConfig = Object.assign({ data: `${prependSass}${code}` }, options.options)

      sassConfig.includePaths = sassConfig.includePaths
            ? sassConfig.includePaths.concat(paths)
            : paths

      try {
        let css = renderSync(sassConfig).css.toString()
        let code = ''

        if (css.trim()) {
          if (isFunction(options.processor)) {
            css = await options.processor(css, id)
          }
          if (styleMaps[id]) {
            styleMaps[id].content = css
          } else {
            styles.push(styleMaps[id] = {
              id: id,
              content: css
            })
          }
          css = JSON.stringify(css)

          if (options.insert === true) {
            code = `${insertFnName}(${css});`
          } else if (options.output === false) {
            code = css
          } else {
            code = `"";`
          }
        }

        return {
          code: `export default ${code};`,
          map: { mappings: '' }
        }
      } catch (error) {
        throw error
      }
    },

    async ongenerate (opts, result) {
      if (!options.insert && (!styles.length || options.output === false)) {
        return
      }

      const css = styles.map((style) => {
        return style.content
      }).join('')

      if (isString(options.output)) {
        ensureFileSync(options.output, (err) => {
          if (err) throw err
        })
        return writeFileSync(options.output, css)
      } else if (isFunction(options.output)) {
        return options.output(css, styles)
      } else if (!options.insert && dest) {
        if (dest.endsWith('.js')) {
          dest = dest.slice(0, -3)
        }
        dest = `${dest}.css`
        ensureFileSync(dest, (err) => {
          if (err) throw err
        })
        return writeFileSync(dest, css)
      }
    }
  }
}
