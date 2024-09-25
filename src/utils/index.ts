export const log = console.log.bind(console); // Binding here to make sure this works in older versions of node (v10 - v12 etc.).
export const warn = console.warn.bind(console); // ""
export const error = console.error.bind(console); // ""

export const isset = (x: unknown): boolean => x !== null && x !== undefined;

export const isString = (x: unknown): x is string =>
  isset(x) && (x as object).constructor === String;
export const isObject = (x: unknown): x is object => typeof x === 'object';
export const isFunction = (x: unknown): x is Function =>
  typeof x === 'function';
