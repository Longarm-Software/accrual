// loot-core `#platform/server/fetch`. React Native's built-in fetch cannot
// reliably send/receive binary bodies (sync uses protobuf, budgets are zips),
// so use Expo's WinterCG-compliant implementation.
import { fetch as expoFetch } from 'expo/fetch';

export const fetch = expoFetch as unknown as typeof globalThis.fetch;
