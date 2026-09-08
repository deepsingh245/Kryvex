import reactConfig from "./react.js";

// eslint-plugin-react-native@5.0.0's rule engine still calls
// context.getSourceCode()/other pre-ESLint-9 APIs removed under flat config
// (crashes on rules like no-unused-styles). Until it ships real ESLint 10
// support, apps/mobile gets TS + React + React Hooks linting only (via
// react.js) — revisit once the plugin catches up.
export default [...reactConfig];
