export const log = console.log.bind(console); // Binding here to make sure this works in older versions of node (v10 - v12 etc.).
export const warn = console.warn.bind(console); // ""
export const error = console.error.bind(console); // ""
