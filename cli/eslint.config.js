// Minimal flat config, no extra dependency beyond eslint itself (no
// @eslint/js "recommended" preset - hand-picked rules instead, kept small
// on purpose). Node/ESM globals listed explicitly rather than pulling in
// the `globals` package for a handful of names.
export default [
  {
    files: ["bin/**/*.js", "src/**/*.js", "test/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        process: "readonly",
        console: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        fetch: "readonly",
        Buffer: "readonly",
        setTimeout: "readonly",
        globalThis: "readonly",
      },
    },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-undef": "error",
      // "smart" allows `== null` (covers null+undefined in one check, a
      // deliberate idiom already in src/lib/audit-log.js) while still
      // flagging every other loose comparison.
      eqeqeq: ["error", "smart"],
      "no-var": "error",
      "prefer-const": "error",
    },
  },
];
