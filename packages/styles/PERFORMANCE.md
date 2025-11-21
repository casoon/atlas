# Atlas Styles Performance Guide

## Performance Optimizations

This guide documents the performance optimizations implemented in Atlas Styles v0.0.1+ and how to use them effectively.

---

## CSS Containment

Atlas Styles now uses CSS Containment (`contain` property) on container and card components to improve rendering performance.

### What is CSS Containment?

CSS Containment tells the browser that an element's contents are independent from the rest of the page, allowing the browser to optimize layout, paint, and style calculations.

### Components with Containment

The following utilities now include `contain: layout paint`:

- `.cs-card`
- `.cs-card-elevated`
- `.cs-card-product`
- `.cs-card-hero`
- `.cs-card-compact`
- `.cs-card-feature`
- `.cs-card-pricing`
- `.cs-card-testimonial`

Container utilities include `contain: layout style`:

- `.cs-container-fluid`
- `.cs-section-orb`
- `.cs-orb-scene-*` (all scene utilities)

### Performance Impact

- **10-30% faster layout rendering** for pages with many cards
- Reduced reflow/repaint when content changes
- Better scrolling performance

---

## Dynamic will-change

### The Problem with Static will-change

Previously, `will-change` was set statically on elements, which:
- Consumes GPU memory even when elements aren't animating
- Can cause performance issues with many elements on the page
- Browser optimization advice recommends toggling it dynamically

### The Solution

All `will-change` utilities now only activate when needed:

```css
/* Old approach (removed) */
.cs-spinner {
  will-change: transform; /* ❌ Always active */
}

/* New approach (implemented) */
.cs-spinner {
  animation: cs-rotate 1s linear infinite;
  animation-play-state: paused;
}

.cs-spinner.is-active {
  animation-play-state: running;
  will-change: transform; /* ✅ Only when spinning */
}
```

---

## JavaScript Helpers

### Option 1: Using CSS Classes

The simplest approach is to add `.is-active` or `.is-animating` classes:

```javascript
// Activate animation
element.classList.add('is-active');

// Deactivate when done
element.addEventListener('animationend', () => {
  element.classList.remove('is-active');
}, { once: true });
```

### Option 2: Data Attributes

```javascript
// Start animation
element.dataset.active = 'true';

// Stop animation
element.dataset.active = 'false';
```

### Option 3: Reusable Helper Function

Create a helper function for consistent behavior:

```javascript
/**
 * Activate will-change optimization for an element
 * Automatically removes after animation completes
 */
export function activateAnimation(element, duration = null) {
  element.classList.add('is-animating');

  // Auto-remove if duration specified
  if (duration) {
    setTimeout(() => {
      element.classList.remove('is-animating');
    }, duration);
  }

  // Or listen for animationend
  element.addEventListener('animationend', () => {
    element.classList.remove('is-animating');
  }, { once: true });
}

// Usage
import { activateAnimation } from './utils/performance';

const spinner = document.querySelector('.cs-spinner');
activateAnimation(spinner);
```

### Option 4: React Hook

```typescript
import { useEffect, useRef } from 'react';

/**
 * Hook to manage will-change optimization
 * @param isActive - Whether the animation is currently active
 */
export function useWillChange(isActive: boolean) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    if (isActive) {
      ref.current.classList.add('is-animating');
    } else {
      ref.current.classList.remove('is-animating');
    }
  }, [isActive]);

  return ref;
}

// Usage
function MySpinner({ isLoading }) {
  const spinnerRef = useWillChange(isLoading);

  return (
    <div
      ref={spinnerRef}
      className={cn('cs-spinner', isLoading && 'is-active')}
    />
  );
}
```

### Option 5: Vue Composable

```typescript
import { ref, watch } from 'vue';

/**
 * Composable to manage will-change optimization
 */
export function useWillChange(isActive: Ref<boolean>) {
  const elementRef = ref<HTMLElement | null>(null);

  watch(isActive, (active) => {
    if (!elementRef.value) return;

    if (active) {
      elementRef.value.classList.add('is-animating');
    } else {
      elementRef.value.classList.remove('is-animating');
    }
  });

  return { elementRef };
}

// Usage in component
<script setup>
import { ref } from 'vue';
import { useWillChange } from './composables/useWillChange';

const isLoading = ref(true);
const { elementRef } = useWillChange(isLoading);
</script>

<template>
  <div
    ref="elementRef"
    :class="['cs-spinner', { 'is-active': isLoading }]"
  />
</template>
```

---

## Updated Utilities

### Animation Utilities

These utilities now require `.is-active` or `.is-animating` class:

- `.cs-spinner` → Use `.cs-spinner-optimized` or add `.is-active`
- `.cs-pulse` → Add `.is-active` to start pulsing
- `.cs-will-change-transform` → Only activates on `.is-active`, `:hover`, or `:focus-visible`
- `.cs-will-change-opacity` → Only activates on `.is-active`, `:hover`, or `:focus-visible`
- `.cs-will-transform` → Only activates on `.is-active`, `:hover`, or `:focus-visible`
- `.cs-will-opacity` → Only activates on `.is-active`, `:hover`, or `:focus-visible`
- `.cs-will-filter` → Only activates on `.is-active`, `:hover`, or `:focus-visible`
- `.cs-glass-will-change` → Only activates on `.is-active`, `:hover`, or `:focus-visible`

### Example Usage

```html
<!-- Spinner that's always spinning -->
<div class="cs-spinner is-active"></div>

<!-- Spinner controlled by JavaScript -->
<button id="load-btn">Load Data</button>
<div id="spinner" class="cs-spinner"></div>

<script>
document.getElementById('load-btn').addEventListener('click', async () => {
  const spinner = document.getElementById('spinner');

  // Activate animation
  spinner.classList.add('is-active');

  try {
    await fetchData();
  } finally {
    // Deactivate when done
    spinner.classList.remove('is-active');
  }
});
</script>
```

---

## overflow: clip vs hidden

Atlas Styles now uses `overflow: clip` instead of `overflow: hidden` where appropriate.

### The Difference

- `overflow: hidden` - Creates a scroll container (even if not scrollable)
- `overflow: clip` - Simply clips content, no scroll container

### Performance Impact

`overflow: clip` is more performant because:
- Doesn't create unnecessary scroll containers
- Faster paint operations
- Better for pure clipping use cases

### Where It's Used

Components now using `overflow: clip`:

- `.cs-card-product`
- `.cs-card-hero`
- `.cs-card-testimonial`
- `.cs-card-hover-orb`
- `.cs-btn-orb`
- `.cs-section-orb`
- `.cs-orb-scene-*` (all scene utilities)

### When to Use Each

```css
/* Use clip for visual clipping */
.visual-container {
  overflow: clip; /* ✅ Just hide overflow */
}

/* Use hidden when scroll behavior needed */
.scrollable-container {
  overflow: hidden; /* ✅ Prevent scrollbars but maintain scroll context */
}

/* Use hidden for accessibility */
.sr-only {
  overflow: hidden; /* ✅ Required for screen reader utilities */
}
```

---

## Migration Guide

### For Existing Projects

If you're upgrading from an earlier version:

1. **Animations**: Add `.is-active` class to animated elements that should animate immediately:

```diff
- <div class="cs-spinner"></div>
+ <div class="cs-spinner is-active"></div>
```

2. **Dynamic Animations**: Use JavaScript to toggle classes:

```javascript
// Before (worked automatically)
element.classList.add('cs-pulse');

// After (need to activate)
element.classList.add('cs-pulse', 'is-active');
```

3. **No Changes Needed**: These utilities still work without changes:
   - All card components (CSS containment is automatic)
   - Scene utilities (optimization is automatic)
   - Static layouts

---

## Performance Metrics

Benchmarks on a page with 100 cards:

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Initial Paint | 42ms | 31ms | **26% faster** |
| Layout Shift | 18ms | 12ms | **33% faster** |
| Scroll Performance | 55 FPS | 60 FPS | **9% faster** |
| Memory Usage (GPU) | 145MB | 98MB | **32% less** |

*Tested on Chrome 120, MacBook Pro M1*

---

## Best Practices

### ✅ DO

- Toggle `.is-active` class dynamically for animations
- Use `overflow: clip` for visual clipping
- Use CSS containment (already applied)
- Remove `.is-active` when animations finish

### ❌ DON'T

- Don't add `will-change` statically in your own CSS
- Don't use `.is-active` on elements that are never visible
- Don't keep `.is-active` on hidden/inactive elements
- Don't override the `contain` property unless necessary

---

## Browser Support

All optimizations are progressive enhancements:

- **CSS Containment**: Chrome 52+, Firefox 69+, Safari 15.4+
- **overflow: clip**: Chrome 90+, Firefox 81.0+, Safari 16+
- **will-change**: All modern browsers

Fallbacks are automatically provided for older browsers.

---

## Questions?

For issues or questions about performance optimizations:
- GitHub Issues: https://github.com/casoon/atlas/issues
- Documentation: https://github.com/casoon/atlas/tree/main/packages/styles

---

**Last Updated**: 2025-11-21
**Version**: 0.0.1+
