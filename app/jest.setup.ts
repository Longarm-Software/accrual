// Shared Jest setup. Mocks for native modules are added here as tasks need them.

// Reanimated ships its own Jest mock.
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

export {};
