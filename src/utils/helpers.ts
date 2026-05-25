export const isString = (x: unknown): x is string => typeof x === 'string';

export const isObject = (x: unknown): x is object =>
  x !== null && typeof x === 'object';
