import { shouldReduceMotion } from '../utils/accessibility';
import { createSimpleAnimationLoop } from '../utils/animation';
import { resolveElement } from '../utils/element';
import { createStyleManager } from '../utils/style';

export interface WaveOptions {
  amplitude?: number;
  frequency?: number;
  speed?: number;
  direction?: 'horizontal' | 'vertical';
}

/**
 * Creates a wave animation effect on an element.
 *
 * @param target - A CSS selector string or an HTMLElement
 * @param options - Configuration options for the wave effect
 * @returns A cleanup function to remove the effect
 *
 * @example
 * ```typescript
 * const cleanup = wave('#element', {
 *   amplitude: 10,
 *   frequency: 0.02,
 *   speed: 0.05,
 *   direction: 'horizontal'
 * });
 * ```
 */
export function wave(target: Element | string, options: WaveOptions = {}): () => void {
  const element = resolveElement(target as string | HTMLElement);
  if (!element) {
    console.warn('[Atlas Wave] Element not found:', target);
    return () => {};
  }

  // Skip effect if user prefers reduced motion
  if (shouldReduceMotion()) {
    console.info('[Atlas Wave] Effect disabled due to prefers-reduced-motion');
    return () => {};
  }

  const { amplitude = 10, frequency = 0.02, speed = 0.05, direction = 'horizontal' } = options;
  const styleManager = createStyleManager();

  let time = 0;

  const stopAnimation = createSimpleAnimationLoop(() => {
    const offset = Math.sin(time * frequency * 100) * amplitude;
    const transformValue =
      direction === 'horizontal' ? `translateY(${offset}px)` : `translateX(${offset}px)`;

    styleManager.setStyle(element, 'transform', transformValue);
    time += speed;
  });

  return () => {
    stopAnimation();
    styleManager.restore(element);
  };
}
