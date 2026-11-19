// Shared Jest setup. Mocks for native modules are added here as tasks need them.

// Reanimated ships its own Jest mock. Reanimated 4 loads react-native-worklets, which needs
// its own mock too, or loading Reanimated fails on the missing native module.
jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
// jest-expo resolves `.native.ts` files, and Reanimated's native initializer asks the Jest
// stand-in for a CSS event handler it does not have. Use the non-native initializer instead.
jest.mock('react-native-reanimated/src/initializers', () => jest.requireActual('react-native-reanimated/src/initializers.ts'));
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

// An in-memory stand-in for the Keychain.
jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => void store.set(key, value)),
    deleteItemAsync: jest.fn(async (key: string) => void store.delete(key)),
    __reset: () => store.clear(),
  };
});

// Home redirects to the developer check when this is set; tests want the real screen.
delete process.env.EXPO_PUBLIC_SPIKE_AUTORUN;

export {};
