import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    ripple: 'src/ripple/index.ts',
    orbs: 'src/orbs/index.ts',
    parallax: 'src/parallax/index.ts',
    'glass-effects': 'src/glass-effects/index.ts',
    'scroll-reveal': 'src/scroll-reveal/index.ts',
    particles: 'src/particles/index.ts',
    'cursor-follow': 'src/cursor-follow/index.ts',
    tilt: 'src/tilt/index.ts',
    glow: 'src/glow/index.ts',
    morphing: 'src/morphing/index.ts',
    wave: 'src/wave/index.ts',
    magnetic: 'src/magnetic/index.ts',
    typewriter: 'src/typewriter/index.ts',
  },
  dts: true,
  format: ['esm'],
  target: 'es2020',
  sourcemap: true,
  treeshake: true,
  splitting: true,
  clean: true,
});
