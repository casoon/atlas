# Theme Toggle Implementation Guide

Atlas Styles supports both automatic (OS preference) and manual theme switching using the modern `data-theme` attribute.

## How It Works

### 1. Default Behavior (OS Preference)
When no `data-theme` attribute is set, the theme follows the user's OS preference:
- Light OS → Light theme
- Dark OS → Dark theme

### 2. Manual Override
Set `data-theme="light"` or `data-theme="dark"` on the `<html>` element:
```html
<html data-theme="light">
  <!-- Forces light theme -->
</html>

<html data-theme="dark">
  <!-- Forces dark theme -->
</html>

<html>
  <!-- Follows OS preference -->
</html>
```

---

## JavaScript Implementation

### Vanilla JavaScript

```javascript
/**
 * Atlas Styles Theme Manager
 * Handles theme switching with localStorage persistence
 */
class AtlasTheme {
  constructor() {
    this.storageKey = 'atlas-theme';
    this.theme = this.getStoredTheme() || 'auto';
    this.applyTheme();
    this.watchSystemTheme();
  }

  /**
   * Get theme from localStorage
   * @returns {'auto' | 'light' | 'dark'}
   */
  getStoredTheme() {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.storageKey);
  }

  /**
   * Store theme preference
   * @param {'auto' | 'light' | 'dark'} theme
   */
  setStoredTheme(theme) {
    localStorage.setItem(this.storageKey, theme);
  }

  /**
   * Apply theme to document
   */
  applyTheme() {
    const root = document.documentElement;

    if (this.theme === 'auto') {
      // Remove data-theme to let OS preference take over
      root.removeAttribute('data-theme');
    } else {
      // Set explicit theme
      root.setAttribute('data-theme', this.theme);
    }

    // Dispatch custom event for listeners
    window.dispatchEvent(
      new CustomEvent('atlas-theme-change', {
        detail: { theme: this.theme, effective: this.getEffectiveTheme() },
      })
    );
  }

  /**
   * Set theme preference
   * @param {'auto' | 'light' | 'dark'} theme
   */
  setTheme(theme) {
    if (!['auto', 'light', 'dark'].includes(theme)) {
      console.warn(`Invalid theme: ${theme}. Use 'auto', 'light', or 'dark'.`);
      return;
    }

    this.theme = theme;
    this.setStoredTheme(theme);
    this.applyTheme();
  }

  /**
   * Toggle between light and dark
   * If currently 'auto', switches to opposite of current effective theme
   */
  toggleTheme() {
    const isDark =
      this.theme === 'dark' ||
      (this.theme === 'auto' && this.getSystemTheme() === 'dark');

    this.setTheme(isDark ? 'light' : 'dark');
  }

  /**
   * Get current system preference
   * @returns {'light' | 'dark'}
   */
  getSystemTheme() {
    if (typeof window === 'undefined') return 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }

  /**
   * Get effective theme (resolving 'auto')
   * @returns {'light' | 'dark'}
   */
  getEffectiveTheme() {
    return this.theme === 'auto' ? this.getSystemTheme() : this.theme;
  }

  /**
   * Watch for system theme changes
   */
  watchSystemTheme() {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    // Modern browsers
    mediaQuery.addEventListener('change', (e) => {
      if (this.theme === 'auto') {
        this.applyTheme();
      }
    });
  }
}

// Global instance
const atlasTheme = new AtlasTheme();

// Export for module usage
export { AtlasTheme, atlasTheme };
```

### Usage Example (Vanilla JS)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <link rel="stylesheet" href="atlas-styles.css" />
  <script type="module">
    import { atlasTheme } from './atlas-theme.js';

    // Theme toggle button
    document.getElementById('theme-toggle')?.addEventListener('click', () => {
      atlasTheme.toggleTheme();
      updateButton();
    });

    // Update button text
    function updateButton() {
      const btn = document.getElementById('theme-toggle');
      const effective = atlasTheme.getEffectiveTheme();
      btn.textContent = effective === 'dark' ? '☀️ Light' : '🌙 Dark';
    }

    // Listen for theme changes
    window.addEventListener('atlas-theme-change', (e) => {
      console.log('Theme changed:', e.detail);
    });

    // Initial state
    updateButton();
  </script>
</head>
<body>
  <button id="theme-toggle">Toggle Theme</button>

  <!-- Theme selector dropdown -->
  <select onchange="atlasTheme.setTheme(this.value)">
    <option value="auto">Auto (System)</option>
    <option value="light">Light</option>
    <option value="dark">Dark</option>
  </select>
</body>
</html>
```

---

## React Implementation

### Custom Hook: `useAtlasTheme`

```typescript
import { useEffect, useState, useCallback } from 'react';

type Theme = 'auto' | 'light' | 'dark';
type EffectiveTheme = 'light' | 'dark';

interface UseAtlasTheme {
  /** Current theme setting ('auto', 'light', or 'dark') */
  theme: Theme;
  /** Effective theme after resolving 'auto' */
  effectiveTheme: EffectiveTheme;
  /** Set theme preference */
  setTheme: (theme: Theme) => void;
  /** Toggle between light and dark */
  toggleTheme: () => void;
}

const STORAGE_KEY = 'atlas-theme';

function getStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'auto' || stored === 'light' || stored === 'dark') {
    return stored;
  }
  return null;
}

function getSystemTheme(): EffectiveTheme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function resolveTheme(theme: Theme): EffectiveTheme {
  return theme === 'auto' ? getSystemTheme() : theme;
}

export function useAtlasTheme(): UseAtlasTheme {
  const [theme, setThemeState] = useState<Theme>(() => {
    return getStoredTheme() || 'auto';
  });

  const [systemTheme, setSystemTheme] = useState<EffectiveTheme>(() => {
    return getSystemTheme();
  });

  const effectiveTheme = theme === 'auto' ? systemTheme : theme;

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;

    if (theme === 'auto') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', theme);
    }

    localStorage.setItem(STORAGE_KEY, theme);

    // Dispatch event
    window.dispatchEvent(
      new CustomEvent('atlas-theme-change', {
        detail: { theme, effective: effectiveTheme },
      })
    );
  }, [theme, effectiveTheme]);

  // Watch for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handler = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const isDark = resolveTheme(current) === 'dark';
      return isDark ? 'light' : 'dark';
    });
  }, []);

  return { theme, effectiveTheme, setTheme, toggleTheme };
}
```

### React Component Examples

```tsx
// Simple toggle button
function ThemeToggle() {
  const { effectiveTheme, toggleTheme } = useAtlasTheme();

  return (
    <button onClick={toggleTheme}>
      {effectiveTheme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}

// Theme selector dropdown
function ThemeSelector() {
  const { theme, setTheme } = useAtlasTheme();

  return (
    <select value={theme} onChange={(e) => setTheme(e.target.value as Theme)}>
      <option value="auto">System Default</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  );
}

// Advanced theme switcher with icons
function ThemeSwitcher() {
  const { theme, effectiveTheme, setTheme } = useAtlasTheme();

  const options = [
    { value: 'auto', label: 'System', icon: '💻' },
    { value: 'light', label: 'Light', icon: '☀️' },
    { value: 'dark', label: 'Dark', icon: '🌙' },
  ] as const;

  return (
    <div className="theme-switcher">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => setTheme(option.value)}
          className={theme === option.value ? 'active' : ''}
          aria-label={`Switch to ${option.label} theme`}
        >
          {option.icon}
          <span>{option.label}</span>
        </button>
      ))}
      <span className="current">Current: {effectiveTheme}</span>
    </div>
  );
}

// Usage in your app
function App() {
  return (
    <div className="app">
      <header>
        <ThemeToggle />
      </header>
      <main>
        <h1>Atlas Styles Demo</h1>
        <ThemeSwitcher />
      </main>
    </div>
  );
}
```

---

## Vue 3 Implementation

### Composable: `useAtlasTheme`

```typescript
import { ref, computed, watch, onMounted } from 'vue';

type Theme = 'auto' | 'light' | 'dark';
type EffectiveTheme = 'light' | 'dark';

const STORAGE_KEY = 'atlas-theme';

function getStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'auto' || stored === 'light' || stored === 'dark') {
    return stored;
  }
  return null;
}

function getSystemTheme(): EffectiveTheme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

export function useAtlasTheme() {
  const theme = ref<Theme>(getStoredTheme() || 'auto');
  const systemTheme = ref<EffectiveTheme>(getSystemTheme());

  const effectiveTheme = computed<EffectiveTheme>(() => {
    return theme.value === 'auto' ? systemTheme.value : theme.value;
  });

  // Apply theme to document
  function applyTheme() {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;

    if (theme.value === 'auto') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', theme.value);
    }

    localStorage.setItem(STORAGE_KEY, theme.value);

    // Dispatch event
    window.dispatchEvent(
      new CustomEvent('atlas-theme-change', {
        detail: { theme: theme.value, effective: effectiveTheme.value },
      })
    );
  }

  // Set theme
  function setTheme(newTheme: Theme) {
    theme.value = newTheme;
  }

  // Toggle theme
  function toggleTheme() {
    const isDark = effectiveTheme.value === 'dark';
    theme.value = isDark ? 'light' : 'dark';
  }

  // Watch for theme changes
  watch(theme, applyTheme, { immediate: true });

  // Watch for system theme changes
  onMounted(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handler = (e: MediaQueryListEvent) => {
      systemTheme.value = e.matches ? 'dark' : 'light';
    };

    mediaQuery.addEventListener('change', handler);

    return () => mediaQuery.removeEventListener('change', handler);
  });

  return {
    theme,
    effectiveTheme,
    setTheme,
    toggleTheme,
  };
}
```

### Vue Component Examples

```vue
<!-- ThemeToggle.vue -->
<script setup lang="ts">
import { useAtlasTheme } from './useAtlasTheme';

const { effectiveTheme, toggleTheme } = useAtlasTheme();
</script>

<template>
  <button @click="toggleTheme" class="theme-toggle">
    {{ effectiveTheme === 'dark' ? '☀️' : '🌙' }}
  </button>
</template>

<!-- ThemeSelector.vue -->
<script setup lang="ts">
import { useAtlasTheme } from './useAtlasTheme';

const { theme, setTheme } = useAtlasTheme();
</script>

<template>
  <select :value="theme" @change="setTheme($event.target.value)">
    <option value="auto">System Default</option>
    <option value="light">Light</option>
    <option value="dark">Dark</option>
  </select>
</template>

<!-- ThemeSwitcher.vue -->
<script setup lang="ts">
import { useAtlasTheme } from './useAtlasTheme';

const { theme, effectiveTheme, setTheme } = useAtlasTheme();

const options = [
  { value: 'auto', label: 'System', icon: '💻' },
  { value: 'light', label: 'Light', icon: '☀️' },
  { value: 'dark', label: 'Dark', icon: '🌙' },
] as const;
</script>

<template>
  <div class="theme-switcher">
    <button
      v-for="option in options"
      :key="option.value"
      @click="setTheme(option.value)"
      :class="{ active: theme === option.value }"
      :aria-label="`Switch to ${option.label} theme`"
    >
      <span class="icon">{{ option.icon }}</span>
      <span class="label">{{ option.label }}</span>
    </button>
    <span class="current">Current: {{ effectiveTheme }}</span>
  </div>
</template>
```

---

## Next.js Integration (with next-themes)

Atlas Styles works seamlessly with `next-themes`:

```bash
npm install next-themes
```

```tsx
// app/providers.tsx
'use client';

import { ThemeProvider } from 'next-themes';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="data-theme"
      defaultTheme="auto"
      enableSystem
      storageKey="atlas-theme"
    >
      {children}
    </ThemeProvider>
  );
}

// app/layout.tsx
import { Providers } from './providers';
import 'atlas-styles/dist/styles.css';

export default function RootLayout({ children }) {
  return (
    <html suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

// components/ThemeToggle.tsx
'use client';

import { useTheme } from 'next-themes';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      Toggle Theme
    </button>
  );
}
```

---

## SSR Considerations

### Preventing Flash of Unstyled Content (FOUC)

Add this script BEFORE your CSS loads:

```html
<script>
  (function() {
    const theme = localStorage.getItem('atlas-theme') || 'auto';
    if (theme !== 'auto') {
      document.documentElement.setAttribute('data-theme', theme);
    }
  })();
</script>
```

### Next.js Example

```tsx
// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const theme = localStorage.getItem('atlas-theme') || 'auto';
                if (theme !== 'auto') {
                  document.documentElement.setAttribute('data-theme', theme);
                }
              })();
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

---

## API Reference

### Theme Values

| Value | Description |
|-------|-------------|
| `'auto'` | Follow OS preference (default) |
| `'light'` | Force light theme |
| `'dark'` | Force dark theme |

### Methods

#### `setTheme(theme: Theme)`
Set theme preference and persist to localStorage.

#### `toggleTheme()`
Toggle between light and dark modes.

#### `getEffectiveTheme()`
Get current effective theme (resolves 'auto').

### Events

#### `atlas-theme-change`
Dispatched when theme changes.

```javascript
window.addEventListener('atlas-theme-change', (e) => {
  console.log('Theme:', e.detail.theme);
  console.log('Effective:', e.detail.effective);
});
```

---

## Browser Support

- Modern browsers with CSS Custom Properties support
- `prefers-color-scheme` media query support
- localStorage support

**Fallback:** If JavaScript is disabled, the theme defaults to the OS preference.

---

## Backwards Compatibility

The old class-based API (`.cs-theme-light`, `.cs-theme-dark`) is still supported:

```html
<!-- Still works -->
<html class="cs-theme-dark">
  ...
</html>
```

However, we recommend using the modern `data-theme` attribute for better framework integration.
