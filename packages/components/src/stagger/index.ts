/**
 * Stagger Animation Utility
 *
 * Creates beautiful staggered entrance animations for lists and grids.
 * Elements appear one after another with smooth, coordinated motion.
 *
 * Features:
 * - Multiple animation presets (fade, slide, scale, flip)
 * - Configurable timing and delays
 * - Direction control (normal, reverse, random)
 * - Intersection Observer support (animate on scroll)
 * - Reduced motion support
 *
 * @example
 * ```typescript
 * // Basic usage - animate list items
 * const cleanup = stagger(document.querySelectorAll('.list-item'), {
 *   animation: 'fade-up',
 *   delay: 50,
 * });
 *
 * // Animate on scroll
 * const cleanup = stagger(document.querySelectorAll('.card'), {
 *   animation: 'scale',
 *   trigger: 'scroll',
 *   threshold: 0.2,
 * });
 *
 * // Grid with random order
 * const cleanup = stagger(document.querySelectorAll('.grid-item'), {
 *   animation: 'fade',
 *   order: 'random',
 *   delay: 30,
 * });
 * ```
 */

import { isBrowser } from '../shared/dom';
import { ANIMATION_DURATION, EASING } from '../shared/types';

/** Animation preset types */
export type StaggerAnimation =
  | 'fade'
  | 'fade-up'
  | 'fade-down'
  | 'fade-left'
  | 'fade-right'
  | 'scale'
  | 'scale-up'
  | 'flip'
  | 'slide-up'
  | 'slide-down'
  | 'slide-left'
  | 'slide-right'
  | 'zoom';

/** Animation order */
export type StaggerOrder = 'normal' | 'reverse' | 'random';

/** Animation trigger */
export type StaggerTrigger = 'immediate' | 'scroll';

export interface StaggerOptions {
  /** Animation preset (default: 'fade-up') */
  animation?: StaggerAnimation;
  /** Delay between each element in ms (default: 50) */
  delay?: number;
  /** Initial delay before first element in ms (default: 0) */
  initialDelay?: number;
  /** Animation duration in ms (default: 400) */
  duration?: number;
  /** Animation easing (default: EASING.spring) */
  easing?: string;
  /** Animation order (default: 'normal') */
  order?: StaggerOrder;
  /** Animation trigger (default: 'immediate') */
  trigger?: StaggerTrigger;
  /** Intersection threshold for scroll trigger (default: 0.1) */
  threshold?: number;
  /** Only animate once when triggered by scroll (default: true) */
  once?: boolean;
  /** Distance for slide/fade animations in pixels (default: 20) */
  distance?: number;
  /** Called when all animations complete */
  onComplete?: () => void;
  /** Called when each element animates */
  onElementAnimate?: (element: HTMLElement, index: number) => void;
}

/** Cleanup function */
export type StaggerCleanup = () => void;

/** Style record for animations */
type AnimationStyleRecord = {
  opacity?: string;
  transform?: string;
};

/**
 * Get initial and final styles for animation preset
 */
function getAnimationStyles(
  animation: StaggerAnimation,
  distance: number
): {
  initial: AnimationStyleRecord;
  final: AnimationStyleRecord;
} {
  const styles: Record<
    StaggerAnimation,
    {
      initial: AnimationStyleRecord;
      final: AnimationStyleRecord;
    }
  > = {
    fade: {
      initial: { opacity: '0' },
      final: { opacity: '1' },
    },
    'fade-up': {
      initial: { opacity: '0', transform: `translateY(${distance}px)` },
      final: { opacity: '1', transform: 'translateY(0)' },
    },
    'fade-down': {
      initial: { opacity: '0', transform: `translateY(-${distance}px)` },
      final: { opacity: '1', transform: 'translateY(0)' },
    },
    'fade-left': {
      initial: { opacity: '0', transform: `translateX(${distance}px)` },
      final: { opacity: '1', transform: 'translateX(0)' },
    },
    'fade-right': {
      initial: { opacity: '0', transform: `translateX(-${distance}px)` },
      final: { opacity: '1', transform: 'translateX(0)' },
    },
    scale: {
      initial: { opacity: '0', transform: 'scale(0.8)' },
      final: { opacity: '1', transform: 'scale(1)' },
    },
    'scale-up': {
      initial: {
        opacity: '0',
        transform: `scale(0.8) translateY(${distance}px)`,
      },
      final: { opacity: '1', transform: 'scale(1) translateY(0)' },
    },
    flip: {
      initial: {
        opacity: '0',
        transform: 'perspective(400px) rotateX(-90deg)',
      },
      final: { opacity: '1', transform: 'perspective(400px) rotateX(0)' },
    },
    'slide-up': {
      initial: { transform: `translateY(${distance * 2}px)` },
      final: { transform: 'translateY(0)' },
    },
    'slide-down': {
      initial: { transform: `translateY(-${distance * 2}px)` },
      final: { transform: 'translateY(0)' },
    },
    'slide-left': {
      initial: { transform: `translateX(${distance * 2}px)` },
      final: { transform: 'translateX(0)' },
    },
    'slide-right': {
      initial: { transform: `translateX(-${distance * 2}px)` },
      final: { transform: 'translateX(0)' },
    },
    zoom: {
      initial: { opacity: '0', transform: 'scale(0)' },
      final: { opacity: '1', transform: 'scale(1)' },
    },
  };

  return styles[animation];
}

/**
 * Shuffle array using Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Check if user prefers reduced motion
 */
function prefersReducedMotion(): boolean {
  if (!isBrowser()) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Apply styles to element
 */
function applyStyles(element: HTMLElement, styles: AnimationStyleRecord): void {
  if (styles.opacity !== undefined) {
    element.style.opacity = styles.opacity;
  }
  if (styles.transform !== undefined) {
    element.style.transform = styles.transform;
  }
}

/**
 * Create staggered entrance animation for a collection of elements
 */
export function stagger(
  elements: NodeListOf<HTMLElement> | HTMLElement[] | HTMLCollection,
  options: StaggerOptions = {}
): StaggerCleanup {
  // SSR guard
  if (!isBrowser()) {
    return () => {};
  }

  const {
    animation = 'fade-up',
    delay = 50,
    initialDelay = 0,
    duration = ANIMATION_DURATION.normal,
    easing = EASING.spring,
    order = 'normal',
    trigger = 'immediate',
    threshold = 0.1,
    once = true,
    distance = 20,
    onComplete,
    onElementAnimate,
  } = options;

  // Convert to array
  let elementArray = Array.from(elements) as HTMLElement[];

  if (elementArray.length === 0) {
    return () => {};
  }

  // Handle reduced motion
  if (prefersReducedMotion()) {
    elementArray.forEach((el) => {
      el.style.opacity = '1';
      el.style.transform = '';
    });
    onComplete?.();
    return () => {};
  }

  // Order elements
  switch (order) {
    case 'reverse':
      elementArray = elementArray.reverse();
      break;
    case 'random':
      elementArray = shuffleArray(elementArray);
      break;
  }

  const { initial, final } = getAnimationStyles(animation, distance);
  let animatedCount = 0;
  let observer: IntersectionObserver | null = null;
  const timeouts: ReturnType<typeof setTimeout>[] = [];
  const originalStyles = new Map<HTMLElement, string>();

  // Store original styles and apply initial state
  elementArray.forEach((el) => {
    originalStyles.set(el, el.style.cssText);
    applyStyles(el, initial);
    el.style.transition = 'none';
  });

  // Animate a single element
  const animateElement = (element: HTMLElement, index: number) => {
    const elementDelay = initialDelay + index * delay;

    const timeout = setTimeout(() => {
      // Add transition
      element.style.transition = `
        opacity ${duration}ms ${easing},
        transform ${duration}ms ${easing}
      `
        .replace(/\s+/g, ' ')
        .trim();

      // Apply final state
      applyStyles(element, final);

      onElementAnimate?.(element, index);

      // Track completion
      animatedCount++;
      if (animatedCount === elementArray.length) {
        setTimeout(() => {
          onComplete?.();
        }, duration);
      }
    }, elementDelay);

    timeouts.push(timeout);
  };

  // Trigger animations
  if (trigger === 'immediate') {
    elementArray.forEach((el, index) => {
      animateElement(el, index);
    });
  } else if (trigger === 'scroll') {
    const animatedElements = new Set<HTMLElement>();

    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const element = entry.target as HTMLElement;

          if (entry.isIntersecting && !animatedElements.has(element)) {
            animateElement(element, animatedElements.size);

            if (once) {
              animatedElements.add(element);
              observer?.unobserve(element);
            }
          } else if (!entry.isIntersecting && !once && animatedElements.has(element)) {
            // Reset element if not once mode
            animatedElements.delete(element);
            applyStyles(element, initial);
            animatedCount = Math.max(0, animatedCount - 1);
          }
        });
      },
      { threshold }
    );

    elementArray.forEach((el) => observer?.observe(el));
  }

  // Cleanup function
  return () => {
    // Clear timeouts
    timeouts.forEach((t) => clearTimeout(t));

    // Disconnect observer
    if (observer) {
      observer.disconnect();
    }

    // Restore original styles
    elementArray.forEach((el) => {
      const original = originalStyles.get(el);
      if (original !== undefined) {
        el.style.cssText = original;
      }
    });
  };
}

/**
 * Create a reusable stagger animation factory
 *
 * @example
 * ```typescript
 * const fadeUpStagger = createStaggerAnimation({
 *   animation: 'fade-up',
 *   delay: 75,
 * });
 *
 * // Use on multiple element sets
 * fadeUpStagger(document.querySelectorAll('.list-a'));
 * fadeUpStagger(document.querySelectorAll('.list-b'));
 * ```
 */
export function createStaggerAnimation(
  defaultOptions: StaggerOptions
): (
  elements: NodeListOf<HTMLElement> | HTMLElement[] | HTMLCollection,
  overrides?: Partial<StaggerOptions>
) => StaggerCleanup {
  return (elements, overrides = {}) => {
    return stagger(elements, { ...defaultOptions, ...overrides });
  };
}

/**
 * Stagger with grid-aware animation (diagonal wave)
 *
 * @example
 * ```typescript
 * staggerGrid(document.querySelectorAll('.grid-item'), {
 *   columns: 3,
 *   animation: 'scale',
 * });
 * ```
 */
export interface StaggerGridOptions extends Omit<StaggerOptions, 'order'> {
  /** Number of columns in the grid */
  columns: number;
  /** Wave direction: 'diagonal', 'row', 'column' (default: 'diagonal') */
  waveDirection?: 'diagonal' | 'row' | 'column';
}

export function staggerGrid(
  elements: NodeListOf<HTMLElement> | HTMLElement[] | HTMLCollection,
  options: StaggerGridOptions
): StaggerCleanup {
  if (!isBrowser()) {
    return () => {};
  }

  const { columns, waveDirection = 'diagonal', delay = 50, ...restOptions } = options;

  const elementArray = Array.from(elements) as HTMLElement[];

  // Calculate delay based on position
  const getDelay = (index: number): number => {
    const row = Math.floor(index / columns);
    const col = index % columns;

    switch (waveDirection) {
      case 'diagonal':
        return (row + col) * delay;
      case 'row':
        return row * delay * columns + col * (delay / columns);
      case 'column':
        return (
          col * delay * Math.ceil(elementArray.length / columns) +
          row * (delay / Math.ceil(elementArray.length / columns))
        );
      default:
        return index * delay;
    }
  };

  // Apply custom delays by animating each element individually
  const cleanups: (() => void)[] = [];

  elementArray.forEach((el, index) => {
    const cleanup = stagger([el], {
      ...restOptions,
      delay: 0,
      initialDelay: getDelay(index),
    });
    cleanups.push(cleanup);
  });

  return () => {
    cleanups.forEach((cleanup) => cleanup());
  };
}
