/**
 * Theme Transition Effects
 *
 * Smooth dark/light mode transitions:
 * - Circular reveal from toggle button
 * - Fade transition
 * - Slide transition
 * - Cross-fade with View Transitions API
 *
 * @module
 */

import { shouldReduceMotion } from '../utils/accessibility';
import { resolveElement } from '../utils/element';

// ============================================================================
// Types
// ============================================================================

/** Theme transition effect type */
export type ThemeTransitionEffect = 'circle' | 'fade' | 'slide-up' | 'slide-down' | 'blur' | 'none';

/** Theme value */
export type Theme = 'light' | 'dark' | string;

/** Theme transition options */
export interface ThemeTransitionOptions {
  /** Transition effect (default: 'circle') */
  effect?: ThemeTransitionEffect;
  /** Duration in ms (default: 500) */
  duration?: number;
  /** Easing function (default: 'ease-out') */
  easing?: string;
  /** Origin element for circle effect */
  origin?: HTMLElement | { x: number; y: number };
  /** Attribute to update (default: 'data-theme') */
  attribute?: string;
  /** Target element (default: document.documentElement) */
  target?: HTMLElement;
  /** CSS class prefix for themes (default: none) */
  classPrefix?: string;
  /** Store preference in localStorage */
  persist?: boolean;
  /** localStorage key (default: 'theme') */
  storageKey?: string;
  /** Callback when theme changes */
  onChange?: (theme: Theme) => void;
}

/** Theme controller */
export interface ThemeController {
  /** Get current theme */
  getTheme: () => Theme;
  /** Set theme with transition */
  setTheme: (theme: Theme) => Promise<void>;
  /** Toggle between light/dark */
  toggle: () => Promise<void>;
  /** Check if dark mode */
  isDark: () => boolean;
  /** Get system preference */
  getSystemPreference: () => 'light' | 'dark';
  /** Match system preference */
  matchSystem: () => Promise<void>;
  /** Destroy controller */
  destroy: () => void;
}

// ============================================================================
// Core Implementation
// ============================================================================

/**
 * Create a theme transition controller
 *
 * @example
 * ```typescript
 * // Basic usage
 * const theme = createThemeTransition({
 *   effect: 'circle',
 *   persist: true
 * });
 *
 * // Toggle on button click
 * button.addEventListener('click', () => theme.toggle());
 *
 * // Circular reveal from button
 * const theme = createThemeTransition({
 *   effect: 'circle',
 *   origin: themeButton
 * });
 *
 * // With callback
 * const theme = createThemeTransition({
 *   onChange: (newTheme) => {
 *     console.log('Theme changed to:', newTheme);
 *   }
 * });
 * ```
 */
export function createThemeTransition(options: ThemeTransitionOptions = {}): ThemeController {
  if (typeof document === 'undefined') {
    return {
      getTheme: () => 'light',
      setTheme: async () => {},
      toggle: async () => {},
      isDark: () => false,
      getSystemPreference: () => 'light',
      matchSystem: async () => {},
      destroy: () => {},
    };
  }

  const {
    effect = 'circle',
    duration = 500,
    easing = 'ease-out',
    origin,
    attribute = 'data-theme',
    target = document.documentElement,
    classPrefix,
    persist = false,
    storageKey = 'theme',
    onChange,
  } = options;

  let currentTheme: Theme = 'light';

  // Initialize from storage or attribute
  if (persist) {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      currentTheme = stored;
    }
  } else {
    currentTheme = target.getAttribute(attribute) || 'light';
  }

  // Apply initial theme
  applyTheme(currentTheme, false);

  function getOriginPoint(): { x: number; y: number } {
    if (!origin) {
      return { x: window.innerWidth - 40, y: 40 }; // Top-right default
    }

    if ('x' in origin && 'y' in origin) {
      return origin;
    }

    const rect = origin.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  }

  async function applyTheme(theme: Theme, animate = true): Promise<void> {
    const previousTheme = currentTheme;
    currentTheme = theme;

    // Skip animation if reduced motion or no animation requested
    if (!animate || shouldReduceMotion() || effect === 'none') {
      updateDOM(theme, previousTheme);
      if (persist) localStorage.setItem(storageKey, theme);
      onChange?.(theme);
      return;
    }

    // Check for View Transitions API support
    const supportsViewTransitions =
      'startViewTransition' in document &&
      typeof (document as unknown as { startViewTransition: unknown }).startViewTransition ===
        'function';

    if (supportsViewTransitions && effect !== 'circle') {
      await viewTransitionEffect(theme, previousTheme);
    } else {
      await customEffect(theme, previousTheme);
    }

    if (persist) localStorage.setItem(storageKey, theme);
    onChange?.(theme);
  }

  function updateDOM(theme: Theme, previousTheme: Theme): void {
    target.setAttribute(attribute, theme);

    if (classPrefix) {
      target.classList.remove(`${classPrefix}${previousTheme}`);
      target.classList.add(`${classPrefix}${theme}`);
    }
  }

  async function viewTransitionEffect(theme: Theme, previousTheme: Theme): Promise<void> {
    const transition = (
      document as Document & {
        startViewTransition: (cb: () => void) => {
          ready: Promise<void>;
          finished: Promise<void>;
        };
      }
    ).startViewTransition(() => {
      updateDOM(theme, previousTheme);
    });

    // Apply custom animation based on effect
    transition.ready.then(() => {
      let animation: Keyframe[];

      switch (effect) {
        case 'fade':
          animation = [{ opacity: 0 }, { opacity: 1 }];
          break;
        case 'slide-up':
          animation = [{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }];
          break;
        case 'slide-down':
          animation = [{ transform: 'translateY(-100%)' }, { transform: 'translateY(0)' }];
          break;
        case 'blur':
          animation = [
            { filter: 'blur(20px)', opacity: 0 },
            { filter: 'blur(0)', opacity: 1 },
          ];
          break;
        default:
          return;
      }

      document.documentElement.animate(animation, {
        duration,
        easing,
        pseudoElement: '::view-transition-new(root)',
      });
    });

    await transition.finished;
  }

  async function customEffect(theme: Theme, previousTheme: Theme): Promise<void> {
    if (effect === 'circle') {
      await circleRevealEffect(theme, previousTheme);
    } else {
      await overlayEffect(theme, previousTheme);
    }
  }

  async function circleRevealEffect(theme: Theme, previousTheme: Theme): Promise<void> {
    const { x, y } = getOriginPoint();

    // Calculate max radius to cover entire screen
    const maxRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    // Create overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 99999;
      pointer-events: none;
      background: ${theme === 'dark' ? '#000' : '#fff'};
      clip-path: circle(0px at ${x}px ${y}px);
    `;
    document.body.appendChild(overlay);

    // Start animation
    const animation = overlay.animate(
      [
        { clipPath: `circle(0px at ${x}px ${y}px)` },
        { clipPath: `circle(${maxRadius}px at ${x}px ${y}px)` },
      ],
      {
        duration,
        easing,
        fill: 'forwards',
      }
    );

    // Update DOM at midpoint
    setTimeout(() => {
      updateDOM(theme, previousTheme);
    }, duration * 0.4);

    await animation.finished;
    overlay.remove();
  }

  async function overlayEffect(theme: Theme, previousTheme: Theme): Promise<void> {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 99999;
      pointer-events: none;
      background: ${theme === 'dark' ? '#000' : '#fff'};
      opacity: 0;
    `;
    document.body.appendChild(overlay);

    // Fade in
    await overlay.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: duration / 2,
      easing,
      fill: 'forwards',
    }).finished;

    // Update DOM
    updateDOM(theme, previousTheme);

    // Fade out
    await overlay.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: duration / 2,
      easing,
      fill: 'forwards',
    }).finished;

    overlay.remove();
  }

  function getSystemPreference(): 'light' | 'dark' {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  // Listen for system preference changes
  let mediaQuery: MediaQueryList | null = null;
  const handleSystemChange = (e: MediaQueryListEvent) => {
    if (!persist || !localStorage.getItem(storageKey)) {
      applyTheme(e.matches ? 'dark' : 'light');
    }
  };

  if (typeof window !== 'undefined') {
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', handleSystemChange);
  }

  return {
    getTheme(): Theme {
      return currentTheme;
    },

    async setTheme(theme: Theme): Promise<void> {
      if (theme === currentTheme) return;
      await applyTheme(theme);
    },

    async toggle(): Promise<void> {
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      await applyTheme(newTheme);
    },

    isDark(): boolean {
      return currentTheme === 'dark';
    },

    getSystemPreference,

    async matchSystem(): Promise<void> {
      await applyTheme(getSystemPreference());
    },

    destroy(): void {
      if (mediaQuery) {
        mediaQuery.removeEventListener('change', handleSystemChange);
      }
    },
  };
}

// ============================================================================
// Convenience: One-shot Theme Transition
// ============================================================================

/**
 * Perform a one-shot theme transition
 *
 * @example
 * ```typescript
 * // Simple toggle with circle reveal
 * await themeTransition('dark', {
 *   effect: 'circle',
 *   origin: toggleButton
 * });
 * ```
 */
export async function themeTransition(
  theme: Theme,
  options: ThemeTransitionOptions = {}
): Promise<void> {
  const controller = createThemeTransition(options);
  await controller.setTheme(theme);
  controller.destroy();
}

// ============================================================================
// Theme Toggle Button
// ============================================================================

export interface ThemeToggleOptions extends ThemeTransitionOptions {
  /** Button element or selector */
  button: HTMLElement | string;
  /** Light mode icon (HTML string) */
  lightIcon?: string;
  /** Dark mode icon (HTML string) */
  darkIcon?: string;
}

/**
 * Create a theme toggle button
 *
 * @example
 * ```typescript
 * const toggle = createThemeToggle({
 *   button: '#theme-toggle',
 *   effect: 'circle',
 *   lightIcon: '☀️',
 *   darkIcon: '🌙',
 *   persist: true
 * });
 * ```
 */
export function createThemeToggle(
  options: ThemeToggleOptions
): ThemeController & { element: HTMLElement | null } {
  const button = resolveElement(options.button as string | HTMLElement);

  const controller = createThemeTransition({
    ...options,
    origin: button || undefined,
  });

  const lightIcon = options.lightIcon || '☀️';
  const darkIcon = options.darkIcon || '🌙';

  function updateIcon(): void {
    if (!button) return;
    button.innerHTML = controller.isDark() ? lightIcon : darkIcon;
    button.setAttribute(
      'aria-label',
      controller.isDark() ? 'Switch to light mode' : 'Switch to dark mode'
    );
  }

  // Initial icon
  updateIcon();

  // Click handler
  const handleClick = async () => {
    await controller.toggle();
    updateIcon();
  };

  button?.addEventListener('click', handleClick);

  return {
    ...controller,
    element: button,
    destroy(): void {
      button?.removeEventListener('click', handleClick);
      controller.destroy();
    },
  };
}
