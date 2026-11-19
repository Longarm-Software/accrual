// xml2js (bank-file import) requires Node's 'timers' for setImmediate.
export const setImmediate = (fn: (...args: any[]) => void, ...args: any[]) => setTimeout(fn, 0, ...args);
