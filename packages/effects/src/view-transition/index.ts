/**
 * View Transitions API Utilities
 *
 * Modern page/state transitions using the View Transitions API:
 * - Cross-fade between states
 * - Shared element transitions (morph)
 * - Circular/directional reveals
 * - Fallback for unsupported browsers
 *
 * @module
 */

import { shouldReduceMotion } from '../utils/accessibility';
import { resolveElement } from '../utils/element';

// ============================================================================
// Types
// ============================================================================

/** View transition options */
export interface ViewTransitionOptions {
  /** Transition duration in ms (CSS fallback) */
  duration?: number;
  /** Easing function */
  easing?: string;
  /** Skip if user prefers reduced motion */
  respectReducedMotion?: boolean;
  /** Fallback for unsupported browsers */
  fallback?: 'fade' | 'none' | 'instant';
}

/** Shared element transition options */
export interface SharedTransitionOptions extends ViewTransitionOptions {
  /** Unique name for the shared element */
  name: string;
}

/** Reveal transition options */
export interface RevealTransitionOptions extends ViewTransitionOptions {
  /** Reveal origin point */
  origin?: { x: number; y: number } | HTMLElement;
  /** Reveal shape */
  shape?: 'circle' | 'rectangle';
}

/** View transition result */
export interface ViewTransitionResult {
  /** Promise that resolves when transition is ready */
  ready: Promise<void>;
  /** Promise that resolves when transition is finished */
  finished: Promise<void>;
  /** Skip the transition animation */
  skipTransition: () => void;
}

// ============================================================================
// Feature Detection
// ============================================================================

/** Check if View Transitions API is supported */
export function supportsViewTransitions(): boolean {
  return typeof document !== 'undefined' && 'startViewTransition' in document;
}

// ============================================================================
// Core View Transition
// ============================================================================

/**
 * Start a view transition with the provided update callback
 *
 * @example
 * ```typescript
 * // Simple state change with transition
 * await startViewTransition(() => {
 *   document.querySelector('.content').innerHTML = newContent;
 * });
 *
 * // With options
 * await startViewTransition(
 *   () => updateDOM(),
 *   { duration: 300, easing: 'ease-out' }
 * );
 * ```
 */
export function startViewTransition(
  updateCallback: () => void | Promise<void>,
  options: ViewTransitionOptions = {}
): ViewTransitionResult {
  const {
    duration = 250,
    easing = 'ease-in-out',
    respectReducedMotion = true,
    fallback = 'fade',
  } = options;

  // Reduced motion - instant update
  if (respectReducedMotion && shouldReduceMotion()) {
    const result = Promise.resolve(updateCallback()).then(() => {});
    return {
      ready: result,
      finished: result,
      skipTransition: () => {},
    };
  }

  // Native View Transitions API
  if (supportsViewTransitions()) {
    // Set CSS custom properties for duration/easing
    document.documentElement.style.setProperty('--view-transition-duration', `${duration}ms`);
    document.documentElement.style.setProperty('--view-transition-easing', easing);

    const transition = (
      document as Document & {
        startViewTransition: (cb: () => void | Promise<void>) => {
          ready: Promise<void>;
          finished: Promise<void>;
          skipTransition: () => void;
        };
      }
    ).startViewTransition(updateCallback);

    return {
      ready: transition.ready,
      finished: transition.finished,
      skipTransition: () => transition.skipTransition(),
    };
  }

  // Fallback for unsupported browsers
  if (fallback === 'none' || fallback === 'instant') {
    const result = Promise.resolve(updateCallback()).then(() => {});
    return {
      ready: result,
      finished: result,
      skipTransition: () => {},
    };
  }

  // Fade fallback
  return fadeTransitionFallback(updateCallback, duration, easing);
}

/** Fade fallback for browsers without View Transitions */
function fadeTransitionFallback(
  updateCallback: () => void | Promise<void>,
  duration: number,
  easing: string
): ViewTransitionResult {
  const root = document.documentElement;
  let skipRequested = false;

  const ready = new Promise<void>((resolve) => {
    root.style.transition = `opacity ${duration / 2}ms ${easing}`;
    root.style.opacity = '0';

    setTimeout(() => {
      resolve();
    }, duration / 2);
  });

  const finished = ready.then(async () => {
    if (skipRequested) {
      root.style.transition = '';
      root.style.opacity = '';
      await updateCallback();
      return;
    }

    await updateCallback();

    root.style.opacity = '1';
    await new Promise<void>((resolve) => setTimeout(resolve, duration / 2));
    root.style.transition = '';
    root.style.opacity = '';
  });

  return {
    ready,
    finished,
    skipTransition: () => {
      skipRequested = true;
    },
  };
}

// ============================================================================
// Shared Element Transitions
// ============================================================================

/**
 * Mark an element for shared element transition
 *
 * @example
 * ```typescript
 * // Mark thumbnail for transition
 * markSharedElement(thumbnail, { name: 'hero-image' });
 *
 * // Later, mark the full image with same name
 * markSharedElement(fullImage, { name: 'hero-image' });
 *
 * // Transition will morph between them
 * await startViewTransition(() => {
 *   thumbnail.hidden = true;
 *   fullImage.hidden = false;
 * });
 * ```
 */
export function markSharedElement(
  target: Element | string,
  options: SharedTransitionOptions
): () => void {
  const element = resolveElement(target as string | HTMLElement);
  if (!element) return () => {};

  const { name } = options;

  // Set view-transition-name CSS property
  (element as HTMLElement).style.viewTransitionName = name;

  // Return cleanup function
  return () => {
    (element as HTMLElement).style.viewTransitionName = '';
  };
}

/**
 * Create a shared element transition between two elements
 *
 * @example
 * ```typescript
 * // Morph from card to modal
 * await sharedElementTransition(card, modal, {
 *   name: 'card-expand',
 *   duration: 400
 * });
 * ```
 */
export async function sharedElementTransition(
  from: Element | string,
  to: Element | string,
  options: SharedTransitionOptions
): Promise<void> {
  const fromEl = resolveElement(from as string | HTMLElement);
  const toEl = resolveElement(to as string | HTMLElement);

  if (!fromEl || !toEl) return;

  const { name, duration = 300, easing = 'ease-in-out' } = options;

  // Mark both elements with same transition name
  const cleanupFrom = markSharedElement(fromEl, { name, duration, easing });

  const transition = startViewTransition(
    () => {
      // Hide source, show target
      (fromEl as HTMLElement).style.display = 'none';
      (toEl as HTMLElement).style.display = '';

      // Transfer transition name to target
      cleanupFrom();
      (toEl as HTMLElement).style.viewTransitionName = name;
    },
    { duration, easing }
  );

  await transition.finished;

  // Cleanup
  (toEl as HTMLElement).style.viewTransitionName = '';
}

// ============================================================================
// Reveal Transitions
// ============================================================================

/**
 * Create a circular reveal transition
 *
 * @example
 * ```typescript
 * // Reveal from button click
 * button.addEventListener('click', async (e) => {
 *   await circularReveal(() => {
 *     showNewContent();
 *   }, {
 *     origin: { x: e.clientX, y: e.clientY }
 *   });
 * });
 *
 * // Reveal from element center
 * await circularReveal(() => changeTheme(), {
 *   origin: themeToggle,
 *   duration: 500
 * });
 * ```
 */
export async function circularReveal(
  updateCallback: () => void | Promise<void>,
  options: RevealTransitionOptions = {}
): Promise<void> {
  const { origin, duration = 400, easing = 'ease-out', respectReducedMotion = true } = options;

  if (respectReducedMotion && shouldReduceMotion()) {
    await updateCallback();
    return;
  }

  // Calculate origin point
  let x = window.innerWidth / 2;
  let y = window.innerHeight / 2;

  if (origin) {
    if (origin instanceof HTMLElement) {
      const rect = origin.getBoundingClientRect();
      x = rect.left + rect.width / 2;
      y = rect.top + rect.height / 2;
    } else {
      x = origin.x;
      y = origin.y;
    }
  }

  // Calculate max radius needed to cover screen
  const maxRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y)
  );

  if (supportsViewTransitions()) {
    // Use View Transitions with custom animation
    const transition = startViewTransition(updateCallback, { duration, easing });

    // Apply circular clip-path animation
    transition.ready.then(() => {
      const root = document.documentElement;
      root.animate(
        [
          { clipPath: `circle(0px at ${x}px ${y}px)` },
          { clipPath: `circle(${maxRadius}px at ${x}px ${y}px)` },
        ],
        {
          duration,
          easing,
          pseudoElement: '::view-transition-new(root)',
        }
      );
    });

    await transition.finished;
  } else {
    // CSS fallback
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 999999;
      background: inherit;
      clip-path: circle(0px at ${x}px ${y}px);
    `;
    document.body.appendChild(overlay);

    await updateCallback();

    overlay.animate(
      [
        { clipPath: `circle(0px at ${x}px ${y}px)` },
        { clipPath: `circle(${maxRadius}px at ${x}px ${y}px)` },
      ],
      { duration, easing, fill: 'forwards' }
    );

    await new Promise((resolve) => setTimeout(resolve, duration));
    overlay.remove();
  }
}

/**
 * Create a directional slide transition
 *
 * @example
 * ```typescript
 * // Slide in from right
 * await slideTransition(() => showNextPage(), {
 *   direction: 'left',
 *   duration: 300
 * });
 * ```
 */
export async function slideTransition(
  updateCallback: () => void | Promise<void>,
  options: ViewTransitionOptions & { direction?: 'left' | 'right' | 'up' | 'down' } = {}
): Promise<void> {
  const {
    direction = 'left',
    duration = 300,
    easing = 'ease-out',
    respectReducedMotion = true,
  } = options;

  if (respectReducedMotion && shouldReduceMotion()) {
    await updateCallback();
    return;
  }

  const transforms: Record<string, { old: string; new: string }> = {
    left: { old: 'translateX(0)', new: 'translateX(100%)' },
    right: { old: 'translateX(0)', new: 'translateX(-100%)' },
    up: { old: 'translateY(0)', new: 'translateY(100%)' },
    down: { old: 'translateY(0)', new: 'translateY(-100%)' },
  };

  const { old: oldTransform, new: newTransformStart } = transforms[direction];
  const newTransformEnd = 'translateX(0) translateY(0)';

  if (supportsViewTransitions()) {
    const transition = startViewTransition(updateCallback, { duration, easing });

    transition.ready.then(() => {
      // Animate old content out
      document.documentElement.animate(
        [{ transform: oldTransform }, { transform: newTransformStart }],
        {
          duration,
          easing,
          pseudoElement: '::view-transition-old(root)',
        }
      );

      // Animate new content in
      document.documentElement.animate(
        [{ transform: newTransformStart.replace('100%', '-100%') }, { transform: newTransformEnd }],
        {
          duration,
          easing,
          pseudoElement: '::view-transition-new(root)',
        }
      );
    });

    await transition.finished;
  } else {
    // Simple fallback
    const transition = startViewTransition(updateCallback, {
      duration,
      easing,
      fallback: 'fade',
    });
    await transition.finished;
  }
}

// ============================================================================
// CSS Custom Properties for View Transitions
// ============================================================================

/**
 * Inject base CSS for view transitions
 *
 * Call this once at app initialization for smoother transitions.
 */
export function injectViewTransitionStyles(): void {
  if (typeof document === 'undefined') return;

  const styleId = 'atlas-view-transition-styles';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    /* View Transition Defaults */
    ::view-transition-old(root),
    ::view-transition-new(root) {
      animation-duration: var(--view-transition-duration, 250ms);
      animation-timing-function: var(--view-transition-easing, ease-in-out);
    }

    /* Disable transitions for reduced motion */
    @media (prefers-reduced-motion: reduce) {
      ::view-transition-group(*),
      ::view-transition-old(*),
      ::view-transition-new(*) {
        animation: none !important;
      }
    }
  `;
  document.head.appendChild(style);
}
