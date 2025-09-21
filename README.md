# 🌟 CASOON Atlas

**A comprehensive, modern UI effects library built for Tailwind v4 and the modern web.**

CASOON Atlas provides a complete toolkit of **SSR-safe effects**, **headless components**, and **Tailwind v4-compatible styles** designed for maximum flexibility and performance across all JavaScript frameworks.

[![npm version](https://img.shields.io/npm/v/@casoon/atlas-effects)](https://npmjs.com/package/@casoon/atlas-effects)
[![GitHub](https://img.shields.io/badge/GitHub-casoon/atlas-181717?logo=github)](https://github.com/casoon/atlas)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6+-blue)](https://typescriptlang.org)
[![Tailwind v4](https://img.shields.io/badge/Tailwind-v4-38bdf8)](https://tailwindcss.com)
[![SSR Safe](https://img.shields.io/badge/SSR-Safe-green)](#ssr-compatibility)
[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

## 📦 Packages Overview

| Package | Description | Size | Features |
|---------|-------------|------|---------|
| **[@casoon/atlas-styles](#casoon-atlas-styles)** | Complete Tailwind v4 design system | Purged by Tailwind | Glass effects, gradients, utilities |
| **[@casoon/atlas-effects](#casoon-atlas-effects)** | Interactive JavaScript effects | ~2.2KB JS | 13+ effects, SSR-safe, tree-shakeable |
| **[@casoon/atlas-components](#casoon-atlas-components)** | Headless UI components | ~1.8KB JS | 10+ components, framework-agnostic |
| **[@casoon/atlas](#casoon-atlas)** | Meta-package for convenience | ~4KB JS | All packages combined |

## 🚀 Quick Start

### Installation

```bash
# Install individual packages
npm install @casoon/atlas-styles @casoon/atlas-effects @casoon/atlas-components

# Or install everything at once
npm install @casoon/atlas

# Using pnpm (recommended)
pnpm add @casoon/atlas-styles @casoon/atlas-effects @casoon/atlas-components
```

### Basic Usage

```typescript
// Import styles (works with any CSS import method)
import '@casoon/atlas-styles';
// Or import specific modules
import '@casoon/atlas-styles/glass.css';
import '@casoon/atlas-styles/effects';

// Import effects
import { ripple, tilt, particles } from '@casoon/atlas-effects';

// Import components  
import { createModal, createTabs } from '@casoon/atlas-components';

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
import { ripple } from '@casoon/atlas-effects/ripple';
import '@casoon/atlas-styles/glass.css';
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
  import { ripple } from '@casoon/atlas-effects/ripple';
  
  let button: HTMLButtonElement;
  
  onMount(() => {
    const dispose = ripple(button, { strength: 0.8 });
    return () => dispose();
  });
</script>

<button bind:this={button} class="glass">Click me!</button>

<style>
  @import '@casoon/atlas-styles/glass.css';
</style>
```

## Architecture

### 📦 Packages

- **@casoon/atlas-styles** - Pure CSS, importable via subpaths
- **@casoon/atlas-effects** - TypeScript effects, SSR-safe 
- **@casoon/atlas-components** - Framework-agnostic components (minimal for now)
- **@casoon/atlas** - Meta-package that re-exports all TypeScript modules

### 🎯 Design Principles

1. **SSR-Safe**: No DOM access at module level
2. **Tree-shakeable**: Named exports only, `sideEffects: false`
3. **Subpath Exports**: Import only what you need
4. **Framework Agnostic**: Works with any framework
5. **Tailwind Compatible**: CSS classes can be purged

### 📂 Subpath Imports

```typescript
// CSS Styles
import '@casoon/atlas-styles';           // All styles
import '@casoon/atlas-styles/glass.css';     // Only glass effects
import '@casoon/atlas-styles/orbs.css';      // Only orb effects
// Or use deep paths:
import '@casoon/atlas-styles/dist/index.css';  // All styles (explicit)
import '@casoon/atlas-styles/dist/glass.css';
import '@casoon/atlas-styles/dist/orbs.css';

// JavaScript Effects
import { ripple } from '@casoon/atlas-effects/ripple';
import { orbs } from '@casoon/atlas-effects/orbs';
import { parallax } from '@casoon/atlas-effects/parallax';

// Or import everything
import { ripple, orbs, parallax } from '@casoon/atlas-effects';
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
import { ripple, tilt, particles } from '@casoon/atlas-effects';

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

CASOON Atlas classes are fully compatible with Tailwind's purge/content system. **The actual CSS bundle size depends entirely on which classes you use** - unused styles are automatically removed during build.

### Bundle Size Optimization
- Only classes actually used in your templates are included in the final build
- Subpath imports allow importing only specific style modules (e.g., just glass effects)
- The ~200KB source size becomes much smaller in production
- CSS imports use package references instead of relative paths for better build compatibility

If you're using classes dynamically, add them to your safelist:

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
import { createModal, createTabs, createToastManager } from '@casoon/atlas-components';

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
│   ├── styles/          # @casoon/atlas-styles
│   │   ├── src/
│   │   │   ├── index.css
│   │   │   ├── glass.css
│   │   │   └── orbs.css
│   │   └── package.json
│   ├── effects/         # @casoon/atlas-effects
│   │   ├── src/
│   │   │   ├── ripple/
│   │   │   ├── orbs/
│   │   │   ├── parallax/
│   │   │   └── index.ts
│   │   ├── tsup.config.ts
│   │   └── package.json
│   ├── components/      # @casoon/atlas-components
│   └── all/            # @casoon/atlas
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

| Package | Raw Size | Modules | Notes |
|---------|----------|---------|----------|
| @casoon/atlas-styles | Purged by Tailwind | 6 CSS modules | Only used classes included in build |
| @casoon/atlas-effects | ~2.2KB JS | 13 effects | Tree-shakeable, minified bundles |
| @casoon/atlas-components | ~1.8KB JS | 10 components | Headless components, minimal JS |
| @casoon/atlas | ~4KB JS | Re-exports | Combined size of effects + components |

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
@import "@casoon/atlas-styles";

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
pnpm test --filter @casoon/atlas-effects

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
🌐 [CASOON](https://www.casoon.de)  
📧 joern.seidel@casoon.de  
💼 [LinkedIn](https://www.linkedin.com/in/casoon)  
🐙 [GitHub](https://github.com/casoon)

---

**Built with ❤️ for the modern web**

CASOON Atlas is designed to make beautiful, interactive UIs accessible to every developer, regardless of framework choice or experience level.
