// `stream` for sax (used by xml2js), which requires it inside a try/catch and
// falls back to a no-op when there is no Stream class. Give it none.
export const Stream = undefined;
