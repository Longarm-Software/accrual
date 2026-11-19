// `node:diagnostics_channel` for lru-cache, which imports it optionally to
// publish metrics. Hermes has no such module, and Metro turns the failed
// dynamic import into a thrown error that stops the whole engine bundle from
// loading. Nothing subscribes on a phone, so the channels are inert.
const inert = { hasSubscribers: false };

export const channel = (_name: string) => inert;
export const tracingChannel = (_name: string) => inert;
