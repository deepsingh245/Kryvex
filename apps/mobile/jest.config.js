/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  testPathIgnorePatterns: ["/node_modules/", "/.expo/"],
  // jest-expo's own transformIgnorePatterns (see its jest-preset.js) doesn't
  // allow-list @noble — @kryvex/crypto and @kryvex/password-generator both
  // pull in @noble/hashes, which ships pure ESM with no CJS build, so Jest
  // fails with "Must use import to load ES Module" unless it's transformed.
  // This array replaces (not merges with) the preset's own list, so it's
  // copied verbatim from jest-expo/jest-preset.js with "@noble" appended.
  transformIgnorePatterns: [
    "/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|standard-navigation|@noble))",
    "/node_modules/react-native-reanimated/plugin/",
    "/node_modules/@react-native/babel-preset/",
  ],
};
