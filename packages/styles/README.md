# @casoon/atlas-styles

**Complete Tailwind v4-compatible design system with modern UI effects**

A comprehensive CSS utility library featuring glassmorphism effects, gradient systems, animations, and modern design components, all built for Tailwind v4.

## Features

- ✅ **Tailwind v4 Native** - Uses `@theme` and `@utility` directives
- ✅ **Modular Imports** - Import only what you need via subpaths
- ✅ **Complete Design System** - 145+ utility classes and components
- ✅ **Glass Effects** - Modern glassmorphism with backdrop filters
- ✅ **Gradient System** - Dynamic backgrounds and effects
- ✅ **SSR Compatible** - No JavaScript required
- ✅ **Tree Shakeable** - Optimized for production builds

## Installation

```bash
npm install @casoon/atlas-styles
```

## Usage

### Full Import
```css
@import "@casoon/atlas-styles";
```

### Modular Imports
```css
/* Import specific modules */
@import "@casoon/atlas-styles/core";     /* Design tokens & base utilities */
@import "@casoon/atlas-styles/glass";    /* Glass morphism effects */
@import "@casoon/atlas-styles/orbs";     /* Orb animations */
@import "@casoon/atlas-styles/animations"; /* Animation utilities */
@import "@casoon/atlas-styles/utilities";  /* Additional utilities */
```

### With Tailwind v4
```css
/* In your main CSS file */
@import "tailwindcss";
@import "@casoon/atlas-styles";
```

## Available Modules

### Core (`@casoon/atlas-styles/core`)
Complete design system foundation with tokens, utilities, and components:
- **Design Tokens**: Colors, spacing, typography, motion
- **Component System**: Cards, forms, navigation, typography
- **Layout Utilities**: Containers, z-index, focus management
- **Gradient System**: 30+ gradient utilities with animations

### Glass (`@casoon/atlas-styles/glass`)
Modern glassmorphism effects:
- **Glass Variants**: `cs-glass`, `cs-glass-dark`, `cs-glass-strong`
- **Size Options**: `cs-glass-sm` to `cs-glass-5xl`
- **Color Variants**: `cs-glass-blue`, `cs-glass-purple`, etc.
- **Interactive States**: Hover and focus effects

### Orbs (`@casoon/atlas-styles/orbs`)
Floating orb animations and effects:
- **Container**: `cs-orbs-container`
- **Orb Elements**: `cs-orb`, `cs-orb-small`, `cs-orb-medium`, `cs-orb-large`
- **Animations**: Built-in floating and movement effects

### Animations (`@casoon/atlas-styles/animations`)
Comprehensive animation utilities:
- **Micro Interactions**: Hover lifts, scales, glows
- **Loading States**: Spinners, skeletons, progress
- **Scroll Effects**: Reveal animations, smooth scrolling

### Utilities (`@casoon/atlas-styles/utilities`)
Additional utility classes:
- **Scrollbar Styling**: Custom scrollbar designs
- **Focus Management**: Enhanced focus states
- **Accessibility**: Screen reader utilities

## Examples

### Glass Morphism Cards
```html
<div class="cs-glass p-6 rounded-lg">
  <h3 class="cs-text">Glass Card</h3>
  <p class="cs-text-muted">Beautiful glassmorphism effect</p>
</div>

<!-- Dark variant -->
<div class="cs-glass-dark p-6 rounded-lg">
  <h3 class="cs-text">Dark Glass Card</h3>
</div>

<!-- Strong glass effect -->
<div class="cs-glass-strong p-6 rounded-lg">
  <h3 class="cs-text">Strong Glass Effect</h3>
</div>
```

### Gradient Backgrounds
```html
<!-- Predefined gradients -->
<div class="cs-gradient-ocean p-8 rounded-lg">
  <h2 class="cs-gradient-text-ocean">Ocean Gradient</h2>
</div>

<div class="cs-gradient-sunset p-8 rounded-lg">
  <h2 class="cs-gradient-text-sunset">Sunset Gradient</h2>
</div>

<!-- Animated gradients -->
<div class="cs-gradient-ocean cs-gradient-animate p-8 rounded-lg">
  <h2>Animated Ocean</h2>
</div>
```

### Feature Cards
```html
<div class="cs-card-feature">
  <div class="cs-card-icon">🚀</div>
  <h3 class="cs-card-title">Fast Performance</h3>
  <p class="cs-card-description">Optimized for speed and efficiency</p>
  <button class="cs-button-primary-card">Learn More</button>
</div>
```

### Form Components
```html
<form class="cs-form-modern">
  <div class="cs-form-group">
    <label class="cs-label-modern">Email</label>
    <input type="email" class="cs-input-modern" placeholder="Enter your email">
  </div>
  <button class="cs-button-primary-modern">Submit</button>
</form>
```

## Design Tokens

All design tokens are available as CSS custom properties:

### Colors
```css
--cs-bg: #0b0c0f;
--cs-surface: #14161a;
--cs-text: #eef1f6;
--cs-brand: #4f7cff;
--cs-success: #22c55e;
```

### Spacing
```css
--cs-space-1: 4px;
--cs-space-2: 8px;
--cs-space-4: 16px;
--cs-space-8: 32px;
```

### Typography
```css
--cs-fs-sm: clamp(0.88rem, 0.82rem + 0.3cqi, 0.95rem);
--cs-fs-md: clamp(1rem, 0.95rem + 0.4cqi, 1.125rem);
--cs-fs-lg: clamp(1.25rem, 1.05rem + 0.8cqi, 1.5rem);
```

## Customization

### Override Design Tokens
```css
:root {
  --cs-brand: #your-brand-color;
  --cs-radius: 12px;
  --cs-glass-blur: 20px;
}
```

### Custom Glass Variants
```css
.my-custom-glass {
  background: var(--cs-glass-bg-medium);
  backdrop-filter: blur(12px);
  border: 1px solid var(--cs-glass-border-strong);
  border-radius: var(--cs-radius);
}
```

## Tailwind Integration

### Purge Configuration
Add CASOON classes to your Tailwind safelist:

```js
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{html,js,tsx}'],
  safelist: [
    // Glass effects
    { pattern: /cs-glass.*/ },
    // Gradient utilities
    { pattern: /cs-gradient.*/ },
    // Component classes
    { pattern: /cs-card.*/ },
    { pattern: /cs-button.*/ },
  ]
}
```

### Plugin Integration
```js
// tailwind.config.js
const plugin = require('tailwindcss/plugin');

module.exports = {
  plugins: [
    plugin(function({ addUtilities }) {
      // CASOON styles will be available as Tailwind utilities
    })
  ]
}
```

## Browser Support

- **Modern Browsers**: Full support (Chrome 88+, Firefox 94+, Safari 14+)
- **Backdrop Filters**: Graceful degradation for unsupported browsers
- **CSS Custom Properties**: IE 11+ (with polyfill)

## Performance

- **CSS Size**: ~50KB uncompressed, ~8KB gzipped
- **Tree Shakeable**: Import only what you need
- **No JavaScript**: Pure CSS, no runtime overhead
- **Optimized**: Minimal specificity, efficient selectors

## Migration Guide

### From Tailwind v3
```css
/* Before */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* After */
@import "tailwindcss";
@import "@casoon/styles";
```

### From Custom CSS
Replace custom glass/gradient CSS with CASOON utilities:

```css
/* Before */
.my-glass {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

/* After - just use the class */
/* <div class="cs-glass"> */
```

## Contributing

See the main [CASOON Atlas README](../../README.md) for contribution guidelines.

## License

MIT