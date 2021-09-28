## [1.2.9](https://github.com/differui/rollup-plugin-sass/releases/tag/1.2.9)

### Fixes:
9b938ee - moved insertStyle test to correct file
b940849 - insertStyle no longer throws a fatal error when window is undefined

### Other:
c9332d0 - #88 - Added 'master' branch to 'dev-build-and-test' git workflow file.

## [1.2.6](https://github.com/differui/rollup-plugin-sass/releases/tag/1.2.6)

### Fixes: 
- Reverted rollup-pluginutils version back to recently upgraded @rollup/pluginutils version, minus one major version from latest version - The version is set to one major behind to ensure backwards compatibility with existing projects.  
   We also upgraded to this version, of @rollup/pluginutils, to allow users, who have started to use rollup-plugin-sass@1.2.5, to continue supplying `RegExp | string | string[]` for `include` and `exclude` properties (rollup-pluginutils doesn't accept `RegExp` for these props).
- Updated plugin's source to ensure that `include` and `exclude` always have a default when their incoming values are directly set to `undefined` - previous update had removed these default, since they were set in options merge call, however merging in `undefined` prop. values weren't taken into account in that update - this update fixes that change.

## [1.1.0](https://github.com/differui/rollup-plugin-sass/releases/tag/1.1.0)

New Features

+ support rollup@1.x ([#61](https://github.com/differui/rollup-plugin-sass/issues/61))
+ `output` options only works with `bundle.write()`

## [0.9.2](https://github.com/differui/rollup-plugin-sass/releases/tag/0.9.2)

Bug Fixes

+ allow `options.exclude` to be empty string

## [0.9.1](https://github.com/differui/rollup-plugin-sass/releases/tag/0.9.1)

Bug Fixes

+ fix ci error
+ remove node-sass in `devDependencies`

## [0.9.0](https://github.com/differui/rollup-plugin-sass/releases/tag/0.9.0)

New Features

+ switch default sass compiler to sass from node-sass ([#56](https://github.com/differui/rollup-plugin-sass/issues/56))

## [0.8.1](https://github.com/differui/rollup-plugin-sass/releases/tag/0.8.1)

Bug Fixes

+ async `resolve` hangs in edge case #55

## [0.8.0](https://github.com/differui/rollup-plugin-sass/releases/tag/0.8.0)

New Features

+ add `options.runtime` support different sass compiler runtime

## [0.7.2](https://github.com/differui/rollup-plugin-sass/releases/tag/0.7.2)

Bug Fixes

+ can not resolve file id start with `~` ([#38](https://github.com/differui/rollup-plugin-sass/issues/38))

## [0.7.0](https://github.com/differui/rollup-plugin-sass/releases/tag/0.7.0)

New Features

+ the `processor` support object result
