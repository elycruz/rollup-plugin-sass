export const log = console.log.bind(console),  // Binding here to make sure this works in older versions of node (v10 - v12 etc.).

  warn = console.warn.bind(console), // ""

  error = console.error.bind(console), // ""

  isset = x => x !== null && x !== undefined,

  isString = x => isset(x) && x.constructor === String,

  isObject = x => typeof x === 'object',

  isFunction = x => typeof x === 'function'
;
