/**
 * Animation System
 *
 * Provides unified animation utilities for components:
 * - CSS-based transitions with JS control
 * - Spring physics animations
 * - Enter/Exit state management
 * - Staggered animations for lists
 *
 * @module
 */

import { isBrowser } from './dom';

// ============================================================================
// Types
// ============================================================================

/** Easing function or preset name */
export type Easing =
  | 'linear'
  | 'ease'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | 'spring'
  | `cubic-bezier(${number}, ${number}, ${number}, ${number})`;

/** Animation direction */
export type AnimationDirection = 'in' | 'out' | 'both';

/** Transition state */
export type TransitionState = 'idle' | 'entering' | 'entered' | 'exiting' | 'exited';

/** Spring physics configuration */
export interface SpringConfig {
  /** Stiffness (default: 100) */
  stiffness?: number;
  /** Damping (default: 10) */
  damping?: number;
  /** Mass (default: 1) */
  mass?: number;
  /** Velocity (default: 0) */
  velocity?: number;
}

/** Transition options */
export interface TransitionOptions {
  /** Duration in ms (default: 200) */
  duration?: number;
  /** Easing function (default: 'ease-out') */
  easing?: Easing;
  /** Delay in ms (default: 0) */
  delay?: number;
  /** CSS properties to animate */
  properties?: string[];
  /** Spring config (overrides duration/easing) */
  spring?: SpringConfig;
  /** Callback when transition starts */
  onStart?: (state: TransitionState) => void;
  /** Callback when transition ends */
  onEnd?: (state: TransitionState) => void;
}

/** Preset animation types */
export type AnimationPreset =
  | 'fade'
  | 'slide-up'
  | 'slide-down'
  | 'slide-left'
  | 'slide-right'
  | 'scale'
  | 'scale-up'
  | 'scale-down'
  | 'flip-x'
  | 'flip-y'
  | 'rotate'
  | 'blur'
  | 'blur-fade';

/** Stagger options */
export interface StaggerOptions extends TransitionOptions {
  /** Delay between each item in ms (default: 50) */
  staggerDelay?: number;
  /** Start from 'first', 'last', 'center', or 'edges' */
  from?: 'first' | 'last' | 'center' | 'edges';
}

/** Transition controller */
export interface Transition {
  /** Current state */
  state: TransitionState;
  /** Trigger enter animation */
  enter: () => Promise<void>;
  /** Trigger exit animation */
  exit: () => Promise<void>;
  /** Toggle between enter/exit */
  toggle: () => Promise<void>;
  /** Cancel current animation */
  cancel: () => void;
  /** Clean up */
  destroy: () => void;
}

// ============================================================================
// Spring Physics
// ============================================================================

/** Spring animation frame data */
interface SpringFrame {
  value: number;
  velocity: number;
  done: boolean;
}

/**
 * Calculate spring animation frame
 */
function springStep(
  current: number,
  target: number,
  velocity: number,
  config: Required<SpringConfig>,
  deltaTime: number
): SpringFrame {
  const { stiffness, damping, mass } = config;

  // Spring force: F = -kx (Hooke's law)
  const springForce = -stiffness * (current - target);
  // Damping force: F = -cv
  const dampingForce = -damping * velocity;
  // Acceleration: a = F/m
  const acceleration = (springForce + dampingForce) / mass;

  // Update velocity and position
  const newVelocity = velocity + acceleration * deltaTime;
  const newValue = current + newVelocity * deltaTime;

  // Check if animation is done (close enough and slow enough)
  const done = Math.abs(target - newValue) < 0.001 && Math.abs(newVelocity) < 0.001;

  return {
    value: done ? target : newValue,
    velocity: done ? 0 : newVelocity,
    done,
  };
}

/**
 * Animate a value using spring physics
 */
export function animateSpring(
  from: number,
  to: number,
  config: SpringConfig = {},
  onUpdate: (value: number) => void,
  onComplete?: () => void
): () => void {
  if (!isBrowser()) {
    onUpdate(to);
    onComplete?.();
    return () => {};
  }

  const fullConfig: Required<SpringConfig> = {
    stiffness: config.stiffness ?? 100,
    damping: config.damping ?? 10,
    mass: config.mass ?? 1,
    velocity: config.velocity ?? 0,
  };

  let current = from;
  let velocity = fullConfig.velocity;
  let lastTime = performance.now();
  let frameId: number | null = null;

  function tick(now: number) {
    const deltaTime = Math.min((now - lastTime) / 1000, 0.064); // Cap at ~15fps min
    lastTime = now;

    const frame = springStep(current, to, velocity, fullConfig, deltaTime);
    current = frame.value;
    velocity = frame.velocity;

    onUpdate(current);

    if (frame.done) {
      frameId = null;
      onComplete?.();
    } else {
      frameId = requestAnimationFrame(tick);
    }
  }

  frameId = requestAnimationFrame(tick);

  return () => {
    if (frameId !== null) {
      cancelAnimationFrame(frameId);
      frameId = null;
    }
  };
}

// ============================================================================
// Preset Animations
// ============================================================================

/** CSS keyframe definitions for presets */
const ANIMATION_PRESETS: Record<AnimationPreset, { enter: string; exit: string }> = {
  fade: {
    enter: 'opacity: 0 -> opacity: 1',
    exit: 'opacity: 1 -> opacity: 0',
  },
  'slide-up': {
    enter: 'transform: translateY(10px); opacity: 0 -> transform: translateY(0); opacity: 1',
    exit: 'transform: translateY(0); opacity: 1 -> transform: translateY(-10px); opacity: 0',
  },
  'slide-down': {
    enter: 'transform: translateY(-10px); opacity: 0 -> transform: translateY(0); opacity: 1',
    exit: 'transform: translateY(0); opacity: 1 -> transform: translateY(10px); opacity: 0',
  },
  'slide-left': {
    enter: 'transform: translateX(10px); opacity: 0 -> transform: translateX(0); opacity: 1',
    exit: 'transform: translateX(0); opacity: 1 -> transform: translateX(-10px); opacity: 0',
  },
  'slide-right': {
    enter: 'transform: translateX(-10px); opacity: 0 -> transform: translateX(0); opacity: 1',
    exit: 'transform: translateX(0); opacity: 1 -> transform: translateX(10px); opacity: 0',
  },
  scale: {
    enter: 'transform: scale(0.95); opacity: 0 -> transform: scale(1); opacity: 1',
    exit: 'transform: scale(1); opacity: 1 -> transform: scale(0.95); opacity: 0',
  },
  'scale-up': {
    enter: 'transform: scale(0.9); opacity: 0 -> transform: scale(1); opacity: 1',
    exit: 'transform: scale(1); opacity: 1 -> transform: scale(1.1); opacity: 0',
  },
  'scale-down': {
    enter: 'transform: scale(1.1); opacity: 0 -> transform: scale(1); opacity: 1',
    exit: 'transform: scale(1); opacity: 1 -> transform: scale(0.9); opacity: 0',
  },
  'flip-x': {
    enter:
      'transform: perspective(400px) rotateX(90deg); opacity: 0 -> transform: perspective(400px) rotateX(0); opacity: 1',
    exit: 'transform: perspective(400px) rotateX(0); opacity: 1 -> transform: perspective(400px) rotateX(-90deg); opacity: 0',
  },
  'flip-y': {
    enter:
      'transform: perspective(400px) rotateY(90deg); opacity: 0 -> transform: perspective(400px) rotateY(0); opacity: 1',
    exit: 'transform: perspective(400px) rotateY(0); opacity: 1 -> transform: perspective(400px) rotateY(-90deg); opacity: 0',
  },
  rotate: {
    enter:
      'transform: rotate(-10deg) scale(0.95); opacity: 0 -> transform: rotate(0) scale(1); opacity: 1',
    exit: 'transform: rotate(0) scale(1); opacity: 1 -> transform: rotate(10deg) scale(0.95); opacity: 0',
  },
  blur: {
    enter: 'filter: blur(8px); opacity: 0 -> filter: blur(0); opacity: 1',
    exit: 'filter: blur(0); opacity: 1 -> filter: blur(8px); opacity: 0',
  },
  'blur-fade': {
    enter:
      'filter: blur(12px); opacity: 0; transform: scale(1.02) -> filter: blur(0); opacity: 1; transform: scale(1)',
    exit: 'filter: blur(0); opacity: 1; transform: scale(1) -> filter: blur(12px); opacity: 0; transform: scale(0.98)',
  },
};

/** Parse preset definition to CSS */
function parsePresetStyles(definition: string): {
  from: Record<string, string>;
  to: Record<string, string>;
} {
  const [fromStr, toStr] = definition.split(' -> ');
  const from: Record<string, string> = {};
  const to: Record<string, string> = {};

  for (const part of fromStr.split(';')) {
    const [key, value] = part.split(':').map((s) => s.trim());
    if (key && value) from[key] = value;
  }

  for (const part of toStr.split(';')) {
    const [key, value] = part.split(':').map((s) => s.trim());
    if (key && value) to[key] = value;
  }

  return { from, to };
}

// ============================================================================
// Transition Controller
// ============================================================================

/**
 * Creates a transition controller for enter/exit animations
 *
 * @example
 * ```typescript
 * const transition = createTransition(element, {
 *   preset: 'fade',
 *   duration: 200
 * });
 *
 * await transition.enter();
 * // Element is now visible
 *
 * await transition.exit();
 * // Element is now hidden
 * ```
 */
export function createTransition(
  element: HTMLElement,
  options: TransitionOptions & { preset?: AnimationPreset } = {}
): Transition {
  const {
    duration = 200,
    easing = 'ease-out',
    delay = 0,
    preset = 'fade',
    onStart,
    onEnd,
  } = options;

  let state: TransitionState = 'idle';
  let cancelFn: (() => void) | null = null;

  const presetDef = ANIMATION_PRESETS[preset];
  const enterStyles = parsePresetStyles(presetDef.enter);
  const exitStyles = parsePresetStyles(presetDef.exit);

  function applyStyles(styles: Record<string, string>) {
    for (const [key, value] of Object.entries(styles)) {
      element.style.setProperty(key, value);
    }
  }

  function animate(
    from: Record<string, string>,
    to: Record<string, string>,
    newState: 'entering' | 'exiting'
  ): Promise<void> {
    return new Promise((resolve) => {
      if (!isBrowser()) {
        applyStyles(to);
        state = newState === 'entering' ? 'entered' : 'exited';
        resolve();
        return;
      }

      // Cancel any running animation
      cancelFn?.();

      state = newState;
      onStart?.(state);

      // Apply initial state
      applyStyles(from);

      // Force reflow
      element.offsetHeight;

      // Set up transition
      const properties = Object.keys(to);
      element.style.transition = properties
        .map((prop) => `${prop} ${duration}ms ${easing} ${delay}ms`)
        .join(', ');

      // Apply target state
      applyStyles(to);

      // Handle completion
      const handleEnd = (e?: TransitionEvent) => {
        if (e && e.target !== element) return;

        element.removeEventListener('transitionend', handleEnd);
        element.style.transition = '';
        cancelFn = null;

        state = newState === 'entering' ? 'entered' : 'exited';
        onEnd?.(state);
        resolve();
      };

      // Set up cancel function
      cancelFn = () => {
        element.removeEventListener('transitionend', handleEnd);
        element.style.transition = '';
        cancelFn = null;
      };

      element.addEventListener('transitionend', handleEnd, { once: false });

      // Fallback timeout in case transitionend doesn't fire
      setTimeout(
        () => {
          if (cancelFn) handleEnd();
        },
        duration + delay + 50
      );
    });
  }

  return {
    get state() {
      return state;
    },

    enter() {
      return animate(enterStyles.from, enterStyles.to, 'entering');
    },

    exit() {
      return animate(exitStyles.from, exitStyles.to, 'exiting');
    },

    async toggle() {
      if (state === 'idle' || state === 'exited') {
        await this.enter();
      } else {
        await this.exit();
      }
    },

    cancel() {
      cancelFn?.();
      state = 'idle';
    },

    destroy() {
      cancelFn?.();
      element.style.transition = '';
    },
  };
}

// ============================================================================
// Staggered Animations
// ============================================================================

/**
 * Animate multiple elements with staggered timing
 *
 * @example
 * ```typescript
 * const items = document.querySelectorAll('.list-item');
 * await stagger(items, {
 *   preset: 'slide-up',
 *   staggerDelay: 50,
 *   from: 'first'
 * });
 * ```
 */
export async function stagger(
  elements: HTMLElement[] | NodeListOf<HTMLElement>,
  options: StaggerOptions & { preset?: AnimationPreset; direction?: AnimationDirection } = {}
): Promise<void> {
  const { staggerDelay = 50, from = 'first', direction = 'in', ...transitionOptions } = options;

  const els = Array.from(elements);
  if (els.length === 0) return;

  // Calculate delays based on 'from' option
  const delays: number[] = [];
  const count = els.length;

  switch (from) {
    case 'first':
      for (let i = 0; i < count; i++) delays.push(i * staggerDelay);
      break;
    case 'last':
      for (let i = 0; i < count; i++) delays.push((count - 1 - i) * staggerDelay);
      break;
    case 'center': {
      const center = (count - 1) / 2;
      for (let i = 0; i < count; i++) delays.push(Math.abs(i - center) * staggerDelay);
      break;
    }
    case 'edges': {
      const center = (count - 1) / 2;
      for (let i = 0; i < count; i++) {
        delays.push((center - Math.abs(i - center)) * staggerDelay);
      }
      break;
    }
  }

  // Create transitions with delays
  const promises = els.map((el, i) => {
    const transition = createTransition(el, {
      ...transitionOptions,
      delay: (transitionOptions.delay ?? 0) + delays[i],
    });
    return direction === 'in' ? transition.enter() : transition.exit();
  });

  await Promise.all(promises);
}

// ============================================================================
// CSS Class-based Animations
// ============================================================================

/** Animation class options */
export interface AnimateClassOptions {
  /** Enter class (added on enter) */
  enterClass?: string;
  /** Enter-from class (initial state) */
  enterFromClass?: string;
  /** Enter-to class (final state) */
  enterToClass?: string;
  /** Exit class (added on exit) */
  exitClass?: string;
  /** Exit-from class (initial state) */
  exitFromClass?: string;
  /** Exit-to class (final state) */
  exitToClass?: string;
  /** Duration in ms (default: auto-detect from CSS) */
  duration?: number;
}

/**
 * Animate element using CSS classes (Vue/Svelte transition style)
 *
 * @example
 * ```typescript
 * // CSS:
 * // .fade-enter-from { opacity: 0; }
 * // .fade-enter-to { opacity: 1; }
 * // .fade-enter-active { transition: opacity 200ms; }
 *
 * await animateClass(element, {
 *   enterClass: 'fade-enter-active',
 *   enterFromClass: 'fade-enter-from',
 *   enterToClass: 'fade-enter-to'
 * }, 'enter');
 * ```
 */
export function animateClass(
  element: HTMLElement,
  options: AnimateClassOptions,
  direction: 'enter' | 'exit'
): Promise<void> {
  return new Promise((resolve) => {
    if (!isBrowser()) {
      resolve();
      return;
    }

    const isEnter = direction === 'enter';
    const activeClass = isEnter ? options.enterClass : options.exitClass;
    const fromClass = isEnter ? options.enterFromClass : options.exitFromClass;
    const toClass = isEnter ? options.enterToClass : options.exitToClass;

    // Add from class
    if (fromClass) element.classList.add(fromClass);
    if (activeClass) element.classList.add(activeClass);

    // Force reflow
    element.offsetHeight;

    // Remove from, add to
    if (fromClass) element.classList.remove(fromClass);
    if (toClass) element.classList.add(toClass);

    // Get duration from CSS or use provided
    const computed = getComputedStyle(element);
    const cssTransitionDuration = parseFloat(computed.transitionDuration) * 1000;
    const cssAnimationDuration = parseFloat(computed.animationDuration) * 1000;
    const duration =
      options.duration ?? (Math.max(cssTransitionDuration, cssAnimationDuration) || 200);

    setTimeout(() => {
      if (activeClass) element.classList.remove(activeClass);
      if (toClass) element.classList.remove(toClass);
      resolve();
    }, duration);
  });
}

// ============================================================================
// Utility: Wait for next frame
// ============================================================================

/**
 * Wait for next animation frame
 */
export function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    if (!isBrowser()) {
      resolve();
      return;
    }
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

/**
 * Wait for specified duration
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
