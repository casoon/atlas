# CASOON Atlas

**A comprehensive, modern UI effects library built for Tailwind v4 and the modern web.**

CASOON Atlas provides a complete toolkit of **SSR-safe effects**, **headless components**, and **Tailwind v4-compatible styles** designed for maximum flexibility and performance across all JavaScript frameworks.

[![npm version](https://img.shields.io/npm/v/@casoon/atlas)](https://npmjs.com/package/@casoon/atlas)
[![GitHub](https://img.shields.io/badge/GitHub-casoon/atlas-181717?logo=github)](https://github.com/casoon/atlas)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6+-blue)](https://typescriptlang.org)
[![Tailwind v4](https://img.shields.io/badge/Tailwind-v4-38bdf8)](https://tailwindcss.com)
[![SSR Safe](https://img.shields.io/badge/SSR-Safe-green)](#ssr-compatibility)
[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

## Packages Overview

| Package                                               | Description                        | Version |
| ----------------------------------------------------- | ---------------------------------- | ------- |
| **[@casoon/atlas-styles](./packages/styles)**         | Complete Tailwind v4 design system | 0.1.0   |
| **[@casoon/atlas-effects](./packages/effects)**       | Interactive JavaScript effects     | 0.2.0   |
| **[@casoon/atlas-components](./packages/components)** | Headless UI components             | 0.1.0   |
| **[@casoon/atlas](./packages/all)**                   | Meta-package with namespaces       | 0.2.0   |

## Quick Start

### Installation

```bash
# Install everything
npm install @casoon/atlas

# Or individual packages
npm install @casoon/atlas-styles @casoon/atlas-effects @casoon/atlas-components
```

### Modern Namespace API (v0.2.0+)

```typescript
import { ui, fx, effects, utils, atlas } from '@casoon/atlas';

// UI Components
const modal = ui.modal(element, { size: 'lg' });
const tabs = ui.tabs(container);
const toast = ui.toast();

// Effect Composition with fx builder
fx(element)
  .add(effects.ripple())
  .add(effects.tilt({ intensity: 15 }))
  .apply();

// State Management
const store = utils.createStore({ count: 0 });
store.subscribe((state) => console.log(state.count));
store.set({ count: 1 });

// Quick Init (auto-discovers data-atlas attributes)
atlas.init();
```

### Direct Imports (Tree-shakeable)

```typescript
// Effects
import { ripple, tilt, parallax, particles } from '@casoon/atlas-effects';

// Components
import { createModal, createTabs, createToastManager } from '@casoon/atlas-components';

// Styles
import '@casoon/atlas-styles';
import '@casoon/atlas-styles/glass.css';
```

## Available Effects (20+)

### Core Effects

| Effect     | Description                               |
| ---------- | ----------------------------------------- |
| `ripple`   | Interactive click/touch ripple animations |
| `tilt`     | 3D tilt effect with physics and glare     |
| `parallax` | Scroll-based parallax movement            |
| `magnetic` | Cursor-attracted magnetic fields          |
| `glow`     | Dynamic glow and lighting                 |

### Visual Effects

| Effect         | Description                      |
| -------------- | -------------------------------- |
| `particles`    | Configurable particle systems    |
| `orbs`         | Floating animated orb particles  |
| `glassEffects` | Interactive glassmorphism        |
| `morphing`     | Shape and border-radius morphing |
| `wave`         | Sine wave movement animations    |

### Interactive Effects

| Effect         | Description                   |
| -------------- | ----------------------------- |
| `cursorFollow` | Elements following mouse      |
| `scrollReveal` | Viewport-triggered animations |
| `typewriter`   | Animated text typing          |

### Modern Effects (v0.2.0+)

| Effect            | Description                  |
| ----------------- | ---------------------------- |
| `viewTransition`  | View Transitions API wrapper |
| `gesture`         | Touch gesture recognition    |
| `customCursor`    | Custom cursor effects        |
| `themeTransition` | Smooth theme switching       |
| `grain`           | Film grain overlay           |
| `scrollEffects`   | Advanced scroll animations   |

## Available Components (40+)

### Layout

`accordion` `card` `separator` `resizable` `scrollArea` `sidebar` `bentoGrid`

### Navigation

`breadcrumb` `menu` `menubar` `navigationMenu` `tabs` `pagination`

### Forms

`button` `checkbox` `input` `inputOtp` `label` `radioGroup` `select` `combobox` `slider` `switch` `textarea` `form`

### Data Display

`avatar` `avatarGroup` `badge` `calendar` `carousel` `progress` `skeleton` `table` `marquee`

### Overlays

`dialog` `drawer` `dropdown` `modal` `popover` `sheet` `tooltip`

### Utility

`command` `datePicker` `toast` `toggle` `toggleGroup`

## Architecture Features (v0.2.0+)

### Base Component System

Factory pattern for standardized component creation with lifecycle hooks:

```typescript
import { createComponentFactory } from '@casoon/atlas-components';

const MyComponent = createComponentFactory({
  name: 'my-component',
  defaultOptions: { theme: 'light' },
  setup(element, options) {
    return {
      state: { active: false },
      methods: {
        toggle() {
          this.state.active = !this.state.active;
        },
      },
    };
  },
});
```

### Effect Composition API

Fluent builder for combining multiple effects:

```typescript
import { fx } from '@casoon/atlas-effects';

// Chain effects
const cleanup = fx(element)
  .add(ripple({ color: '#3b82f6' }))
  .add(tilt({ intensity: 10 }))
  .add(glow({ color: '#8b5cf6' }))
  .apply();

// Use presets
fx(element).preset('interactive').apply();
fx(element).preset('hero').apply();
```

### Unified State Management

Reactive store with undo/redo and persistence:

```typescript
import { createStore, derivedStore } from '@casoon/atlas-components';

const store = createStore({ count: 0, items: [] }, { history: true, persist: 'my-app-state' });

// Subscribe to changes
store.subscribe((state) => render(state));

// Computed values
const doubled = derivedStore(store, (s) => s.count * 2);

// Undo/Redo
store.set({ count: 5 });
store.undo();
```

### Animation Registry

Centralized keyframes and spring physics:

```typescript
import {
  registerAnimation,
  animate,
  animateWithSpring,
  EASING_PRESETS,
} from '@casoon/atlas-components';

// Register custom animation
registerAnimation('customFade', {
  keyframes: [
    { opacity: 0, transform: 'translateY(20px)' },
    { opacity: 1, transform: 'translateY(0)' },
  ],
  options: { duration: 300, easing: EASING_PRESETS.spring },
});

// Use animation
await animate(element, 'customFade');

// Spring physics
animateWithSpring({
  from: 0,
  to: 100,
  stiffness: 200,
  damping: 20,
  onUpdate: (value) => (element.style.left = `${value}px`),
});
```

### Plugin System

Extend components and effects with lifecycle hooks:

```typescript
import { registerPlugin } from '@casoon/atlas-components';

registerPlugin({
  name: 'analytics',
  onComponentCreate(component) {
    track('component_created', { name: component.name });
  },
  onEffectApply(effect, element) {
    track('effect_applied', { effect: effect.name });
  },
});

// Built-in plugins
import { debugPlugin, performancePlugin, a11yPlugin } from '@casoon/atlas-components';
registerPlugin(debugPlugin);
```

### Config Validation

Schema-based runtime validation:

```typescript
import { schema, validate } from '@casoon/atlas-components';

const optionsSchema = schema.object({
  size: schema.enum(['sm', 'md', 'lg']).default('md'),
  duration: schema.number().min(0).max(5000).default(300),
  enabled: schema.boolean().default(true),
});

const result = validate(userOptions, optionsSchema);
if (result.valid) {
  // Use result.value with defaults applied
}
```

## CSS Styles

### Glass Effects

```css
.glass        /* Standard glass effect */
.glass-dark   /* Dark variant */
.glass-strong /* Enhanced blur */
```

### Design Tokens

```css
:root {
  --cs-brand: #4f7cff;
  --cs-glass-blur: 16px;
  --cs-transition: 180ms cubic-bezier(0.2, 0.6, 0.2, 1);
}
```

## Framework Integration

### React

```tsx
import { useEffect, useRef } from 'react';
import { fx, effects } from '@casoon/atlas';

function InteractiveCard({ children }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    return fx(ref.current).add(effects.tilt()).add(effects.glow()).apply();
  }, []);

  return <div ref={ref}>{children}</div>;
}
```

### Vue 3

```vue
<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import { fx, effects } from '@casoon/atlas';

const card = ref(null);
let cleanup;

onMounted(() => {
  cleanup = fx(card.value).add(effects.tilt()).apply();
});

onUnmounted(() => cleanup?.());
</script>

<template>
  <div ref="card">Interactive Card</div>
</template>
```

### Svelte

```svelte
<script>
  import { onMount } from 'svelte';
  import { fx, effects } from '@casoon/atlas';

  let element;

  onMount(() => {
    return fx(element)
      .add(effects.ripple())
      .add(effects.tilt())
      .apply();
  });
</script>

<div bind:this={element}>Interactive Element</div>
```

## Development

```bash
# Clone and setup
git clone https://github.com/casoon/atlas.git
cd atlas
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Lint
pnpm lint
```

## Browser Support

| Feature          | Chrome | Firefox | Safari | Edge |
| ---------------- | ------ | ------- | ------ | ---- |
| Core Effects     | 88+    | 94+     | 14+    | 88+  |
| View Transitions | 111+   | -       | 18+    | 111+ |
| Backdrop Filters | 76+    | 103+    | 14+    | 79+  |

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for version history.

### v0.2.0 (Latest)

- Base Component System with lifecycle hooks
- Effect Composition API (fx builder)
- Unified State Management with undo/redo
- Animation Registry with spring physics
- Plugin System for extensibility
- Config Validation with schemas
- 40+ UI Components
- 20+ Effects including View Transitions, Gestures, Custom Cursor

## License

MIT License - see [LICENSE](./LICENSE)

## Author

**Jörn Seidel**  
[CASOON](https://www.casoon.de) | [GitHub](https://github.com/casoon)

---

**Built with care for the modern web**
