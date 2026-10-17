// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    rules: {
      // React Native <Text> içinde HTML varlık kaçışı gerekmez; Türkçe metinlerde ' ve " doğaldır.
      'react/no-unescaped-entities': 'off',
    },
  },
  {
    ignores: ['dist/*', 'backend/*', 'scripts/*', '.expo/*'],
  },
]);
