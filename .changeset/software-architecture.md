---
"@casoon/atlas-components": minor
"@casoon/atlas-effects": minor
"@casoon/atlas": minor
---

feat: add software architecture improvements

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
