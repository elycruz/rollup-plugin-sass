export const isString = (x: unknown): x is string => typeof x === 'string';

export const isObject = (x: unknown): x is object =>
  x !== null && typeof x === 'object';

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export const isFunction = (x: unknown): x is Function =>
  typeof x === 'function';
