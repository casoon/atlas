import { shouldReduceMotion } from '../utils/accessibility';
import { createSimpleAnimationLoop } from '../utils/animation';
import { resolveElement } from '../utils/element';
import { createStyleManager } from '../utils/style';

export interface OrbsOptions {
  count?: number;
  minSize?: number;
  maxSize?: number;
  speed?: number;
  color?: string;
}

interface Orb {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  element: HTMLElement;
}

/**
 * Creates floating orbs that move smoothly within a container.
 *
 * @param target - A CSS selector string or an HTMLElement
 * @param options - Configuration options for the orbs effect
 * @returns A cleanup function to remove the effect
 *
 * @example
 * ```typescript
 * const cleanup = orbs('#background', {
 *   count: 5,
 *   minSize: 20,
 *   maxSize: 60,
 *   speed: 0.5,
 *   color: 'rgba(255, 255, 255, 0.1)'
 * });
 * ```
 */
export function orbs(target: Element | string, options: OrbsOptions = {}): () => void {
  const container = resolveElement(target as string | HTMLElement);
  if (!container) {
    console.warn('[Atlas Orbs] Container element not found:', target);
    return () => {};
  }

  // Skip effect if user prefers reduced motion
  if (shouldReduceMotion()) {
    console.info('[Atlas Orbs] Effect disabled due to prefers-reduced-motion');
    return () => {};
  }

  const {
    count = 5,
    minSize = 20,
    maxSize = 60,
    speed = 0.5,
    color = 'rgba(255, 255, 255, 0.1)',
  } = options;

  const orbs: Orb[] = [];
  const cleanupFunctions: Array<() => void> = [];
  const styleManager = createStyleManager();

  // Ensure container has relative positioning and overflow hidden
  styleManager.setStyles(container, {
    position: container.style.position || 'relative',
    overflow: 'hidden',
  });

  cleanupFunctions.push(() => styleManager.restore(container));

  // Get container dimensions with resize handling
  const getContainerRect = () => container.getBoundingClientRect();

  // Create orbs
  const rect = getContainerRect();
  for (let i = 0; i < count; i++) {
    const size = minSize + Math.random() * (maxSize - minSize);
    const orb: Orb = {
      x: Math.random() * (rect.width - size),
      y: Math.random() * (rect.height - size),
      vx: (Math.random() - 0.5) * speed,
      vy: (Math.random() - 0.5) * speed,
      size,
      element: document.createElement('div'),
    };

    orb.element.className = 'atlas-orb';
    orb.element.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      background: ${color};
      pointer-events: none;
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      transition: transform 0.1s ease-out;
      will-change: transform;
    `;

    container.appendChild(orb.element);
    orbs.push(orb);
  }

  // Animation loop using our utility
  const stopAnimation = createSimpleAnimationLoop(() => {
    const currentRect = getContainerRect();

    orbs.forEach((orb) => {
      orb.x += orb.vx;
      orb.y += orb.vy;

      // Bounce off walls (use current rect for resize support)
      if (orb.x <= 0 || orb.x >= currentRect.width - orb.size) {
        orb.vx *= -1;
        orb.x = Math.max(0, Math.min(currentRect.width - orb.size, orb.x));
      }
      if (orb.y <= 0 || orb.y >= currentRect.height - orb.size) {
        orb.vy *= -1;
        orb.y = Math.max(0, Math.min(currentRect.height - orb.size, orb.y));
      }

      orb.element.style.transform = `translate(${orb.x}px, ${orb.y}px)`;
    });
  });

  cleanupFunctions.push(stopAnimation);

  // Cleanup function
  return () => {
    cleanupFunctions.forEach((cleanup) => cleanup());

    orbs.forEach((orb) => {
      if (orb.element.parentNode) {
        orb.element.parentNode.removeChild(orb.element);
      }
    });
  };
}
