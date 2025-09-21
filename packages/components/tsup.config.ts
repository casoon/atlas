import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    modal: 'src/modal/index.ts',
    dropdown: 'src/dropdown/index.ts',
    tabs: 'src/tabs/index.ts',
    accordion: 'src/accordion/index.ts',
    tooltip: 'src/tooltip/index.ts',
    toast: 'src/toast/index.ts',
    drawer: 'src/drawer/index.ts',
    card: 'src/card/index.ts',
    form: 'src/form/index.ts',
    button: 'src/button/index.ts'
  },
  dts: true,
  format: ['esm'],
  target: 'es2020',
  sourcemap: true,
  treeshake: true,
  splitting: true,
  clean: true
});
