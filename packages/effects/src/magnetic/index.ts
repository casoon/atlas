import { resolveElement } from '../utils/element';
import { createSimpleAnimationLoop } from '../utils/animation';
import { createStyleManager } from '../utils/style';
import { rafThrottle } from '../utils/performance';
import { shouldReduceMotion } from '../utils/accessibility';

export interface MagneticOptions {
  strength?: number;
  threshold?: number;
  returnSpeed?: number;
}

/**
 * Creates a magnetic effect that pulls an element toward the mouse cursor.
 *
 * @param target - A CSS selector string or an HTMLElement
 * @param options - Configuration options for the magnetic effect
 * @returns A cleanup function to remove the effect
 *
 * @example
 * ```typescript
 * const cleanup = magnetic('#my-button', {
 *   strength: 0.3,
 *   threshold: 100,
 *   returnSpeed: 0.1
 * });
 * ```
 */
export function magnetic(target: Element | string, options: MagneticOptions = {}): () => void {
  const element = resolveElement(target as string | HTMLElement);
  if (!element) {
    console.warn('[Atlas Magnetic] Element not found:', target);
    return () => {};
  }

  // Skip effect if user prefers reduced motion
  if (shouldReduceMotion()) {
    console.info('[Atlas Magnetic] Effect disabled due to prefers-reduced-motion');
    return () => {};
  }

  const { strength = 0.3, threshold = 100, returnSpeed = 0.1 } = options;
  const styleManager = createStyleManager();

  let currentX = 0;
  let currentY = 0;
  let targetX = 0;
  let targetY = 0;

  const lerp = (start: number, end: number, factor: number) => start + (end - start) * factor;

  const handleMouseMove = rafThrottle((e: MouseEvent) => {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const deltaX = e.clientX - centerX;
    const deltaY = e.clientY - centerY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance < threshold) {
      const force = (threshold - distance) / threshold;
      targetX = deltaX * strength * force;
      targetY = deltaY * strength * force;
    } else {
      targetX = 0;
      targetY = 0;
    }
  });

  const stopAnimation = createSimpleAnimationLoop(() => {
    currentX = lerp(currentX, targetX, returnSpeed);
    currentY = lerp(currentY, targetY, returnSpeed);

    const transformValue = `translate(${currentX}px, ${currentY}px)`;
    styleManager.setStyle(element, 'transform', transformValue);
  });

  document.addEventListener('mousemove', handleMouseMove);

  return () => {
    handleMouseMove.cancel();
    document.removeEventListener('mousemove', handleMouseMove);
    stopAnimation();
    styleManager.restore(element);
  };
}