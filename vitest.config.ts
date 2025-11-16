import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.config.*',
        '**/demo/**',
        '**/documentation/**',
        '**/*.d.ts'
      ]
    },
    include: ['packages/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', 'demo']
  }
});
