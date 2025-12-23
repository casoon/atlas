# @casoon/atlas

## 0.2.1

### Patch Changes

- Updated dependencies
  - @casoon/atlas-styles@0.1.0

## 0.2.0

### Minor Changes

- bdcfe7b: feat: add software architecture improvements

  ### New Features

  **Base Component System** (`shared/base.ts`)
  - Factory pattern for standardized component creation
  - Lifecycle hooks (init, mount, update, destroy)
  - Auto-cleanup for event listeners, timeouts, RAF

  **Effect Composition API** (`core/fx.ts`)
  - Fluent builder: `fx(element).add(ripple()).add(tilt()).apply()`
  - Preset system for common effect combinations
  - Sequential and parallel effect execution

  **Unified State API** (`shared/state.ts`)
  - Reactive store with subscriptions
  - Computed values and derived stores
  - Undo/redo history
  - LocalStorage persistence

  **Animation Registry** (`shared/animation-registry.ts`)
  - Centralized keyframe definitions
  - Spring physics utilities
  - Easing presets and CSS transitions

  **Simplified Import API**
  - Namespace exports: `ui`, `fx`, `effects`, `utils`, `atlas`
  - Tree-shakeable direct imports

  **Config Validation** (`shared/validation.ts`)
  - Schema-based runtime validation
  - Type coercion and error messages

  **Plugin System** (`shared/plugins.ts`)
  - Lifecycle hooks for components and effects
  - Built-in plugins: debug, performance, a11y

### Patch Changes

- Updated dependencies [bdcfe7b]
  - @casoon/atlas-components@0.1.0
  - @casoon/atlas-effects@0.2.0

## 0.1.0

### Minor Changes

- Add 8 new interactive effects and improve project configuration
  - Add spotlight effect with customizable size and blur
  - Add text-scramble effect with character randomization
  - Add glitch effect with RGB channel splitting
  - Add shimmer effect with animated highlights
  - Add noise effect with canvas-based grain
  - Add confetti effect with physics-based particles
  - Add skeleton loading effect with shimmer animation
  - Add progress-ring effect with circular progress indicator
  - Configure Volta to pin Node.js 24.11.0 and pnpm 9.15.4
  - Consolidate documentation from WARP.md to .claude file
  - Add comprehensive build commands and package details

### Patch Changes

- Updated dependencies
  - @casoon/atlas-effects@0.1.0
  - @casoon/atlas-styles@0.0.6
  - @casoon/atlas-components@0.0.2

## 0.0.4

### Patch Changes

- Updated dependencies
  - @casoon/atlas-styles@0.0.4

## 0.0.3

### Patch Changes

- Updated dependencies
  - @casoon/atlas-styles@0.0.3

## 0.0.2

### Patch Changes

- Updated dependencies
  - @casoon/atlas-styles@0.0.2
