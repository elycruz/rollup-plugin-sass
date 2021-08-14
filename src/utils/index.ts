export const log = console.log.bind(console),

  error = console.log.bind(console),

  peekAndLast = (...args) => (log(...args), args.pop());
