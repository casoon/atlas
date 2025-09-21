# @casoon/effects

**Modern, SSR-safe JavaScript effects for interactive UIs**

A collection of 13+ interactive JavaScript effects designed for modern web applications. All effects are SSR-compatible, framework-agnostic, and highly customizable.

## Features

- ✅ **SSR-Safe** - No DOM access at module level
- ✅ **Framework Agnostic** - Works with React, Vue, Svelte, Astro, vanilla JS
- ✅ **Tree Shakeable** - Import only the effects you need
- ✅ **TypeScript Native** - Full TypeScript support with detailed types
- ✅ **Performance Optimized** - Efficient animations and cleanup
- ✅ **Highly Customizable** - Extensive configuration options
- ✅ **Accessibility Ready** - Respects user preferences

## Installation

```bash
npm install @casoon/effects
```

## Quick Start

```typescript
import { ripple, tilt, particles } from '@casoon/effects';

// Add ripple effect to buttons
const cleanup1 = ripple('.btn', { 
  strength: 0.8, 
  color: '#3b82f6' 
});

// Add 3D tilt to cards
const cleanup2 = tilt('.card', { 
  intensity: 15, 
  glareEffect: true 
});

// Add particle system
const cleanup3 = particles('#hero', { 
  count: 30, 
  interactive: true 
});

// Cleanup when needed
cleanup1();
cleanup2();
cleanup3();
```

## Available Effects

### Core Effects

#### Ripple
Interactive click/touch ripple animations
```typescript
import { ripple } from '@casoon/effects/ripple';

const dispose = ripple('#button', {
  strength: 0.5,        // Ripple size multiplier
  duration: 600,        // Animation duration in ms
  color: 'rgba(255, 255, 255, 0.3)'
});
```

#### Orbs
Floating animated orb particles with physics
```typescript
import { orbs } from '@casoon/effects/orbs';

const dispose = orbs('#container', {
  count: 5,             // Number of orbs
  minSize: 20,          // Minimum orb size
  maxSize: 60,          // Maximum orb size
  speed: 0.5,           // Movement speed
  color: 'rgba(255, 255, 255, 0.1)'
});
```

#### Parallax
Scroll-based parallax movement effects
```typescript
import { parallax } from '@casoon/effects/parallax';

const dispose = parallax('#element', {
  speed: 0.5,           // Parallax speed
  direction: 'vertical', // 'vertical', 'horizontal', or 'both'
  offset: 0             // Initial offset
});
```

### Advanced Effects

#### Glass Effects
Interactive glassmorphism with dynamic blur
```typescript
import { glassEffects } from '@casoon/effects/glass-effects';

const dispose = glassEffects('#element', {
  intensity: 0.15,      // Background opacity
  blurAmount: 16,       // Blur intensity
  animated: true,       // Animated pulse
  interactiveBlur: true, // Mouse interaction
  color: 'rgba(255, 255, 255, 0.1)'
});
```

#### Scroll Reveal
Elements animate in as they enter viewport
```typescript
import { scrollReveal } from '@casoon/effects/scroll-reveal';

const dispose = scrollReveal('#element', {
  distance: '20px',     // Animation distance
  duration: 800,        // Animation duration
  delay: 0,             // Delay before animation
  origin: 'bottom',     // Animation origin
  scale: 0.95,          // Initial scale
  once: true            // Animate only once
});
```

#### Particles
Configurable particle systems with connections
```typescript
import { particles } from '@casoon/effects/particles';

const dispose = particles('#container', {
  count: 30,            // Number of particles
  size: [2, 8],         // Size range [min, max]
  speed: [0.1, 0.5],    // Speed range [min, max]
  color: ['#3b82f6', '#8b5cf6'], // Color array
  interactive: true,    // Mouse interaction
  connectLines: true,   // Connect nearby particles
  maxDistance: 100      // Connection distance
});
```

### Interactive Effects

#### Cursor Follow
Elements that follow mouse movement
```typescript
import { cursorFollow } from '@casoon/effects/cursor-follow';

const dispose = cursorFollow('#element', {
  speed: 0.1,           // Follow speed
  offset: { x: 10, y: -10 }, // Cursor offset
  magnetic: false,      // Magnetic attraction
  magneticThreshold: 100 // Magnetic range
});
```

#### Tilt
3D tilt effect with realistic physics and glare
```typescript
import { tilt } from '@casoon/effects/tilt';

const dispose = tilt('#element', {
  intensity: 20,        // Tilt intensity
  scale: 1.05,          // Hover scale
  perspective: 1000,    // 3D perspective
  speed: 300,           // Animation speed
  glareEffect: true     // Enable glare overlay
});
```

#### Magnetic
Elements attracted to cursor with magnetic fields
```typescript
import { magnetic } from '@casoon/effects/magnetic';

const dispose = magnetic('#element', {
  strength: 0.3,        // Magnetic force
  threshold: 100,       // Activation distance
  returnSpeed: 0.1      // Return animation speed
});
```

### Visual Effects

#### Glow
Dynamic glow and lighting effects
```typescript
import { glow } from '@casoon/effects/glow';

const dispose = glow('#element', {
  color: '#3b82f6',     // Glow color
  intensity: 0.5,       // Glow intensity
  size: 20,             // Glow size
  animated: true,       // Animated pulse
  interactive: true     // Hover interaction
});
```

#### Morphing
Shape and border-radius morphing animations
```typescript
import { morphing } from '@casoon/effects/morphing';

const dispose = morphing('#element', {
  shapes: ['50%', '0%', '25%', '50%'], // Shape sequence
  duration: 2000,       // Animation duration
  autoPlay: true,       // Auto-start animation
  loop: true            // Loop animation
});
```

#### Wave
Sine wave movement animations
```typescript
import { wave } from '@casoon/effects/wave';

const dispose = wave('#element', {
  amplitude: 10,        // Wave amplitude
  frequency: 0.02,      // Wave frequency
  speed: 0.05,          // Animation speed
  direction: 'horizontal' // 'horizontal' or 'vertical'
});
```

#### Typewriter
Animated text typing with cursor
```typescript
import { typewriter } from '@casoon/effects/typewriter';

const dispose = typewriter('#element', {
  texts: ['Hello!', 'World!'], // Text array
  speed: 100,           // Typing speed
  deleteSpeed: 50,      // Delete speed
  pause: 1000,          // Pause between texts
  loop: true,           // Loop through texts
  cursor: true,         // Show cursor
  cursorChar: '|'       // Cursor character
});
```

## Framework Integration

### React
```typescript
import { useEffect, useRef } from 'react';
import { ripple } from '@casoon/effects';

function MyComponent() {
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (buttonRef.current) {
      const dispose = ripple(buttonRef.current, { strength: 0.8 });
      return dispose; // Cleanup on unmount
    }
  }, []);

  return <button ref={buttonRef}>Click me</button>;
}
```

### Vue 3
```vue
<template>
  <button ref="buttonRef">Click me</button>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import { ripple } from '@casoon/effects';

const buttonRef = ref(null);
let dispose;

onMounted(() => {
  if (buttonRef.value) {
    dispose = ripple(buttonRef.value, { strength: 0.8 });
  }
});

onUnmounted(() => {
  dispose?.();
});
</script>
```

### Svelte
```svelte
<script>
  import { onMount } from 'svelte';
  import { ripple } from '@casoon/effects';
  
  let buttonRef;

  onMount(() => {
    const dispose = ripple(buttonRef, { strength: 0.8 });
    return dispose; // Cleanup on destroy
  });
</script>

<button bind:this={buttonRef}>Click me</button>
```

### Astro
```astro
---
import { ripple } from '@casoon/effects';
---

<button id="my-button">Click me</button>

<script>
  import { ripple } from '@casoon/effects';
  
  // Client-side only
  if (typeof window !== 'undefined') {
    const dispose = ripple('#my-button', { strength: 0.8 });
  }
</script>
```

## Advanced Usage

### Effect Chaining
```typescript
import { ripple, tilt, glow } from '@casoon/effects';

// Combine multiple effects
const element = document.querySelector('#my-element');
const cleanups = [
  ripple(element, { strength: 0.6 }),
  tilt(element, { intensity: 10 }),
  glow(element, { color: '#3b82f6', animated: false })
];

// Cleanup all effects
const cleanupAll = () => cleanups.forEach(fn => fn());
```

### Conditional Effects
```typescript
import { tilt } from '@casoon/effects';

// Only add effects on non-touch devices
const addTiltEffect = () => {
  if (window.matchMedia('(hover: hover)').matches) {
    return tilt('.card', { intensity: 15 });
  }
  return () => {}; // No-op cleanup
};

const dispose = addTiltEffect();
```

### Dynamic Configuration
```typescript
import { particles } from '@casoon/effects';

const configs = {
  subtle: { count: 10, speed: [0.1, 0.2] },
  normal: { count: 20, speed: [0.2, 0.4] },
  intense: { count: 40, speed: [0.4, 0.8] }
};

let currentEffect;
const changeIntensity = (level) => {
  currentEffect?.(); // Cleanup current
  currentEffect = particles('#bg', configs[level]);
};
```

## Performance Guidelines

### Optimization Tips
1. **Cleanup Effects**: Always call the returned cleanup function
2. **Selective Initialization**: Only initialize effects when needed
3. **Throttle/Debounce**: Use throttling for resize/scroll events
4. **Prefer CSS**: Use CSS animations when possible

### Memory Management
```typescript
// Good: Store and cleanup effects
const effects = new Map();

const addEffect = (element, type, options) => {
  const key = `${element.id}-${type}`;
  const dispose = effectFunctions[type](element, options);
  effects.set(key, dispose);
};

const removeEffect = (element, type) => {
  const key = `${element.id}-${type}`;
  const dispose = effects.get(key);
  if (dispose) {
    dispose();
    effects.delete(key);
  }
};

// Cleanup all effects on page unload
window.addEventListener('beforeunload', () => {
  effects.forEach(dispose => dispose());
  effects.clear();
});
```

## Browser Support

- **Modern Browsers**: Full support (Chrome 88+, Firefox 94+, Safari 14+)
- **Internet Explorer**: Not supported (uses modern JavaScript features)
- **Mobile**: Full support with touch event handling

## Performance

- **Bundle Size**: ~15KB minified and gzipped
- **Tree Shaking**: Import only used effects
- **Runtime**: Efficient RAF-based animations
- **Memory**: Automatic cleanup prevents memory leaks

## Accessibility

All effects respect user preferences:

```css
/* Effects are disabled when user prefers reduced motion */
@media (prefers-reduced-motion: reduce) {
  /* Effects automatically adapt or disable */
}
```

## Migration Guide

### From Custom Animation Libraries
```typescript
// Before (custom solution)
const myRipple = (element) => {
  // Custom ripple implementation...
};

// After (CASOON Effects)
import { ripple } from '@casoon/effects';
const dispose = ripple(element, options);
```

### Version Updates
Effects maintain backward compatibility within major versions. See [CHANGELOG.md](./CHANGELOG.md) for breaking changes.

## Contributing

See the main [CASOON Atlas README](../../README.md) for contribution guidelines.

## License

MIT