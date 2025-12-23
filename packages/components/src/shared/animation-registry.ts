/**
 * Animation Registry
 *
 * Centralized animation definitions:
 * - Reusable keyframe definitions
 * - Consistent timing functions
 * - Animation presets
 * - Spring physics utilities
 * - Stagger utilities
 *
 * @module
 */

// ============================================================================
// Types
// ============================================================================

/** Keyframe definition */
export interface KeyframeDefinition {
  keyframes: Keyframe[];
  options: KeyframeAnimationOptions;
}

/** Animation preset */
export interface RegistryAnimationPreset {
  name: string;
  keyframes: Keyframe[];
  options: KeyframeAnimationOptions;
  description?: string;
}

/** Spring configuration for registry */
export interface RegistrySpringConfig {
  /** Stiffness (default: 100) */
  stiffness?: number;
  /** Damping (default: 10) */
  damping?: number;
  /** Mass (default: 1) */
  mass?: number;
  /** Initial velocity (default: 0) */
  velocity?: number;
}

/** Stagger configuration */
export interface StaggerConfig {
  /** Delay between items in ms */
  delay?: number;
  /** Starting delay in ms */
  start?: number;
  /** Direction: 'normal' | 'reverse' | 'center' | 'edges' */
  from?: 'start' | 'end' | 'center' | 'edges';
  /** Easing for stagger timing */
  easing?: (t: number) => number;
}

// ============================================================================
// Constants: Easing Functions
// ============================================================================

/** Standard easing curves (extended) */
export const EASING_PRESETS = {
  // Basic
  linear: 'linear',
  ease: 'ease',
  easeIn: 'ease-in',
  easeOut: 'ease-out',
  easeInOut: 'ease-in-out',

  // Cubic bezier presets
  standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
  decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
  accelerate: 'cubic-bezier(0.4, 0, 1, 1)',

  // Expressive
  emphasized: 'cubic-bezier(0.2, 0, 0, 1)',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  elastic: 'cubic-bezier(0.68, -0.6, 0.32, 1.6)',

  // Smooth
  smooth: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
  smoothIn: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',
  smoothOut: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
  smoothInOut: 'cubic-bezier(0.645, 0.045, 0.355, 1)',

  // Sharp
  sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
  sharpIn: 'cubic-bezier(0.55, 0, 1, 0.45)',
  sharpOut: 'cubic-bezier(0, 0.55, 0.45, 1)',
} as const;

/** Numeric easing functions for JS animations */
export const easingFn = {
  linear: (t: number) => t,
  easeInQuad: (t: number) => t * t,
  easeOutQuad: (t: number) => t * (2 - t),
  easeInOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeInCubic: (t: number) => t * t * t,
  easeOutCubic: (t: number) => --t * t * t + 1,
  easeInOutCubic: (t: number) =>
    t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  easeInQuart: (t: number) => t * t * t * t,
  easeOutQuart: (t: number) => 1 - --t * t * t * t,
  easeInOutQuart: (t: number) => (t < 0.5 ? 8 * t * t * t * t : 1 - 8 * --t * t * t * t),
  easeOutElastic: (t: number) => {
    const p = 0.3;
    return 2 ** (-10 * t) * Math.sin(((t - p / 4) * (2 * Math.PI)) / p) + 1;
  },
  easeOutBounce: (t: number) => {
    let tVal = t;
    if (tVal < 1 / 2.75) {
      return 7.5625 * tVal * tVal;
    } else if (tVal < 2 / 2.75) {
      tVal -= 1.5 / 2.75;
      return 7.5625 * tVal * tVal + 0.75;
    } else if (tVal < 2.5 / 2.75) {
      tVal -= 2.25 / 2.75;
      return 7.5625 * tVal * tVal + 0.9375;
    } else {
      tVal -= 2.625 / 2.75;
      return 7.5625 * tVal * tVal + 0.984375;
    }
  },
} as const;

// ============================================================================
// Constants: Duration
// ============================================================================

/** Standard animation durations in ms */
export const DURATION = {
  instant: 0,
  fastest: 50,
  faster: 100,
  fast: 150,
  normal: 200,
  slow: 300,
  slower: 400,
  slowest: 500,
  // Named durations
  micro: 100,
  short: 150,
  medium: 250,
  long: 400,
  // Specific use cases
  tooltip: 150,
  modal: 250,
  page: 400,
  loading: 1000,
} as const;

// ============================================================================
// Animation Registry
// ============================================================================

/** Registered animations */
const registry = new Map<string, RegistryAnimationPreset>();

/**
 * Register a custom animation
 *
 * @example
 * ```typescript
 * registerAnimation('myFadeIn', {
 *   keyframes: [{ opacity: 0 }, { opacity: 1 }],
 *   options: { duration: 300, easing: EASING_PRESETS.smooth }
 * });
 * ```
 */
export function registerAnimation(
  name: string,
  definition: Omit<RegistryAnimationPreset, 'name'>
): void {
  registry.set(name, { name, ...definition });
}

/** Get a registered animation */
export function getAnimation(name: string): RegistryAnimationPreset | undefined {
  return registry.get(name);
}

/** Get all registered animations */
export function getAnimations(): Map<string, RegistryAnimationPreset> {
  return new Map(registry);
}

// ============================================================================
// Built-in Animations
// ============================================================================

/** Fade animations */
export const fadeIn: KeyframeDefinition = {
  keyframes: [{ opacity: 0 }, { opacity: 1 }],
  options: { duration: DURATION.normal, easing: EASING_PRESETS.smooth, fill: 'forwards' },
};

export const fadeOut: KeyframeDefinition = {
  keyframes: [{ opacity: 1 }, { opacity: 0 }],
  options: { duration: DURATION.normal, easing: EASING_PRESETS.smooth, fill: 'forwards' },
};

/** Scale animations */
export const scaleIn: KeyframeDefinition = {
  keyframes: [
    { opacity: 0, transform: 'scale(0.95)' },
    { opacity: 1, transform: 'scale(1)' },
  ],
  options: { duration: DURATION.normal, easing: EASING_PRESETS.decelerate, fill: 'forwards' },
};

export const scaleOut: KeyframeDefinition = {
  keyframes: [
    { opacity: 1, transform: 'scale(1)' },
    { opacity: 0, transform: 'scale(0.95)' },
  ],
  options: { duration: DURATION.fast, easing: EASING_PRESETS.accelerate, fill: 'forwards' },
};

/** Slide animations */
export const slideInUp: KeyframeDefinition = {
  keyframes: [
    { opacity: 0, transform: 'translateY(10px)' },
    { opacity: 1, transform: 'translateY(0)' },
  ],
  options: { duration: DURATION.normal, easing: EASING_PRESETS.decelerate, fill: 'forwards' },
};

export const slideInDown: KeyframeDefinition = {
  keyframes: [
    { opacity: 0, transform: 'translateY(-10px)' },
    { opacity: 1, transform: 'translateY(0)' },
  ],
  options: { duration: DURATION.normal, easing: EASING_PRESETS.decelerate, fill: 'forwards' },
};

export const slideInLeft: KeyframeDefinition = {
  keyframes: [
    { opacity: 0, transform: 'translateX(-10px)' },
    { opacity: 1, transform: 'translateX(0)' },
  ],
  options: { duration: DURATION.normal, easing: EASING_PRESETS.decelerate, fill: 'forwards' },
};

export const slideInRight: KeyframeDefinition = {
  keyframes: [
    { opacity: 0, transform: 'translateX(10px)' },
    { opacity: 1, transform: 'translateX(0)' },
  ],
  options: { duration: DURATION.normal, easing: EASING_PRESETS.decelerate, fill: 'forwards' },
};

export const slideOutUp: KeyframeDefinition = {
  keyframes: [
    { opacity: 1, transform: 'translateY(0)' },
    { opacity: 0, transform: 'translateY(-10px)' },
  ],
  options: { duration: DURATION.fast, easing: EASING_PRESETS.accelerate, fill: 'forwards' },
};

export const slideOutDown: KeyframeDefinition = {
  keyframes: [
    { opacity: 1, transform: 'translateY(0)' },
    { opacity: 0, transform: 'translateY(10px)' },
  ],
  options: { duration: DURATION.fast, easing: EASING_PRESETS.accelerate, fill: 'forwards' },
};

/** Bounce/Spring animations */
export const bounceIn: KeyframeDefinition = {
  keyframes: [
    { opacity: 0, transform: 'scale(0.3)' },
    { opacity: 1, transform: 'scale(1.05)' },
    { transform: 'scale(0.9)' },
    { transform: 'scale(1.03)' },
    { transform: 'scale(0.97)' },
    { transform: 'scale(1)' },
  ],
  options: { duration: DURATION.slow, easing: EASING_PRESETS.bounce, fill: 'forwards' },
};

export const bounceOut: KeyframeDefinition = {
  keyframes: [
    { transform: 'scale(1)' },
    { transform: 'scale(0.9)' },
    { opacity: 1, transform: 'scale(1.1)' },
    { opacity: 0, transform: 'scale(0.3)' },
  ],
  options: { duration: DURATION.slow, easing: EASING_PRESETS.bounce, fill: 'forwards' },
};

/** Attention animations */
export const shake: KeyframeDefinition = {
  keyframes: [
    { transform: 'translateX(0)' },
    { transform: 'translateX(-10px)' },
    { transform: 'translateX(10px)' },
    { transform: 'translateX(-10px)' },
    { transform: 'translateX(10px)' },
    { transform: 'translateX(0)' },
  ],
  options: { duration: DURATION.slow, easing: EASING_PRESETS.smooth },
};

export const pulse: KeyframeDefinition = {
  keyframes: [{ transform: 'scale(1)' }, { transform: 'scale(1.05)' }, { transform: 'scale(1)' }],
  options: { duration: DURATION.medium, easing: EASING_PRESETS.smooth },
};

export const wiggle: KeyframeDefinition = {
  keyframes: [
    { transform: 'rotate(0deg)' },
    { transform: 'rotate(-5deg)' },
    { transform: 'rotate(5deg)' },
    { transform: 'rotate(-5deg)' },
    { transform: 'rotate(5deg)' },
    { transform: 'rotate(0deg)' },
  ],
  options: { duration: DURATION.slow, easing: EASING_PRESETS.smooth },
};

export const heartbeat: KeyframeDefinition = {
  keyframes: [
    { transform: 'scale(1)' },
    { transform: 'scale(1.15)' },
    { transform: 'scale(1.05)' },
    { transform: 'scale(1.25)' },
    { transform: 'scale(1)' },
  ],
  options: { duration: DURATION.slow, easing: EASING_PRESETS.smooth },
};

/** Breathing animation (infinite) */
export const breathe: KeyframeDefinition = {
  keyframes: [
    { transform: 'scale(1)', opacity: 1 },
    { transform: 'scale(1.02)', opacity: 0.9 },
    { transform: 'scale(1)', opacity: 1 },
  ],
  options: {
    duration: 2000,
    easing: EASING_PRESETS.smooth,
    iterations: Infinity,
  },
};

/** Spin animation */
export const spin: KeyframeDefinition = {
  keyframes: [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }],
  options: {
    duration: DURATION.loading,
    easing: EASING_PRESETS.linear,
    iterations: Infinity,
  },
};

// ============================================================================
// Register Built-in Animations
// ============================================================================

// Fade
registerAnimation('fadeIn', { ...fadeIn, description: 'Fade in' });
registerAnimation('fadeOut', { ...fadeOut, description: 'Fade out' });

// Scale
registerAnimation('scaleIn', { ...scaleIn, description: 'Scale in with fade' });
registerAnimation('scaleOut', { ...scaleOut, description: 'Scale out with fade' });

// Slide
registerAnimation('slideInUp', { ...slideInUp, description: 'Slide in from bottom' });
registerAnimation('slideInDown', { ...slideInDown, description: 'Slide in from top' });
registerAnimation('slideInLeft', { ...slideInLeft, description: 'Slide in from left' });
registerAnimation('slideInRight', { ...slideInRight, description: 'Slide in from right' });
registerAnimation('slideOutUp', { ...slideOutUp, description: 'Slide out to top' });
registerAnimation('slideOutDown', { ...slideOutDown, description: 'Slide out to bottom' });

// Bounce
registerAnimation('bounceIn', { ...bounceIn, description: 'Bouncy entrance' });
registerAnimation('bounceOut', { ...bounceOut, description: 'Bouncy exit' });

// Attention
registerAnimation('shake', { ...shake, description: 'Shake horizontally' });
registerAnimation('pulse', { ...pulse, description: 'Subtle pulse' });
registerAnimation('wiggle', { ...wiggle, description: 'Wiggle rotation' });
registerAnimation('heartbeat', { ...heartbeat, description: 'Heartbeat pulse' });
registerAnimation('breathe', { ...breathe, description: 'Continuous breathing' });
registerAnimation('spin', { ...spin, description: 'Continuous spin' });

// ============================================================================
// Animation Helpers
// ============================================================================

/**
 * Play an animation on an element
 *
 * @example
 * ```typescript
 * // Using preset name
 * await animate(element, 'fadeIn');
 *
 * // Using keyframe definition
 * await animate(element, fadeIn);
 *
 * // With custom options
 * await animate(element, 'fadeIn', { duration: 500 });
 * ```
 */
export function animate(
  element: HTMLElement,
  animation: string | KeyframeDefinition,
  overrides?: Partial<KeyframeAnimationOptions>
): Animation {
  const def = typeof animation === 'string' ? getAnimation(animation) : animation;

  if (!def) {
    console.warn(`[Atlas Animation] Animation "${animation}" not found`);
    return element.animate([], {});
  }

  const options = { ...def.options, ...overrides };
  return element.animate(def.keyframes, options);
}

/**
 * Play animation and wait for completion
 *
 * @example
 * ```typescript
 * await animateAsync(element, 'fadeIn');
 * console.log('Animation complete');
 * ```
 */
export async function animateAsync(
  element: HTMLElement,
  animation: string | KeyframeDefinition,
  overrides?: Partial<KeyframeAnimationOptions>
): Promise<void> {
  const anim = animate(element, animation, overrides);
  await anim.finished;
}

/**
 * Create staggered animation for multiple elements
 *
 * @example
 * ```typescript
 * const elements = document.querySelectorAll('.card');
 * await staggerElements(elements, 'fadeIn', { delay: 50 });
 * ```
 */
export async function staggerElements(
  elements: HTMLElement[] | NodeListOf<HTMLElement>,
  animation: string | KeyframeDefinition,
  config: StaggerConfig = {}
): Promise<void> {
  const { delay = 50, start = 0, from = 'start', easing = easingFn.linear } = config;

  const els = Array.from(elements);
  const count = els.length;

  if (count === 0) return;

  // Calculate indices based on direction
  let indices: number[];
  switch (from) {
    case 'end':
      indices = els.map((_, i) => count - 1 - i);
      break;
    case 'center': {
      const mid = Math.floor(count / 2);
      indices = els.map((_, i) => Math.abs(i - mid));
      break;
    }
    case 'edges': {
      const mid = Math.floor(count / 2);
      indices = els.map((_, i) => mid - Math.abs(i - mid));
      break;
    }
    default:
      indices = els.map((_, i) => i);
  }

  // Animate each element with staggered delay
  const animations = els.map((el, i) => {
    const progress = indices[i] / (count - 1 || 1);
    const staggerDelay = start + delay * easing(progress) * (count - 1);
    return animateAsync(el, animation, { delay: staggerDelay });
  });

  await Promise.all(animations);
}

// ============================================================================
// Spring Physics
// ============================================================================

/**
 * Calculate spring animation value
 *
 * @example
 * ```typescript
 * // Animate with spring physics
 * let position = 0;
 * const target = 100;
 * const spring = createSpring({ stiffness: 120, damping: 14 });
 *
 * function animate() {
 *   position = spring(position, target);
 *   element.style.transform = `translateX(${position}px)`;
 *   if (Math.abs(target - position) > 0.01) {
 *     requestAnimationFrame(animate);
 *   }
 * }
 * animate();
 * ```
 */
export function createSpring(
  config: RegistrySpringConfig = {}
): (current: number, target: number) => number {
  const { stiffness = 100, damping = 10, mass = 1 } = config;
  let velocity = config.velocity ?? 0;

  return (current: number, target: number): number => {
    const force = -stiffness * (current - target);
    const dampingForce = -damping * velocity;
    const acceleration = (force + dampingForce) / mass;

    velocity += acceleration * (1 / 60); // Assume 60fps
    const newPosition = current + velocity * (1 / 60);

    return newPosition;
  };
}

/**
 * Animate a value using spring physics
 *
 * @example
 * ```typescript
 * animateSpring({
 *   from: 0,
 *   to: 100,
 *   stiffness: 120,
 *   damping: 14,
 *   onUpdate: (value) => {
 *     element.style.transform = `translateX(${value}px)`;
 *   },
 *   onComplete: () => console.log('Done!')
 * });
 * ```
 */
export function animateWithSpring(options: {
  from: number;
  to: number;
  stiffness?: number;
  damping?: number;
  mass?: number;
  velocity?: number;
  precision?: number;
  onUpdate: (value: number) => void;
  onComplete?: () => void;
}): () => void {
  const {
    from,
    to,
    stiffness = 100,
    damping = 10,
    mass = 1,
    velocity: initialVelocity = 0,
    precision = 0.01,
    onUpdate,
    onComplete,
  } = options;

  let current = from;
  let velocity = initialVelocity;
  let rafId: number;

  function tick(): void {
    const force = -stiffness * (current - to);
    const dampingForce = -damping * velocity;
    const acceleration = (force + dampingForce) / mass;

    velocity += acceleration * (1 / 60);
    current += velocity * (1 / 60);

    onUpdate(current);

    if (Math.abs(to - current) > precision || Math.abs(velocity) > precision) {
      rafId = requestAnimationFrame(tick);
    } else {
      onUpdate(to);
      onComplete?.();
    }
  }

  rafId = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(rafId);
  };
}

// ============================================================================
// Transition Helpers
// ============================================================================

/**
 * Create a CSS transition helper
 *
 * @example
 * ```typescript
 * const transition = createCSSTransition(element, ['transform', 'opacity'], {
 *   duration: 200,
 *   easing: EASING_PRESETS.smooth
 * });
 *
 * transition.to({ transform: 'translateX(100px)', opacity: 0.5 });
 * await transition.wait();
 * transition.reset();
 * ```
 */
export function createCSSTransition(
  element: HTMLElement,
  properties: string[],
  options: { duration?: number; easing?: string } = {}
): {
  to: (styles: Partial<CSSStyleDeclaration>) => void;
  wait: () => Promise<void>;
  reset: () => void;
  cancel: () => void;
} {
  const { duration = DURATION.normal, easing = EASING_PRESETS.smooth } = options;

  const originalTransition = element.style.transition;
  const originalStyles: Record<string, string> = {};

  // Store original values
  for (const prop of properties) {
    originalStyles[prop] = element.style.getPropertyValue(prop);
  }

  // Set up transition
  element.style.transition = properties.map((prop) => `${prop} ${duration}ms ${easing}`).join(', ');

  return {
    to(styles: Partial<CSSStyleDeclaration>): void {
      Object.assign(element.style, styles);
    },

    wait(): Promise<void> {
      return new Promise((resolve) => {
        const handler = () => {
          element.removeEventListener('transitionend', handler);
          resolve();
        };
        element.addEventListener('transitionend', handler);
      });
    },

    reset(): void {
      for (const prop of properties) {
        if (originalStyles[prop] !== undefined) {
          element.style.setProperty(prop, originalStyles[prop]);
        }
      }
    },

    cancel(): void {
      element.style.transition = originalTransition;
    },
  };
}
