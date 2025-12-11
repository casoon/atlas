import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
  },
  dts: true,
  format: ['esm'],
  target: 'es2020',
  sourcemap: true,
  treeshake: true,
  splitting: true,
  clean: true,
});
