export const log = console.log.bind(console),  // Binding here to make sure this works in older versions of node (v10 - v12 etc.).

  warn = console.warn.bind(console), // ""

  error = console.error.bind(console), // ""

  isset = (x: unknown): boolean => x !== null && x !== undefined,

  isString = (x: unknown): x is string => isset(x) && (x as object).constructor === String,

  isObject = (x: unknown): x is object => typeof x === 'object',

  isFunction = (x: unknown): x is Function => typeof x === 'function'
;
