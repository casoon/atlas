import { shouldReduceMotion } from '../utils/accessibility';
import { resolveElement } from '../utils/element';
import { createStyleManager } from '../utils/style';

export interface MorphingOptions {
  shapes?: string[];
  duration?: number;
  autoPlay?: boolean;
  loop?: boolean;
}

/**
 * Creates a morphing animation that cycles through border-radius shapes.
 *
 * @param target - A CSS selector string or an HTMLElement
 * @param options - Configuration options for the morphing effect
 * @returns A cleanup function to remove the effect
 *
 * @example
 * ```typescript
 * const cleanup = morphing('#element', {
 *   shapes: ['50%', '0%', '25%', '50%'],
 *   duration: 2000,
 *   autoPlay: true,
 *   loop: true
 * });
 * ```
 */
export function morphing(target: Element | string, options: MorphingOptions = {}): () => void {
  const element = resolveElement(target as string | HTMLElement);
  if (!element) {
    console.warn('[Atlas Morphing] Element not found:', target);
    return () => {};
  }

  // Skip animation if user prefers reduced motion
  if (shouldReduceMotion()) {
    console.info('[Atlas Morphing] Effect disabled due to prefers-reduced-motion');
    return () => {};
  }

  const {
    shapes = ['50%', '0%', '25%', '50%'],
    duration = 2000,
    autoPlay = true,
    loop = true,
  } = options;

  const styleManager = createStyleManager();
  let currentIndex = 0;
  let intervalId: ReturnType<typeof setInterval> | null = null;

  const morph = (shapeIndex: number) => {
    styleManager.setStyles(element, {
      'border-radius': shapes[shapeIndex],
      transition: `border-radius ${duration}ms cubic-bezier(0.68, -0.55, 0.265, 1.55)`,
    });
  };

  const nextShape = () => {
    currentIndex = (currentIndex + 1) % shapes.length;
    morph(currentIndex);

    // Stop if not looping and reached the end
    if (!loop && currentIndex === shapes.length - 1 && intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };

  if (autoPlay) {
    intervalId = setInterval(nextShape, duration + 100);
  }

  return () => {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
    styleManager.restore(element);
  };
}
