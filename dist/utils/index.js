"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isFunction = exports.isObject = exports.isString = exports.isset = exports.error = exports.warn = exports.log = void 0;
const isset = x => x !== null && x !== undefined, isString = x => (0, exports.isset)(x) && x.constructor === String, isObject = x => typeof x === 'object', isFunction = x => typeof x === 'function';
exports.log = console.log.bind(console), exports.warn = console.warn.bind(console), exports.error = console.error.bind(console), exports.isset = isset, exports.isString = isString, exports.isObject = isObject, exports.isFunction = isFunction;
//# sourceMappingURL=index.js.map