import { shouldReduceMotion } from '../utils/accessibility';
import { createSimpleAnimationLoop } from '../utils/animation';
import { resolveElement } from '../utils/element';
import { rafThrottle } from '../utils/performance';
import { createStyleManager } from '../utils/style';

export interface CursorFollowOptions {
  speed?: number;
  offset?: { x: number; y: number };
  magnetic?: boolean;
  magneticThreshold?: number;
}

/**
 * Makes an element follow the cursor position smoothly.
 *
 * @param target - A CSS selector string or an HTMLElement
 * @param options - Configuration options for the cursor follow effect
 * @returns A cleanup function to remove the effect
 *
 * @example
 * ```typescript
 * const cleanup = cursorFollow('#cursor', {
 *   speed: 0.1,
 *   offset: { x: 10, y: 10 },
 *   magnetic: false,
 *   magneticThreshold: 100
 * });
 * ```
 */
export function cursorFollow(
  target: Element | string,
  options: CursorFollowOptions = {}
): () => void {
  const element = resolveElement(target as string | HTMLElement);
  if (!element) {
    console.warn('[Atlas CursorFollow] Element not found:', target);
    return () => {};
  }

  // Skip effect if user prefers reduced motion
  if (shouldReduceMotion()) {
    console.info('[Atlas CursorFollow] Effect disabled due to prefers-reduced-motion');
    return () => {};
  }

  const {
    speed = 0.1,
    offset = { x: 0, y: 0 },
    magnetic = false,
    magneticThreshold = 100,
  } = options;

  const styleManager = createStyleManager();

  let currentX = 0;
  let currentY = 0;
  let targetX = 0;
  let targetY = 0;

  const lerp = (start: number, end: number, factor: number) => start + (end - start) * factor;

  const handleMouseMove = rafThrottle((e: MouseEvent) => {
    if (magnetic) {
      const rect = element.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const deltaX = e.clientX - centerX;
      const deltaY = e.clientY - centerY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      if (distance < magneticThreshold) {
        targetX = e.clientX + offset.x;
        targetY = e.clientY + offset.y;
      }
    } else {
      targetX = e.clientX + offset.x;
      targetY = e.clientY + offset.y;
    }
  });

  const stopAnimation = createSimpleAnimationLoop(() => {
    currentX = lerp(currentX, targetX, speed);
    currentY = lerp(currentY, targetY, speed);

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
