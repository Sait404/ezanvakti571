import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
    environment: 'node',
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      '@react-native-async-storage/async-storage': fileURLToPath(new URL('./tests/stubs/async-storage.ts', import.meta.url)),
    },
  },
});
