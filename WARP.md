# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

CASOON Atlas is a comprehensive, modern UI effects library built for Tailwind v4 consisting of three main packages:

- **@casoon/atlas-styles** - Pure CSS design system with glass effects, gradients, and utilities
- **@casoon/atlas-effects** - 13+ interactive JavaScript effects (SSR-safe, tree-shakeable)
- **@casoon/atlas-components** - 10+ headless UI components (framework-agnostic)
- **@casoon/atlas** - Meta-package that re-exports all TypeScript modules

## Development Commands

### Core Development Workflow
```bash
# Install dependencies
pnpm install

# Build all packages (must run before demo)
pnpm build

# Start interactive demo server on localhost:3000
pnpm demo

# Build production demo
pnpm demo:build

# Development mode (watch all packages for changes)
pnpm dev

# Clean all build artifacts
pnpm clean
```

### Package-Specific Commands
```bash
# Build specific package
pnpm --filter @casoon/atlas-effects build
pnpm --filter @casoon/atlas-styles build
pnpm --filter @casoon/atlas-components build

# Clean specific package
pnpm --filter @casoon/atlas-effects clean
```

### Linting and Code Quality
```bash
# ESLint configuration is present but no script defined
# TypeScript compilation serves as primary validation via build process
```

### Versioning and Releases
```bash
# Create a changeset (describe changes and bump types)
pnpm changeset

# Apply version bumps from changesets
pnpm version

# Build and publish packages to npm
pnpm release

# View current versions
pnpm list --depth=0
```

## Architecture and Code Structure

### Monorepo Structure
- **pnpm workspace** with packages under `packages/`
- **TypeScript** codebase with shared `tsconfig.base.json`
- **ESM-only** modules (`"type": "module"` in all packages)
- **Tree-shaking optimized** with `sideEffects: false` for JS packages

### Package Architecture

#### @casoon/atlas-styles
- **Pure CSS modules** with subpath exports for granular imports
- **Tailwind v4 compatible** using `@theme` and `@utility` directives
- **Design token system** with CSS custom properties for theming
- **Modular imports**: `@casoon/atlas-styles/glass.css`, `@casoon/atlas-styles/orbs.css`, etc.

#### @casoon/atlas-effects
- **SSR-safe effects** - no DOM access at module level, function-based initialization only
- **Cleanup functions** - all effects return disposal functions to prevent memory leaks
- **13 individual effects** with dedicated subpath exports
- **TypeScript interfaces** for all effect options
- **RAF-based animations** for 60fps performance

Key effects include:
- `ripple` - Interactive click/touch ripple animations
- `tilt` - 3D tilt effect with realistic physics and glare
- `particles` - Configurable particle systems with connections
- `orbs` - Floating animated orb particles with physics
- `parallax`, `scrollReveal`, `glassEffects`, `magnetic`, `typewriter`, etc.

#### @casoon/atlas-components
- **Headless components** - framework-agnostic, minimal styling
- **Accessibility-focused** with ARIA support and focus management
- **Subpath exports** for individual component imports
- Components include: Modal, Dropdown, Tabs, Accordion, Tooltip, Toast, etc.

### Build System
- **tsup** for TypeScript compilation and bundling
- **Multiple entry points** configured in tsup.config.ts for subpath exports
- **ES2020 target** with ESM format only
- **Source maps** and **tree-shaking** enabled
- **Declaration files** generated for TypeScript support

### Key Design Principles

1. **SSR Compatibility**: Effects use function-based initialization, no top-level DOM access
2. **Tree Shaking**: Named exports only, `sideEffects: false`, subpath imports
3. **Framework Agnostic**: Works with React, Vue, Svelte, Astro, vanilla JS
4. **Performance**: RAF animations, Intersection Observer, passive event listeners
5. **Accessibility**: Respects `prefers-reduced-motion`, proper ARIA support

### Effect Implementation Pattern
All effects follow this pattern:
```typescript
export function effectName(target: Element | string, options: EffectOptions = {}) {
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  if (!el) return () => {};
  
  // Effect implementation with event listeners
  
  return () => {
    // Cleanup function - remove event listeners, cancel animations
  };
}
```

### Import Patterns
```typescript
// Recommended CSS imports
import '@casoon/atlas-styles';               // All styles
import '@casoon/atlas-styles/glass.css';     // Only glass effects
import '@casoon/atlas-styles/orbs.css';      // Only orb effects
import '@casoon/atlas-styles/core.css';      // Only core design system

// Individual effect imports
import { ripple } from '@casoon/atlas-effects/ripple';
import { tilt } from '@casoon/atlas-effects/tilt';

// Bulk imports
import { ripple, tilt, particles } from '@casoon/atlas-effects';
import { createModal, createTabs } from '@casoon/atlas-components';
```

## Development Tips

### Testing Effects
Use the demo application to test effects interactively:
1. Run `pnpm build` to compile packages
2. Run `pnpm demo` to start demo server
3. Visit `localhost:3000` to see all effects in action

### Adding New Effects
1. Create new directory under `packages/effects/src/effect-name/`
2. Add `index.ts` with effect function and options interface
3. Add entry to `packages/effects/tsup.config.ts`
4. Add export to `packages/effects/src/index.ts`
5. Add subpath export to `packages/effects/package.json`

### CSS Development
- All CSS uses Tailwind v4 syntax with `@theme` and `@utility`
- Design tokens defined as CSS custom properties for easy theming
- Files in `packages/styles/src/` are copied directly to `dist/` (no processing)

### Framework Integration
Effects work seamlessly across frameworks:
- **React**: Call effects in `useEffect` hooks
- **Vue**: Use in `onMounted` composables
- **Svelte**: Use in `onMount` lifecycle
- **Astro**: Use with client directives and `onMount`

### Performance Considerations
- Always call cleanup functions returned by effects
- Use conditional loading for interactive effects: `window.matchMedia('(hover: hover)').matches`
- Effects use `requestAnimationFrame` and `IntersectionObserver` for optimal performance
- Respect user's motion preferences automatically

## Browser Support
- **Core Effects**: Chrome 88+, Firefox 94+, Safari 14+, Edge 88+
- **Backdrop Filters**: Chrome 76+, Firefox 103+, Safari 14+, Edge 79+
- **Modern CSS Features**: All packages use modern CSS Grid, Flexbox, Custom Properties