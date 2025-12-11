import { shouldReduceMotion } from '../utils/accessibility';
import { resolveElement } from '../utils/element';
import { rafThrottle } from '../utils/performance';
import { createStyleManager } from '../utils/style';

export interface ParallaxOptions {
  speed?: number;
  direction?: 'vertical' | 'horizontal' | 'both';
  offset?: number;
}

/**
 * Creates a parallax scrolling effect on an element.
 *
 * @param target - A CSS selector string or an HTMLElement
 * @param options - Configuration options for the parallax effect
 * @returns A cleanup function to remove the effect
 *
 * @example
 * ```typescript
 * const cleanup = parallax('#background', {
 *   speed: 0.5,
 *   direction: 'vertical',
 *   offset: 0
 * });
 * ```
 */
export function parallax(target: Element | string, options: ParallaxOptions = {}): () => void {
  const element = resolveElement(target as string | HTMLElement);
  if (!element) {
    console.warn('[Atlas Parallax] Element not found:', target);
    return () => {};
  }

  // Skip effect if user prefers reduced motion
  if (shouldReduceMotion()) {
    console.info('[Atlas Parallax] Effect disabled due to prefers-reduced-motion');
    return () => {};
  }

  const { speed = 0.5, direction = 'vertical', offset = 0 } = options;
  const styleManager = createStyleManager();

  const updatePosition = () => {
    const rect = element.getBoundingClientRect();
    const elementTop = rect.top + window.scrollY;
    const elementHeight = rect.height;
    const windowHeight = window.innerHeight;
    const scrollTop = window.scrollY;

    // Calculate if element is in viewport
    const elementBottom = elementTop + elementHeight;
    const viewportTop = scrollTop;
    const viewportBottom = scrollTop + windowHeight;

    if (elementBottom >= viewportTop && elementTop <= viewportBottom) {
      // Element is visible, apply parallax
      const scrolled = scrollTop - elementTop + offset;
      let transformValue = '';

      switch (direction) {
        case 'vertical':
          transformValue = `translateY(${scrolled * speed}px)`;
          break;
        case 'horizontal':
          transformValue = `translateX(${scrolled * speed}px)`;
          break;
        case 'both':
          transformValue = `translate(${scrolled * speed}px, ${scrolled * speed}px)`;
          break;
      }

      styleManager.setStyle(element, 'transform', transformValue);
    }
  };

  // Throttle scroll and resize events using RAF
  const onScroll = rafThrottle(() => {
    updatePosition();
  });

  const onResize = rafThrottle(() => {
    updatePosition();
  });

  // Initial position
  updatePosition();

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize, { passive: true });

  return () => {
    onScroll.cancel();
    onResize.cancel();
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onResize);
    styleManager.restore(element);
  };
}
