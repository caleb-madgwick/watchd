// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  ...expoConfig,
  {
    ignores: [
      'dist/**',
      '.expo/**',
      'coverage/**',
      // Deno runtime, checked by `deno check`, not this ESLint setup
      'supabase/functions/**',
    ],
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
]);
