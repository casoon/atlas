# 🌟 CASOON Atlas

**A comprehensive, modern UI effects library built for Tailwind v4 and the modern web.**

CAASOON Atlas provides a complete toolkit of **SSR-safe effects**, **headless components**, and **Tailwind v4-compatible styles** designed for maximum flexibility and performance.

[![npm version](https://img.shields.io/npm/v/@casoon/effects)](https://npmjs.com/package/@casoon/effects)
[![GitHub](https://img.shields.io/badge/GitHub-casoon/atlas-181717?logo=github)](https://github.com/casoon/atlas)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6+-blue)](https://typescriptlang.org)
[![Tailwind v4](https://img.shields.io/badge/Tailwind-v4-38bdf8)](https://tailwindcss.com)
[![SSR Safe](https://img.shields.io/badge/SSR-Safe-green)](#ssr-compatibility)
[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

## 📦 Packages Overview

| Package | Description | Size | Features |
|---------|-------------|------|----------|
| **[@casoon/styles](#casoon-styles)** | Complete Tailwind v4 design system | ~50KB | Glass effects, gradients, utilities |
| **[@casoon/effects](#casoon-effects)** | Interactive JavaScript effects | ~15KB | 13+ effects, SSR-safe, tree-shakeable |
| **[@casoon/components](#casoon-components)** | Headless UI components | ~8KB | 10+ components, framework-agnostic |
| **[@casoon/all](#casoon-all)** | Meta-package for convenience | ~25KB | All packages combined |

## 🚀 Quick Start

### Installation

```bash
# Install individual packages
npm install @casoon/styles @casoon/effects @casoon/components

# Or install everything at once
npm install @casoon/all

# Using pnpm (recommended)
pnpm add @casoon/styles @casoon/effects @casoon/components
```

### Basic Usage

```typescript
// Import styles (works with any CSS import method)
import '@casoon/styles';
// Or import specific modules
import '@casoon/styles/glass';
import '@casoon/styles/effects';

// Import effects
import { ripple, tilt, particles } from '@casoon/effects';

// Import components  
import { createModal, createTabs } from '@casoon/components';

// Initialize effects
ripple('.btn', { strength: 0.8 });
tilt('.card', { intensity: 15 });

// Create components
const modal = createModal();
const tabs = createTabs(['home', 'about', 'contact']);
```

### Astro Example

```astro
---
// Component script (runs on server)
import { onMount } from 'astro:client';
import { ripple } from '@casoon/effects/ripple';
import '@casoon/styles/glass';
---

<button id="cta" class="glass">Click me!</button>

<script>
  onMount(() => {
    const dispose = ripple('#cta', { strength: 0.8 });
    return () => dispose(); // Cleanup
  });
</script>
```

### Svelte Example

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { ripple } from '@casoon/effects/ripple';
  
  let button: HTMLButtonElement;
  
  onMount(() => {
    const dispose = ripple(button, { strength: 0.8 });
    return () => dispose();
  });
</script>

<button bind:this={button} class="glass">Click me!</button>

<style>
  @import '@casoon/styles/glass';
</style>
```

## Architecture

### 📦 Packages

- **@casoon/styles** - Pure CSS, importable via subpaths
- **@casoon/effects** - TypeScript effects, SSR-safe 
- **@casoon/components** - Framework-agnostic components (minimal for now)
- **@casoon/all** - Meta-package that re-exports all TypeScript modules

### 🎯 Design Principles

1. **SSR-Safe**: No DOM access at module level
2. **Tree-shakeable**: Named exports only, `sideEffects: false`
3. **Subpath Exports**: Import only what you need
4. **Framework Agnostic**: Works with any framework
5. **Tailwind Compatible**: CSS classes can be purged

### 📂 Subpath Imports

```typescript
// CSS Styles
import '@casoon/styles';           // All styles
import '@casoon/styles/glass';     // Only glass effects
import '@casoon/styles/orbs';      // Only orb effects

// JavaScript Effects
import { ripple } from '@casoon/effects/ripple';
import { orbs } from '@casoon/effects/orbs';
import { parallax } from '@casoon/effects/parallax';

// Or import everything
import { ripple, orbs, parallax } from '@casoon/effects';
```

## 🎭 Available Effects (13+)

### Core Effects
- **Ripple** - Interactive click/touch ripple animations
- **Orbs** - Floating animated orb particles with physics
- **Parallax** - Scroll-based parallax movement effects

### Advanced Effects
- **Glass Effects** - Interactive glassmorphism with dynamic blur
- **Scroll Reveal** - Elements animate in as they enter viewport
- **Particles** - Configurable particle systems with connections

### Interactive Effects
- **Cursor Follow** - Elements that follow mouse movement
- **Tilt** - 3D tilt effect with realistic physics and glare
- **Magnetic** - Elements attracted to cursor with magnetic fields

### Visual Effects
- **Glow** - Dynamic glow and lighting effects
- **Morphing** - Shape and border-radius morphing animations
- **Wave** - Sine wave movement animations
- **Typewriter** - Animated text typing with cursor

### Quick Example
```typescript
import { ripple, tilt, particles } from '@casoon/effects';

// Add ripple effect to buttons
ripple('.btn', { strength: 0.8, color: '#3b82f6' });

// Add 3D tilt to cards
tilt('.card', { intensity: 15, glareEffect: true });

// Add particle system to hero section
particles('#hero', { count: 30, interactive: true, connectLines: true });
```

## CSS Classes

### Glass Effect
```css
.glass       /* Standard glass effect */
.glass-dark  /* Dark variant */
.glass-strong /* Enhanced blur */
```

### Orbs
```css
.orbs-container /* Container for orb effects */
.orb           /* Individual orb styling */
.orb-small     /* Small orb (20px) */
.orb-medium    /* Medium orb (40px) */
.orb-large     /* Large orb (80px) */
```

## Tailwind Integration

CASOON Atlas classes are designed to work with Tailwind's purge/content system. If you're using classes dynamically, add them to your safelist:

```js
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  safelist: [
    'glass',
    'glass-dark', 
    'glass-strong',
    'orb',
    'orb-small',
    'orb-medium',
    'orb-large',
    'orbs-container'
  ]
}
```

## 🧩 Available Components (10+)

### Layout & Navigation
- **Modal** - Accessible modal dialogs with focus management
- **Dropdown** - Flexible dropdown menus with positioning
- **Tabs** - Accessible tab interfaces with ARIA support
- **Drawer** - Slide-in panels and sidebars

### Content & Data
- **Accordion** - Collapsible content sections
- **Card** - Flexible card components with variants

### Feedback & Overlays
- **Tooltip** - Contextual tooltips with smart positioning
- **Toast** - Non-blocking notification system

### Forms & Inputs
- **Form** - Form state management with validation
- **Button** - Interactive button states and variants

### Quick Example
```typescript
import { createModal, createTabs, createToastManager } from '@casoon/components';

// Create modal with backdrop
const modal = createModal({ closeOnBackdrop: true, trapFocus: true });

// Create tabs system
const tabs = createTabs(['home', 'about', 'contact']);

// Create toast notifications
const toast = createToastManager();
toast.show('Welcome to CASOON Atlas!', { type: 'success' });
```

## 🌎 Live Demo

```bash
# Start the interactive demo
pnpm demo

# Visit http://localhost:3000
# Explore all effects and components interactively!
```

## Development

```bash
# Clone and setup
git clone <repo>
cd casoon-atlas
pnpm install

# Build all packages
pnpm build

# Start demo server
pnpm demo

# Clean builds
pnpm clean

### Project Structure

```
casoon-atlas/
├── packages/
│   ├── styles/          # @casoon/styles
│   │   ├── src/
│   │   │   ├── index.css
│   │   │   ├── glass.css
│   │   │   └── orbs.css
│   │   └── package.json
│   ├── effects/         # @casoon/effects
│   │   ├── src/
│   │   │   ├── ripple/
│   │   │   ├── orbs/
│   │   │   ├── parallax/
│   │   │   └── index.ts
│   │   ├── tsup.config.ts
│   │   └── package.json
│   ├── components/      # @casoon/components
│   └── all/            # @casoon/all
├── pnpm-workspace.yaml
└── package.json
```

## 🔧 Architecture & Design Principles

### SSR Compatibility
All effects are designed to be SSR-safe:
- No top-level DOM access
- Function-based initialization only
- Cleanup functions prevent memory leaks

### Framework Agnostic
Works seamlessly with:
- **React** - Custom hooks and effects
- **Vue 3** - Composables and reactivity
- **Svelte** - Actions and stores  
- **Astro** - Client directives
- **Vanilla JS** - Direct function calls

### Tree Shaking
Optimized for minimal bundle size:
- Named exports only (no default exports)
- `sideEffects: false` for JavaScript packages
- Subpath imports for granular control
- CSS modules can be imported individually

## 📊 Bundle Sizes

| Package | Minified | Gzipped | Modules |
|---------|----------|---------|----------|
| @casoon/styles | 50KB | 8KB | 5 CSS modules |
| @casoon/effects | 25KB | 6KB | 13 effects |
| @casoon/components | 15KB | 4KB | 10 components |
| **Total** | **90KB** | **18KB** | **28 modules** |

## 🌐 Browser Support

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|---------|
| Core Effects | 88+ | 94+ | 14+ | 88+ |
| Backdrop Filters | 76+ | 103+ | 14+ | 79+ |
| CSS Grid/Flexbox | 57+ | 52+ | 10.1+ | 16+ |
| IntersectionObserver | 58+ | 55+ | 12.1+ | 17+ |

## 🚀 Performance

### Optimization Features
- **RAF-based animations** for smooth 60fps performance
- **Intersection Observer** for efficient scroll-based effects
- **Passive event listeners** to improve scroll performance
- **Automatic cleanup** prevents memory leaks
- **Reduced motion support** respects user preferences

### Best Practices
```typescript
// ✅ Good: Cleanup effects properly
const cleanupFunctions = [
  ripple('.btn'),
  tilt('.card'),
  particles('#bg')
];

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  cleanupFunctions.forEach(cleanup => cleanup());
});

// ✅ Good: Conditional loading
if (window.matchMedia('(hover: hover)').matches) {
  tilt('.interactive-element');
}
```

## 🎨 Styling Approach

### Tailwind v4 Integration
```css
/* Your main CSS file */
@import "tailwindcss";
@import "@casoon/styles";

/* Override design tokens */
@theme {
  --cs-brand: #your-brand-color;
  --cs-radius: 12px;
}
```

### Custom Properties
All styles use CSS custom properties for easy theming:
```css
:root {
  /* Brand colors */
  --cs-brand: #4f7cff;
  --cs-success: #22c55e;
  --cs-danger: #ef4444;
  
  /* Glass effects */
  --cs-glass-blur: 16px;
  --cs-glass-bg-light: rgba(255, 255, 255, 0.1);
  
  /* Animation timing */
  --cs-transition: 180ms cubic-bezier(0.2, 0.6, 0.2, 1);
}
```

## 🧪 Testing

### Running Tests
```bash
# Run all tests
pnpm test

# Test specific package
pnpm test --filter @casoon/effects

# Watch mode
pnpm test --watch
```

### Demo & Development
```bash
# Start interactive demo
pnpm demo
# Opens http://localhost:3000 with live examples

# Build demo for production
pnpm demo:build

# Development mode (watch all packages)
pnpm dev
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

### Development Setup
```bash
# Clone the repository
git clone https://github.com/casoon/atlas.git
cd atlas

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Start demo for testing
pnpm demo
```

### Project Structure
```
casoon-atlas/
├── packages/
│   ├── styles/          # CSS utilities and design system
│   ├── effects/         # JavaScript effects
│   ├── components/      # Headless UI components  
│   └── all/            # Meta-package
├── demo/               # Interactive demo application
├── docs/               # Documentation
└── tools/              # Build and development tools
```

## 📚 Documentation

- **[Styles Documentation](./packages/styles/README.md)** - Complete CSS system guide
- **[Effects Documentation](./packages/effects/README.md)** - JavaScript effects API
- **[Components Documentation](./packages/components/README.md)** - Headless components guide
- **[Interactive Demo](http://localhost:3000)** - Live examples (run `pnpm demo`)

## 🔄 Changelog

See [CHANGELOG.md](./CHANGELOG.md) for detailed version history.

## 🛡️ Security

For security concerns, please email joern.seidel@casoon.de

## 📄 License

MIT License - see [LICENSE](./LICENSE) file for details.

## 👨‍💻 Author

**Jörn Seidel**  
🌐 [CASOON - Digital Transformation](https://www.casoon.de)  
📧 joern.seidel@casoon.de  
💼 [LinkedIn](https://linkedin.com/in/joern-seidel)  
🐙 [GitHub](https://github.com/casoon)

---

**Built with ❤️ for the modern web**

CASOON Atlas is designed to make beautiful, interactive UIs accessible to every developer, regardless of framework choice or experience level.
