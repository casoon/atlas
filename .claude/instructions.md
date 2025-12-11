# Atlas Project Instructions

## Overview

CASOON Atlas is a modern, framework-agnostic UI library providing headless components and visual effects for web applications. Built as a pnpm monorepo with strict TypeScript and comprehensive accessibility support.

## Architecture

### Monorepo Structure

```
packages/
├── styles/          # @casoon/atlas-styles - Pure CSS design system
├── effects/         # @casoon/atlas-effects - 13+ interactive effects (SSR-safe)
├── components/      # @casoon/atlas-components - 10+ headless UI components
└── all/             # @casoon/atlas - Meta-package re-exporting all TypeScript modules
```

### Tech Stack

- **Package Manager:** pnpm (workspaces)
- **Build Tool:** tsup (TypeScript + esbuild)
- **Testing:** Vitest with happy-dom
- **Styling:** Tailwind CSS v4
- **TypeScript:** Strict mode enabled
- **Module System:** ESM-only (`"type": "module"`)
- **Tree Shaking:** Enabled with `sideEffects: false` for JS packages

## Design Philosophy

**Atlas provides 10% enhancement, not 100% replacement.**

DO add to Atlas:

- Complex visual effects (Glass, Orbs, Particles)
- Interactive micro-animations (Ripple, Tilt, Magnetic)
- Headless components with A11y (Modal, Dropdown, Tabs)
- Design tokens for consistent theming

DO NOT add to Atlas:

- Wrappers for basic Tailwind utilities (`flex`, `p-4`, `text-white`)
- Simple styling that Tailwind handles better
- Bloated component variants

### Decision Rule

If it can be done with 1-3 Tailwind classes, use Tailwind.
If it requires complex CSS (backdrop-filter, animations, states) or JS, use Atlas.

## Import Patterns

### Recommended CSS Imports

```typescript
// All styles
import '@casoon/atlas-styles';

// Only specific modules
import '@casoon/atlas-styles/glass.css';
import '@casoon/atlas-styles/orbs.css';
import '@casoon/atlas-styles/core.css';
```

### Recommended Effect Imports

```typescript
// Individual effect imports (recommended for tree-shaking)
import { ripple } from '@casoon/atlas-effects/ripple';
import { tilt } from '@casoon/atlas-effects/tilt';

// Bulk imports
import { ripple, tilt, particles } from '@casoon/atlas-effects';
```

### Component Imports

```typescript
import { createModal, createTabs } from '@casoon/atlas-components';
```

## Key Architectural Patterns

### Effect Pattern

Every effect follows this pattern:

```typescript
export function effectName(target: Element | string, options: EffectOptions = {}): () => void {
  // 1. Resolve element
  const element = resolveElement(target);
  if (!element) {
    console.warn('[Atlas EffectName] Element not found:', target);
    return () => {};
  }

  // 2. Check reduced motion
  if (shouldReduceMotion()) {
    return () => {};
  }

  // 3. Setup effect with utilities
  const styleManager = createStyleManager();
  const throttledHandler = rafThrottle(handler);
  const stopAnimation = createSimpleAnimationLoop(animate);

  // 4. Return cleanup
  return () => {
    stopAnimation();
    throttledHandler.cancel();
    styleManager.restore(element);
  };
}
```

### Component Pattern

Components use subscription pattern for reactivity:

```typescript
export function createComponent(options) {
  const subscribers = new Set<(state: State) => void>();

  return {
    subscribe: (callback) => {
      subscribers.add(callback);
      callback(getState());
      return () => subscribers.delete(callback);
    },
    destroy: () => {
      subscribers.clear();
    },
  };
}
```

## Coding Standards

### TypeScript

- Strict mode enabled - No `any` types allowed
- Generic types - Use `<T extends Record<string, unknown>>` for forms/data
- Explicit return types - All public functions must declare return type
- Interface over type - Use `interface` for options, `type` for unions

### Memory Management

- Always return cleanup functions - Every effect/component must clean up
- Cancel animations - Use `createSimpleAnimationLoop` or track RAF IDs
- Remove event listeners - Track all listeners and remove in cleanup
- Clear timeouts/intervals - Always clear timers
- Restore styles - Use `StyleManager` to restore original styles

### Accessibility

- Respect prefers-reduced-motion - Use `shouldReduceMotion()` in all effects
- ARIA attributes - Add proper ARIA labels/roles to components
- Keyboard navigation - Support Tab, Enter, Escape, Arrow keys
- Focus management - Trap focus in modals, restore on close

## Build Commands

```bash
pnpm install          # Install dependencies
pnpm build            # Build all packages
pnpm dev              # Development mode (watch)
pnpm demo             # Start demo server on localhost:3000
pnpm test             # Run tests in watch mode
pnpm test:run         # Single test run
pnpm typecheck        # Type checking
pnpm changeset        # Create a changeset
pnpm version          # Apply version bumps
pnpm release          # Build and publish
```

## Git Workflow

### Commit Message Format

```
type(scope): subject
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`

Examples:

```
feat: add confetti celebration effect
fix: resolve memory leak in animation loop
refactor: migrate effects to shared utilities
```

## Important Notes

- Never use `any` type - Use proper generics or unknowns
- Always test cleanup - Ensure no memory leaks
- Mobile-first - Effects should work on touch devices
- Framework-agnostic - No React/Vue/etc. dependencies
- SSR-safe - Check `typeof window !== 'undefined'`
- Tree-shakeable - Use targeted exports, avoid `export *`
