import { shouldReduceMotion } from '../utils/accessibility';
import { resolveElement } from '../utils/element';
import { createStyleManager } from '../utils/style';

export interface ScrollRevealOptions {
  distance?: string;
  duration?: number;
  delay?: number;
  easing?: string;
  origin?: 'top' | 'bottom' | 'left' | 'right';
  scale?: number;
  opacity?: [number, number];
  threshold?: number;
  once?: boolean;
}

/**
 * Reveals an element with animation when it scrolls into view.
 *
 * @param target - A CSS selector string or an HTMLElement
 * @param options - Configuration options for the scroll reveal effect
 * @returns A cleanup function to remove the effect
 *
 * @example
 * ```typescript
 * const cleanup = scrollReveal('#element', {
 *   distance: '20px',
 *   duration: 800,
 *   delay: 0,
 *   easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
 *   origin: 'bottom',
 *   scale: 0.95,
 *   opacity: [0, 1],
 *   threshold: 0.1,
 *   once: true
 * });
 * ```
 */
export function scrollReveal(
  target: Element | string,
  options: ScrollRevealOptions = {}
): () => void {
  const element = resolveElement(target as string | HTMLElement);
  if (!element) {
    console.warn('[Atlas ScrollReveal] Element not found:', target);
    return () => {};
  }

  const {
    distance = '20px',
    duration = 800,
    delay = 0,
    easing = 'cubic-bezier(0.16, 1, 0.3, 1)',
    origin = 'bottom',
    scale = 0.95,
    opacity = [0, 1],
    threshold = 0.1,
    once = true,
  } = options;

  // Check if user prefers reduced motion - if so, just show the element
  const reduceMotion = shouldReduceMotion();
  if (reduceMotion) {
    element.setAttribute('style', `opacity: ${opacity[1]};`);
    return () => {
      element.removeAttribute('style');
    };
  }

  const styleManager = createStyleManager();
  let hasAnimated = false;

  // Set initial state
  const setInitialState = () => {
    const transforms = [];

    switch (origin) {
      case 'top':
        transforms.push(`translateY(-${distance})`);
        break;
      case 'bottom':
        transforms.push(`translateY(${distance})`);
        break;
      case 'left':
        transforms.push(`translateX(-${distance})`);
        break;
      case 'right':
        transforms.push(`translateX(${distance})`);
        break;
    }

    if (scale !== 1) {
      transforms.push(`scale(${scale})`);
    }

    styleManager.setStyles(element, {
      opacity: opacity[0].toString(),
      transform: transforms.join(' '),
      transition: `all ${duration}ms ${easing} ${delay}ms`,
      'will-change': 'transform, opacity',
    });
  };

  // Animate to visible state
  const reveal = () => {
    if (hasAnimated && once) return;

    styleManager.setStyles(element, {
      opacity: opacity[1].toString(),
      transform: 'translateX(0) translateY(0) scale(1)',
    });
    hasAnimated = true;
  };

  // Hide element (for reanimation)
  const hide = () => {
    if (once) return;
    setInitialState();
    hasAnimated = false;
  };

  // Intersection Observer
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          reveal();
        } else if (!once) {
          hide();
        }
      });
    },
    {
      threshold,
      rootMargin: '50px 0px -50px 0px',
    }
  );

  // Initialize
  setInitialState();
  observer.observe(element);

  // Cleanup function
  return () => {
    observer.unobserve(element);
    observer.disconnect();
    styleManager.restore(element);
  };
}
