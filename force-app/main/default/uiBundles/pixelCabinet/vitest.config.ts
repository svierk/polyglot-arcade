import { configDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './vitest.setup.ts',
    // e2e/ holds Playwright specs, run by `npx playwright test`.
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
});
